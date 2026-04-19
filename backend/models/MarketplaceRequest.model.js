import mongoose from 'mongoose';

const marketplaceRequestSchema = new mongoose.Schema({
  requestNumber: {
    type: String,
    required: true,
    unique: true
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requesterRole: {
    type: String,
    required: true
  },
  requesterType: {
    type: String,
    enum: ['business', 'restaurant', 'community', 'travel_agency', 'customer'],
    required: true
  },
  cropName: {
    type: String,
    required: true,
    trim: true
  },
  season: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: String,
    enum: ['kg', 'liter', 'piece', 'dozen', 'quintal', 'gram', 'ml'],
    default: 'kg'
  },
  offeredPrice: {
    type: Number,
    required: true,
    min: 0
  },
  location: {
    type: String,
    trim: true,
    default: 'India'
  },
  requiredBy: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['open', 'accepted', 'declined', 'fulfilled', 'cancelled'],
    default: 'open'
  },
  matchedFarmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  farmerResponse: {
    offeredPrice: Number,
    message: String,
    respondedAt: Date
  }
}, {
  timestamps: true
});

marketplaceRequestSchema.index({ cropName: 1, status: 1, createdAt: -1 });
marketplaceRequestSchema.index({ requesterId: 1, status: 1, createdAt: -1 });
marketplaceRequestSchema.index({ matchedFarmerId: 1, status: 1, createdAt: -1 });

marketplaceRequestSchema.pre('validate', function(next) {
  if (!this.requestNumber) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.requestNumber = `MRQ${Date.now()}${randomSuffix}`;
  }
  next();
});

const MarketplaceRequest = mongoose.model('MarketplaceRequest', marketplaceRequestSchema);

export default MarketplaceRequest;
