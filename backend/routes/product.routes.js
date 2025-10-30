import express from 'express';
import Product from '../models/Product.model.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validateProduct, validateObjectId } from '../middleware/validation.middleware.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      ownerId, 
      status = 'active', 
      search,
      minPrice,
      maxPrice,
      tags,
      page = 1, 
      limit = 20,
      sort = '-createdAt'
    } = req.query;
    
    const query = {};
    if (category) query.categoryId = category;
    if (ownerId) query.ownerId = ownerId;
    if (status) query.status = status;
    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) query.basePrice.$gte = Number(minPrice);
      if (maxPrice) query.basePrice.$lte = Number(maxPrice);
    }
    if (tags) query.tags = { $in: tags.split(',') };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query)
      .populate('ownerId', 'name email')
      .populate('categoryId', 'name slug')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sort);

    const count = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('ownerId', 'name email phone addresses')
      .populate('categoryId', 'name slug');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create product (farmers and admins only)
router.post(
  '/',
  authenticate,
  authorize('farmer', 'admin'),
  // Ensure ownerId defaults to the authenticated farmer if not provided
  (req, res, next) => {
    if (!req.body.ownerId && req.user.roles?.includes('farmer')) {
      req.body.ownerId = req.user._id;
    }
    next();
  },
  validateProduct,
  async (req, res) => {
    try {
      // Non-admin farmers can only create products for themselves
      if (!req.user.roles.includes('admin') && req.user.roles.includes('farmer')) {
        if (String(req.body.ownerId) !== String(req.user._id)) {
          return res.status(403).json({ success: false, message: 'Forbidden: You can only create products for yourself' });
        }
      }

      const product = new Product(req.body);
      await product.save();

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Update product (owner or admin)
router.put('/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Only admin or owner can update
    const isOwner = String(product.ownerId) === String(req.user._id);
    const isAdmin = req.user.roles.includes('admin');
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: Only the owner or admin can update this product' });
    }

    Object.assign(product, req.body);
    await product.save();

    res.json({ success: true, message: 'Product updated successfully', data: { product } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete product (owner or admin)
router.delete('/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const isOwner = String(product.ownerId) === String(req.user._id);
    const isAdmin = req.user.roles.includes('admin');
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: Only the owner or admin can delete this product' });
    }

    await product.deleteOne();
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
