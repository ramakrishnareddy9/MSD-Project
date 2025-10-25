import mongoose from 'mongoose';

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
    enum: ['kg', 'liter', 'piece', 'dozen', 'quintal', 'gram', 'ml'],
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
    enum: ['active', 'out_of_stock', 'discontinued'],
    default: 'active'
  },
  minOrderQuantity: {
    type: Number,
    default: 1
  },
  maxOrderQuantity: Number,
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
  timestamps: true
});

// Indexes
productSchema.index({ ownerId: 1, status: 1 });
productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ status: 1, averageRating: -1 });
productSchema.index({ tags: 1 });
productSchema.index({ name: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema);

export default Product;
