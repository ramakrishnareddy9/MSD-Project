import Dispute from '../models/Dispute.model.js';
import Order from '../models/Order.model.js';
import Payment from '../models/Payment.model.js';
import { notifyUsers } from '../utils/notification.util.js';

const DISPUTE_WINDOW_DAYS = Number(process.env.DISPUTE_WINDOW_DAYS || 7);

const getDeliveredAt = (order) => {
  return order.actualDeliveryDate || order.updatedAt || order.createdAt;
};

export const createDispute = async (req, res) => {
  try {
    const { orderId, reason, description, evidenceImages = [] } = req.body;

    if (!orderId || !reason || !description) {
      return res.status(400).json({
        success: false,
        message: 'orderId, reason, and description are required'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (String(order.buyerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the buyer can open a dispute' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ success: false, message: 'Disputes can only be opened for delivered orders' });
    }

    const deliveredAt = getDeliveredAt(order);
    const elapsedDays = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
    if (!Number.isFinite(elapsedDays) || elapsedDays > DISPUTE_WINDOW_DAYS) {
      return res.status(400).json({
        success: false,
        message: `Disputes must be opened within ${DISPUTE_WINDOW_DAYS} days of delivery`
      });
    }

    const existing = await Dispute.findOne({ orderId: order._id, buyerId: req.user._id });
    if (existing && ['open', 'under_review'].includes(existing.status)) {
      return res.status(400).json({ success: false, message: 'A dispute is already open for this order' });
    }

    const dispute = await Dispute.create({
      orderId: order._id,
      buyerId: req.user._id,
      reason,
      description: String(description).trim(),
      evidenceImages: Array.isArray(evidenceImages) ? evidenceImages.filter(Boolean) : []
    });

    await notifyUsers([order.sellerId, req.user._id], {
      title: 'Order Dispute Opened',
      message: `A dispute was opened for order ${order.orderNumber}.`,
      type: 'alert',
      relatedId: dispute._id
    });

    res.status(201).json({
      success: true,
      message: 'Dispute opened successfully',
      data: { dispute }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listDisputes = async (req, res) => {
  try {
    const { status, buyerId, orderId, page = 1, limit = 20 } = req.query;
    const cappedLimit = Math.min(Number(limit) || 20, 100);

    const query = {};
    const isAdmin = req.user?.roles?.includes('admin');

    if (!isAdmin) {
      query.buyerId = req.user._id;
    } else if (buyerId) {
      query.buyerId = buyerId;
    }

    if (status) {
      query.status = status;
    }

    if (orderId) {
      query.orderId = orderId;
    }

    const disputes = await Dispute.find(query)
      .populate('orderId', 'orderNumber total status createdAt sellerId buyerId')
      .populate('buyerId', 'name email phone')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(cappedLimit)
      .skip((page - 1) * cappedLimit);

    const count = await Dispute.countDocuments(query);

    res.json({
      success: true,
      data: {
        disputes,
        totalPages: Math.ceil(count / cappedLimit),
        currentPage: Number(page),
        total: count
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resolveDispute = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }

    const resolution = String(req.body.resolution || req.body.status || '').trim();
    const resolutionNotes = String(req.body.resolutionNotes || req.body.notes || '').trim();

    if (!['under_review', 'resolved_refund', 'resolved_replacement', 'rejected'].includes(resolution)) {
      return res.status(400).json({
        success: false,
        message: 'resolution must be one of: under_review, resolved_refund, resolved_replacement, rejected'
      });
    }

    if (dispute.status !== 'open' && dispute.status !== 'under_review') {
      return res.status(400).json({ success: false, message: `Dispute already ${dispute.status}` });
    }

    const order = await Order.findById(dispute.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Associated order not found' });
    }

    let refundPayment = null;
    if (resolution === 'resolved_refund') {
      refundPayment = await Payment.findOne({ orderId: order._id });
      if (!refundPayment) {
        return res.status(400).json({
          success: false,
          message: 'No payment found for this order, cannot trigger refund'
        });
      }

      await refundPayment.processRefund(undefined, resolutionNotes || 'Dispute refund');
    }

    dispute.status = resolution;
    dispute.resolutionNotes = resolutionNotes || undefined;
    dispute.resolvedBy = req.user._id;
    dispute.resolvedAt = new Date();
    dispute.refundPaymentId = refundPayment?._id || undefined;
    await dispute.save();

    await notifyUsers([dispute.buyerId, order.sellerId], {
      title: 'Dispute Resolved',
      message: resolution === 'resolved_refund'
        ? `Your dispute for order ${order.orderNumber} was resolved with a refund.`
        : resolution === 'resolved_replacement'
          ? `Your dispute for order ${order.orderNumber} was resolved with a replacement.`
          : resolution === 'under_review'
            ? `Your dispute for order ${order.orderNumber} is under review.`
            : `Your dispute for order ${order.orderNumber} was rejected.`,
      type: 'system',
      relatedId: dispute._id
    });

    res.json({
      success: true,
      message: 'Dispute resolved successfully',
      data: { dispute }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
