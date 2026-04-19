import Product from '../models/Product.model.js';
import { CROP_CATALOG, getCropByName } from '../constants/cropCatalog.js';

export const getCropCatalog = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        crops: CROP_CATALOG,
        total: CROP_CATALOG.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const { 
      category, 
      ownerId, 
      status,
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
    // Keep marketplace/public listings active by default,
    // but allow owners to fetch all their products when status is not specified.
    if (status) {
      query.status = status;
    } else if (!ownerId) {
      query.status = 'active';
    }
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
};

export const getProductById = async (req, res) => {
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
};

export const createProduct = async (req, res) => {
  try {
    const isFarmer = req.user.roles.includes('farmer') && !req.user.roles.includes('admin');

    // Non-admin farmers can only create products for themselves
    if (isFarmer) {
      if (String(req.body.ownerId) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only create products for yourself' });
      }

      const crop = getCropByName(req.body.name);
      if (!crop) {
        return res.status(400).json({
          success: false,
          message: 'Invalid crop. Please select a crop from the approved India crop list.'
        });
      }

      req.body.name = crop.name;

      if (req.body.season) {
        if (!crop.seasons.includes(req.body.season)) {
          return res.status(400).json({
            success: false,
            message: `Invalid season for ${crop.name}. Allowed seasons: ${crop.seasons.join(', ')}`
          });
        }
      } else {
        req.body.season = crop.seasons[0];
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
};

export const updateProduct = async (req, res) => {
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

    if (req.user.roles.includes('farmer') && !isAdmin && (req.body.name || req.body.season)) {
      const targetCropName = req.body.name || product.name;
      const crop = getCropByName(targetCropName);

      if (!crop) {
        return res.status(400).json({
          success: false,
          message: 'Invalid crop. Please select a crop from the approved India crop list.'
        });
      }

      if (req.body.name) {
        req.body.name = crop.name;
      }

      if (req.body.season && !crop.seasons.includes(req.body.season)) {
        return res.status(400).json({
          success: false,
          message: `Invalid season for ${crop.name}. Allowed seasons: ${crop.seasons.join(', ')}`
        });
      }
    }

    Object.assign(product, req.body);
    await product.save();

    res.json({ success: true, message: 'Product updated successfully', data: { product } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
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
};
