import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';
import InventoryLot from '../models/InventoryLot.model.js';
import Order from '../models/Order.model.js';
import Commission from '../models/Commission.model.js';
import Category from '../models/Category.model.js';
import User from '../models/User.model.js';
import mongoose from 'mongoose';
import { calculateDeliveryFeeForOrder } from '../utils/deliveryFee.util.js';
import { getCommissionRate } from '../utils/commission.util.js';

const ensureFarmerProduct = async (productId, requestedQty = 1) => {
  const product = await Product.findById(productId).select('ownerId status name');
  if (!product || product.status !== 'active') {
    return { ok: false, message: 'Product not found or unavailable', product: null, availableQty: 0 };
  }

  const owner = await User.findById(product.ownerId).select('roles status');
  const isFarmerOwner = owner?.roles?.includes('farmer');

  if (!isFarmerOwner || owner?.status !== 'active') {
    return { ok: false, message: 'Only crops grown by active farmers can be added to cart', product: null, availableQty: 0 };
  }

  // Use the same validation logic as checkout: find if a lot can be reserved with requested qty
  // This prevents cart accepting items that will fail at checkout due to inventory fragmentation
  const availableLot = await InventoryLot.findOne({
    productId: product._id,
    $expr: {
      $gte: [
        { $subtract: ['$quantity', '$reservedQuantity'] },
        requestedQty
      ]
    }
  }).select('quantity reservedQuantity');

  if (!availableLot) {
    // If no single lot has enough, report total available across all lots (for user information)
    const totalAvailable = await InventoryLot.getAvailableQuantityForProduct(product._id);
    return { ok: false, message: `Insufficient stock: ${totalAvailable} available`, product, availableQty: totalAvailable };
  }

  const availableQty = availableLot.quantity - availableLot.reservedQuantity;
  return { ok: true, message: '', product, availableQty };
};

const normalizeQty = (qty) => {
  const parsedQty = Number(qty);
  return Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 1;
};

const getCartItemQty = (cart, productId) => {
  const item = cart?.items?.find((cartItem) => String(cartItem.product) === String(productId));
  return Number(item?.qty || 0);
};

