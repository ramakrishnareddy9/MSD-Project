import mongoose from 'mongoose';

/**
 * Commission Model - Tracks platform revenue from transactions
 * Manages commission collection and farmer payouts
 */

const commissionSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true
  },
  orderNumber: String, // snapshot for quick reference
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sellerType: {
    type: String,
    enum: ['farmer', 'business'],
    required: true
  },
  orderAmount: {
    type: Number,
    required: true
  },
  commissionRate: {
    type: Number,
    required: true,
    default: 0.10 // 10% default
  },
  commissionAmount: {
    type: Number,
    required: true
  },
  sellerPayout: {
    type: Number,
    required: true // orderAmount - commissionAmount
  },
  status: {
    type: String,
    enum: ['pending', 'collected', 'processing', 'paid', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },
  collectedAt: Date, // When payment was received from customer
  processedAt: Date, // When payout was initiated
  paidAt: Date, // When payout was completed
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'upi', 'wallet', 'cash']
  },
  payoutDetails: {
    transactionId: String,
    bankAccount: String,
    upiId: String,
    notes: String
  },
  settlement: {
    cycleId: String, // Weekly/Monthly settlement cycle
    batchId: String,
    scheduledDate: Date
  },
  adjustments: [{
    type: {
      type: String,
      enum: ['refund', 'penalty', 'bonus', 'correction']
    },
    amount: Number,
    reason: String,
    appliedAt: Date,
    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  metadata: {
    orderType: String, // b2c or b2b
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    },
    productCount: Number,
    deliveryFee: Number,
    region: String
  },
  flags: {
    isDisputed: { type: Boolean, default: false },
    requiresReview: { type: Boolean, default: false },
    isHighValue: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
commissionSchema.index({ sellerId: 1, status: 1 });
commissionSchema.index({ 'settlement.cycleId': 1 });
commissionSchema.index({ createdAt: -1 });
commissionSchema.index({ status: 1, 'settlement.scheduledDate': 1 });

// Calculate seller payout
commissionSchema.pre('save', function(next) {
  if (this.isModified('orderAmount') || this.isModified('commissionAmount')) {
    this.sellerPayout = this.orderAmount - this.commissionAmount;
  }
  
  // Flag high-value transactions
  if (this.orderAmount > 50000) {
    this.flags.isHighValue = true;
  }
  
  next();
});

// Methods
commissionSchema.methods.markCollected = async function() {
  this.status = 'collected';
  this.collectedAt = new Date();
  return this.save();
};

commissionSchema.methods.processPayout = async function(paymentDetails) {
  this.status = 'processing';
  this.processedAt = new Date();
  this.payoutDetails = paymentDetails;
  return this.save();
};

commissionSchema.methods.completePayout = async function(transactionId) {
  this.status = 'paid';
  this.paidAt = new Date();
  this.payoutDetails.transactionId = transactionId;
  return this.save();
};

commissionSchema.methods.addAdjustment = async function(type, amount, reason, userId) {
  this.adjustments.push({
    type,
    amount,
    reason,
    appliedAt: new Date(),
    appliedBy: userId
  });
  
  // Recalculate seller payout
  const totalAdjustments = this.adjustments.reduce((sum, adj) => {
    return sum + (adj.type === 'bonus' ? adj.amount : -adj.amount);
  }, 0);
  
  this.sellerPayout = this.orderAmount - this.commissionAmount + totalAdjustments;
  return this.save();
};

// Statics
commissionSchema.statics.getSettlementSummary = async function(sellerId, cycleId) {
  return this.aggregate([
    {
      $match: {
        sellerId: mongoose.Types.ObjectId(sellerId),
        'settlement.cycleId': cycleId
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalOrderAmount: { $sum: '$orderAmount' },
        totalCommission: { $sum: '$commissionAmount' },
        totalPayout: { $sum: '$sellerPayout' },
        pendingCount: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        paidCount: {
          $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
        }
      }
    }
  ]);
};

const Commission = mongoose.model('Commission', commissionSchema);
export default Commission;
