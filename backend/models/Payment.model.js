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
    enum: ['pending', 'processing', 'success', 'failed', 'refunded', 'cancelled'],
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
  refundedAt: Date,
  refundAmount: {
    type: Number,
    min: 0
  },
  refundReason: String,
  failureReason: String,
  metadata: {
    cardLast4: String,
    cardBrand: String,
    upiVpa: String,
    bankName: String,
    payerName: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
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
  if (this.status !== 'success') {
    throw new Error('Can only refund successful payments');
  }
  this.status = 'refunded';
  this.refundedAt = new Date();
  this.refundAmount = amount || this.amount;
  this.refundReason = reason;
  return this.save();
};

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
