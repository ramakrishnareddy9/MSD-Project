import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['farm', 'hub', 'dark_store', 'warehouse'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  address: {
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'India' }
  },
  coordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  capacity: {
    maxWeight: Number,
    maxVolume: Number,
    coldStorage: { type: Boolean, default: false }
  },
  operatingHours: {
    open: String,
    close: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
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
locationSchema.index({ type: 1, status: 1 });
locationSchema.index({ coordinates: '2dsphere' });

const Location = mongoose.model('Location', locationSchema);

export default Location;
