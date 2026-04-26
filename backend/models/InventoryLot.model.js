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
    { $set: { stockQuantity: availableQuantity } }
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
  return this.save(options?.session ? { session: options.session } : undefined);
};

inventoryLotSchema.methods.cancelReservation = async function(orderId, options = {}) {
  const reservation = this.reservations.find(
    r => r.orderId.toString() === orderId.toString() && r.status === 'active'
  );
  
  if (reservation) {
    reservation.status = 'cancelled';
    this.reservedQuantity -= reservation.quantity;
    return this.save(options?.session ? { session: options.session } : undefined);
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
    return this.save(options?.session ? { session: options.session } : undefined);
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

inventoryLotSchema.post('save', async function() {
  const session = this.$session ? this.$session() : null;
  await this.constructor.syncProductStockQuantity(this.productId, session);
});

inventoryLotSchema.post('findOneAndUpdate', async function(doc) {
  if (!doc) return;
  const session = this.getOptions ? this.getOptions().session : null;
  await doc.constructor.syncProductStockQuantity(doc.productId, session);
});

inventoryLotSchema.post('findOneAndDelete', async function(doc) {
  if (!doc) return;
  const session = this.getOptions ? this.getOptions().session : null;
  await doc.constructor.syncProductStockQuantity(doc.productId, session);
});

inventoryLotSchema.post('insertMany', async function(docs) {
  if (!Array.isArray(docs) || docs.length === 0) return;
  const uniqueProductIds = [...new Set(docs.map((doc) => String(doc.productId)))];

  for (const productId of uniqueProductIds) {
    await this.syncProductStockQuantity(productId);
  }
});

const InventoryLot = mongoose.model('InventoryLot', inventoryLotSchema);

export default InventoryLot;
