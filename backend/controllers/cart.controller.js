import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';

const ensureFarmerProduct = async (productId) => {
  const product = await Product.findById(productId).select('ownerId status stockQuantity');
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

    const productCheck = await ensureFarmerProduct(productId);
    if (!productCheck.ok) {
      return res.status(400).json({ success: false, message: productCheck.message });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (itemIndex > -1) {
      cart.items[itemIndex].qty += Number(qty) || 1;
    } else {
      cart.items.push({ product: productId, qty: Number(qty) || 1 });
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

    const cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (itemIndex > -1) {
      cart.items[itemIndex].qty = Number(qty);
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
