/**
 * Price Calculation Security Utility
 * Prevents frontend price manipulation
 * 
 * Issue: Cart Price Manipulation (CRITICAL)
 * 
 * NEVER TRUST from frontend:
 * ❌ price
 * ❌ subtotal
 * ❌ discount
 * ❌ deliveryFee
 * ❌ tax
 * ❌ total
 * 
 * ALWAYS recalculate server-side from database values
 */

import Product from '../models/Product.model.js';
import PriceAgreement from '../models/PriceAgreement.model.js';
import CommunityPool from '../models/CommunityPool.model.js';
import Community from '../models/Community.model.js';

/**
 * Validate that NO pricing data is included in request
 * Rejects any attempt to send prices from frontend
 * 
 * Issue: Prevents price manipulation by rejecting malicious payloads
 */
export function validateNoPricingData(req, res, next) {
  const forbiddenFields = [
    'price',
    'unitPrice',
    'basePrice',
    'discountPrice',
    'subtotal',
    'discount',
    'discountAmount',
    'deliveryFee',
    'tax',
    'total',
    'total_amount',
    'amount',
    'cost',
    'finalPrice',
    'salePrice',
    'sellingPrice',
    'itemTotal',
    'orderTotal',
    'commission',
    'commissionAmount',
    'commissionRate'
  ];

  // Check request body
  for (const field of forbiddenFields) {
    if (req.body && req.body[field] !== undefined) {
      return res.status(400).json({
        success: false,
        message: `Client cannot specify '${field}'. All prices calculated server-side only.`,
        field,
        severity: 'CRITICAL',
        reason: 'Price manipulation attempt detected'
      });
    }

    // Check in orderItems array
    if (req.body?.orderItems && Array.isArray(req.body.orderItems)) {
      for (const item of req.body.orderItems) {
        if (item[field] !== undefined) {
          return res.status(400).json({
            success: false,
            message: `Client cannot specify '${field}' in orderItems. All prices calculated server-side only.`,
            field,
            itemIndex: req.body.orderItems.indexOf(item),
            severity: 'CRITICAL',
            reason: 'Price manipulation attempt detected'
          });
        }
      }
    }
  }

  next();
}

/**
 * Calculate unit price based on context
 * - B2C: Use basePrice
 * - B2B with agreement: Use tiered pricing from agreement
 * - Marketplace negotiation: Use agreed price
 */
export async function calculateUnitPrice({
  product,
  orderType,
  buyerId,
  sellerId,
  quantity,
  marketplaceRequest,
  session = null
}) {
  if (!product) {
    throw new Error('Product not found');
  }

  // Start with base price
  let unitPrice = product.basePrice;
  let priceSource = 'basePrice';

  // 1. Marketplace negotiation overrides everything
  if (marketplaceRequest) {
    if (!marketplaceRequest.agreedPrice || marketplaceRequest.agreedPrice <= 0) {
      throw new Error('Invalid agreed price in marketplace request');
    }
    unitPrice = Number(marketplaceRequest.agreedPrice);
    priceSource = 'marketplaceAgreedPrice';
    return { unitPrice, priceSource };
  }

  // 2. B2B price agreement (tiered)
  if (orderType === 'b2b') {
    const agreementQuery = PriceAgreement.findOne({
      buyerId,
      sellerId: sellerId || product.ownerId,
      productId: product._id,
      status: 'active',
      validFrom: { $lte: new Date() },
      validUntil: { $gt: new Date() }
    });

    if (session) {
      agreementQuery.session(session);
    }

    const agreement = await agreementQuery;

    if (agreement) {
      // Find applicable tier
      const tier = agreement.tiers.find(
        t => quantity >= t.minQuantity && 
             (!t.maxQuantity || quantity <= t.maxQuantity)
      );

      if (tier && tier.price > 0) {
        unitPrice = tier.price;
        priceSource = 'priceAgreementTiered';
      }
    }
  }

  // Validate price is reasonable
  if (unitPrice <= 0) {
    throw new Error(`Invalid unit price: ₹${unitPrice}`);
  }

  return { unitPrice, priceSource };
}

