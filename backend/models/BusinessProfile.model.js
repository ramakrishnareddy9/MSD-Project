import mongoose from 'mongoose';

const businessProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  companyType: {
    type: String,
    enum: ['wholesaler', 'processor', 'manufacturer', 'retailer'],
    required: true
  },
  gstNumber: {
    type: String,
    sparse: true
  },
  panNumber: String,
  businessLicense: String,
  paymentTerms: {
    type: String,
    enum: ['prepaid', 'net_7', 'net_15', 'net_30'],
    default: 'prepaid'
  },
  creditLimit: {
    type: Number,
    default: 0
  },
  purchaseVolume: {
    monthly: { type: Number, default: 0 },
    yearly: { type: Number, default: 0 }
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
businessProfileSchema.index({ userId: 1 }, { unique: true });
businessProfileSchema.index({ gstNumber: 1 }, { unique: true, sparse: true });

const BusinessProfile = mongoose.model('BusinessProfile', businessProfileSchema);

export default BusinessProfile;
