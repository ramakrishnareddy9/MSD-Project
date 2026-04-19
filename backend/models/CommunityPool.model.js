import mongoose from 'mongoose';

const contributionSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  qty: {
    type: Number,
    required: true,
    min: 1
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const communityPoolSchema = new mongoose.Schema({
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  totalQty: {
    type: Number,
    default: 0
  },
  minBulkQty: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['collecting', 'ready', 'ordered', 'delivered', 'allocated'],
    default: 'collecting'
  },
  contributions: [contributionSchema],
  assignedFarmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// One pool per community + product pair.
communityPoolSchema.index({ community: 1, product: 1 }, { unique: true });

export default mongoose.model('CommunityPool', communityPoolSchema);
