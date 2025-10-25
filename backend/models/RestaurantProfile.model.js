import mongoose from 'mongoose';

const restaurantProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  restaurantName: {
    type: String,
    required: true
  },
  cuisineType: [String],
  fssaiLicense: {
    type: String,
    unique: true,
    sparse: true
  },
  seatingCapacity: Number,
  operatingHours: {
    open: String, // e.g., "09:00"
    close: String, // e.g., "22:00"
    daysOpen: [String] // e.g., ["Monday", "Tuesday", ...]
  },
  deliveryWindowPreference: {
    type: String,
    enum: ['early_morning', 'specific_time', 'flexible'],
    default: 'early_morning'
  },
  averageDailyOrders: {
    type: Number,
    default: 0
  },
  paymentTerms: {
    type: String,
    enum: ['prepaid', 'net_7', 'net_15', 'net_30'],
    default: 'prepaid'
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
restaurantProfileSchema.index({ userId: 1 });
restaurantProfileSchema.index({ fssaiLicense: 1 });

const RestaurantProfile = mongoose.model('RestaurantProfile', restaurantProfileSchema);

export default RestaurantProfile;
