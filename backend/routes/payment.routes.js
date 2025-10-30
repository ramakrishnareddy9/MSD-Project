import express from 'express';
import Payment from '../models/Payment.model.js';
import Order from '../models/Order.model.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validateObjectId } from '../middleware/validation.middleware.js';

const router = express.Router();

// Get all payments (admin only, or user's own payments)
router.get('/', authenticate, async (req, res) => {
  try {
    const { orderId, status, method, page = 1, limit = 20 } = req.query;
    
    let query = {};
    
    // If not admin, only show user's payments
    if (!req.user.roles.includes('admin')) {
      // Get user's orders
      const userOrders = await Order.find({
        $or: [{ buyerId: req.user._id }, { sellerId: req.user._id }]
      }).select('_id');
      const orderIds = userOrders.map(o => o._id);
      query.orderId = { $in: orderIds };
    }
    
    if (orderId) query.orderId = orderId;
    if (status) query.status = status;
    if (method) query.method = method;

    const payments = await Payment.find(query)
      .populate('orderId', 'orderNumber type buyerId sellerId total')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: {
        payments,
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

// Get payment by ID (owner or admin)
router.get('/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('orderId', 'orderNumber type buyerId sellerId total');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user has access
    if (!req.user.roles.includes('admin')) {
      const order = await Order.findById(payment.orderId);
      const hasAccess = 
        String(order.buyerId) === String(req.user._id) || 
        String(order.sellerId) === String(req.user._id);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: { payment }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create payment (authenticated users)
router.post('/', authenticate, async (req, res) => {
  try {
    const { orderId, amount, method, gateway } = req.body;

    // Verify order exists and user is the buyer
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (String(order.buyerId) !== String(req.user._id) && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only the buyer can create payment for this order'
      });
    }

    // Check if payment already exists for this order
    const existingPayment = await Payment.findOne({ orderId, status: { $in: ['success', 'processing'] } });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment already exists for this order'
      });
    }

    const payment = new Payment({
      orderId,
      amount: amount || order.total,
      method,
      gateway,
      currency: order.currency || 'INR'
    });

    await payment.save();

    res.status(201).json({
      success: true,
      message: 'Payment initiated successfully',
      data: { payment }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Mark payment as success (admin or payment gateway callback)
router.patch('/:id/success', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const { transactionId, paymentId, metadata } = req.body;

    await payment.markSuccess({
      transactionId,
      paymentId,
      metadata
    });

    // Update order status to confirmed
    await Order.findByIdAndUpdate(payment.orderId, {
      status: 'confirmed',
      $push: {
        statusHistory: {
          status: 'confirmed',
          timestamp: new Date(),
          updatedBy: req.user._id,
          notes: 'Payment received'
        }
      }
    });

    res.json({
      success: true,
      message: 'Payment marked as successful',
      data: { payment }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Mark payment as failed (admin or payment gateway callback)
router.patch('/:id/failed', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const { reason } = req.body;

    await payment.markFailed(reason);

    res.json({
      success: true,
      message: 'Payment marked as failed',
      data: { payment }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Process refund (admin only)
router.post('/:id/refund', authenticate, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const { amount, reason } = req.body;

    await payment.processRefund(amount, reason);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: { payment }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get payment statistics (admin only)
router.get('/stats/overview', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const stats = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const methodStats = await Payment.aggregate([
      { $match: { status: 'success', ...matchStage } },
      {
        $group: {
          _id: '$method',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        byStatus: stats,
        byMethod: methodStats
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
