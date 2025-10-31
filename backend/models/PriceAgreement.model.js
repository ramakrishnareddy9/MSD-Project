import mongoose from 'mongoose';

const tierSchema = new mongoose.Schema({
  minQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  maxQuantity: {
    type: Number,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discountPercent: {
    type: Number,
    min: 0,
    max: 100
  }
}, { _id: false });

const priceAgreementSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  agreementNumber: {
    type: String
  },
  tiers: {
    type: [tierSchema],
    required: true,
    validate: {
      validator: function(tiers) {
        return tiers && tiers.length > 0;
      },
      message: 'At least one pricing tier is required'
    }
  },
  currency: {
    type: String,
    default: 'INR'
  },
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'active', 'expired', 'cancelled', 'rejected'],
    default: 'draft'
  },
  terms: {
    paymentTerms: {
      type: String,
      enum: ['net_7', 'net_15', 'net_30', 'net_45', 'prepaid'],
      default: 'net_15'
    },
    deliveryTerms: String,
    minimumOrderValue: Number,
    autoRenewal: {
      type: Boolean,
      default: false
    },
    renewalPeriod: Number // in days
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectedAt: Date,
  rejectionReason: String,
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
priceAgreementSchema.index({ sellerId: 1, buyerId: 1, productId: 1 });
priceAgreementSchema.index({ validFrom: 1, validUntil: 1 });
priceAgreementSchema.index({ status: 1 });
priceAgreementSchema.index({ agreementNumber: 1 }, { unique: true });

// Generate agreement number before saving
priceAgreementSchema.pre('save', async function(next) {
  if (!this.agreementNumber) {
    const count = await mongoose.model('PriceAgreement').countDocuments();
    this.agreementNumber = `AGR${Date.now()}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Method to get price for quantity
priceAgreementSchema.methods.getPriceForQuantity = function(quantity) {
  if (this.status !== 'active') {
    return null;
  }
  
  const now = new Date();
  if (now < this.validFrom || now > this.validUntil) {
    return null;
  }
  
  // Find applicable tier
  const tier = this.tiers.find(t => {
    const meetsMin = quantity >= t.minQuantity;
    const meetsMax = !t.maxQuantity || quantity <= t.maxQuantity;
    return meetsMin && meetsMax;
  });
  
  return tier ? tier.price : null;
};

// Method to check if agreement is currently valid
priceAgreementSchema.methods.isCurrentlyValid = function() {
  if (this.status !== 'active') return false;
  
  const now = new Date();
  return now >= this.validFrom && now <= this.validUntil;
};

// Method to activate agreement
priceAgreementSchema.methods.activate = function(approvedBy) {
  this.status = 'active';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  return this.save();
};

// Method to reject agreement
priceAgreementSchema.methods.reject = function(reason) {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// Static method to find active agreements
priceAgreementSchema.statics.findActiveAgreements = function(sellerId, buyerId, productId) {
  const now = new Date();
  return this.find({
    sellerId,
    buyerId,
    productId,
    status: 'active',
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  });
};

const PriceAgreement = mongoose.model('PriceAgreement', priceAgreementSchema);

export default PriceAgreement;
