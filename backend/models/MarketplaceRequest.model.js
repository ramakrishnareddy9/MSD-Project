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
    enum: ['open', 'countered', 'accepted', 'declined', 'fulfilled', 'cancelled', 'expired'],
    default: 'open'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 72 * 60 * 60 * 1000),
    required: true
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
marketplaceRequestSchema.index({ status: 1, createdAt: -1 });
marketplaceRequestSchema.index({ expiresAt: 1, status: 1 });

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

/**
 * Issue 12 - Validate state transition
 * Ensures valid state transitions to prevent invalid workflows
 */
MarketplaceRequest.prototype.canTransitionTo = function(newStatus) {
  const validTransitions = {
    'open': ['countered', 'declined', 'expired'],
    'countered': ['open', 'accepted', 'declined', 'expired'],
    'accepted': ['fulfilled', 'cancelled', 'expired'],
    'declined': ['expired'],
    'fulfilled': ['cancelled'],
    'cancelled': [],
    'expired': []
  };
  
  const allowed = validTransitions[this.status] || [];
  return allowed.includes(newStatus);
};

/**
 * Issue 19 - Expire old requests
 * Marks requests as expired if past expiresAt and not in terminal state
 */
MarketplaceRequest.expireOldRequests = async function() {
  try {
    const now = new Date();
    
    // Find non-terminal requests that have expired
    const result = await this.updateMany(
      {
        expiresAt: { $lt: now },
        status: { $nin: ['fulfilled', 'cancelled', 'expired'] }
      },
      { status: 'expired', updatedAt: now }
    );
    
    return result;
  } catch (error) {
    console.error('❌ Error expiring old marketplace requests:', error);
    throw error;
  }
};

export default MarketplaceRequest;
