import express from 'express';
import MarketplaceRequest from '../models/MarketplaceRequest.model.js';
import Product from '../models/Product.model.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { getCropByName, normalizeCropName } from '../constants/cropCatalog.js';

const router = express.Router();

// Create demand-side marketplace request (business/restaurant/community side)
router.post(
  '/',
  authenticate,
  authorize('business', 'restaurant', 'travel_agency', 'customer', 'admin'),
  async (req, res) => {
    try {
      const {
        cropName,
        season,
        quantity,
        unit = 'kg',
        offeredPrice,
        location,
        requiredBy,
        notes,
        requesterType
      } = req.body;

      if (!cropName || !quantity || Number(quantity) <= 0 || offeredPrice == null) {
        return res.status(400).json({
          success: false,
          message: 'cropName, quantity (> 0), and offeredPrice are required'
        });
      }

      const crop = getCropByName(cropName);
      if (!crop) {
        return res.status(400).json({
          success: false,
          message: 'Invalid crop. Please select a crop from the approved India crop list.'
        });
      }

      if (season && !crop.seasons.includes(season)) {
        return res.status(400).json({
          success: false,
          message: `Invalid season for ${crop.name}. Allowed seasons: ${crop.seasons.join(', ')}`
        });
      }

      const normalizedRequesterType = requesterType || (req.user.roles.includes('restaurant')
        ? 'restaurant'
        : req.user.roles.includes('business')
          ? 'business'
          : req.user.roles.includes('travel_agency')
            ? 'travel_agency'
            : 'community');

      const marketplaceRequest = await MarketplaceRequest.create({
        requesterId: req.user._id,
        requesterRole: req.user.roles[0] || 'customer',
        requesterType: normalizedRequesterType,
        cropName: crop.name,
        season: season || crop.seasons[0],
        quantity: Number(quantity),
        unit,
        offeredPrice: Number(offeredPrice),
        location: location || 'India',
        requiredBy,
        notes,
        status: 'open'
      });

      res.status(201).json({
        success: true,
        message: 'Marketplace request created successfully',
        data: { request: marketplaceRequest }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Requests created by current requester (or all for admin)
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, cropName, page = 1, limit = 20 } = req.query;
    const query = {};

    if (!req.user.roles.includes('admin')) {
      query.requesterId = req.user._id;
    }

    if (status) query.status = status;
    if (cropName) query.cropName = { $regex: cropName, $options: 'i' };

    const requests = await MarketplaceRequest.find(query)
      .populate('requesterId', 'name email')
      .populate('matchedFarmerId', 'name email')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const count = await MarketplaceRequest.countDocuments(query);

    res.json({
      success: true,
      data: {
        requests,
        totalPages: Math.ceil(count / Number(limit)),
        currentPage: Number(page),
        total: count
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Open requests relevant to farmer crops
router.get('/open-for-farmer', authenticate, authorize('farmer', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;

    let farmerCropNames = [];

    if (!req.user.roles.includes('admin')) {
      const farmerProducts = await Product.find({ ownerId: req.user._id, status: 'active' }).select('name');
      farmerCropNames = Array.from(
        new Set(farmerProducts.map((p) => normalizeCropName(p.name)).filter(Boolean))
      );
    }

    const query = { status: 'open' };

    if (!req.user.roles.includes('admin')) {
      if (!farmerCropNames.length) {
        return res.json({
          success: true,
          data: {
            requests: [],
            totalPages: 0,
            currentPage: Number(page),
            total: 0
          }
        });
      }
      query.cropName = { $in: farmerCropNames.map((name) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) };
    }

    const requests = await MarketplaceRequest.find(query)
      .populate('requesterId', 'name email roles')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const count = await MarketplaceRequest.countDocuments(query);

    res.json({
      success: true,
      data: {
        requests,
        totalPages: Math.ceil(count / Number(limit)),
        currentPage: Number(page),
        total: count
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Requests accepted by current farmer
router.get('/farmer/accepted', authenticate, authorize('farmer', 'admin'), async (req, res) => {
  try {
    const query = req.user.roles.includes('admin')
      ? { status: 'accepted' }
      : { status: 'accepted', matchedFarmerId: req.user._id };

    const requests = await MarketplaceRequest.find(query)
      .populate('requesterId', 'name email roles')
      .populate('matchedFarmerId', 'name email')
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: { requests } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Farmer respond to request (accept/decline)
router.patch('/:id/respond', authenticate, authorize('farmer', 'admin'), async (req, res) => {
  try {
    const { action, offeredPrice, message } = req.body;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action must be either accept or decline'
      });
    }

    const request = await MarketplaceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Marketplace request not found' });
    }

    if (request.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: `Cannot respond. Request status is ${request.status}`
      });
    }

    if (!req.user.roles.includes('admin') && action === 'accept') {
      const farmerHasCrop = await Product.exists({
        ownerId: req.user._id,
        status: 'active',
        name: { $regex: `^${request.cropName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
      });

      if (!farmerHasCrop) {
        return res.status(400).json({
          success: false,
          message: `You can only accept requests for crops in your active My Crops list (${request.cropName})`
        });
      }
    }

    request.status = action === 'accept' ? 'accepted' : 'declined';
    request.matchedFarmerId = action === 'accept' ? req.user._id : null;
    request.farmerResponse = {
      offeredPrice: offeredPrice != null ? Number(offeredPrice) : undefined,
      message,
      respondedAt: new Date()
    };

    await request.save();
    await request.populate('requesterId', 'name email roles');
    await request.populate('matchedFarmerId', 'name email');

    res.json({
      success: true,
      message: `Marketplace request ${action}ed successfully`,
      data: { request }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
