import mongoose from 'mongoose';

/**
 * Lightweight POSIX cron "next date" calculator (no external dependencies).
 * Supports 5-field expressions: "min hour dom month dow"
 * Wildcards (*) and single numeric values are supported.
 * Does NOT support ranges, step values, or lists — use cron-parser for advanced cases.
 *
 * @param {string} cronExpr  - e.g. "0 6 * * 1" (every Monday at 06:00)
 * @param {Date}   from      - start searching from this point (default: now)
 * @returns {Date}           - next occurrence after `from`
 */
function getNextCronDate(cronExpr, from = new Date()) {
  const parts = String(cronExpr).trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Expected 5-field cron expression, got ${parts.length} fields: "${cronExpr}"`);
  }

  const [minF, hourF, domF, monthF, dowF] = parts;

  const matches = (field, value) => field === '*' || parseInt(field, 10) === value;

  // Advance one minute beyond `from` so we don't re-trigger the current minute
  const cursor = new Date(from.getTime() + 60 * 1000);
  cursor.setSeconds(0, 0);

  // Search up to 1 year ahead to avoid infinite loops on invalid expressions
  const limit = new Date(from.getTime() + 366 * 24 * 60 * 60 * 1000);

  while (cursor < limit) {
    const month = cursor.getMonth() + 1; // 1-12
    const dom   = cursor.getDate();       // 1-31
    const dow   = cursor.getDay();        // 0-6 (Sun-Sat)
    const hour  = cursor.getHours();
    const min   = cursor.getMinutes();

    if (!matches(monthF, month)) {
      // Skip to next month
      cursor.setMonth(cursor.getMonth() + 1, 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }
    if (!matches(domF, dom) || !matches(dowF, dow)) {
      // Skip to next day
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }
    if (!matches(hourF, hour)) {
      // Skip to next hour
      cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
      continue;
    }
    if (!matches(minF, min)) {
      // Skip to next minute
      cursor.setMinutes(cursor.getMinutes() + 1, 0, 0);
      continue;
    }

    return new Date(cursor);
  }

  throw new Error(`No next occurrence found for cron expression "${cronExpr}" within 1 year`);
}

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
  isProcessing: {
    type: Boolean,
    default: false,
    // Issue 11 - Prevent double-processing from multiple workers
    // Set to true when scheduler starts processing, false when complete/failed
  },
  processingStartedAt: {
    type: Date,
    // When processing started (for timeout detection)
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
recurringOrderSchema.index({ status: 1, 'schedule.nextRunAt': 1 });
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

    case 'monthly': {
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth;
    }

    case 'custom': {
      // Parse the cron expression to calculate the next run time.
      // Supports 5-field POSIX cron: "min hour dom month dow"
      // e.g. "0 6 * * 1"  = Every Monday at 06:00
      //      "0 8 1 * *"  = 1st of every month at 08:00
      if (!customCron) {
        console.warn('[RecurringOrder] custom frequency but no customCron expression — defaulting to weekly');
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      try {
        return getNextCronDate(customCron, now);
      } catch (err) {
        console.error(`[RecurringOrder] Failed to parse customCron "${customCron}": ${err.message} — defaulting to weekly`);
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    }

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
