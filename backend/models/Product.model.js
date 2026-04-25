import mongoose from 'mongoose';
import { PRODUCT_STATUSES, PRODUCT_UNITS } from '../constants/productEnums.js';

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
  status: {
    type: String,
    enum: PRODUCT_STATUSES,
    default: 'active'
  },
  minOrderQuantity: {
    type: Number,
    default: 1
  },
  maxOrderQuantity: Number,
  stockQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
productSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ status: 1, averageRating: -1 });
productSchema.index({ tags: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Compatibility virtuals for older frontend payload expectations.
productSchema.virtual('price').get(function() {
  return this.basePrice;
});

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

const Product = mongoose.model('Product', productSchema);

export default Product;
