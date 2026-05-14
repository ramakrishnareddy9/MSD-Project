import Invoice from '../models/Invoice.model.js';
import Order from '../models/Order.model.js';
import User from '../models/User.model.js';
import BusinessProfile from '../models/BusinessProfile.model.js';
import Product from '../models/Product.model.js';

/**
 * Generate GST invoice for an order
 * Creates invoice record with itemised GST breakdown by slab
 * Only for B2B orders above ₹200
 */
export const generateGSTInvoice = async (orderId, session = null) => {
  try {
    // Fetch order with full details
    const orderQuery = Order.findById(orderId)
      .populate('buyerId', 'name email phone addresses businessProfile')
      .populate('sellerId', 'name email phone addresses')
      .populate('orderItems.productId', 'name hsnCode');

    if (session) {
      orderQuery.session(session);
    }

    const order = await orderQuery;

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Only generate invoice for B2B orders above ₹200
    if (order.type !== 'b2b' || order.total < 200) {
      return null; // Invoice not applicable
    }

    // Fetch seller's business profile for GSTIN
    const sellerBusinessQuery = BusinessProfile.findOne({ userId: order.sellerId._id });
    if (session) {
      sellerBusinessQuery.session(session);
    }
    const sellerBusiness = await sellerBusinessQuery;

    // Fetch buyer's business profile for GSTIN
    const buyerBusinessQuery = BusinessProfile.findOne({ userId: order.buyerId._id });
    if (session) {
      buyerBusinessQuery.session(session);
    }
    const buyerBusiness = await buyerBusinessQuery;

    // Check if invoice already exists for this order
    const existingInvoiceQuery = Invoice.findOne({ orderId });
    if (session) {
      existingInvoiceQuery.session(session);
    }
    const existingInvoice = await existingInvoiceQuery;

    if (existingInvoice && existingInvoice.status !== 'draft') {
      throw new Error(`Invoice already exists for order ${order.orderNumber}`);
    }

    // Calculate GST breakdown by slab
    const gstBreakdown = calculateGSTBreakdown(order.orderItems);

    // Prepare invoice items with HSN codes
    const invoiceItems = order.orderItems.map((item) => ({
      productId: item.productId._id,
      productName: item.productName || item.productId.name,
      hsnCode: item.productId.hsnCode,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      itemTotal: item.totalPrice,
      gstRate: item.gstRate,
      gstAmount: item.taxAmount,
      totalWithGst: item.totalPrice + item.taxAmount
    }));

    // Calculate place of supply (state of the buyer for B2B)
    const placeOfSupply = order.deliveryAddress?.state || order.buyerId.addresses?.[0]?.state;

    // Determine payment terms and due date
    const paymentTerms = order.paymentTerms || 'prepaid';
    const dueDate = calculateDueDate(new Date(), paymentTerms);

    // Create or update invoice
    let invoice;
    if (existingInvoice && existingInvoice.status === 'draft') {
      // Update existing draft invoice
      invoice = existingInvoice;
      invoice.status = 'issued';
    } else {
      // Create new invoice
      invoice = new Invoice();
    }

    // Populate invoice data
    invoice.orderId = order._id;
    invoice.orderNumber = order.orderNumber;
    invoice.orderType = order.type;

    invoice.sellerId = order.sellerId._id;
    invoice.sellerName = order.sellerId.name;
    invoice.sellerGSTIN = sellerBusiness?.gstNumber;
    invoice.sellerAddress = order.sellerId.addresses?.[0] || {
      line1: 'Address not available',
      city: 'Unknown',
      state: 'Unknown',
      country: 'India'
    };

    invoice.buyerId = order.buyerId._id;
    invoice.buyerName = order.buyerId.name;
    invoice.buyerGSTIN = buyerBusiness?.gstNumber;
    invoice.buyerAddress = order.deliveryAddress || order.buyerId.addresses?.[0] || {
      line1: 'Address not available',
      city: 'Unknown',
      state: 'Unknown',
      country: 'India'
    };

    invoice.items = invoiceItems;
    invoice.subtotal = order.subtotal;
    invoice.deliveryFee = order.deliveryFee;
    invoice.gstBreakdown = gstBreakdown;
    invoice.totalGst = order.tax;
    invoice.totalAmount = order.total;

    invoice.status = 'issued';
    invoice.invoiceDate = new Date();
    invoice.dueDate = dueDate;
    invoice.paymentTerms = paymentTerms;
    invoice.placeOfSupply = placeOfSupply;

    // Check if reverse charge is applicable
    // Reverse charge is applicable when buyer is unregistered and seller is registered
    const buyerGSTIN = buyerBusiness?.gstNumber;
    const sellerGSTIN = sellerBusiness?.gstNumber;
    invoice.reverseChargeApplicable = sellerGSTIN && !buyerGSTIN;

    // Add default terms and conditions for GST invoices
    invoice.termsAndConditions = getGSTTermsAndConditions();

    // Save invoice
    const saveOptions = session ? { session } : {};
    await invoice.save(saveOptions);

    return invoice;
  } catch (error) {
    console.error('Error generating GST invoice:', error);
    throw error;
  }
};

