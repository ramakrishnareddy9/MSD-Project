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
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
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
  currentOfferPrice: {
    type: Number,
    min: 0
  },
  lastOfferedBy: {
    type: String,
    enum: ['buyer', 'farmer'],
    default: 'buyer'
  },
  buyerAccepted: {
    type: Boolean,
    default: true
  },
  farmerAccepted: {
    type: Boolean,
    default: false
  },
  agreedPrice: {
    type: Number,
    min: 0
  },
  agreedAt: Date,
  negotiationHistory: [{
    offeredBy: {
      type: String,
      enum: ['buyer', 'farmer'],
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    message: String,
    offeredAt: {
      type: Date,
      default: Date.now
    }
  }],
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
    enum: ['open', 'countered', 'accepted', 'declined', 'fulfilled', 'cancelled'],
    default: 'open'
  },
  matchedFarmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  communityContext: {
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community'
    },
    poolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityPool'
    },
    contributorIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  delivery: {
    requestedVehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle'
    },
    requestedPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: Date,
    requestStatus: {
      type: String,
      enum: ['none', 'requested', 'accepted', 'rejected'],
      default: 'none'
    }
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
  if (this.currentOfferPrice == null && this.offeredPrice != null) {
    this.currentOfferPrice = this.offeredPrice;
  }
  next();
});

const MarketplaceRequest = mongoose.model('MarketplaceRequest', marketplaceRequestSchema);

export default MarketplaceRequest;
