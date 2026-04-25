import express from 'express';
import crypto from 'crypto';
import Payment from '../models/Payment.model.js';
import Order from '../models/Order.model.js';
import Commission from '../models/Commission.model.js';
import MarketplaceRequest from '../models/MarketplaceRequest.model.js';
import { notifyUsers } from '../utils/notification.util.js';
import { assertTransactionVerification } from '../utils/verification.util.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validateObjectId } from '../middleware/validation.middleware.js';

const router = express.Router();

const verifyRazorpaySignature = (payload, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error('Razorpay webhook secret is not configured');
  }

  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(String(signature));

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
};

const finalizeSuccessfulPayment = async ({ payment, transactionId, paymentId, metadata, updatedBy }) => {
  await payment.markSuccess({ transactionId, paymentId, metadata });

  const updatedOrder = await Order.findByIdAndUpdate(payment.orderId, {
    status: 'confirmed',
    $push: {
      statusHistory: {
        status: 'confirmed',
        timestamp: new Date(),
        updatedBy,
        notes: 'Payment received'
      }
    }
  }, { new: true });

  const commission = await Commission.findOne({ orderId: payment.orderId });
  if (commission && commission.status === 'pending') {
    await commission.markCollected();
  }

  if (updatedOrder) {
    await notifyUsers([updatedOrder.buyerId, updatedOrder.sellerId], {
      title: 'Payment Successful',
      message: `Payment received for order ${updatedOrder.orderNumber}. Order is now confirmed.`,
      type: 'payment',
      relatedId: updatedOrder._id
    });
  }

  return updatedOrder;
};

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
    
    if (orderId) {
      if (query.orderId && query.orderId.$in) {
        query.orderId = { $in: query.orderId.$in.filter((id) => String(id) === String(orderId)) };
      } else {
        query.orderId = orderId;
      }
    }
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
// Expects an `Idempotency-Key` header (client-generated UUID) to prevent
// duplicate charge attempts caused by network retries or double-clicks.
router.post('/', authenticate, async (req, res) => {
  try {
    const { orderId, amount, method, gateway } = req.body;
    const idempotencyKey = (req.headers['idempotency-key'] || '').trim() || null;

    // ── Idempotency check ──────────────────────────────────────────────
    // If the client re-sends the same key, return the existing payment
    // instead of creating a duplicate.
    if (idempotencyKey) {
      const existingByKey = await Payment.findOne({ idempotencyKey });
      if (existingByKey) {
        return res.status(200).json({
          success: true,
          message: 'Payment already created (idempotent)',
          data: { payment: existingByKey }
        });
      }
    }

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

    if (order.marketplaceRequestId) {
      const linkedRequest = await MarketplaceRequest.findById(order.marketplaceRequestId);
      if (!linkedRequest) {
        return res.status(400).json({
          success: false,
          message: 'Linked negotiation request not found for this order'
        });
      }

      if (
        linkedRequest.status !== 'accepted' ||
        !linkedRequest.buyerAccepted ||
        !linkedRequest.farmerAccepted ||
        !Number(linkedRequest.agreedPrice)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Payment is allowed only after both buyer and farmer accept the negotiated price'
        });
      }
    }

    const verificationCheck = assertTransactionVerification(req.user, order.total, order.type);
    if (!verificationCheck.ok) {
      return res.status(403).json({
        success: false,
        message: verificationCheck.message
      });
    }

    // Check if a non-failed payment already exists for this order
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
      currency: order.currency || 'INR',
      ...(idempotencyKey ? { idempotencyKey } : {})
    });

    try {
      await payment.save();
    } catch (saveErr) {
      // ── Race-condition safety net ─────────────────────────────────────
      // If two identical requests slip past the findOne check above,
      // the unique index on idempotencyKey will reject the second insert.
      // Return the first record instead of an error.
      if (saveErr?.code === 11000 && idempotencyKey) {
        const racedPayment = await Payment.findOne({ idempotencyKey });
        if (racedPayment) {
          return res.status(200).json({
            success: true,
            message: 'Payment already created (idempotent)',
            data: { payment: racedPayment }
          });
        }
      }
      throw saveErr;
    }

    await notifyUsers([order.buyerId, order.sellerId], {
      title: 'Payment Initiated',
      message: `Payment has been initiated for order ${order.orderNumber}.`,
      type: 'payment',
      relatedId: order._id
    });

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

// Mark payment as success (admin only)
router.patch('/:id/success', authenticate, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const { transactionId, paymentId, metadata } = req.body;

    const updatedOrder = await finalizeSuccessfulPayment({
      payment,
      transactionId,
      paymentId,
      metadata,
      updatedBy: req.user._id
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

// Razorpay webhook - verified gateway callback only
router.post('/webhook/razorpay', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || '';

    if (!verifyRazorpaySignature(rawBody, signature)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Razorpay signature'
      });
    }

    const event = req.body;
    const paymentEntity = event?.payload?.payment?.entity;

    if (!paymentEntity?.notes?.paymentId && !paymentEntity?.order_id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook payload'
      });
    }

    const payment = await Payment.findOne({
      $or: [
        { _id: paymentEntity.notes?.paymentId },
        { gatewayOrderId: paymentEntity.order_id },
        { transactionId: paymentEntity.id }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status === 'success') {
      return res.json({ success: true, message: 'Payment already processed' });
    }

    await finalizeSuccessfulPayment({
      payment,
      transactionId: paymentEntity.id,
      paymentId: paymentEntity.id,
      metadata: {
        gateway: 'razorpay',
        event: event?.event,
        gatewayOrderId: paymentEntity.order_id
      },
      updatedBy: payment.orderId
    });

    return res.json({
      success: true,
      message: 'Payment webhook processed successfully'
    });
  } catch (error) {
    return res.status(500).json({
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

    const order = await Order.findById(payment.orderId);
    if (order) {
      await notifyUsers([order.buyerId, order.sellerId], {
        title: 'Payment Failed',
        message: `Payment failed for order ${order.orderNumber}${reason ? `: ${reason}` : ''}.`,
        type: 'payment',
        relatedId: order._id
      });
    }

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

    const order = await Order.findById(payment.orderId);
    if (order) {
      await notifyUsers([order.buyerId, order.sellerId], {
        title: 'Refund Processed',
        message: `Refund of ${amount || payment.amount} has been processed for order ${order.orderNumber}.`,
        type: 'payment',
        relatedId: order._id
      });
    }

    res.json({
      success: true,
      message: payment.status === 'refunded' ? 'Refund processed successfully' : 'Partial refund processed successfully',
      data: { payment }
    });
  } catch (error) {
    const statusCode = /refund|balance|successful or partially refunded/i.test(error.message) ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
