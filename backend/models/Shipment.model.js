import mongoose from 'mongoose';

/**
 * Shipment Model - Tracks long-haul transportation
 * Handles farm-to-hub logistics by large-scale delivery partners
 */

const shipmentSchema = new mongoose.Schema({
  shipmentNumber: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return 'SHIP' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    }
  },
  type: {
    type: String,
    enum: ['farm_to_hub', 'hub_to_hub', 'hub_to_warehouse'],
    required: true
  },
  deliveryPartnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  origin: {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true
    },
    address: {
      line1: String,
      city: String,
      state: String,
      postalCode: String
    },
    pickupTime: Date
  },
  destination: {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true
    },
    address: {
      line1: String,
      city: String,
      state: String,
      postalCode: String
    },
    estimatedDelivery: Date
  },
  orders: [{
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    items: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      quantity: Number,
      unit: String
    }]
  }],
  vehicleDetails: {
    type: String,
    vehicleNumber: String,
    driverName: String,
    driverPhone: String,
    capacity: Number,
    temperatureControlled: Boolean
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_transit', 'at_checkpoint', 'delivered', 'cancelled', 'delayed'],
    default: 'scheduled',
    index: true
  },
  tracking: {
    currentLocation: {
      coordinates: {
        type: [Number],
        index: '2dsphere'
      },
      lastUpdated: Date
    },
    checkpoints: [{
      location: String,
      arrivedAt: Date,
      departedAt: Date,
      notes: String
    }],
    estimatedArrival: Date,
    actualArrival: Date
  },
  conditions: {
    temperature: Number,
    humidity: Number,
    lastRecorded: Date
  },
  documents: [{
    type: String,
    url: String,
    uploadedAt: Date
  }],
  cost: {
    baseCharge: Number,
    fuelSurcharge: Number,
    tollCharges: Number,
    insuranceCharge: Number,
    total: Number,
    currency: {
      type: String,
      default: 'INR'
    }
  },
  issues: [{
    reportedAt: Date,
    type: String,
    description: String,
    resolved: Boolean,
    resolvedAt: Date
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
shipmentSchema.index({ deliveryPartnerId: 1, status: 1 });
shipmentSchema.index({ 'origin.locationId': 1, 'destination.locationId': 1 });
shipmentSchema.index({ createdAt: -1 });

// Methods
shipmentSchema.methods.updateTracking = async function(location, notes) {
  this.tracking.currentLocation = {
    coordinates: location,
    lastUpdated: new Date()
  };
  if (notes) {
    this.tracking.checkpoints.push({
      location: notes,
      arrivedAt: new Date()
    });
  }
  return this.save();
};

shipmentSchema.methods.markDelivered = async function() {
  this.status = 'delivered';
  this.tracking.actualArrival = new Date();
  return this.save();
};

const Shipment = mongoose.model('Shipment', shipmentSchema);
export default Shipment;
