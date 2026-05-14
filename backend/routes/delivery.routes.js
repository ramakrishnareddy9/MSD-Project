import express from 'express';
import mongoose from 'mongoose';
import Shipment from '../models/Shipment.model.js';
import DeliveryTask from '../models/DeliveryTask.model.js';
import Order from '../models/Order.model.js';
import Payment from '../models/Payment.model.js';
import Commission from '../models/Commission.model.js';
import User from '../models/User.model.js';
import MarketplaceRequest from '../models/MarketplaceRequest.model.js';
import CommunityPool from '../models/CommunityPool.model.js';
import { notifyUsers } from '../utils/notification.util.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validateObjectId } from '../middleware/validation.middleware.js';

const router = express.Router();

/**
 * Guard: returns true only when MongoDB is connected and can start a session.
 * Prevents cold-start crashes when a request arrives before the DB is ready.
 */
const isDbReady = () => mongoose.connection.readyState === 1;

/**
 * Checks whether the current MongoDB topology supports transactions.
 * Mirrors the helper in order.routes.js to avoid starting transactions on
 * standalone deployments which will throw MongoServerError.
 */
const supportsMongoTransactions = () => {
  if (process.env.DISABLE_MONGO_TRANSACTIONS === 'true') return false;
  if (mongoose.connection.readyState !== 1) return false;

  const topologyType = mongoose.connection.client?.topology?.description?.type;
  return ['ReplicaSetWithPrimary', 'Sharded', 'LoadBalanced'].includes(topologyType);
};


/**
 * SHIPMENT ROUTES (Long-haul delivery)
 */

