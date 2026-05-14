import mongoose from 'mongoose';

const Product = mongoose.models.Product;

const inventoryLotSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  reservedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  reservations: [{
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    quantity: Number,
    reservedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: function() {
        // Reservation expires after 30 minutes
        return new Date(Date.now() + 30 * 60 * 1000);
      }
    },
    status: {
      type: String,
      enum: ['active', 'confirmed', 'expired', 'cancelled'],
      default: 'active'
    }
  }],
  harvestDate: Date,
  expiryDate: Date,
  batchNumber: String,
  qualityGrade: {
    type: String,
    enum: ['A', 'B', 'C'],
    default: 'A'
  },
  storageCondition: String,
}, {
  timestamps: true
});

// Indexes
inventoryLotSchema.index({ productId: 1, locationId: 1, expiryDate: 1 });
inventoryLotSchema.index({ expiryDate: 1 });
inventoryLotSchema.index({ locationId: 1, quantity: 1 });
// Issue 7 - Add TTL index for automatic reservation cleanup after 30 minutes
inventoryLotSchema.index(
  { 'reservations.expiresAt': 1 },
  { expireAfterSeconds: 0 }
);
// Issue 17 - Add index on user field for Cart
// Issue 18 - Add index on user field for Wishlist

// Virtual for available quantity
inventoryLotSchema.virtual('availableQuantity').get(function() {
  return this.quantity - this.reservedQuantity;
});

// Methods
inventoryLotSchema.statics.getAvailableQuantityForProduct = async function(productId, session = null) {
  const productObjectId = typeof productId === 'string'
    ? new mongoose.Types.ObjectId(productId)
    : productId;

  const pipeline = [
    { $match: { productId: productObjectId } },
    {
      $project: {
        available: {
          $max: [
            { $subtract: ['$quantity', '$reservedQuantity'] },
            0
          ]
        }
      }
    },
    {
      $group: {
        _id: '$productId',
        totalAvailable: { $sum: '$available' }
      }
    }
  ];

  const aggregation = this.aggregate(pipeline);
  if (session) {
    aggregation.session(session);
  }

  const [result] = await aggregation;
  return Number(result?.totalAvailable || 0);
};

inventoryLotSchema.statics.syncProductStockQuantity = async function(productId, session = null) {
  if (!productId) return;

  const ProductModel = Product || mongoose.model('Product');
  const availableQuantity = await this.getAvailableQuantityForProduct(productId, session);
    const updateQuery = ProductModel.updateOne(
      { _id: productId },
      { $set: { _cachedStockQuantity: availableQuantity } }
  );

  if (session) {
    updateQuery.session(session);
  }

  await updateQuery;
};

inventoryLotSchema.statics.reserveAvailableLot = async function({ productId, orderId, quantity, session = null }) {
  return this.findOneAndUpdate(
    {
      productId,
      $expr: { $gte: [{ $subtract: ['$quantity', '$reservedQuantity'] }, quantity] }
    },
    {
      $inc: { reservedQuantity: quantity },
      $push: {
        reservations: {
          orderId,
          quantity,
          reservedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'active'
        }
      }
    },
    {
      new: true,
      session,
      sort: { createdAt: 1 },
      runValidators: true
    }
  );
};

inventoryLotSchema.methods.reserve = async function(orderId, quantity, options = {}) {
  return this.constructor.reserveAvailableLot({
    productId: this.productId,
    orderId,
    quantity,
    session: options?.session || null
  });
};

inventoryLotSchema.methods.confirmReservation = async function(orderId, options = {}) {
  const reservation = this.reservations.find(
    r => r.orderId.toString() === orderId.toString() && r.status === 'active'
  );
  
  if (!reservation) {
    throw new Error('Reservation not found or already processed');
  }
  
  reservation.status = 'confirmed';
  const session = options?.session || undefined;
  await this.save(session ? { session } : undefined);
  // Explicitly sync the product cache now that the hook has been removed
  await this.constructor.syncProductStockQuantity(this.productId, session || null);
};

inventoryLotSchema.methods.cancelReservation = async function(orderId, options = {}) {
  const reservation = this.reservations.find(
    r => r.orderId.toString() === orderId.toString() && r.status === 'active'
  );
  
  if (reservation) {
    reservation.status = 'cancelled';
    this.reservedQuantity -= reservation.quantity;
    const session = options?.session || undefined;
    await this.save(session ? { session } : undefined);
    // Explicitly sync the product cache now that the hook has been removed
    await this.constructor.syncProductStockQuantity(this.productId, session || null);
  }
};

inventoryLotSchema.methods.cleanupExpiredReservations = async function(options = {}) {
  const now = new Date();
  let freedQuantity = 0;
  
  this.reservations.forEach(reservation => {
    if (reservation.status === 'active' && reservation.expiresAt < now) {
      reservation.status = 'expired';
      freedQuantity += reservation.quantity;
    }
  });
  
  if (freedQuantity > 0) {
    this.reservedQuantity -= freedQuantity;
    const session = options?.session || undefined;
    await this.save(session ? { session } : undefined);
    // Explicitly sync the product cache now that the hook has been removed
    await this.constructor.syncProductStockQuantity(this.productId, session || null);
  }
};

// Static method to cleanup all expired reservations
inventoryLotSchema.statics.cleanupAllExpiredReservations = async function() {
  const lots = await this.find({
    'reservations.status': 'active',
    'reservations.expiresAt': { $lt: new Date() }
  });
  
  const promises = lots.map(lot => lot.cleanupExpiredReservations());
  return Promise.all(promises);
};

// NOTE: stockQuantity sync is performed EXPLICITLY by InventoryManager._syncProductCache()
// after each successful operation. Automatic post-hooks are NOT used because
// this.$session() does not reliably propagate the active transaction session in
// all Mongoose versions — which would cause the cache write to escape the
// transaction boundary and create a permanent desync if the transaction aborts.

const InventoryLot = mongoose.model('InventoryLot', inventoryLotSchema);

export default InventoryLot;
