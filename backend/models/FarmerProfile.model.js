import mongoose from 'mongoose';

const farmerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  farmName: {
    type: String,
    required: true
  },
  farmType: {
    type: String,
    enum: ['organic', 'conventional', 'mixed'],
    default: 'conventional'
  },
  farmSize: {
    type: Number, // in acres or hectares
    required: true
  },
  certifications: [{
    type: String,
    enum: ['organic', 'fair_trade', 'gmp', 'global_gap', 'rainforest_alliance']
  }],
  bankAccount: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String
  },
  payoutSchedule: {
    type: String,
    enum: ['weekly', 'biweekly', 'monthly'],
    default: 'weekly'
  },
  languages: [String],
  experience: Number, // years
  specialization: [String], // crops they specialize in
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
farmerProfileSchema.index({ userId: 1 });

const FarmerProfile = mongoose.model('FarmerProfile', farmerProfileSchema);

export default FarmerProfile;
