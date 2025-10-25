import express from 'express';
import RecurringOrder from '../models/RecurringOrder.model.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validateRecurringOrder, validateObjectId } from '../middleware/validation.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const router = express.Router();

/**
 * Recurring Order Routes
 * Per BACKEND_API_PROMPT.md lines 419-427
 */

/**
 * @route   GET /api/recurring-orders
 * @desc    List recurring order schedules for current user (admin can list all)
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const query = {};
  
  // Admins can see all, others see only their own
  if (!req.user.roles.includes('admin')) {
    query.buyerId = req.user._id;
  }
  
  // Optional filters
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  if (req.query.type) {
    query.type = req.query.type;
  }
  
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  const [orders, total] = await Promise.all([
    RecurringOrder.find(query)
      .populate('buyerId', 'name email')
      .populate('itemsTemplate.productId', 'name basePrice images')
      .sort({ 'schedule.nextRunAt': 1 })
      .skip(skip)
      .limit(limit),
    RecurringOrder.countDocuments(query)
  ]);
  
  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

/**
 * @route   GET /api/recurring-orders/:id
 * @desc    Get a recurring schedule by ID
 * @access  Private
 */
router.get('/:id', authenticate, validateObjectId('id'), asyncHandler(async (req, res) => {
  const order = await RecurringOrder.findById(req.params.id)
    .populate('buyerId', 'name email addresses')
    .populate('itemsTemplate.productId', 'name description basePrice unit images')
    .populate('lastRun.orderId');
  
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Recurring order not found'
    });
  }
  
  // Check ownership (unless admin)
  if (!req.user.roles.includes('admin') && 
      order.buyerId._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden - You can only view your own recurring orders'
    });
  }
  
  res.json({
    success: true,
    data: { order }
  });
}));

/**
 * @route   POST /api/recurring-orders
 * @desc    Create recurring schedule (buyer roles only)
 * @access  Private (business, restaurant, customer)
 */
router.post('/', 
  authenticate, 
  authorize('business', 'restaurant', 'customer'),
  validateRecurringOrder,
  asyncHandler(async (req, res) => {
    const {
      type,
      itemsTemplate,
      deliveryAddressId,
      deliveryPreferences,
      pricingPreferences,
      schedule
    } = req.body;
    
    // Ensure buyerId matches authenticated user
    const buyerId = req.user._id;
    
    // Validate delivery address exists in user's addresses
    const user = await mongoose.model('User').findById(buyerId);
    const addressExists = user.addresses.some(addr => addr._id.toString() === deliveryAddressId);
    
    if (!addressExists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery address ID'
      });
    }
    
    // Create recurring order
    const recurringOrder = new RecurringOrder({
      buyerId,
      type,
      itemsTemplate,
      deliveryAddressId,
      deliveryPreferences,
      pricingPreferences,
      schedule: {
        ...schedule,
        nextRunAt: new Date(schedule.nextRunAt)
      },
      createdBy: buyerId
    });
    
    await recurringOrder.save();
    
    res.status(201).json({
      success: true,
      message: 'Recurring order schedule created successfully',
      data: { order: recurringOrder }
    });
  })
);

/**
 * @route   PUT /api/recurring-orders/:id
 * @desc    Update recurring schedule
 * @access  Private
 */
router.put('/:id', 
  authenticate, 
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const order = await RecurringOrder.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Recurring order not found'
      });
    }
    
    // Check ownership
    if (!req.user.roles.includes('admin') && 
        order.buyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - You can only update your own recurring orders'
      });
    }
    
    // Update allowed fields
    const allowedUpdates = [
      'itemsTemplate', 
      'deliveryAddressId', 
      'deliveryPreferences', 
      'pricingPreferences',
      'schedule'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        order[field] = req.body[field];
      }
    });
    
    order.updatedBy = req.user._id;
    await order.save();
    
    res.json({
      success: true,
      message: 'Recurring order updated successfully',
      data: { order }
    });
  })
);

/**
 * @route   PATCH /api/recurring-orders/:id/pause
 * @desc    Pause a schedule
 * @access  Private
 */
router.patch('/:id/pause', 
  authenticate, 
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const order = await RecurringOrder.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Recurring order not found'
      });
    }
    
    // Check ownership
    if (!req.user.roles.includes('admin') && 
        order.buyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden'
      });
    }
    
    await order.pause(req.user._id);
    
    res.json({
      success: true,
      message: 'Recurring order paused successfully',
      data: { order }
    });
  })
);

/**
 * @route   PATCH /api/recurring-orders/:id/resume
 * @desc    Resume a schedule
 * @access  Private
 */
router.patch('/:id/resume', 
  authenticate, 
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const order = await RecurringOrder.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Recurring order not found'
      });
    }
    
    // Check ownership
    if (!req.user.roles.includes('admin') && 
        order.buyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden'
      });
    }
    
    await order.resume(req.user._id);
    
    res.json({
      success: true,
      message: 'Recurring order resumed successfully',
      data: { order }
    });
  })
);

/**
 * @route   DELETE /api/recurring-orders/:id
 * @desc    Cancel and remove schedule
 * @access  Private
 */
router.delete('/:id', 
  authenticate, 
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const order = await RecurringOrder.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Recurring order not found'
      });
    }
    
    // Check ownership
    if (!req.user.roles.includes('admin') && 
        order.buyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden'
      });
    }
    
    await order.cancel(req.user._id);
    
    res.json({
      success: true,
      message: 'Recurring order cancelled successfully'
    });
  })
);

export default router;
