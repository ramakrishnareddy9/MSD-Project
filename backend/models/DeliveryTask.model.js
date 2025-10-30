import mongoose from 'mongoose';

/**
 * DeliveryTask Model - Tracks last-mile delivery
 * Handles hub-to-customer logistics by small-scale delivery partners
 */

const deliveryTaskSchema = new mongoose.Schema({
  taskNumber: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return 'TASK' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    }
  },
  type: {
    type: String,
    enum: ['last_mile', 'express', 'scheduled', 'same_day'],
    required: true,
    default: 'last_mile'
  },
  deliveryPartnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  shipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment',
    // Optional - links to parent shipment if part of long-haul delivery
  },
  pickupLocation: {
    type: {
      type: String,
      enum: ['hub', 'warehouse', 'dark_store', 'restaurant', 'farm'],
      required: true
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location'
    },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String
    },
    pickupTime: Date
  },
  deliveryLocation: {
    address: {
      line1: { type: String, required: true },
      line2: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      coordinates: {
        type: [Number],
        index: '2dsphere'
      }
    },
    instructions: String,
    contactPerson: String,
    contactPhone: String
  },
  timeSlot: {
    date: Date,
    slot: {
      type: String,
      enum: ['early_morning', 'morning', 'afternoon', 'evening', 'night'],
      required: true
    },
    startTime: String,
    endTime: String
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: [
      'assigned',
      'accepted',
      'picked_up',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'failed',
      'cancelled',
      'rescheduled'
    ],
    default: 'assigned',
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
    route: [{
      coordinates: [Number],
      timestamp: Date
    }],
    distance: Number, // in kilometers
    duration: Number, // in minutes
    startedAt: Date,
    completedAt: Date
  },
  attempts: [{
    attemptNumber: Number,
    attemptedAt: Date,
    status: String,
    reason: String,
    notes: String
  }],
  proof: {
    deliveryPhoto: String,
    signature: String,
    receiverName: String,
    deliveredAt: Date,
    notes: String
  },
  payment: {
    method: {
      type: String,
      enum: ['prepaid', 'cod', 'online'],
      required: true
    },
    codAmount: Number,
    collected: Boolean,
    collectedAmount: Number,
    deliveryCharge: Number,
    tip: Number
  },
  rating: {
    customerRating: Number,
    partnerRating: Number,
    feedback: String
  },
  vehicle: {
    type: {
      type: String,
      enum: ['bike', 'scooter', 'van', 'truck', 'bicycle', 'on_foot']
    },
    number: String,
    temperatureControlled: Boolean
  }
}, {
  timestamps: true
});

// Indexes
deliveryTaskSchema.index({ deliveryPartnerId: 1, status: 1 });
deliveryTaskSchema.index({ orderId: 1 });
deliveryTaskSchema.index({ 'timeSlot.date': 1, 'timeSlot.slot': 1 });
deliveryTaskSchema.index({ createdAt: -1 });

// Methods
deliveryTaskSchema.methods.accept = async function() {
  this.status = 'accepted';
  return this.save();
};

deliveryTaskSchema.methods.startDelivery = async function() {
  this.status = 'out_for_delivery';
  this.tracking.startedAt = new Date();
  return this.save();
};

deliveryTaskSchema.methods.complete = async function(proof) {
  this.status = 'delivered';
  this.tracking.completedAt = new Date();
  this.proof = {
    ...proof,
    deliveredAt: new Date()
  };
  return this.save();
};

deliveryTaskSchema.methods.recordAttempt = async function(success, reason) {
  const attemptNumber = this.attempts.length + 1;
  this.attempts.push({
    attemptNumber,
    attemptedAt: new Date(),
    status: success ? 'successful' : 'failed',
    reason
  });
  
  if (!success && attemptNumber >= 3) {
    this.status = 'failed';
  }
  
  return this.save();
};

deliveryTaskSchema.methods.updateLocation = async function(coordinates) {
  this.tracking.currentLocation = {
    coordinates,
    lastUpdated: new Date()
  };
  this.tracking.route.push({
    coordinates,
    timestamp: new Date()
  });
  return this.save();
};

const DeliveryTask = mongoose.model('DeliveryTask', deliveryTaskSchema);
export default DeliveryTask;
