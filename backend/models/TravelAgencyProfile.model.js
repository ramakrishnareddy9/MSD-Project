import mongoose from 'mongoose';

const travelAgencyProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agencyName: {
    type: String,
    required: true
  },
  registrationNumber: String,
  serviceAreas: [String],
  specialties: [String],
  paymentTerms: {
    type: String,
    enum: ['prepaid', 'net_7', 'net_15', 'net_30'],
    default: 'net_15'
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

travelAgencyProfileSchema.index({ userId: 1 }, { unique: true });

const TravelAgencyProfile = mongoose.model('TravelAgencyProfile', travelAgencyProfileSchema);

export default TravelAgencyProfile;
