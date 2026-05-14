import mongoose from 'mongoose';
import { PRODUCT_STATUSES, PRODUCT_UNITS } from '../constants/productEnums.js';
import { softDeletePlugin } from '../utils/softDelete.plugin.js';

const productSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  unit: {
    type: String,
    enum: PRODUCT_UNITS,
    required: true
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  hsnCode: {
    type: String,
    description: 'Harmonised System of Nomenclature code (8-digit) for GST taxation'
  },
  images: [String],
  isPerishable: {
    type: Boolean,
    default: false
  },
  shelfLife: Number, // in days
  storageRequirements: {
    type: String,
    enum: ['ambient', 'refrigerated', 'frozen']
  },
  tags: [String],
  availableMonths: [{
    type: Number,
    min: 1,
    max: 12
  }],
  harvestWindow: {
    startMonth: {
      type: Number,
      min: 1,
      max: 12
    },
    endMonth: {
      type: Number,
      min: 1,
      max: 12
    }
  },
  status: {
    type: String,
    enum: PRODUCT_STATUSES,
    default: 'active'
  },
  _cachedStockQuantity: {
    type: Number,
    default: 0,
    min: 0,
    select: false // Don't expose raw cache in queries; use virtual instead
  },
  minOrderQuantity: {
    type: Number,
    default: 1
  },
  maxOrderQuantity: Number,
  landSize: String,
  season: String,
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  totalSold: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  ownerRole: {
    type: String,
    enum: ['farmer', 'business', 'restaurant', 'travel_agency', 'customer'],
    default: 'farmer',
    index: true
  },
  // REMOVED: stockQuantity is now a virtual field computed from InventoryLot
  // This ensures InventoryLot is the single source of truth for available stock
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Soft-delete support
productSchema.plugin(softDeletePlugin);

/**
 * CRITICAL: stockQuantity must ONLY be synced from InventoryLot (via InventoryLot.syncProductStockQuantity).
 * Do NOT allow direct writes to prevent data divergence.
 * This hook prevents accidental/malicious direct updates to stockQuantity.
 */
productSchema.pre('save', function(next) {
  // If this document has been modified to include stockQuantity, reject it
  // (stockQuantity should only be synced by InventoryLot operations, never directly)
  if (this.isModified('stockQuantity') && !this.isNew) {
    const err = new Error(
      'stockQuantity must not be modified directly. Use InventoryLot operations instead. ' +
      'stockQuantity is computed from InventoryLot aggregation.'
    );
    err.code = 'DATA_INTEGRITY_VIOLATION';
    return next(err);
  }
  next();
});

// Indexes
productSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
productSchema.index({ ownerRole: 1, status: 1, createdAt: -1 }); // Fast catalog queries without User join
productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ categoryId: 1, status: 1, basePrice: 1 });
productSchema.index({ status: 1, averageRating: -1 });
productSchema.index({ tags: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Compatibility virtuals for older frontend payload expectations.
productSchema.virtual('price').get(function() {
  return this.basePrice;
});

/**
 * stockQuantity - Virtual field computed from InventoryLot aggregation.
 * InventoryLot is the authoritative source; Product.stockQuantity is a cached mirror.
 * Use staticMethod populateStockQuantity() to hydrate this virtual.
 */
productSchema.virtual('stockQuantity').get(function() {
  // Return _cachedStockQuantity (synced from InventoryLot)
  return this._cachedStockQuantity || 0;
});

// Set the cache when loading from DB (not exposed in schema)
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

// Alias for backward compatibility
productSchema.virtual('stock').get(function() {
  return this.stockQuantity;
});

productSchema.virtual('category').get(function() {
  return this.categoryId;
});

productSchema.virtual('seller').get(function() {
  return this.ownerId;
});

productSchema.virtual('avgRating').get(function() {
  return this.averageRating;
});

/**
 * Static method to populate stockQuantity virtual from InventoryLot aggregation.
 * Call this after querying products to hydrate the stockQuantity virtual.
 * 
 * @param {Array<Product>} products - Product documents to populate
 * @returns {Promise<Array>} Products with _stockQuantityCache populated
 */
productSchema.statics.populateStockQuantity = async function(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return products;
  }

  const productIds = products.map(p => p._id);
  const InventoryLot = mongoose.model('InventoryLot');

  // Aggregate available quantity for each product from InventoryLot
  const stockMap = await InventoryLot.aggregate([
    {
      $match: {
        productId: { $in: productIds },
        deletedAt: { $exists: false } // Respect soft deletes if InventoryLot uses soft-delete plugin
      }
    },
    {
      $project: {
        productId: 1,
        available: {
          $max: [{ $subtract: ['$quantity', '$reservedQuantity'] }, 0]
        }
      }
    },
    {
      $group: {
        _id: '$productId',
        totalAvailable: { $sum: '$available' }
      }
    }
  ]);

  // Build lookup map
  const stockLookup = {};
  stockMap.forEach(item => {
    stockLookup[item._id.toString()] = item.totalAvailable;
  });

  // Populate cache on each product
  products.forEach(product => {
    product._cachedStockQuantity = stockLookup[product._id.toString()] || 0;
  });

  return products;
};

/**
 * Convenience method for single product.
 * @param {Product} product - Single product document
 * @returns {Promise<Product>} Product with stockQuantity hydrated
 */
productSchema.statics.populateStockQuantitySingle = async function(product) {
  if (!product) return product;
  const [populated] = await this.populateStockQuantity([product]);
  return populated;
};

const Product = mongoose.model('Product', productSchema);

export default Product;
