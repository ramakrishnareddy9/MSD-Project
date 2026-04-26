import mongoose from 'mongoose';
import crypto from 'crypto';

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: String, // snapshot
  productImage: String, // snapshot of primary image
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }, // for payout tracking
  farmerName: String, // snapshot
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }, // for analytics
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit: String,
  unitPrice: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  discountApplied: {
    type: Number,
    default: 0
  },
  lotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryLot'
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['b2c', 'b2b'],
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  orderItems: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  deliveryFee: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  deliveryAddress: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    coordinates: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number]
    }
  },
  scheduledWindowStart: Date,
  scheduledWindowEnd: Date,
  actualDeliveryDate: Date,
  paymentTerms: {
    type: String,
    enum: ['prepaid', 'net_7', 'net_15', 'net_30', 'cod'],
    default: 'prepaid'
  },
  // Price Agreement Reference (for B2B orders)
  priceAgreementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PriceAgreement'
  },
  marketplaceRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketplaceRequest'
  },
  // Delivery Tracking
  delivery: {
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment'
    },
    deliveryTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryTask'
    },
    requestedVehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle'
    },
    requestedPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: Date,
    requestStatus: {
      type: String,
      enum: ['none', 'requested', 'accepted', 'rejected'],
      default: 'none'
    },
    trackingNumber: String,
    estimatedDelivery: Date,
    actualDelivery: Date
  },
  // Platform Commission Tracking
  commission: {
    rate: {
      type: Number,
      default: 0.10 // 10% default platform commission
    },
    amount: Number,
    status: {
      type: String,
      enum: ['pending', 'collected', 'paid_out'],
      default: 'pending'
    },
    paidOutAt: Date
  },
  notes: String,
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ buyerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ type: 1, status: 1 });
orderSchema.index({ scheduledWindowStart: 1 });

// Generate order number before validation so required constraint passes.
orderSchema.pre('validate', function(next) {
  if (!this.orderNumber) {
    this.orderNumber = 'ORD' + crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
