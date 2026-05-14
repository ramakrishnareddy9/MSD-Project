import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  grossAmount: {
    type: Number,
    required: true,
    min: 0
  },
  commissionDeducted: {
    type: Number,
    required: true,
    min: 0
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processed'],
    default: 'pending',
    index: true
  },
  processedAt: {
    type: Date,
    default: null
  },
  paymentReference: {
    type: String,
    default: null
  },
  orderCount: {
    type: Number,
    default: 0,
    min: 0
  },
  cycle: {
    type: String,
    enum: ['weekly', 'monthly'],
    required: true
  }
}, {
  timestamps: true
});

payoutSchema.index({ farmerId: 1, periodStart: 1, periodEnd: 1 }, { unique: true });
payoutSchema.index({ farmerId: 1, status: 1, createdAt: -1 });
payoutSchema.index({ status: 1, periodEnd: -1 });

payoutSchema.pre('validate', function(next) {
  if (this.netAmount == null && this.grossAmount != null && this.commissionDeducted != null) {
    this.netAmount = Math.max(0, Number(this.grossAmount || 0) - Number(this.commissionDeducted || 0));
  }

  next();
});

payoutSchema.methods.markProcessed = async function(paymentReference) {
  this.status = 'processed';
  this.processedAt = new Date();
  this.paymentReference = paymentReference;
  return this.save();
};

const Payout = mongoose.model('Payout', payoutSchema);

export default Payout;