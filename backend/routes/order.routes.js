import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import InventoryLot from '../models/InventoryLot.model.js';
import PriceAgreement from '../models/PriceAgreement.model.js';
import MarketplaceRequest from '../models/MarketplaceRequest.model.js';
import CommunityPool from '../models/CommunityPool.model.js';
import Commission from '../models/Commission.model.js';
import Vehicle from '../models/Vehicle.model.js';
import User from '../models/User.model.js';
import { notifyUsers } from '../utils/notification.util.js';
import { assertTransactionVerification } from '../utils/verification.util.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validateOrder, validateObjectId } from '../middleware/validation.middleware.js';

const router = express.Router();

const supportsMongoTransactions = () => {
  if (process.env.DISABLE_MONGO_TRANSACTIONS === 'true') {
    return false;
  }

  if (mongoose.connection.readyState !== 1) {
    return false;
  }

  const topologyType = mongoose.connection.client?.topology?.description?.type;
  return ['ReplicaSetWithPrimary', 'Sharded', 'LoadBalanced'].includes(topologyType);
};

// Get all orders (auth required - buyers see their own, sellers see received, admin sees all)
router.get('/', authenticate, async (req, res) => {
  try {
    const { buyerId, sellerId, type, status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    const isAdmin = req.user.roles?.includes('admin');
    const isDeliveryUser = req.user.roles?.some((role) => ['delivery', 'delivery_large', 'delivery_small'].includes(role));

    if (isAdmin) {
      if (buyerId) query.buyerId = buyerId;
      if (sellerId) query.sellerId = sellerId;
    } else {
      // Non-admin users can see orders where they are buyer/seller.
      // Delivery partners additionally see orders explicitly requested to them.
      query.$or = [{ buyerId: req.user._id }, { sellerId: req.user._id }];
      if (isDeliveryUser) {
        query.$or.push({ 'delivery.requestedPartnerId': req.user._id });
      }
    }
    if (type) query.type = type;
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('buyerId', 'name email phone')
      .populate('sellerId', 'name email phone')
      .populate('orderItems.productId', 'name images')
      .populate('delivery.requestedVehicleId', 'name type capacity status plateNumber')
      .populate('delivery.requestedPartnerId', 'name email phone')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
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

// Get order by ID (auth required)
router.get('/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyerId', 'name email phone addresses')
      .populate('sellerId', 'name email phone addresses')
      .populate('orderItems.productId', 'name images unit');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const isAdmin = req.user.roles?.includes('admin');
    const isBuyer = String(order.buyerId?._id || order.buyerId) === String(req.user._id);
    const isSeller = String(order.sellerId?._id || order.sellerId) === String(req.user._id);

    if (!isAdmin && !isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only access orders where you are the buyer or seller'
      });
    }

    res.json({
      success: true,
      data: { order }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create order with proper B2B pricing, inventory reservation, and commission tracking
router.post('/', authenticate, (req, res, next) => {
  req.body.buyerId = req.user._id;
  next();
}, validateOrder, (req, res, next) => {
  const isAdmin = req.user.roles?.includes('admin');
  const isB2BBuyer = req.user.roles?.some((role) => ['business', 'restaurant', 'travel_agency'].includes(role));

  if (req.body.type === 'b2b' && !isAdmin && !isB2BBuyer) {
    return res.status(403).json({
      success: false,
      message: 'Only business, restaurant, travel_agency, or admin users can create B2B orders'
    });
  }

  next();
}, async (req, res) => {
  let session = null;
  const useTransaction = supportsMongoTransactions();
  let reservationToken = null;
  const reservedLotIds = [];

  if (useTransaction) {
    session = await mongoose.startSession();
    session.startTransaction();
  }
  
  try {
    const { type, sellerId, orderItems, deliveryAddress, marketplaceRequestId } = req.body;
    const buyerId = req.user._id;

    reservationToken = new mongoose.Types.ObjectId();
    let resolvedSellerId = sellerId || null;
    let resolvedPriceAgreementId = null;
    let resolvedMarketplaceRequestId = null;
    let subtotal = 0;
    const processedItems = [];

    let marketplaceRequest = null;
    if (marketplaceRequestId) {
      const marketplaceRequestQuery = MarketplaceRequest.findById(marketplaceRequestId).populate('productId', 'name ownerId');
      if (useTransaction) {
        marketplaceRequestQuery.session(session);
      }

      marketplaceRequest = await marketplaceRequestQuery;
      if (!marketplaceRequest) {
        throw new Error('Linked negotiation request not found');
      }

      if (String(marketplaceRequest.requesterId) !== String(buyerId)) {
        throw new Error('Only the requester can place order against this negotiation');
      }

      if (
        marketplaceRequest.status !== 'accepted' ||
        !marketplaceRequest.buyerAccepted ||
        !marketplaceRequest.farmerAccepted ||
        !Number(marketplaceRequest.agreedPrice)
      ) {
        throw new Error('Payment/order can proceed only after both parties accept the negotiated price');
      }

      resolvedSellerId = marketplaceRequest.matchedFarmerId || resolvedSellerId;
      resolvedMarketplaceRequestId = marketplaceRequest._id;
    }
    
    // Process each order item
    for (const item of orderItems) {
      const productQuery = Product.findById(item.productId);
      if (useTransaction) {
        productQuery.session(session);
      }
      const product = await productQuery;
      if (!product || product.status !== 'active') {
        throw new Error(`Product ${item.productId} is not available`);
      }

      if (!resolvedSellerId) {
        resolvedSellerId = product.ownerId;
      }

      // Keep order relations coherent: all items in one order must belong to the same seller.
      if (String(product.ownerId) !== String(resolvedSellerId)) {
        throw new Error('All order items must belong to the same seller');
      }
      
      // Check for B2B price agreement
      let unitPrice = product.basePrice;

      if (marketplaceRequest) {
        const productMatchesRequest = String(product._id) === String(marketplaceRequest.productId?._id || marketplaceRequest.productId);
        if (!productMatchesRequest) {
          throw new Error('Negotiated order item does not match requested crop product');
        }

        unitPrice = Number(marketplaceRequest.agreedPrice);
      }
      
      if (type === 'b2b' && !marketplaceRequest) {
        const agreementQuery = PriceAgreement.findOne({
          buyerId,
          sellerId: product.ownerId,
          productId: item.productId,
          status: 'active',
          validFrom: { $lte: new Date() },
          validUntil: { $gt: new Date() }
        });

        if (useTransaction) {
          agreementQuery.session(session);
        }

        const agreement = await agreementQuery;
        
        if (agreement) {
          // Apply tiered pricing based on quantity
          const tier = agreement.tiers.find(
            t => item.quantity >= t.minQuantity && 
                 (!t.maxQuantity || item.quantity <= t.maxQuantity)
          );
          
          if (tier) {
            unitPrice = tier.price;
            if (!resolvedPriceAgreementId) {
              resolvedPriceAgreementId = agreement._id;
            }
          }
        }
      }
      
      // Reserve inventory atomically
      const inventory = await InventoryLot.reserveAvailableLot({
        productId: product._id,
        orderId: reservationToken,
        quantity: item.quantity,
        session: useTransaction ? session : null
      });

      if (!inventory) {
        throw new Error(`Insufficient inventory for ${product.name}`);
      }
      reservedLotIds.push(inventory._id);
      
      // Build processed item
      const itemTotal = unitPrice * item.quantity;
      processedItems.push({
        productId: product._id,
        productName: product.name,
        productImage: product.images?.[0],
        farmerId: product.ownerId,
        farmerName: product.ownerName,
        categoryId: product.categoryId,
        quantity: item.quantity,
        unit: product.unit,
        unitPrice,
        totalPrice: itemTotal,
        discountApplied: product.basePrice - unitPrice,
        lotId: inventory._id
      });
      
      subtotal += itemTotal;
    }
    
    // Calculate fees and totals
    const deliveryFee = type === 'b2b' ? 0 : 50; // Free delivery for B2B
    const tax = subtotal * 0.05; // 5% GST
    const total = subtotal + deliveryFee + tax;
    
    // Calculate commission (lower for B2B)
    const commissionRate = type === 'b2b' ? 0.05 : 0.10; // 5% for B2B, 10% for B2C
    const commissionAmount = subtotal * commissionRate;

    const verificationCheck = assertTransactionVerification(req.user, total, type);
    if (!verificationCheck.ok) {
      throw new Error(verificationCheck.message);
    }
    
    // Create order
    const order = new Order({
      type,
      buyerId,
      sellerId: resolvedSellerId,
      orderItems: processedItems,
      subtotal,
      deliveryFee,
      tax,
      total,
      currency: 'INR',
      deliveryAddress,
      priceAgreementId: resolvedPriceAgreementId,
      marketplaceRequestId: resolvedMarketplaceRequestId,
      paymentTerms: type === 'b2b' ? 'net_15' : 'prepaid',
      commission: {
        rate: commissionRate,
        amount: commissionAmount,
        status: 'pending'
      },
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        updatedBy: req.user._id,
        notes: 'Order created'
      }]
    });
    
    if (useTransaction) {
      await order.save({ session });
    } else {
      await order.save();
    }
    
    // Update inventory reservations with order ID
    for (const item of processedItems) {
      const updateOptions = {
        arrayFilters: [{ 'elem.status': 'active', 'elem.orderId': reservationToken }]
      };

      if (useTransaction) {
        updateOptions.session = session;
      }

      await InventoryLot.findByIdAndUpdate(
        item.lotId,
        {
          $set: {
            'reservations.$[elem].orderId': order._id
          }
        },
        updateOptions
      );
    }
    
    // Create commission record
    const commission = new Commission({
      orderId: order._id,
      orderNumber: order.orderNumber,
      sellerId: resolvedSellerId,
      sellerType: 'farmer',
      orderAmount: subtotal,
      commissionRate,
      commissionAmount,
      status: 'pending',
      metadata: {
        orderType: type,
        productCount: processedItems.length,
        deliveryFee,
        region: deliveryAddress?.state
      }
    });
    
    if (useTransaction) {
      await commission.save({ session });
    } else {
      await commission.save();
    }
    
    // Commit transaction
    if (useTransaction) {
      await session.commitTransaction();
    }

    try {
      await notifyUsers([buyerId, resolvedSellerId], {
        title: 'Order Placed',
        message: `Order ${order.orderNumber} has been placed and is awaiting processing.`,
        type: 'order',
        relatedId: order._id
      });
    } catch {
      // Best-effort notification should not fail order creation.
    }
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { 
        order,
        commission: {
          rate: commissionRate,
          amount: commissionAmount
        }
      }
    });
  } catch (error) {
    if (!useTransaction && reservationToken && reservedLotIds.length > 0) {
      // Roll back temporary reservations when order creation fails mid-way.
      for (const lotId of reservedLotIds) {
        const lot = await InventoryLot.findById(lotId);
        if (lot) {
          await lot.cancelReservation(reservationToken);
        }
      }
    }

    if (useTransaction && session) {
      await session.abortTransaction();
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
});

// Update order status (farmer, delivery, admin only)
router.patch('/:id/status', authenticate, authorize('farmer', 'delivery', 'delivery_large', 'delivery_small', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const isAdmin = req.user.roles?.includes('admin');
    const isDeliveryUser = req.user.roles?.some((role) => ['delivery', 'delivery_large', 'delivery_small'].includes(role));

    if (!isAdmin && isDeliveryUser) {
      const assignedToPartner = String(order.delivery?.requestedPartnerId || '') === String(req.user._id);
      const requestAccepted = order.delivery?.requestStatus === 'accepted';
      if (!assignedToPartner || !requestAccepted) {
        return res.status(403).json({
          success: false,
          message: 'Delivery partner can only update status for accepted delivery assignments'
        });
      }

      if (!['shipped', 'delivered'].includes(String(status))) {
        return res.status(400).json({
          success: false,
          message: 'Delivery partner can only update status to shipped or delivered'
        });
      }
    }

    const previousStatus = order.status;
    order.status = status;
    if (String(status) === 'delivered') {
      order.delivery = {
        ...(order.delivery || {}),
        actualDelivery: new Date()
      };
      if (order.delivery?.requestedVehicleId) {
        await Vehicle.findByIdAndUpdate(order.delivery.requestedVehicleId, { status: 'Available' });
      }
    }
    if (String(status) === 'cancelled' && order.delivery?.requestedVehicleId) {
      await Vehicle.findByIdAndUpdate(order.delivery.requestedVehicleId, { status: 'Available' });
    }
    order.statusHistory = [
      ...(order.statusHistory || []),
      {
        status,
        timestamp: new Date(),
        updatedBy: req.user._id,
        notes: `Status changed from ${previousStatus} to ${status}`
      }
    ];
    await order.save();

    const normalizedStatus = String(status || '').toLowerCase();
    const isCancelled = normalizedStatus === 'cancelled' || normalizedStatus === 'canceled';

    const notificationTargets = [order.buyerId, order.sellerId];
    if (normalizedStatus === 'delivered' && order.marketplaceRequestId) {
      const linkedRequest = await MarketplaceRequest.findById(order.marketplaceRequestId)
        .select('requesterType communityContext.poolId communityContext.contributorIds');
      if (linkedRequest?.requesterType === 'community') {
        notificationTargets.push(...(linkedRequest.communityContext?.contributorIds || []));

        if (linkedRequest.communityContext?.poolId) {
          await CommunityPool.findByIdAndUpdate(linkedRequest.communityContext.poolId, {
            status: 'delivered',
            deliveredAt: new Date()
          });
        }
      }
    }

    await notifyUsers(notificationTargets, {
      title: isCancelled ? 'Order Cancelled' : 'Order Status Updated',
      message: isCancelled
        ? `Order ${order.orderNumber} has been cancelled.`
        : `Order ${order.orderNumber} status is now ${status}.`,
      type: isCancelled ? 'alert' : 'order',
      relatedId: order._id
    });

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Buyer requests a delivery partner vehicle for an order
router.patch('/:id/request-delivery', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const { vehicleId } = req.body;
    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'vehicleId is required'
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const isAdmin = req.user.roles?.includes('admin');
    const isBuyer = String(order.buyerId) === String(req.user._id);
    if (!isAdmin && !isBuyer) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to request delivery for this order'
      });
    }

    const vehicle = await Vehicle.findById(vehicleId).populate('owner', 'roles status');
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const ownerRoles = vehicle.owner?.roles || [];
    const isDeliveryPartnerVehicle = ownerRoles.some((r) => ['delivery', 'delivery_large', 'delivery_small'].includes(r));
    const isOwnerActive = vehicle.owner?.status === 'active';
    if (!isDeliveryPartnerVehicle || !isOwnerActive) {
      return res.status(400).json({
        success: false,
        message: 'Selected vehicle must belong to an active delivery partner'
      });
    }

    if (vehicle.status !== 'Available') {
      return res.status(400).json({
        success: false,
        message: 'Selected vehicle is not available'
      });
    }

    order.delivery = {
      ...(order.delivery || {}),
      requestedVehicleId: vehicle._id,
      requestedPartnerId: vehicle.owner?._id || vehicle.owner,
      requestedAt: new Date(),
      requestStatus: 'requested'
    };

    order.statusHistory = [
      ...(order.statusHistory || []),
      {
        status: order.status,
        timestamp: new Date(),
        updatedBy: req.user._id,
        notes: `Delivery requested with vehicle ${vehicle.name}`
      }
    ];

    await order.save();

    if (order.marketplaceRequestId) {
      const linkedRequest = await MarketplaceRequest.findById(order.marketplaceRequestId)
        .select('requesterType communityContext.poolId');
      if (linkedRequest?.requesterType === 'community' && linkedRequest.communityContext?.poolId) {
        await CommunityPool.findByIdAndUpdate(linkedRequest.communityContext.poolId, {
          assignedVehicle: vehicle._id,
          assignedDeliveryPartner: vehicle.owner?._id || vehicle.owner,
          deliveryRequestedAt: new Date(),
          deliveryRequestStatus: 'requested'
        });
      }
    }

    const requestedPartnerId = vehicle.owner?._id || vehicle.owner;
    await notifyUsers([requestedPartnerId, order.buyerId, order.sellerId], {
      title: 'Delivery Vehicle Requested',
      message: `Vehicle ${vehicle.name} was requested for order ${order.orderNumber}.`,
      type: 'delivery',
      relatedId: order._id
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email')
      .populate('delivery.requestedVehicleId', 'name type capacity status plateNumber')
      .populate('delivery.requestedPartnerId', 'name email phone');

    res.json({
      success: true,
      message: 'Delivery vehicle requested successfully',
      data: { order: populatedOrder }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delivery partner accepts/rejects a requested delivery assignment
router.patch('/:id/delivery-response', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const { action, vehicleId } = req.body;
    const normalizedAction = String(action || '').toLowerCase();
    if (!['accepted', 'rejected'].includes(normalizedAction)) {
      return res.status(400).json({
        success: false,
        message: 'action must be accepted or rejected'
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const isAdmin = req.user.roles?.includes('admin');
    const isDeliveryUser = req.user.roles?.some((role) => ['delivery', 'delivery_large', 'delivery_small'].includes(role));
    if (!isAdmin && !isDeliveryUser) {
      return res.status(403).json({
        success: false,
        message: 'Only delivery partners can respond to delivery requests'
      });
    }

    const requestedPartnerId = order.delivery?.requestedPartnerId;
    if (!isAdmin && String(requestedPartnerId || '') !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond to this delivery request'
      });
    }

    if (!order.delivery || order.delivery.requestStatus === 'none') {
      return res.status(400).json({
        success: false,
        message: 'No delivery request found for this order'
      });
    }

    let resolvedVehicle = null;
    if (normalizedAction === 'accepted') {
      const targetVehicleId = vehicleId || order.delivery?.requestedVehicleId;
      if (!targetVehicleId) {
        return res.status(400).json({
          success: false,
          message: 'vehicleId is required to accept delivery request'
        });
      }

      const targetPartnerId = isAdmin
        ? (order.delivery?.requestedPartnerId || req.user._id)
        : req.user._id;

      resolvedVehicle = await Vehicle.findById(targetVehicleId).populate('owner', 'roles status');
      if (!resolvedVehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      if (String(resolvedVehicle.owner?._id || resolvedVehicle.owner) !== String(targetPartnerId)) {
        return res.status(400).json({
          success: false,
          message: 'Selected vehicle does not belong to requested delivery partner'
        });
      }

      const ownerRoles = resolvedVehicle.owner?.roles || [];
      const isDeliveryPartnerVehicle = ownerRoles.some((r) => ['delivery', 'delivery_large', 'delivery_small'].includes(r));
      if (!isDeliveryPartnerVehicle || resolvedVehicle.owner?.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Selected vehicle owner is not an active delivery partner'
        });
      }

      if (resolvedVehicle.status !== 'Available') {
        return res.status(400).json({
          success: false,
          message: 'Selected vehicle is not available'
        });
      }

      await Vehicle.findByIdAndUpdate(resolvedVehicle._id, { status: 'On Delivery' });
      order.delivery = {
        ...(order.delivery || {}),
        requestedVehicleId: resolvedVehicle._id,
        requestedPartnerId: targetPartnerId,
        requestStatus: 'accepted'
      };
    } else {
      order.delivery = {
        ...(order.delivery || {}),
        requestStatus: 'rejected'
      };
    }

    order.statusHistory = [
      ...(order.statusHistory || []),
      {
        status: order.status,
        timestamp: new Date(),
        updatedBy: req.user._id,
        notes: normalizedAction === 'accepted'
          ? `Delivery request accepted${resolvedVehicle ? ` with vehicle ${resolvedVehicle.name}` : ''}`
          : 'Delivery request rejected by delivery partner'
      }
    ];

    await order.save();

    if (order.marketplaceRequestId) {
      const linkedRequest = await MarketplaceRequest.findById(order.marketplaceRequestId)
        .select('requesterType communityContext.poolId');
      if (linkedRequest?.requesterType === 'community' && linkedRequest.communityContext?.poolId) {
        const update = normalizedAction === 'accepted'
          ? {
              assignedVehicle: resolvedVehicle?._id || order.delivery?.requestedVehicleId,
              assignedDeliveryPartner: order.delivery?.requestedPartnerId,
              deliveryRequestStatus: 'accepted'
            }
          : {
              deliveryRequestStatus: 'rejected'
            };
        await CommunityPool.findByIdAndUpdate(linkedRequest.communityContext.poolId, update);
      }
    }

    await notifyUsers([order.buyerId, order.sellerId, order.delivery?.requestedPartnerId].filter(Boolean), {
      title: normalizedAction === 'accepted' ? 'Delivery Request Accepted' : 'Delivery Request Rejected',
      message: normalizedAction === 'accepted'
        ? `Delivery partner accepted order ${order.orderNumber}.`
        : `Delivery partner rejected order ${order.orderNumber}.`,
      type: 'delivery',
      relatedId: order._id
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email')
      .populate('delivery.requestedVehicleId', 'name type capacity status plateNumber')
      .populate('delivery.requestedPartnerId', 'name email phone');

    res.json({
      success: true,
      message: normalizedAction === 'accepted'
        ? 'Delivery request accepted successfully'
        : 'Delivery request rejected successfully',
      data: { order: populatedOrder }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update order (admin or owner only)
router.put('/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const isAdmin = req.user.roles?.includes('admin');
    const isOwner = String(order.buyerId) === String(req.user._id);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order'
      });
    }

    if (!isAdmin && order.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: 'Only pending orders can be updated'
      });
    }

    const protectedFields = [
      'buyerId',
      'sellerId',
      'status',
      'orderItems',
      'subtotal',
      'deliveryFee',
      'tax',
      'total',
      'currency',
      'paymentTerms',
      'priceAgreementId',
      'marketplaceRequestId',
      'delivery',
      'commission',
      'statusHistory',
      'createdAt',
      'updatedAt',
      'orderNumber'
    ];
    const attemptedProtectedFields = protectedFields.filter((field) => req.body[field] !== undefined);

    if (attemptedProtectedFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Protected order fields cannot be updated through this endpoint',
        fields: attemptedProtectedFields
      });
    }

    const updateData = {};
    if (req.body.deliveryAddress !== undefined) {
      if (!req.body.deliveryAddress || typeof req.body.deliveryAddress !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'deliveryAddress must be an object'
        });
      }

      updateData.deliveryAddress = {
        line1: req.body.deliveryAddress.line1,
        line2: req.body.deliveryAddress.line2,
        city: req.body.deliveryAddress.city,
        state: req.body.deliveryAddress.state,
        postalCode: req.body.deliveryAddress.postalCode,
        country: req.body.deliveryAddress.country,
        coordinates: req.body.deliveryAddress.coordinates
      };
    }

    if (req.body.notes !== undefined) {
      updateData.notes = req.body.notes;
    }

    if (req.body.scheduledWindowStart !== undefined) {
      updateData.scheduledWindowStart = req.body.scheduledWindowStart;
    }

    if (req.body.scheduledWindowEnd !== undefined) {
      updateData.scheduledWindowEnd = req.body.scheduledWindowEnd;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No editable order fields were provided'
      });
    }

    Object.assign(order, updateData);
    await order.save();

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: { order }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
