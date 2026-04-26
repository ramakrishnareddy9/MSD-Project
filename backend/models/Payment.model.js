import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  method: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'wallet', 'cod', 'credit', 'bank_transfer'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'partial_refunded', 'refunded', 'cancelled'],
    default: 'pending'
  },
  gateway: {
    type: String,
    enum: ['razorpay', 'stripe', 'paytm', 'phonepe', 'manual'],
    default: 'razorpay'
  },
  transactionId: {
    type: String
  },
  gatewayOrderId: String,
  gatewayPaymentId: String,
  paidAt: Date,
  failedAt: Date,
  refundedAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  remainingAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  refundedAt: Date,
  refundAmount: {
    type: Number,
    min: 0
  },
  refundReason: String,
  refundHistory: [{
    amount: {
      type: Number,
      min: 0,
      required: true
    },
    reason: String,
    refundedAt: {
      type: Date,
      default: Date.now
    }
  }],
  failureReason: String,
  idempotencyKey: {
    type: String,
    index: true
  },
  metadata: {
    cardLast4: String,
    cardBrand: String,
    upiVpa: String,
    bankName: String,
    payerName: String
  },
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ method: 1, status: 1 });

// Virtual for isPaid
paymentSchema.virtual('isPaid').get(function() {
  return this.status === 'success';
});

// Method to mark as success
paymentSchema.methods.markSuccess = function(transactionData) {
  this.status = 'success';
  this.paidAt = new Date();
  this.transactionId = transactionData.transactionId;
  this.gatewayPaymentId = transactionData.paymentId;
  this.refundedAmount = 0;
  this.remainingAmount = this.amount;
  if (transactionData.metadata) {
    this.metadata = { ...this.metadata, ...transactionData.metadata };
  }
  return this.save();
};

// Method to mark as failed
paymentSchema.methods.markFailed = function(reason) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.failureReason = reason;
  return this.save();
};

// Method to process refund
paymentSchema.methods.processRefund = function(amount, reason) {
  if (!['success', 'partial_refunded'].includes(this.status)) {
    throw new Error('Can only refund successful or partially refunded payments');
  }

  const requestedAmount = amount == null || amount === '' ? null : Number(amount);
  const currentRefundedAmount = Number(this.refundedAmount || 0);
  const currentRemainingAmount = Number(
    this.remainingAmount != null
      ? this.remainingAmount
      : Math.max(Number(this.amount || 0) - currentRefundedAmount, 0)
  );

  if (currentRemainingAmount <= 0 || this.status === 'refunded') {
    throw new Error('Payment has already been fully refunded');
  }

  const refundAmount = requestedAmount == null ? currentRemainingAmount : requestedAmount;

  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    throw new Error('Refund amount must be a positive number');
  }

  if (refundAmount > currentRemainingAmount) {
    throw new Error(`Refund amount cannot exceed remaining refundable balance of ${currentRemainingAmount}`);
  }

  const nextRefundedAmount = currentRefundedAmount + refundAmount;
  const nextRemainingAmount = Math.max(Number(this.amount || 0) - nextRefundedAmount, 0);

  this.status = nextRemainingAmount === 0 ? 'refunded' : 'partial_refunded';
  this.refundedAt = new Date();
  this.refundAmount = refundAmount;
  this.refundedAmount = nextRefundedAmount;
  this.remainingAmount = nextRemainingAmount;
  this.refundReason = reason;

  if (!Array.isArray(this.refundHistory)) {
    this.refundHistory = [];
  }

  this.refundHistory.push({
    amount: refundAmount,
    reason,
    refundedAt: this.refundedAt
  });

  return this.save();
};

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