/**
 * Calculate total price including discounts, fees, and taxes
 * ALL calculations server-side, NEVER trust frontend
 */
export async function calculateOrderTotals({
  orderItems,         // [{productId, quantity}, ...]
  orderType,          // 'b2c' or 'b2b'
  buyerId,
  sellerId,
  communityPoolId,
  marketplaceRequest,
  session = null,
  priceMap = null     // Cache of {productId: {product, unitPrice, priceSource}}
}) {
  if (!orderItems || orderItems.length === 0) {
    throw new Error('No order items provided');
  }

  const calculatedItems = [];
  let subtotal = 0;
  let communityDiscount = 0;
  let communityDiscountAmount = 0;

  // Load community discount if applicable
  if (communityPoolId) {
    const poolQuery = CommunityPool.findById(communityPoolId).populate('community');
    if (session) {
      poolQuery.session(session);
    }
    const pool = await poolQuery;

    if (pool?.community?.discount) {
      communityDiscount = pool.community.discount / 100; // Convert 10 to 0.10
    }
  }

  // Calculate each item
  for (const item of orderItems) {
    // Get product with fresh DB read
    let product = null;
    let unitPrice = null;
    let priceSource = null;

    // Use cache if available, otherwise fetch
    if (priceMap?.[item.productId]) {
      product = priceMap[item.productId].product;
      unitPrice = priceMap[item.productId].unitPrice;
      priceSource = priceMap[item.productId].priceSource;
    } else {
      const productQuery = Product.findById(item.productId).select('basePrice ownerId status name');
      if (session) {
        productQuery.session(session);
      }
      product = await productQuery;

      if (!product || product.status !== 'active') {
        throw new Error(`Product ${item.productId} unavailable`);
      }

      // Calculate unit price server-side
      const priceCalc = await calculateUnitPrice({
        product,
        orderType,
        buyerId,
        sellerId: sellerId || product.ownerId,
        quantity: item.quantity,
        marketplaceRequest,
        session
      });

      unitPrice = priceCalc.unitPrice;
      priceSource = priceCalc.priceSource;
    }

    // Apply community discount if applicable
    const discountedUnitPrice = communityDiscount > 0 
      ? unitPrice * (1 - communityDiscount)
      : unitPrice;

    const itemSubtotal = discountedUnitPrice * item.quantity;
    const itemDiscountAmount = (unitPrice - discountedUnitPrice) * item.quantity;

    calculatedItems.push({
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: unitPrice,           // BEFORE discount
      discountedUnitPrice,            // AFTER discount
      itemSubtotal,                   // quantity * discountedUnitPrice
      itemDiscountAmount,             // discount applied
      communityDiscountPercent: communityDiscount * 100,
      priceSource,                    // For audit trail
      priceSource_Detailed: {
        basePrice: product.basePrice,
        appliedPrice: unitPrice,
        discountedPrice: discountedUnitPrice,
        source: priceSource
      }
    });

    subtotal += itemSubtotal;
    communityDiscountAmount += itemDiscountAmount;
  }

  // Calculate fees and taxes (fixed formulas, not from frontend)
  const deliveryFee = orderType === 'b2b' ? 0 : 50; // B2C: ₹50, B2B: Free
  const gstRate = 0.05; // 5% GST (can be product-specific)
  const tax = subtotal * gstRate;
  const total = subtotal + deliveryFee + tax;

  // Validate totals are reasonable
  if (subtotal < 0 || total < 0 || deliveryFee < 0 || tax < 0) {
    throw new Error('Invalid calculated totals (negative values)');
  }

  // Sanity check: total should be within 30% of subtotal
  // (accounting for fees and taxes)
  const maxExpectedTotal = subtotal * 1.3; // Max 30% for fees + tax
  if (total > maxExpectedTotal) {
    throw new Error(`Calculated total exceeds maximum expected (₹${total} > ₹${maxExpectedTotal})`);
  }

  return {
    items: calculatedItems,
    subtotal,
    communityDiscount: communityDiscount * 100,
    communityDiscountAmount,
    deliveryFee,
    gstRate: gstRate * 100,
    tax,
    total,
    breakdown: {
      subtotalAfterDiscount: subtotal,
      deliveryFee,
      tax,
      total
    },
    // For audit: show how we calculated this
    calculationAuditTrail: {
      itemCount: calculatedItems.length,
      communityDiscountApplied: communityDiscount > 0,
      orderType,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Verify that frontend-calculated total (if provided) matches our server calculation
 * Use this before payment to ensure no tampering between request and payment
 */
export function verifyTotalAmounts(frontendTotal, serverTotal, tolerance = 1) {
  if (!frontendTotal) {
    return { valid: true, match: true, reason: 'No frontend total provided' };
  }

  // Convert to numbers for comparison
  const frontend = Number(frontendTotal);
  const server = Number(serverTotal);

  // Allow 1 paisa (0.01) tolerance for floating point rounding
  const difference = Math.abs(frontend - server);

  if (difference > tolerance) {
    return {
      valid: false,
      match: false,
      frontendTotal: frontend,
      serverTotal: server,
      difference,
      reason: `Total mismatch: Frontend ₹${frontend} vs Server ₹${server}`
    };
  }

  return {
    valid: true,
    match: true,
    frontendTotal: frontend,
    serverTotal: server,
    difference,
    reason: 'Totals match within tolerance'
  };
}

/**
 * Sanitize order items to prevent injection attacks
 * Removes any price/cost fields if somehow present
 */
export function sanitizeOrderItems(orderItems) {
  if (!Array.isArray(orderItems)) {
    throw new Error('orderItems must be an array');
  }

  const priceFields = [
    'price', 'unitPrice', 'basePrice', 'subtotal', 'discount',
    'total', 'amount', 'cost', 'commissionAmount'
  ];

  const sanitized = orderItems.map(item => {
    if (!item.productId || !item.quantity) {
      throw new Error('Each item must have productId and quantity');
    }

    // Only allow productId and quantity
    return {
      productId: item.productId,
      quantity: Number(item.quantity)
    };
  });

  // Validate quantities
  for (const item of sanitized) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error(`Invalid quantity for product ${item.productId}`);
    }

    if (item.quantity > 10000) {
      throw new Error(`Quantity too large: ${item.quantity} (max 10000)`);
    }
  }

  return sanitized;
}

/**
 * Deep validation: ensure NO pricing data in entire request
 * Checks recursively through nested objects
 */
export function deepValidateNoPricing(obj, path = '') {
  const priceKeywords = [
    'price', 'cost', 'fee', 'discount', 'tax', 'total', 'amount',
    'commission', 'subtotal', 'charge', 'rate'
  ];

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

    // Check if this key contains pricing keywords
    const isPrice = priceKeywords.some(keyword => 
      key.toLowerCase().includes(keyword)
    );

    if (isPrice && value !== null && value !== undefined) {
      return {
        valid: false,
        field: currentPath,
        message: `Forbidden pricing field: ${currentPath}`
      };
    }

    // Recurse into objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = deepValidateNoPricing(value, currentPath);
      if (!nested.valid) return nested;
    }

    // Skip arrays (handled separately in middleware)
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (value[i] && typeof value[i] === 'object') {
          const nested = deepValidateNoPricing(value[i], `${currentPath}[${i}]`);
          if (!nested.valid) return nested;
        }
      }
    }
  }

  return { valid: true };
}

export default {
  validateNoPricingData,
  calculateUnitPrice,
  calculateOrderTotals,
  verifyTotalAmounts,
  sanitizeOrderItems,
  deepValidateNoPricing
};
