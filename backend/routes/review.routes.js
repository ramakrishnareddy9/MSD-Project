import express from 'express';
import Review from '../models/Review.model.js';

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

// Create review
router.post('/', async (req, res) => {
  try {
    const review = new Review(req.body);
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
