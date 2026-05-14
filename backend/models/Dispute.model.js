import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reason: {
    type: String,
    enum: ['damaged', 'wrong_item', 'not_delivered', 'quality'],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  evidenceImages: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved_refund', 'resolved_replacement', 'rejected'],
    default: 'open',
    index: true
  },
  resolutionNotes: {
    type: String,
    trim: true
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  refundPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  }
}, {
  timestamps: true
});

disputeSchema.index({ orderId: 1, buyerId: 1 }, { unique: true });
disputeSchema.index({ status: 1, createdAt: -1 });

const Dispute = mongoose.model('Dispute', disputeSchema);

export default Dispute;
