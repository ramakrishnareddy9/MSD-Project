import mongoose from 'mongoose';
import { softDeletePlugin } from '../utils/softDelete.plugin.js';

const invoiceItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: String,
  hsnCode: String, // HSN code for tax classification
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
  itemTotal: {
    type: Number,
    required: true
  },
  gstRate: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  gstAmount: {
    type: Number,
    required: true
  },
  totalWithGst: {
    type: Number,
    required: true
  }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  // Invoice identification
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },

  // Order reference
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  orderType: {
    type: String,
    enum: ['b2c', 'b2b'],
    required: true
  },

  // Seller information (invoice issuer)
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerName: String,
  sellerGSTIN: {
    type: String,
    description: 'GSTIN of the seller (invoice issuer)'
  },
  sellerAddress: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },

  // Buyer information (invoice recipient)
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyerName: String,
  buyerGSTIN: {
    type: String,
    description: 'GSTIN of the buyer (for B2B transactions)'
  },
  buyerAddress: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },

  // Invoice items
  items: [invoiceItemSchema],

  // Financial summary
  subtotal: {
    type: Number,
    required: true
  },
  deliveryFee: {
    type: Number,
    default: 0
  },
  
  // GST breakdown by slab (for itemised reporting)
  gstBreakdown: [
    {
      slab: {
        type: Number, // e.g., 0.05 for 5%, 0.12 for 12%, etc.
        required: true
      },
      taxableAmount: {
        type: Number,
        required: true
      },
      sgstAmount: {
        type: Number,
        required: true
      },
      cgstAmount: {
        type: Number,
        required: true
      },
      igstAmount: {
        type: Number,
        default: 0,
        description: 'Applicable only for interstate transactions'
      }
    }
  ],

  totalGst: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },

  // Status and tracking
  status: {
    type: String,
    enum: ['draft', 'issued', 'sent', 'paid', 'cancelled'],
    default: 'issued'
  },
  
  // PDF generation
  pdfPath: String,
  pdfUrl: String,
  pdfGeneratedAt: Date,

  // Notes
  notes: String,
  termsAndConditions: String,

  // Compliance
  paymentTerms: {
    type: String,
    enum: ['prepaid', 'net_7', 'net_15', 'net_30', 'cod'],
    default: 'prepaid'
  },
  placeOfSupply: String, // State of supply for GST purposes
  reverseChargeApplicable: {
    type: Boolean,
    default: false
  },

  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Soft-delete support
invoiceSchema.plugin(softDeletePlugin);

// Indexes
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ orderId: 1 }, { unique: true });
invoiceSchema.index({ sellerId: 1, invoiceDate: -1 });
invoiceSchema.index({ buyerId: 1, invoiceDate: -1 });
invoiceSchema.index({ invoiceDate: -1 });
invoiceSchema.index({ status: 1, invoiceDate: -1 });
invoiceSchema.index({ orderType: 1, status: 1 });
invoiceSchema.index({ sellerGSTIN: 1, invoiceDate: -1 }); // For GST compliance reports
invoiceSchema.index({ buyerGSTIN: 1, invoiceDate: -1 });

// Pre-save hook to calculate invoice number if not provided
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    // Generate invoice number: INV-YYYYMM-XXXXX
    const now = new Date();
    const yearMonth = now.getFullYear().toString().slice(2) + String(now.getMonth() + 1).padStart(2, '0');
    
    // Count invoices for this year-month
    const count = await Invoice.countDocuments({
      invoiceDate: {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
      }
    });
    
    this.invoiceNumber = `INV-${yearMonth}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
