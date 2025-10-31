import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import Commission from '../models/Commission.model.js';
import Order from '../models/Order.model.js';
import User from '../models/User.model.js';

const router = express.Router();

/**
 * @route   GET /api/commissions
 * @desc    Get all commissions (admin only)
 * @access  Admin
 */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const {
      sellerId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};
    
    if (sellerId) query.sellerId = sellerId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    
    const commissions = await Commission.find(query)
      .populate('sellerId', 'name email role')
      .populate('orderId', 'orderNumber totalAmount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Commission.countDocuments(query);

    res.json({
      success: true,
      data: commissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commissions'
    });
  }
});

/**
 * @route   GET /api/commissions/:id
 * @desc    Get commission by ID
 * @access  Admin or Seller (own commission)
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const commission = await Commission.findById(req.params.id)
      .populate('sellerId', 'name email role')
      .populate('orderId', 'orderNumber totalAmount items');

    if (!commission) {
      return res.status(404).json({
        success: false,
        error: 'Commission not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && 
        commission.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this commission'
      });
    }

    res.json({
      success: true,
      data: commission
    });
  } catch (error) {
    console.error('Error fetching commission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commission'
    });
  }
});

/**
 * @route   GET /api/commissions/settlement/:sellerId/:cycleId
 * @desc    Get settlement summary for a seller
 * @access  Admin or Seller (own settlement)
 */
router.get('/settlement/:sellerId/:cycleId', authenticate, async (req, res) => {
  try {
    const { sellerId, cycleId } = req.params;

    // Check authorization
    if (req.user.role !== 'admin' && req.user._id.toString() !== sellerId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this settlement'
      });
    }

    const commissions = await Commission.find({
      sellerId,
      settlementCycle: cycleId
    }).populate('orderId', 'orderNumber totalAmount');

    const summary = {
      cycleId,
      sellerId,
      totalCommissions: commissions.length,
      totalOrderValue: 0,
      totalCommissionAmount: 0,
      totalAdjustments: 0,
      netAmount: 0,
      pending: 0,
      collected: 0,
      paid: 0,
      commissions: commissions
    };

    commissions.forEach(comm => {
      summary.totalOrderValue += comm.orderAmount;
      summary.totalCommissionAmount += comm.commissionAmount;
      summary.totalAdjustments += comm.adjustmentAmount || 0;
      summary.netAmount += comm.netAmount;
      
      if (comm.status === 'pending') summary.pending += comm.netAmount;
      if (comm.status === 'collected') summary.collected += comm.netAmount;
      if (comm.status === 'paid') summary.paid += comm.netAmount;
    });

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching settlement summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settlement summary'
    });
  }
});

/**
 * @route   PATCH /api/commissions/:id/collect
 * @desc    Mark commission as collected
 * @access  Admin
 */
router.patch('/:id/collect', authenticate, authorize('admin'), async (req, res) => {
  try {
    const commission = await Commission.findById(req.params.id);

    if (!commission) {
      return res.status(404).json({
        success: false,
        error: 'Commission not found'
      });
    }

    if (commission.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Commission is not in pending status'
      });
    }

    commission.status = 'collected';
    commission.collectedAt = new Date();
    await commission.save();

    res.json({
      success: true,
      data: commission
    });
  } catch (error) {
    console.error('Error marking commission as collected:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark commission as collected'
    });
  }
});

/**
 * @route   POST /api/commissions/:id/payout
 * @desc    Process payout for commission
 * @access  Admin
 */
router.post('/:id/payout', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { paymentMethod, transactionId, paymentDetails } = req.body;

    const commission = await Commission.findById(req.params.id);

    if (!commission) {
      return res.status(404).json({
        success: false,
        error: 'Commission not found'
      });
    }

    if (commission.status !== 'collected') {
      return res.status(400).json({
        success: false,
        error: 'Commission must be collected before payout'
      });
    }

    commission.status = 'paid';
    commission.paidAt = new Date();
    commission.paymentMethod = paymentMethod;
    commission.paymentDetails = {
      ...paymentDetails,
      transactionId,
      processedBy: req.user._id
    };

    await commission.save();

    res.json({
      success: true,
      data: commission
    });
  } catch (error) {
    console.error('Error processing payout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process payout'
    });
  }
});

/**
 * @route   POST /api/commissions/:id/adjustment
 * @desc    Add adjustment to commission
 * @access  Admin
 */
router.post('/:id/adjustment', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { type, amount, reason } = req.body;

    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid adjustment type'
      });
    }

    const commission = await Commission.findById(req.params.id);

    if (!commission) {
      return res.status(404).json({
        success: false,
        error: 'Commission not found'
      });
    }

    if (commission.status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Cannot adjust paid commission'
      });
    }

    if (!commission.adjustments) {
      commission.adjustments = [];
    }

    commission.adjustments.push({
      type,
      amount,
      reason,
      createdBy: req.user._id,
      createdAt: new Date()
    });

    // Update adjustment amount and net amount
    const adjustmentDelta = type === 'credit' ? amount : -amount;
    commission.adjustmentAmount = (commission.adjustmentAmount || 0) + adjustmentDelta;
    commission.netAmount = commission.commissionAmount + commission.adjustmentAmount;

    await commission.save();

    res.json({
      success: true,
      data: commission
    });
  } catch (error) {
    console.error('Error adding adjustment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add adjustment'
    });
  }
});

/**
 * @route   GET /api/commissions/stats/overview
 * @desc    Get commission statistics
 * @access  Admin
 */
router.get('/stats/overview', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const stats = await Commission.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$netAmount' }
        }
      }
    ]);

    const overview = {
      pending: { count: 0, amount: 0 },
      collected: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 }
    };

    stats.forEach(stat => {
      if (overview[stat._id]) {
        overview[stat._id] = {
          count: stat.count,
          amount: stat.totalAmount
        };
      }
    });

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('Error fetching commission stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commission statistics'
    });
  }
});

export default router;
