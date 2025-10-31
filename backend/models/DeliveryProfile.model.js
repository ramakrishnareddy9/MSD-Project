import mongoose from 'mongoose';

const deliveryProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  scale: {
    type: String,
    enum: ['large', 'small'],
    required: true
  },
  vehicleTypes: [{
    type: String,
    enum: ['truck', 'van', 'bike', 'refrigerated_truck', 'refrigerated_van']
  }],
  coldChainCapable: {
    type: Boolean,
    default: false
  },
  serviceAreas: [{
    type: {
      type: String,
      enum: ['city', 'region', 'state', 'national']
    },
    coverage: [String], // city/region names
    coordinates: {
      type: { type: String, enum: ['Polygon'], default: 'Polygon' },
      coordinates: [[[Number]]] // GeoJSON Polygon
    }
  }],
  capacity: {
    maxWeight: Number, // in kg
    maxVolume: Number // in cubic meters
  },
  insurance: {
    provider: String,
    policyNumber: String,
    coverage: Number,
    expiryDate: Date
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  completedDeliveries: {
    type: Number,
    default: 0
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
deliveryProfileSchema.index({ userId: 1 }, { unique: true });
deliveryProfileSchema.index({ scale: 1 });
deliveryProfileSchema.index({ 'serviceAreas.coordinates': '2dsphere' });

const DeliveryProfile = mongoose.model('DeliveryProfile', deliveryProfileSchema);

export default DeliveryProfile;
