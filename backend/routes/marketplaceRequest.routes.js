import express from 'express';
import mongoose from 'mongoose';
import MarketplaceRequest from '../models/MarketplaceRequest.model.js';
import Product from '../models/Product.model.js';
import Order from '../models/Order.model.js';
import InventoryLot from '../models/InventoryLot.model.js';
import Commission from '../models/Commission.model.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { escapeRegex } from '../utils/regex.util.js';
import { getCropByName, normalizeCropName } from '../constants/cropCatalog.js';
import { notifyUsers } from '../utils/notification.util.js';

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
    if (cropName) query.cropName = { $regex: `^${escapeRegex(cropName)}$`, $options: 'i' };

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
      name: { $regex: `^${escapeRegex(request.cropName)}$`, $options: 'i' }
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

// 2.12: Convert an accepted marketplace negotiation into a real Order
// Only the requester (buyer) can trigger this after both parties have accepted.
router.post(
  '/:id/create-order',
  authenticate,
  authorize('business', 'restaurant', 'travel_agency', 'customer', 'admin'),
  async (req, res) => {
    try {
      const { deliveryAddress } = req.body;

      if (!deliveryAddress?.line1 || !deliveryAddress?.city) {
        return res.status(400).json({
          success: false,
          message: 'deliveryAddress with at least line1 and city is required'
        });
      }

      const request = await MarketplaceRequest.findById(req.params.id)
        .populate('productId', 'name unit images ownerId categoryId status');
      if (!request) {
        return res.status(404).json({ success: false, message: 'Marketplace request not found' });
      }

      // Only the original requester may convert to order
      const isOwner = String(request.requesterId) === String(req.user._id);
      if (!isOwner && !req.user.roles.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: 'Only the requester can convert this negotiation to an order'
        });
      }

      if (
        request.status !== 'accepted' ||
        !request.buyerAccepted ||
        !request.farmerAccepted ||
        !Number(request.agreedPrice)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Order can only be created once both parties have accepted a price',
          currentStatus: request.status
        });
      }

      const product = request.productId;
      if (!product || product.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'The negotiated product is no longer available'
        });
      }

      const sellerId = product.ownerId;
      const agreedPrice = Number(request.agreedPrice);
      const quantity = Number(request.quantity);
      const itemTotal = agreedPrice * quantity;

      // Reserve inventory atomically — use a temp token ObjectId, swap to real orderId after save
      const reservationToken = new mongoose.Types.ObjectId();
      const lot = await InventoryLot.reserveAvailableLot({
        productId: product._id,
        orderId: reservationToken,
        quantity
      });
      if (!lot) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}"`,
          code: 'INSUFFICIENT_INVENTORY'
        });
      }

      const deliveryFee = 0; // Marketplace (B2B-style) — free delivery
      const tax = itemTotal * 0.05;
      const total = itemTotal + deliveryFee + tax;
      const commissionRate = 0.05;
      const commissionAmount = itemTotal * commissionRate;

      const order = new Order({
        type: 'b2b',
        buyerId: request.requesterId,
        sellerId,
        marketplaceRequestId: request._id,
        orderItems: [{
          productId: product._id,
          productName: product.name,
          productImage: product.images?.[0],
          farmerId: sellerId,
          categoryId: product.categoryId,
          quantity,
          unit: request.unit,
          unitPrice: agreedPrice,
          totalPrice: itemTotal,
          discountApplied: 0,
          lotId: lot._id
        }],
        subtotal: itemTotal,
        deliveryFee,
        tax,
        total,
        currency: 'INR',
        deliveryAddress,
        paymentTerms: req.body.paymentTerms || 'net_15',
        commission: { rate: commissionRate, amount: commissionAmount, status: 'pending' },
        status: 'pending',
        statusHistory: [{
          status: 'pending',
          timestamp: new Date(),
          updatedBy: req.user._id,
          notes: `Order from marketplace negotiation ${request.requestNumber}`
        }]
      });
      await order.save();

      // Update lot reservation from temp token -> real orderId
      await InventoryLot.findByIdAndUpdate(
        lot._id,
        { $set: { 'reservations.$[elem].orderId': order._id } },
        { arrayFilters: [{ 'elem.status': 'active', 'elem.orderId': reservationToken }] }
      );

      // Create commission record
      await Commission.create({
        orderId: order._id,
        orderNumber: order.orderNumber,
        sellerId,
        sellerType: 'farmer',
        orderAmount: itemTotal,
        commissionRate,
        commissionAmount,
        status: 'pending',
        metadata: { orderType: 'b2b', productCount: 1, deliveryFee, region: deliveryAddress?.state }
      });

      // Mark marketplace request as fulfilled
      request.status = 'fulfilled';
      await request.save();

      // Notify both parties
      try {
        await notifyUsers([request.requesterId, sellerId], {
          title: 'Order Created from Negotiation',
          message: `Order ${order.orderNumber} has been placed from marketplace negotiation ${request.requestNumber}.`,
          type: 'order',
          relatedId: order._id
        });
      } catch { /* best-effort */ }

      res.status(201).json({
        success: true,
        message: 'Order created successfully from marketplace negotiation',
        data: { order, marketplaceRequest: request }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;
