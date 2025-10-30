import express from 'express';
import mongoose from 'mongoose';
import Shipment from '../models/Shipment.model.js';
import DeliveryTask from '../models/DeliveryTask.model.js';
import Order from '../models/Order.model.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validateObjectId } from '../middleware/validation.middleware.js';

const router = express.Router();

/**
 * SHIPMENT ROUTES (Long-haul delivery)
 */

// Get shipments for delivery partner
router.get('/shipments', authenticate, authorize('delivery', 'delivery_large', 'admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
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
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Shipment.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        shipments,
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
  const session = await mongoose.startSession();
  session.startTransaction();
  
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
    
    await shipment.save({ session });
    
    // Update orders with shipment reference
    for (const orderItem of orders) {
      await Order.findByIdAndUpdate(
        orderItem.orderId,
        {
          'delivery.shipmentId': shipment._id,
          'delivery.trackingNumber': shipment.shipmentNumber,
          'delivery.estimatedDelivery': estimatedArrival
        },
        { session }
      );
    }
    
    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      message: 'Shipment created successfully',
      data: { shipment }
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
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
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await DeliveryTask.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        tasks,
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
  const session = await mongoose.startSession();
  session.startTransaction();
  
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
    
    await task.save({ session });
    
    // Update order with delivery task reference
    await Order.findByIdAndUpdate(
      orderId,
      {
        'delivery.deliveryTaskId': task._id,
        'delivery.trackingNumber': task.taskNumber
      },
      { session }
    );
    
    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      message: 'Delivery task created successfully',
      data: { task }
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
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
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { proof } = req.body;
    
    const task = await DeliveryTask.findById(req.params.id).session(session);
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    if (String(task.deliveryPartnerId) !== String(req.user._id)) {
      throw new Error('Access denied');
    }
    
    await task.complete(proof);
    
    // Update order status
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
    
    res.json({
      success: true,
      message: 'Delivery completed',
      data: { task }
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
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
