import cron from 'node-cron';
import mongoose from 'mongoose';
import Order from '../models/Order.model.js';
import Commission from '../models/Commission.model.js';
import FarmerProfile from '../models/FarmerProfile.model.js';
import Payout from '../models/Payout.model.js';
import { getPayoutPeriodWindow } from '../utils/payoutPeriod.util.js';

const buildPayoutAggregate = async ({ farmerId, periodStart, periodEnd }) => {
  return Order.aggregate([
    {
      $match: {
        sellerId: new mongoose.Types.ObjectId(farmerId),
        status: 'delivered'
      }
    },
    {
      $addFields: {
        payoutCompletedAt: {
          $ifNull: ['$actualDeliveryDate', '$updatedAt']
        }
      }
    },
    {
      $match: {
        payoutCompletedAt: {
          $gte: periodStart,
          $lt: periodEnd
        }
      }
    },
    {
      $lookup: {
        from: 'commissions',
        localField: '_id',
        foreignField: 'orderId',
        as: 'commission'
      }
    },
    { $unwind: '$commission' },
    {
      $match: {
        'commission.status': 'collected'
      }
    },
    {
      $group: {
        _id: null,
        grossAmount: { $sum: '$total' },
        commissionDeducted: { $sum: '$commission.commissionAmount' },
        netAmount: { $sum: '$commission.sellerPayout' },
        orderCount: { $sum: 1 }
      }
    }
  ]);
};

export async function generatePayoutsForCycle(cycle, now = new Date()) {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  const periodWindow = getPayoutPeriodWindow(cycle, now);
  if (!periodWindow) {
    return [];
  }

  const farmerProfiles = await FarmerProfile.find({ payoutSchedule: cycle }).select('userId payoutSchedule');
  const createdPayouts = [];

  for (const profile of farmerProfiles) {
    const farmerId = profile.userId;
    const existingPayout = await Payout.findOne({
      farmerId,
      periodStart: periodWindow.periodStart,
      periodEnd: periodWindow.periodEnd
    });

    if (existingPayout) {
      continue;
    }

    const [summary] = await buildPayoutAggregate({
      farmerId,
      periodStart: periodWindow.periodStart,
      periodEnd: periodWindow.periodEnd
    });

    if (!summary || Number(summary.netAmount || 0) <= 0) {
      continue;
    }

    const payout = await Payout.create({
      farmerId,
      periodStart: periodWindow.periodStart,
      periodEnd: periodWindow.periodEnd,
      grossAmount: Number(summary.grossAmount || 0),
      commissionDeducted: Number(summary.commissionDeducted || 0),
      netAmount: Number(summary.netAmount || 0),
      orderCount: Number(summary.orderCount || 0),
      status: 'pending',
      cycle
    });

    createdPayouts.push(payout);
  }

  return createdPayouts;
}

export async function runPayoutGeneration(now = new Date()) {
  const created = [];

  if (process.env.DISABLE_MONGO_TRANSACTIONS === 'true') {
    // No-op; payout generation uses read-only aggregation and single-document inserts.
  }

  if (now.getDay() === 1) {
    created.push(...await generatePayoutsForCycle('weekly', now));
  }

  if (now.getDate() === 1) {
    created.push(...await generatePayoutsForCycle('monthly', now));
  }

  return created;
}

export function startPayoutScheduler() {
  console.log('🚀 Starting payout scheduler...');

  const schedule = '15 0 * * *';
  cron.schedule(schedule, async () => {
    console.log('\n💸 Payout generation triggered at', new Date().toISOString());
    try {
      const payouts = await runPayoutGeneration(new Date());
      console.log(`✅ Generated ${payouts.length} payout records`);
    } catch (error) {
      console.error('❌ Payout generation failed:', error.message);
    }
  });

  setTimeout(async () => {
    try {
      const payouts = await runPayoutGeneration(new Date());
      console.log(`🔄 Initial payout pass created ${payouts.length} payout records`);
    } catch (error) {
      console.error('❌ Initial payout generation failed:', error.message);
    }
  }, 15000);

  console.log(`✅ Payout scheduler running with cron: ${schedule}`);
}

export default {
  startPayoutScheduler,
  runPayoutGeneration,
  generatePayoutsForCycle
};