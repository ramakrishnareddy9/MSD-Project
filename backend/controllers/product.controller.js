import Product from '../models/Product.model.js';
import User from '../models/User.model.js';
import InventoryLot from '../models/InventoryLot.model.js';
import Location from '../models/Location.model.js';
import { CROP_CATALOG, getCropByName } from '../constants/cropCatalog.js';
import { getCoordinatesForCity, isCanonicalAddressCoordinate } from '../utils/address.util.js';

const resolveAddress = (owner) => {
  const primaryAddress = owner?.addresses?.[0];
  if (primaryAddress) {
    return {
      line1: primaryAddress.line1,
      line2: primaryAddress.line2 || '',
      city: primaryAddress.city,
      state: primaryAddress.state,
      postalCode: primaryAddress.postalCode,
      country: primaryAddress.country || 'India',
      coordinates: primaryAddress.coordinates?.coordinates || null
    };
  }

  return {
    line1: 'Auto-generated farm location',
    line2: '',
    city: 'Hyderabad',
    state: 'TS',
    postalCode: '500001',
    country: 'India',
    coordinates: getCoordinatesForCity('Hyderabad')
  };
};

const ensureOwnerLocation = async (ownerId) => {
  let location = await Location.findOne({ ownerId, status: 'active' }).sort({ createdAt: 1 });
  if (location) {
    return location;
  }

  const owner = await User.findById(ownerId).select('name addresses');
  const address = resolveAddress(owner);

  location = await Location.create({
    type: 'farm',
    name: `${owner?.name || 'Farmer'} Farm`,
    ownerId,
    address,
    coordinates: {
      type: 'Point',
      coordinates: isCanonicalAddressCoordinate(address.coordinates)
        ? address.coordinates
        : getCoordinatesForCity(address.city)
    },
    status: 'active'
  });

  return location;
};

const syncPrimaryInventoryLot = async (product, forceQuantity = null) => {
  let lot = await InventoryLot.findOne({ productId: product._id }).sort({ createdAt: 1 });
  const hasForcedQuantity = forceQuantity != null;

  if (!lot) {
    const location = await ensureOwnerLocation(product.ownerId);
    lot = await InventoryLot.create({
      productId: product._id,
      locationId: location._id,
      quantity: Math.max(0, Number(hasForcedQuantity ? forceQuantity : product.stockQuantity || 0)),
      reservedQuantity: 0,
      qualityGrade: 'A'
    });
    return lot;
  }

  if (hasForcedQuantity) {
    const targetQuantity = Math.max(Number(forceQuantity || 0), Number(lot.reservedQuantity || 0));
    if (lot.quantity !== targetQuantity) {
      lot.quantity = targetQuantity;
      await lot.save();
    }
  }

  return lot;
};

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
    if (ownerId) {
      query.ownerId = ownerId;
    } else {
      const farmerUsers = await User.find({ roles: 'farmer', status: 'active' }).select('_id');
      query.ownerId = { $in: farmerUsers.map((u) => u._id) };
    }
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
      query.$text = { $search: String(search).trim().slice(0, 100) };
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

    try {
      await syncPrimaryInventoryLot(product, Number(product.stockQuantity || 0));
    } catch (syncError) {
      await Product.findByIdAndDelete(product._id);
      throw syncError;
    }

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
    const stockQuantityProvided = Object.prototype.hasOwnProperty.call(req.body, 'stockQuantity');
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

    if (stockQuantityProvided) {
      await syncPrimaryInventoryLot(product, Number(product.stockQuantity || 0));
    } else {
      await syncPrimaryInventoryLot(product);
    }

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

    await InventoryLot.deleteMany({ productId: product._id });
    await product.deleteOne();
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
