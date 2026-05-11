import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';
import InventoryLot from '../models/InventoryLot.model.js';
import User from '../models/User.model.js';

const ensureFarmerProduct = async (productId) => {
  const product = await Product.findById(productId).select('ownerId status name');
  if (!product || product.status !== 'active') {
    return { ok: false, message: 'Product not found or unavailable', product: null, availableQty: 0 };
  }

  const owner = await User.findById(product.ownerId).select('roles status');
  const isFarmerOwner = owner?.roles?.includes('farmer');

  if (!isFarmerOwner || owner?.status !== 'active') {
    return { ok: false, message: 'Only crops grown by active farmers can be added to cart', product: null, availableQty: 0 };
  }

  const availableQty = await InventoryLot.getAvailableQuantityForProduct(product._id);

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
    let cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
      select: 'name description basePrice price images stockQuantity stock categoryId category ownerId seller unit status'
    });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    res.status(200).json({ success: true, data: cart });
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

    const productCheck = await ensureFarmerProduct(productId);
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

    if (!canFitInStock(productCheck.availableQty, nextQty)) {
      return res.status(400).json({
        success: false,
        message: `Only ${Number(productCheck.availableQty || 0)} ${productCheck.product.name || 'units'} available in stock`
      });
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
      const productCheck = await ensureFarmerProduct(productId);
      if (!productCheck.ok) {
        return res.status(400).json({ success: false, message: productCheck.message });
      }

      if (!canFitInStock(productCheck.availableQty, requestedQty)) {
        return res.status(400).json({
          success: false,
          message: `Only ${Number(productCheck.availableQty || 0)} ${productCheck.product.name || 'units'} available in stock`
        });
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

// @desc    Validate cart before checkout
// @route   POST /api/cart/validate
// @access  Private
// Issue 27 - Pre-validate all cart items before checkout
export const validateCartBeforeCheckout = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
      select: 'name status ownerId categoryId basePrice'
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Validate each item
    const validation = {
      valid: true,
      errors: [],
      items: []
    };

    for (const item of cart.items) {
      const product = item.product;

      // Check product exists and is active
      if (!product || product.status !== 'active') {
        validation.valid = false;
        validation.errors.push({
          productId: item.product?._id || 'unknown',
          message: `Product is no longer available`
        });
        continue;
      }

      // Check inventory
      const availableQty = await InventoryLot.getAvailableQuantityForProduct(product._id);
      if (item.qty > availableQty) {
        validation.valid = false;
        validation.errors.push({
          productId: product._id,
          productName: product.name,
          message: `Insufficient inventory. Available: ${availableQty}, Requested: ${item.qty}`
        });
        continue;
      }

      // Check seller is active farmer
      const owner = await User.findById(product.ownerId).select('roles status');
      if (!owner?.roles?.includes('farmer') || owner?.status !== 'active') {
        validation.valid = false;
        validation.errors.push({
          productId: product._id,
          productName: product.name,
          message: `Product seller is no longer available`
        });
        continue;
      }

      validation.items.push({
        productId: product._id,
        productName: product.name,
        quantity: item.qty,
        unitPrice: product.basePrice,
        totalPrice: item.qty * product.basePrice
      });
    }

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Cart validation failed',
        errors: validation.errors
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cart validated successfully',
      data: validation
    });
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
