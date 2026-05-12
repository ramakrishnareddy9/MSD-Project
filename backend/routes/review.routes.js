import express from 'express';
import Review from '../models/Review.model.js';
import Order from '../models/Order.model.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateReview } from '../middleware/validation.middleware.js';

const router = express.Router();

// Get reviews
router.get('/', async (req, res) => {
  try {
    const { productId, userId, status = 'published', page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (productId) query.productId = productId;
    if (userId) query.userId = userId;
    if (status) query.status = status;

    const reviews = await Review.find(query)
      .populate('userId', 'name profileImage')
      .populate('productId', 'name images')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Review.countDocuments(query);

    res.json({
      success: true,
      data: {
        reviews,
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

// Create review (authenticated users only, validated)
router.post('/', authenticate, validateReview, async (req, res) => {
  try {
    const { productId, orderId } = req.body;

    // 2.11: Verify the reviewer has a delivered order containing this product
    const eligibleOrder = await Order.findOne({
      _id: orderId,
      buyerId: req.user._id,
      status: 'delivered',
      'orderItems.productId': productId
    }).select('_id');

    if (!eligibleOrder) {
      return res.status(403).json({
        success: false,
        message: 'You can only review products from your own delivered orders',
        code: 'REVIEW_NOT_ELIGIBLE'
      });
    }

    // Prevent duplicate review for the same order (additional guard before DB unique index)
    const existing = await Review.findOne({ userId: req.user._id, orderId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this order',
        code: 'DUPLICATE_REVIEW'
      });
    }

    // Always set userId and verifiedPurchase server-side (never trust client)
    const review = new Review({
      ...req.body,
      userId: req.user._id,
      verifiedPurchase: true
    });
    await review.save();

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: { review }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;