// Get shipments for delivery partner
router.get('/shipments', authenticate, authorize('delivery', 'delivery_large', 'admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const cappedLimit = Math.min(Number(limit) || 20, 100);
    const query = {};
    
    // Filter by delivery partner unless admin
    if (!req.user.roles.includes('admin')) {
      query.deliveryPartnerId = req.user._id;
    }
    
    if (status) query.status = status;
    
    const shipments = await Shipment.find(query)
      .populate('origin.locationId', 'name type')
      .populate('destination.locationId', 'name type')
      .populate('orders.orderId', 'orderNumber')
      .sort({ createdAt: -1 })
      .limit(cappedLimit)
      .skip((page - 1) * cappedLimit);
    
    const count = await Shipment.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        shipments,
        totalPages: Math.ceil(count / cappedLimit),
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

// Get shipment by ID
router.get('/shipments/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate('origin.locationId')
      .populate('destination.locationId')
      .populate('orders.orderId')
      .populate('deliveryPartnerId', 'name email phone');
    
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }
    
    // Check access rights
    if (!req.user.roles.includes('admin') && 
        String(shipment.deliveryPartnerId._id) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: { shipment }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create shipment (admin or large-scale delivery)
router.post('/shipments', authenticate, authorize('admin', 'delivery_large'), async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).set('Retry-After', '5').json({
      success: false,
      message: 'Database not ready. Please retry in a few seconds.'
    });
  }

  const useTransaction = supportsMongoTransactions();
  const session = useTransaction ? await mongoose.startSession() : null;
  if (useTransaction) session.startTransaction();
  let shipmentCreatedId = null;
  try {
    const {
      type,
      origin,
      destination,
      orders,
      vehicleDetails,
      estimatedArrival
    } = req.body;
    
    const shipment = new Shipment({
      type,
      deliveryPartnerId: req.body.deliveryPartnerId || req.user._id,
      origin,
      destination,
      orders,
      vehicleDetails,
      status: 'scheduled',
      tracking: {
        estimatedArrival: new Date(estimatedArrival)
      }
    });
    
    if (useTransaction) {
      await shipment.save({ session });
    } else {
      await shipment.save();
      shipmentCreatedId = shipment._id;
    }
    
    // Update orders with shipment reference
    for (const orderItem of orders) {
      if (useTransaction) {
        await Order.findByIdAndUpdate(
          orderItem.orderId,
          {
            'delivery.shipmentId': shipment._id,
            'delivery.trackingNumber': shipment.shipmentNumber,
            'delivery.estimatedDelivery': estimatedArrival
          },
          { session }
        );
      } else {
        await Order.findByIdAndUpdate(
          orderItem.orderId,
          {
            'delivery.shipmentId': shipment._id,
            'delivery.trackingNumber': shipment.shipmentNumber,
            'delivery.estimatedDelivery': estimatedArrival
          }
        );
      }
    }

    if (useTransaction) await session.commitTransaction();

    const relatedOrders = await Order.find({ _id: { $in: orders.map((o) => o.orderId) } }).select('buyerId sellerId');
    const recipients = [shipment.deliveryPartnerId, ...relatedOrders.flatMap((o) => [o.buyerId, o.sellerId])];
    await notifyUsers(recipients, {
      title: 'Shipment Scheduled',
      message: `Shipment ${shipment.shipmentNumber} has been scheduled.`,
      type: 'delivery',
      relatedId: shipment._id
    });
    
    res.status(201).json({
      success: true,
      message: 'Shipment created successfully',
      data: { shipment }
    });
  } catch (error) {
    if (useTransaction && session) await session.abortTransaction();
    // Compensating rollback for non-transactional topology
    if (!useTransaction) {
      try {
        if (shipmentCreatedId) {
          await Shipment.findByIdAndDelete(shipmentCreatedId).catch(() => {});
        }
        await Order.updateMany(
          { _id: { $in: orders.map((o) => o.orderId) } },
          { $unset: { 'delivery.shipmentId': '', 'delivery.trackingNumber': '', 'delivery.estimatedDelivery': '' } }
        ).catch(() => {});
      } catch (_) {}
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    if (session) session.endSession();
  }
});

// Update shipment tracking
router.patch('/shipments/:id/tracking', authenticate, authorize('delivery', 'delivery_large'), validateObjectId('id'), async (req, res) => {
  try {
    const { coordinates, checkpoint } = req.body;
    
    const shipment = await Shipment.findById(req.params.id);
    
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }
    
    // Verify ownership
    if (String(shipment.deliveryPartnerId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await shipment.updateTracking(coordinates, checkpoint);
    
    res.json({
      success: true,
      message: 'Tracking updated successfully',
      data: { shipment }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Mark shipment as delivered
router.patch('/shipments/:id/deliver', authenticate, authorize('delivery', 'delivery_large'), validateObjectId('id'), async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }
    
    if (String(shipment.deliveryPartnerId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await shipment.markDelivered();

    const relatedOrders = await Order.find({ _id: { $in: shipment.orders.map((o) => o.orderId) } }).select('buyerId sellerId');
    const recipients = [shipment.deliveryPartnerId, ...relatedOrders.flatMap((o) => [o.buyerId, o.sellerId])];
    await notifyUsers(recipients, {
      title: 'Shipment Delivered',
      message: `Shipment ${shipment.shipmentNumber} has been marked as delivered.`,
      type: 'delivery',
      relatedId: shipment._id
    });
    
    res.json({
      success: true,
      message: 'Shipment marked as delivered',
      data: { shipment }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELIVERY TASK ROUTES (Last-mile delivery)
 */

// Get delivery tasks
router.get('/tasks', authenticate, authorize('delivery', 'delivery_small', 'admin'), async (req, res) => {
  try {
    const { status, date, slot, page = 1, limit = 20 } = req.query;
    const cappedLimit = Math.min(Number(limit) || 20, 100);
    const query = {};
    
    // Filter by delivery partner unless admin
    if (!req.user.roles.includes('admin')) {
      query.deliveryPartnerId = req.user._id;
    }
    
    if (status) query.status = status;
    if (date) {
      query['timeSlot.date'] = {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
      };
    }
    if (slot) query['timeSlot.slot'] = slot;
    
    const tasks = await DeliveryTask.find(query)
      .populate('orderId', 'orderNumber total')
      .populate('pickupLocation.locationId', 'name type')
      .sort({ 'timeSlot.date': 1, priority: -1 })
      .limit(cappedLimit)
      .skip((page - 1) * cappedLimit);
    
    const count = await DeliveryTask.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        tasks,
        totalPages: Math.ceil(count / cappedLimit),
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

// Get task by ID
router.get('/tasks/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const task = await DeliveryTask.findById(req.params.id)
      .populate('orderId')
      .populate('shipmentId')
      .populate('pickupLocation.locationId')
      .populate('deliveryPartnerId', 'name email phone');
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Delivery task not found'
      });
    }
    
    // Check access rights
    if (!req.user.roles.includes('admin') && 
        String(task.deliveryPartnerId._id) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: { task }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create delivery task
router.post('/tasks', authenticate, authorize('admin', 'delivery_small'), async (req, res) => {
  if (!isDbReady()) {
    return res.status(503).set('Retry-After', '5').json({
      success: false,
      message: 'Database not ready. Please retry in a few seconds.'
    });
  }

  const useTransaction = supportsMongoTransactions();
  const session = useTransaction ? await mongoose.startSession() : null;
  if (useTransaction) session.startTransaction();
  let taskCreatedId = null;
  try {
    const {
      type,
      orderId,
      shipmentId,
      pickupLocation,
      deliveryLocation,
      timeSlot,
      priority
    } = req.body;
    
    // Verify order exists
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new Error('Order not found');
    }
    
    const task = new DeliveryTask({
      type: type || 'last_mile',
      deliveryPartnerId: req.body.deliveryPartnerId || req.user._id,
      orderId,
      shipmentId,
      pickupLocation,
      deliveryLocation: deliveryLocation || order.deliveryAddress,
      timeSlot,
      priority: priority || 'normal',
      payment: {
        method: order.paymentTerms === 'cod' ? 'cod' : 'prepaid',
        codAmount: order.paymentTerms === 'cod' ? order.total : 0,
        deliveryCharge: order.deliveryFee
      }
    });
    
    if (useTransaction) {
      await task.save({ session });
    } else {
      await task.save();
      taskCreatedId = task._id;
    }

    // Update order with delivery task reference
    if (useTransaction) {
      await Order.findByIdAndUpdate(
        orderId,
        {
          'delivery.deliveryTaskId': task._id,
          'delivery.trackingNumber': task.taskNumber
        },
        { session }
      );
      await session.commitTransaction();
    } else {
      await Order.findByIdAndUpdate(
        orderId,
        {
          'delivery.deliveryTaskId': task._id,
          'delivery.trackingNumber': task.taskNumber
        }
      );
    }

    await notifyUsers([task.deliveryPartnerId, order.buyerId, order.sellerId], {
      title: 'Delivery Task Created',
      message: `Delivery task ${task.taskNumber} has been created for order ${order.orderNumber}.`,
      type: 'delivery',
      relatedId: task._id
    });
    
    res.status(201).json({
      success: true,
      message: 'Delivery task created successfully',
      data: { task }
    });
  } catch (error) {
    if (useTransaction && session) await session.abortTransaction();
    if (!useTransaction) {
      try {
        if (taskCreatedId) await DeliveryTask.findByIdAndDelete(taskCreatedId).catch(() => {});
        await Order.findByIdAndUpdate(orderId, { $unset: { 'delivery.deliveryTaskId': '', 'delivery.trackingNumber': '' } }).catch(() => {});
      } catch (_) {}
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    if (session) session.endSession();
  }
});

// Accept delivery task
router.patch('/tasks/:id/accept', authenticate, authorize('delivery', 'delivery_small'), validateObjectId('id'), async (req, res) => {
  try {
    const task = await DeliveryTask.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    if (String(task.deliveryPartnerId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await task.accept();

    const order = await Order.findById(task.orderId).select('orderNumber buyerId sellerId');
    if (order) {
      await notifyUsers([order.buyerId, order.sellerId], {
        title: 'Delivery Task Accepted',
        message: `Delivery partner accepted delivery task for order ${order.orderNumber}.`,
        type: 'delivery',
        relatedId: task._id
      });
    }
    
    res.json({
      success: true,
      message: 'Task accepted',
      data: { task }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Start delivery
router.patch('/tasks/:id/start', authenticate, authorize('delivery', 'delivery_small'), validateObjectId('id'), async (req, res) => {
  try {
    const task = await DeliveryTask.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    if (String(task.deliveryPartnerId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await task.startDelivery();

    const order = await Order.findById(task.orderId).select('orderNumber buyerId sellerId');
    if (order) {
      await notifyUsers([order.buyerId, order.sellerId], {
        title: 'Out For Delivery',
        message: `Order ${order.orderNumber} is now out for delivery.`,
        type: 'delivery',
        relatedId: task._id
      });
    }
    
    res.json({
      success: true,
      message: 'Delivery started',
      data: { task }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Complete delivery
router.patch('/tasks/:id/complete', authenticate, authorize('delivery', 'delivery_small'), validateObjectId('id'), async (req, res) => {
  const useTransaction = supportsMongoTransactions();
  const session = useTransaction ? await mongoose.startSession() : null;
  if (useTransaction) session.startTransaction();
  let taskProcessed = false;
  try {
    const { proof } = req.body;
    
    const task = useTransaction ? await DeliveryTask.findById(req.params.id).session(session) : await DeliveryTask.findById(req.params.id);
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    if (String(task.deliveryPartnerId) !== String(req.user._id)) {
      throw new Error('Access denied');
    }
    
    await task.complete(proof);
    taskProcessed = true;
    
    // Update order status
    if (useTransaction) {
      await Order.findByIdAndUpdate(
        task.orderId,
        {
          status: 'delivered',
          actualDeliveryDate: new Date(),
          'delivery.actualDelivery': new Date(),
          $push: {
            statusHistory: {
              status: 'delivered',
              timestamp: new Date(),
              updatedBy: req.user._id,
              notes: 'Delivered successfully'
            }
          }
        },
        { session }
      );

      await session.commitTransaction();
    } else {
      await Order.findByIdAndUpdate(
        task.orderId,
        {
          status: 'delivered',
          actualDeliveryDate: new Date(),
          'delivery.actualDelivery': new Date(),
          $push: {
            statusHistory: {
              status: 'delivered',
              timestamp: new Date(),
              updatedBy: req.user._id,
              notes: 'Delivered successfully'
            }
          }
        }
      );
    }

    const order = await Order.findById(task.orderId).select('orderNumber buyerId sellerId marketplaceRequestId total paymentTerms');
    if (order) {
      // 2.5: For COD orders — settle Payment record now that cash is collected
      if (order.paymentTerms === 'cod' || task.payment?.method === 'cod') {
        try {
          let payment = await Payment.findOne({ orderId: order._id });
          if (!payment) {
            payment = new Payment({
              orderId: order._id,
              amount: order.total,
              currency: 'INR',
              method: 'cod',
              gateway: 'manual',
              status: 'pending'
            });
          }
          payment.status = 'success';
          payment.paidAt = new Date();
          payment.transactionId = `COD-${task.taskNumber}`;
          await payment.save();

          // Mark commission as collected
          const commission = await Commission.findOne({ orderId: order._id });
          if (commission && commission.status === 'pending') {
            await commission.markCollected();
          }

          // Award loyalty points (1 pt per ₹1 spent)
          const pointsEarned = Math.floor(order.total || 0);
          if (pointsEarned > 0) {
            await User.findByIdAndUpdate(order.buyerId, { $inc: { loyaltyPoints: pointsEarned } });
          }
        } catch (codErr) {
          console.error('COD payment settlement failed:', codErr.message);
        }
      }

      // Notify all parties about delivery completion
      const targetUsers = [order.buyerId, order.sellerId, task.deliveryPartnerId];

      if (order.marketplaceRequestId) {
        const linkedRequest = await MarketplaceRequest.findById(order.marketplaceRequestId)
          .select('requesterType communityContext.poolId communityContext.contributorIds');
        if (linkedRequest?.requesterType === 'community') {
          const contributorIds = linkedRequest.communityContext?.contributorIds || [];
          targetUsers.push(...contributorIds);

          if (linkedRequest.communityContext?.poolId) {
            await CommunityPool.findByIdAndUpdate(linkedRequest.communityContext.poolId, {
              status: 'delivered',
              deliveredAt: new Date()
            });
          }
        }
      }

      await notifyUsers(targetUsers, {
        title: 'Order Delivered',
        message: `Order ${order.orderNumber} has been delivered successfully.`,
        type: 'delivery',
        relatedId: task._id
      });
    }
    
    res.json({
      success: true,
      message: 'Delivery completed',
      data: { task }
    });
  } catch (error) {
    if (useTransaction && session) await session.abortTransaction();
    // Compensating rollback for non-transactional topology: try to revert task.complete
    if (!useTransaction && taskProcessed) {
      try {
        // Attempt to mark task back to previous status (best-effort)
        await DeliveryTask.findByIdAndUpdate(req.params.id, { status: 'accepted' }).catch(() => {});
        await Order.findByIdAndUpdate(taskProcessed ? (await DeliveryTask.findById(req.params.id)).orderId : null, { $pop: { statusHistory: 1 } }).catch(() => {});
      } catch (_) {}
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    if (session) session.endSession();
  }
});

// Update location
router.patch('/tasks/:id/location', authenticate, authorize('delivery', 'delivery_small'), validateObjectId('id'), async (req, res) => {
  try {
    const { coordinates } = req.body;
    
    const task = await DeliveryTask.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    if (String(task.deliveryPartnerId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await task.updateLocation(coordinates);
    
    res.json({
      success: true,
      message: 'Location updated',
      data: { 
        currentLocation: task.tracking.currentLocation,
        taskId: task._id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
