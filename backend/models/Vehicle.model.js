import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Truck', 'Van', 'Car', 'Bike', 'Bicycle', 'Other'],
    default: 'Truck'
  },
  capacity: {
    type: Number,
    default: 0,
    min: 0,
    set: (value) => {
      if (value === null || value === undefined || value === '') return 0;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
  },
  plateNumber: {
    type: String
  },
  status: {
    type: String,
    enum: ['Available', 'In Transit', 'On Delivery', 'Maintenance', 'Inactive'],
    default: 'Available'
  },
  currentLocation: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Who is currently driving/assigned
  }
}, {
  timestamps: true
});

export default mongoose.model('Vehicle', vehicleSchema);
