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
        productId,
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

      if (!productId || !cropName || !quantity || Number(quantity) <= 0 || offeredPrice == null) {
        return res.status(400).json({
          success: false,
          message: 'productId, cropName, quantity (> 0), and offeredPrice are required'
        });
      }

      const product = await Product.findById(productId).populate('ownerId', 'roles status name');
      if (!product || product.status !== 'active') {
        return res.status(404).json({
          success: false,
          message: 'Selected crop product is not available'
        });
      }

      const ownerRoles = product.ownerId?.roles || [];
      if (!ownerRoles.includes('farmer')) {
        return res.status(400).json({
          success: false,
          message: 'Negotiation can be created only for crops grown by farmers'
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

      const normalizedProductCrop = normalizeCropName(product.name);
      const normalizedRequestedCrop = normalizeCropName(crop.name);
      if (normalizedProductCrop !== normalizedRequestedCrop) {
        return res.status(400).json({
          success: false,
          message: 'Selected crop must match the farmer product exactly'
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
        productId: product._id,
        cropName: crop.name,
        season: season || crop.seasons[0],
        quantity: Number(quantity),
        unit,
        offeredPrice: Number(offeredPrice),
        currentOfferPrice: Number(offeredPrice),
        lastOfferedBy: 'buyer',
        buyerAccepted: true,
        farmerAccepted: false,
        negotiationHistory: [{
          offeredBy: 'buyer',
          price: Number(offeredPrice),
          message: notes || 'Initial offer'
        }],
        location: location || 'India',
        requiredBy,
        notes,
        status: 'open',
        matchedFarmerId: product.ownerId?._id || product.ownerId
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
      .populate('productId', 'name unit basePrice ownerId')
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

    const query = { status: { $in: ['open', 'countered'] } };

    if (!req.user.roles.includes('admin')) {
      query.matchedFarmerId = req.user._id;
    }

    const requests = await MarketplaceRequest.find(query)
      .populate('requesterId', 'name email roles')
      .populate('productId', 'name unit basePrice ownerId')
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

    if (!['accept', 'decline', 'counter'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action must be one of: accept, decline, counter'
      });
    }

    const request = await MarketplaceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Marketplace request not found' });
    }

    if (!['open', 'countered'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot respond. Request status is ${request.status}`
      });
    }

    const effectiveFarmerId = req.user.roles.includes('admin') ? request.matchedFarmerId : req.user._id;

    if (!effectiveFarmerId) {
      return res.status(400).json({
        success: false,
        message: 'No farmer is associated with this request'
      });
    }

    const farmerHasCrop = await Product.exists({
      _id: request.productId,
      ownerId: effectiveFarmerId,
      status: 'active',
      name: { $regex: `^${request.cropName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    });

    if (!farmerHasCrop) {
      return res.status(400).json({
        success: false,
        message: `You can respond only for active crops in your My Crops list (${request.cropName})`
      });
    }

    if (action === 'counter' && (offeredPrice == null || Number(offeredPrice) <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'counter action requires offeredPrice > 0'
      });
    }

    request.matchedFarmerId = effectiveFarmerId;

    if (action === 'decline') {
      request.status = 'declined';
      request.farmerAccepted = false;
      request.buyerAccepted = false;
    } else if (action === 'counter') {
      const counterPrice = Number(offeredPrice);
      request.status = 'countered';
      request.currentOfferPrice = counterPrice;
      request.lastOfferedBy = 'farmer';
      request.farmerAccepted = true;
      request.buyerAccepted = false;
      request.agreedPrice = undefined;
      request.agreedAt = undefined;
      request.negotiationHistory = [
        ...(request.negotiationHistory || []),
        {
          offeredBy: 'farmer',
          price: counterPrice,
          message: message || 'Farmer counter offer',
          offeredAt: new Date()
        }
      ];
    } else {
      request.farmerAccepted = true;
      if (request.buyerAccepted) {
        request.status = 'accepted';
        request.agreedPrice = Number(request.currentOfferPrice ?? request.offeredPrice);
        request.agreedAt = new Date();
      } else {
        request.status = 'countered';
      }
    }

    request.farmerResponse = {
      offeredPrice: action === 'counter'
        ? Number(offeredPrice)
        : Number(request.currentOfferPrice ?? request.offeredPrice),
      message,
      respondedAt: new Date()
    };

    await request.save();
    await request.populate('requesterId', 'name email roles');
    await request.populate('matchedFarmerId', 'name email');
    await request.populate('productId', 'name unit basePrice ownerId');

    res.json({
      success: true,
      message: `Marketplace request ${action}ed successfully`,
      data: { request }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Buyer respond to farmer negotiation (accept/counter/cancel)
router.patch('/:id/buyer-respond', authenticate, authorize('business', 'restaurant', 'travel_agency', 'customer', 'admin'), async (req, res) => {
  try {
    const { action, offeredPrice, message } = req.body;

    if (!['accept', 'counter', 'cancel'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action must be one of: accept, counter, cancel'
      });
    }

    const request = await MarketplaceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Marketplace request not found' });
    }

    const isOwner = String(request.requesterId) === String(req.user._id);
    if (!isOwner && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only the requester can respond from buyer side'
      });
    }

    if (!['open', 'countered', 'accepted'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot respond. Request status is ${request.status}`
      });
    }

    if (action === 'cancel') {
      request.status = 'cancelled';
      request.buyerAccepted = false;
      request.farmerAccepted = false;
      request.agreedPrice = undefined;
      request.agreedAt = undefined;
    } else if (action === 'counter') {
      if (offeredPrice == null || Number(offeredPrice) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'counter action requires offeredPrice > 0'
        });
      }

      const counterPrice = Number(offeredPrice);
      request.status = 'countered';
      request.currentOfferPrice = counterPrice;
      request.lastOfferedBy = 'buyer';
      request.buyerAccepted = true;
      request.farmerAccepted = false;
      request.agreedPrice = undefined;
      request.agreedAt = undefined;
      request.negotiationHistory = [
        ...(request.negotiationHistory || []),
        {
          offeredBy: 'buyer',
          price: counterPrice,
          message: message || 'Buyer counter offer',
          offeredAt: new Date()
        }
      ];
    } else {
      request.buyerAccepted = true;
      if (request.farmerAccepted) {
        request.status = 'accepted';
        request.agreedPrice = Number(request.currentOfferPrice ?? request.offeredPrice);
        request.agreedAt = new Date();
      } else {
        request.status = 'countered';
      }
    }

    await request.save();
    await request.populate('requesterId', 'name email roles');
    await request.populate('matchedFarmerId', 'name email');
    await request.populate('productId', 'name unit basePrice ownerId');

    res.json({
      success: true,
      message: `Buyer ${action} action completed successfully`,
      data: { request }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