const canFitInStock = (availableQty, requestedQty) => {
  const normalizedAvailableQty = Number(availableQty || 0);
  return requestedQty <= normalizedAvailableQty;
};

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
      select: 'name description basePrice price images stockQuantity stock categoryId category ownerId seller unit status isDeleted'
    });

    // Bug 11: Don't write to DB on a GET — return an empty representation instead.
    // The cart document is only created when the first item is added (POST /api/cart).
    if (!cart) {
      return res.status(200).json({
        success: true,
        data: { items: [], activeItems: [], staleItems: [] }
      });
    }

    // Bug 5: Partition items into active and stale so the frontend can warn the user.
    // Stale = product deleted, inactive, or out of stock.
    const activeItems = [];
    const staleItems = [];

    for (const item of cart.items) {
      const p = item.product;
      if (!p || p.isDeleted || p.status !== 'active') {
        staleItems.push({
          ...item.toObject(),
          staleReason: !p ? 'Product no longer exists'
            : p.isDeleted ? 'Product has been removed'
            : `Product is ${p.status}`
        });
      } else {
        activeItems.push(item);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        ...cart.toObject(),
        activeItems,
        staleItems
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
export const addItemToCart = async (req, res) => {
  try {
    const { productId, qty } = req.body;
    const requestedQty = normalizeQty(qty);

    const productCheck = await ensureFarmerProduct(productId, requestedQty);
    if (!productCheck.ok) {
      return res.status(400).json({ success: false, message: productCheck.message });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    const existingQty = getCartItemQty(cart, productId);
    const nextQty = existingQty + requestedQty;

    // Re-validate that the total quantity can be reserved from a single lot
    const totalQtyCheck = await ensureFarmerProduct(productId, nextQty);
    if (!totalQtyCheck.ok) {
      return res.status(400).json({
        success: false,
        message: `Cannot add ${requestedQty} more units. ${totalQtyCheck.message}`
      });
    }

    // 2.8: Enforce single-seller cart — all items must belong to the same farmer
    if (cart.items.length > 0) {
      const existingItem = await Product.findById(cart.items[0].product).select('ownerId');
      const newProduct = productCheck.product;
      if (existingItem && String(existingItem.ownerId) !== String(newProduct.ownerId)) {
        return res.status(400).json({
          success: false,
          message: 'Your cart already contains items from another farmer. Please clear your cart before adding items from a different seller.',
          code: 'CART_SELLER_CONFLICT',
          cartSellerId: existingItem.ownerId,
          newSellerId: newProduct.ownerId
        });
      }
    }

    if (itemIndex > -1) {
      cart.items[itemIndex].qty = nextQty;
    } else {
      cart.items.push({ product: productId, qty: requestedQty });
    }

    await cart.save();
    
    // Populate before returning
    await cart.populate({
      path: 'items.product',
      select: 'name description basePrice price images stockQuantity stock categoryId category ownerId seller unit status'
    });

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update item quantity
// @route   PUT /api/cart/:productId
// @access  Private
export const updateCartItem = async (req, res) => {
  try {
    const { qty } = req.body;
    const { productId } = req.params;
    const requestedQty = normalizeQty(qty);

    const cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (itemIndex > -1) {
      const productCheck = await ensureFarmerProduct(productId, requestedQty);
      if (!productCheck.ok) {
        return res.status(400).json({ success: false, message: productCheck.message });
      }

      cart.items[itemIndex].qty = requestedQty;
      if (cart.items[itemIndex].qty <= 0) {
        cart.items.splice(itemIndex, 1);
      }
    } else {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    await cart.save();
    
    await cart.populate({
      path: 'items.product',
      select: 'name description basePrice price images stockQuantity stock categoryId category ownerId seller unit status'
    });

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private
export const removeItemFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item.product.toString() !== productId);

    await cart.save();
    
    await cart.populate({
      path: 'items.product',
      select: 'name description basePrice price images stockQuantity stock categoryId category ownerId seller unit status'
    });

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Checkout — convert cart into an Order atomically
// @route   POST /api/cart/checkout
// @access  Private (customers and B2B buyers)
export const checkoutCart = async (req, res) => {
  try {
    const { deliveryAddress, paymentTerms, notes, redeemLoyalty = false } = req.body;

    if (!deliveryAddress?.line1 || !deliveryAddress?.city) {
      return res.status(400).json({
        success: false,
        message: 'deliveryAddress with line1 and city is required',
        code: 'MISSING_DELIVERY_ADDRESS'
      });
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
      select: 'name basePrice images unit ownerId status categoryId isDeleted'
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty',
        code: 'EMPTY_CART'
      });
    }

    // Separate stale items
    const activeItems = cart.items.filter(
      i => i.product && !i.product.isDeleted && i.product.status === 'active'
    );

    if (activeItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All cart items are unavailable. Please update your cart.',
        code: 'NO_ACTIVE_ITEMS'
      });
    }

    // Determine order type from buyer role
    const isB2BBuyer = req.user.roles?.some(r =>
      ['business', 'restaurant', 'travel_agency'].includes(r)
    );
    const orderType = isB2BBuyer ? 'b2b' : 'b2c';

    // All items must belong to a single seller (already enforced at add-to-cart time)
    const sellerId = activeItems[0].product.ownerId;
    const mixedSellers = activeItems.some(
      i => String(i.product.ownerId) !== String(sellerId)
    );
    if (mixedSellers) {
      return res.status(400).json({
        success: false,
        message: 'Cart contains items from multiple sellers. Please create separate orders.',
        code: 'CART_SELLER_CONFLICT'
      });
    }

    // Build order items + reserve inventory
    const processedItems = [];
    const reservedLotIds = [];
    const reservationToken = new mongoose.Types.ObjectId();
    let subtotal = 0;

    for (const cartItem of activeItems) {
      const product = cartItem.product;
      const quantity = Number(cartItem.qty || 1);

      const lot = await InventoryLot.reserveAvailableLot({
        productId: product._id,
        orderId: reservationToken,
        quantity
      });

      if (!lot) {
        // Roll back previously reserved lots
        for (const lotId of reservedLotIds) {
          const l = await InventoryLot.findById(lotId);
          if (l) await l.cancelReservation(reservationToken);
        }
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}"`,
          code: 'INSUFFICIENT_INVENTORY'
        });
      }
      reservedLotIds.push(lot._id);

      const unitPrice = product.basePrice;
      const itemTotal = unitPrice * quantity;
      processedItems.push({
        productId: product._id,
        productName: product.name,
        productImage: product.images?.[0],
        farmerId: product.ownerId,
        categoryId: product.categoryId,
        quantity,
        unit: product.unit,
        unitPrice,
        totalPrice: itemTotal,
        discountApplied: 0,
        lotId: lot._id
      });
      subtotal += itemTotal;
    }

    // Loyalty point redemption (100 pts = ₹100 off, max 20% of subtotal)
    let loyaltyDiscount = 0;
    if (redeemLoyalty) {
      const buyer = await User.findById(req.user._id).select('loyaltyPoints');
      const maxDiscount = Math.floor(subtotal * 0.20);
      const pointsValue = Math.min(buyer?.loyaltyPoints || 0, maxDiscount * 100) / 100; // 100 pts = ₹1
      loyaltyDiscount = Math.min(Math.floor(pointsValue), maxDiscount);
    }

    const adjustedSubtotal = Math.max(0, subtotal - loyaltyDiscount);
    const deliveryFeeResult = await calculateDeliveryFeeForOrder({
      orderType,
      lotIds: processedItems.map((item) => item.lotId),
      deliveryAddressCoordinates: deliveryAddress.coordinates
    });
    const deliveryFee = deliveryFeeResult.deliveryFee;
    const categoryIds = [...new Set(processedItems.map((item) => item.categoryId).filter(Boolean).map((categoryId) => String(categoryId)))];
    const categoryDocs = categoryIds.length > 0
      ? await Category.find({ _id: { $in: categoryIds } }).select('gstRate')
      : [];
    const gstRateMap = new Map(categoryDocs.map((category) => [String(category._id), Number(category.gstRate ?? 0.05)]));
    const itemBases = processedItems.map((item) => ({
      item,
      discountShare: subtotal > 0 ? loyaltyDiscount * (item.totalPrice / subtotal) : 0
    }));

    let runningDiscount = 0;
    let tax = 0;
    itemBases.forEach(({ item, discountShare }, index) => {
      const allocatedDiscount = index === itemBases.length - 1
        ? Math.max(0, loyaltyDiscount - runningDiscount)
        : Math.min(item.totalPrice, Number(discountShare.toFixed(2)));
      runningDiscount += allocatedDiscount;
      const taxableAmount = Math.max(0, item.totalPrice - allocatedDiscount);
      const gstRate = gstRateMap.get(String(item.categoryId)) ?? 0.05;
      const taxAmount = Number((taxableAmount * gstRate).toFixed(2));

      item.discountApplied = Number(allocatedDiscount.toFixed(2));
      item.gstRate = gstRate;
      item.taxAmount = taxAmount;
      tax += taxAmount;
    });
    tax = Number(tax.toFixed(2));
    const total = adjustedSubtotal + deliveryFee + tax;

    const commissionRate = await getCommissionRate(orderType);
    const commissionAmount = adjustedSubtotal * commissionRate;


    const order = new Order({
      type: orderType,
      buyerId: req.user._id,
      sellerId,
      orderItems: processedItems,
      subtotal: adjustedSubtotal,
      deliveryFee,
      tax,
      total,
      currency: 'INR',
      deliveryAddress,
      paymentTerms: paymentTerms || (orderType === 'b2b' ? 'net_15' : 'prepaid'),
      notes: notes || undefined,
      commission: { rate: commissionRate, amount: commissionAmount, status: 'pending' },
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        updatedBy: req.user._id,
        notes: 'Order created via cart checkout'
      }]
    });
    await order.save();

    // Update lot reservations from token → real orderId
    for (const item of processedItems) {
      await InventoryLot.findByIdAndUpdate(
        item.lotId,
        { $set: { 'reservations.$[elem].orderId': order._id } },
        { arrayFilters: [{ 'elem.status': 'active', 'elem.orderId': reservationToken }] }
      );
    }

    // Create commission record
    await Commission.create({
      orderId: order._id,
      orderNumber: order.orderNumber,
      sellerId,
      sellerType: 'farmer',
      orderAmount: adjustedSubtotal,
      commissionRate,
      commissionAmount,
      status: 'pending',
      metadata: {
        orderType,
        productCount: processedItems.length,
        deliveryFee,
        region: deliveryAddress?.state
      }
    });

    // Deduct loyalty points if redeemed
    if (redeemLoyalty && loyaltyDiscount > 0) {
      const ptsUsed = loyaltyDiscount * 100;
      await User.findByIdAndUpdate(req.user._id, { $inc: { loyaltyPoints: -ptsUsed } });
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        order,
        loyaltyDiscount,
        commission: { rate: commissionRate, amount: commissionAmount }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