/**
 * Calculate GST breakdown by slab (SGST, CGST for intra-state, IGST for inter-state)
 * Returns array of slab breakdowns with taxable amount and tax amounts
 */
export const calculateGSTBreakdown = (orderItems) => {
  const slabMap = new Map();

  // Group items by GST slab
  orderItems.forEach((item) => {
    const slab = Number(item.gstRate);
    if (!slabMap.has(slab)) {
      slabMap.set(slab, {
        taxableAmount: 0,
        taxAmount: 0
      });
    }

    const slabData = slabMap.get(slab);
    slabData.taxableAmount += item.totalPrice;
    slabData.taxAmount += item.taxAmount;
  });

  // Convert to breakdown array
  const breakdown = Array.from(slabMap.entries()).map(([slab, data]) => {
    // For intra-state: Split SGST/CGST equally (50-50)
    // For inter-state: Use full IGST rate
    // Default to intra-state (SGST + CGST)
    const sgstAmount = data.taxAmount / 2;
    const cgstAmount = data.taxAmount / 2;

    return {
      slab,
      taxableAmount: Number(data.taxableAmount.toFixed(2)),
      sgstAmount: Number(sgstAmount.toFixed(2)),
      cgstAmount: Number(cgstAmount.toFixed(2)),
      igstAmount: 0 // Can be set to full tax amount if inter-state
    };
  });

  return breakdown;
};

/**
 * Calculate due date based on payment terms
 */
export const calculateDueDate = (invoiceDate, paymentTerms) => {
  const dueDate = new Date(invoiceDate);

  switch (paymentTerms) {
    case 'prepaid':
      return dueDate; // Same day
    case 'net_7':
      dueDate.setDate(dueDate.getDate() + 7);
      break;
    case 'net_15':
      dueDate.setDate(dueDate.getDate() + 15);
      break;
    case 'net_30':
      dueDate.setDate(dueDate.getDate() + 30);
      break;
    case 'cod':
      return dueDate; // Same day
    default:
      dueDate.setDate(dueDate.getDate() + 15); // Default to net_15
  }

  return dueDate;
};

/**
 * Get default GST terms and conditions for invoices
 */
export const getGSTTermsAndConditions = () => {
  return `Terms and Conditions:

1. PAYMENT TERMS:
   - Payment should be made as per the agreed payment terms mentioned above.
   - All payments must be made to the designated bank account of the seller.

2. GST COMPLIANCE:
   - This is a tax invoice as per GST laws.
   - GST Registration Number (GSTIN) of the seller: [SELLER_GSTIN]
   - GSTIN of the buyer: [BUYER_GSTIN]

3. DELIVERY:
   - Goods are supplied as per the specifications mentioned in the order.
   - Risk and title passes to the buyer upon receipt of goods.

4. DISPUTES:
   - Any disputes related to this invoice must be raised within 30 days of invoice date.
   - All disputes will be resolved as per the terms of the purchase agreement.

5. VALIDITY:
   - This invoice is valid for reference purposes only and does not constitute a binding agreement.

6. RETURNS AND REPLACEMENTS:
   - Returns/exchanges are subject to the terms of the purchase agreement.
   - Quality issues must be reported within 7 days of receipt.`;
};

/**
 * Get invoice by order ID
 */
export const getInvoiceByOrderId = async (orderId, session = null) => {
  const query = Invoice.findOne({ orderId }).populate('orderItems.productId');

  if (session) {
    query.session(session);
  }

  return await query;
};

/**
 * Fetch invoice by ID with all details
 */
export const getInvoiceById = async (invoiceId, session = null) => {
  const query = Invoice.findById(invoiceId)
    .populate('sellerId', 'name email phone')
    .populate('buyerId', 'name email phone')
    .populate('orderItems.productId', 'name hsnCode');

  if (session) {
    query.session(session);
  }

  return await query;
};

export default {
  generateGSTInvoice,
  calculateGSTBreakdown,
  calculateDueDate,
  getGSTTermsAndConditions,
  getInvoiceByOrderId,
  getInvoiceById
};
