import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';

const ensureFarmerProduct = async (productId) => {
  const product = await Product.findById(productId).select('ownerId status stockQuantity name');
  if (!product || product.status !== 'active') {
    return { ok: false, message: 'Product not found or unavailable', product: null };
  }

  const owner = await User.findById(product.ownerId).select('roles status');
  const isFarmerOwner = owner?.roles?.includes('farmer');

  if (!isFarmerOwner || owner?.status !== 'active') {
    return { ok: false, message: 'Only crops grown by active farmers can be added to cart', product: null };
  }

  return { ok: true, message: '', product };
};

const normalizeQty = (qty) => {
  const parsedQty = Number(qty);
  return Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 1;
};

const getCartItemQty = (cart, productId) => {
  const item = cart?.items?.find((cartItem) => String(cartItem.product) === String(productId));
  return Number(item?.qty || 0);
};

const canFitInStock = (product, requestedQty) => {
  const availableQty = Number(product?.stockQuantity || 0);
  return requestedQty <= availableQty;
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

    if (!canFitInStock(productCheck.product, nextQty)) {
      return res.status(400).json({
        success: false,
        message: `Only ${Number(productCheck.product.stockQuantity || 0)} ${productCheck.product.name || 'units'} available in stock`
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

      if (!canFitInStock(productCheck.product, requestedQty)) {
        return res.status(400).json({
          success: false,
          message: `Only ${Number(productCheck.product.stockQuantity || 0)} ${productCheck.product.name || 'units'} available in stock`
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
