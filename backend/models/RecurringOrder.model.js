import mongoose from 'mongoose';

/**
 * Recurring Order Model
 * Defines scheduled purchase patterns that generate concrete Orders on schedule
 * Per BACKEND_API_PROMPT.md lines 212-242 and SYSTEM_OVERVIEW_PROMPT.md lines 354-359
 */

const itemTemplateSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: String,
    enum: ['kg', 'g', 'liter', 'ml', 'piece', 'dozen', 'bag', 'box'],
    required: true
  },
  maxPrice: {
    type: Number,
    min: 0,
    // Optional price cap - order won't be created if price exceeds this
  }
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  frequency: {
    type: String,
    enum: ['weekly', 'biweekly', 'monthly', 'custom'],
    required: true,
    default: 'weekly'
  },
  customCron: {
    type: String,
    // For advanced schedules using cron expressions
    // Example: '0 6 * * 1' = Every Monday at 6 AM
  },
  nextRunAt: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    // Optional end date for the recurring schedule
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  }
}, { _id: false });

const lastRunSchema = new mongoose.Schema({
  ranAt: {
    type: Date,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  success: {
    type: Boolean,
    required: true
  },
  error: {
    type: String
  }
}, { _id: false });

const recurringOrderSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['b2c', 'b2b'],
    required: true,
    default: 'b2c'
  },
  itemsTemplate: {
    type: [itemTemplateSchema],
    required: true,
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Items template must contain at least one item'
    }
  },
  // Snapshot of delivery address to avoid dependency on User.addresses subdoc IDs
  deliveryAddress: {
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'India' },
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] }
    }
  },
  deliveryPreferences: {
    preferredTimeSlot: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'early_morning'],
      default: 'morning'
    },
    notes: String
  },
  pricingPreferences: {
    applyCoupons: {
      type: Boolean,
      default: false
    },
    useLoyalty: {
      type: Boolean,
      default: false
    }
  },
  schedule: {
    type: scheduleSchema,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled'],
    default: 'active',
    index: true
  },
  lastRun: lastRunSchema,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
recurringOrderSchema.index({ buyerId: 1, status: 1 });
recurringOrderSchema.index({ 'schedule.nextRunAt': 1, status: 1 }); // For scheduler
recurringOrderSchema.index({ type: 1, status: 1 });

/**
 * Calculate next run date based on frequency
 */
recurringOrderSchema.methods.calculateNextRunDate = function() {
  const { frequency, customCron } = this.schedule;
  const now = new Date();

  switch (frequency) {
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    case 'biweekly':
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    case 'monthly':
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth;
    
    case 'custom':
      // For custom cron expressions, would need a cron parser
      // This is a placeholder - implement with a library like 'cron-parser'
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    default:
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
};

/**
 * Check if schedule is due to run
 */
recurringOrderSchema.methods.isDue = function() {
  if (this.status !== 'active') return false;
  if (this.schedule.endDate && new Date() > this.schedule.endDate) return false;
  return new Date() >= this.schedule.nextRunAt;
};

/**
 * Record successful run
 */
recurringOrderSchema.methods.recordSuccess = async function(orderId) {
  this.lastRun = {
    ranAt: new Date(),
    orderId: orderId,
    success: true
  };
  this.schedule.nextRunAt = this.calculateNextRunDate();
  
  // Auto-cancel if past end date
  if (this.schedule.endDate && this.schedule.nextRunAt > this.schedule.endDate) {
    this.status = 'cancelled';
  }
  
  return this.save();
};

/**
 * Record failed run
 */
recurringOrderSchema.methods.recordFailure = async function(error) {
  this.lastRun = {
    ranAt: new Date(),
    success: false,
    error: error.message || String(error)
  };
  
  // Don't advance nextRunAt on failure - retry on next scheduler run
  return this.save();
};

/**
 * Pause schedule
 */
recurringOrderSchema.methods.pause = async function(userId) {
  this.status = 'paused';
  this.updatedBy = userId;
  return this.save();
};

/**
 * Resume schedule
 */
recurringOrderSchema.methods.resume = async function(userId) {
  this.status = 'active';
  this.updatedBy = userId;
  
  // If nextRunAt is in the past, set to next occurrence
  if (this.schedule.nextRunAt < new Date()) {
    this.schedule.nextRunAt = this.calculateNextRunDate();
  }
  
  return this.save();
};

/**
 * Cancel schedule
 */
recurringOrderSchema.methods.cancel = async function(userId) {
  this.status = 'cancelled';
  this.updatedBy = userId;
  return this.save();
};

// No virtuals needed for delivery address snapshot

const RecurringOrder = mongoose.model('RecurringOrder', recurringOrderSchema);

export default RecurringOrder;
