import express from 'express';
import PriceAgreement from '../models/PriceAgreement.model.js';
import Product from '../models/Product.model.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validateObjectId } from '../middleware/validation.middleware.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Validation middleware
const validatePriceAgreement = [
  body('sellerId').isMongoId().withMessage('Valid seller ID is required'),
  body('buyerId').isMongoId().withMessage('Valid buyer ID is required'),
  body('productId').isMongoId().withMessage('Valid product ID is required'),
  body('tiers').isArray({ min: 1 }).withMessage('At least one pricing tier is required'),
  body('tiers.*.minQuantity').isNumeric().withMessage('Min quantity must be a number'),
  body('tiers.*.price').isNumeric().withMessage('Price must be a number'),
  body('validFrom').isISO8601().withMessage('Valid from date is required'),
  body('validUntil').isISO8601().withMessage('Valid until date is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];

// Get all price agreements (filtered by role)
router.get('/', authenticate, async (req, res) => {
  try {
    const { sellerId, buyerId, productId, status, page = 1, limit = 20 } = req.query;
    
    let query = {};
    
    // Filter based on role
    if (req.user.roles.includes('farmer')) {
      query.sellerId = req.user._id;
    } else if (req.user.roles.includes('business') || req.user.roles.includes('restaurant')) {
      query.buyerId = req.user._id;
    } else if (!req.user.roles.includes('admin')) {
      // Other roles can't access price agreements
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Admin can filter by sellerId, buyerId
    if (sellerId && req.user.roles.includes('admin')) query.sellerId = sellerId;
    if (buyerId && req.user.roles.includes('admin')) query.buyerId = buyerId;
    if (productId) query.productId = productId;
    if (status) query.status = status;

    const agreements = await PriceAgreement.find(query)
      .populate('sellerId', 'name email')
      .populate('buyerId', 'name email')
      .populate('productId', 'name unit basePrice')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await PriceAgreement.countDocuments(query);

    res.json({
      success: true,
      data: {
        agreements,
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

// Get price agreement by ID (owner or admin)
router.get('/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const agreement = await PriceAgreement.findById(req.params.id)
      .populate('sellerId', 'name email phone')
      .populate('buyerId', 'name email phone')
      .populate('productId', 'name description unit basePrice images')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');
    
    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'Price agreement not found'
      });
    }

    // Check access
    const hasAccess = 
      req.user.roles.includes('admin') ||
      String(agreement.sellerId._id) === String(req.user._id) ||
      String(agreement.buyerId._id) === String(req.user._id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { agreement }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create price agreement (farmers and businesses)
router.post('/', authenticate, authorize('farmer', 'business', 'restaurant', 'admin'), validatePriceAgreement, async (req, res) => {
  try {
    const { sellerId, buyerId, productId, tiers, validFrom, validUntil, terms, notes } = req.body;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Verify seller owns the product (unless admin)
    if (!req.user.roles.includes('admin')) {
      if (String(product.ownerId) !== String(sellerId)) {
        return res.status(400).json({
          success: false,
          message: 'Seller does not own this product'
        });
      }

      // Ensure user is either seller or buyer
      const isParty = 
        String(sellerId) === String(req.user._id) || 
        String(buyerId) === String(req.user._id);
      
      if (!isParty) {
        return res.status(403).json({
          success: false,
          message: 'You must be either the seller or buyer'
        });
      }
    }

    // Validate date range
    if (new Date(validFrom) >= new Date(validUntil)) {
      return res.status(400).json({
        success: false,
        message: 'Valid until date must be after valid from date'
      });
    }

    const agreement = new PriceAgreement({
      sellerId,
      buyerId,
      productId,
      tiers,
      validFrom,
      validUntil,
      terms,
      notes,
      createdBy: req.user._id,
      status: 'draft'
    });

    await agreement.save();

    res.status(201).json({
      success: true,
      message: 'Price agreement created successfully',
      data: { agreement }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update price agreement (creator or admin, only if draft/pending)
router.put('/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const agreement = await PriceAgreement.findById(req.params.id);
    
    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'Price agreement not found'
      });
    }

    // Only draft or pending agreements can be updated
    if (!['draft', 'pending_approval'].includes(agreement.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only draft or pending agreements can be updated'
      });
    }

    // Check if user can update
    const canUpdate = 
      req.user.roles.includes('admin') ||
      String(agreement.createdBy) === String(req.user._id);
    
    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator or admin can update this agreement'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['tiers', 'validFrom', 'validUntil', 'terms', 'notes'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        agreement[field] = req.body[field];
      }
    });

    await agreement.save();

    res.json({
      success: true,
      message: 'Price agreement updated successfully',
      data: { agreement }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Activate price agreement (admin or seller)
router.patch('/:id/activate', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const agreement = await PriceAgreement.findById(req.params.id);
    
    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'Price agreement not found'
      });
    }

    // Check authorization
    const canActivate = 
      req.user.roles.includes('admin') ||
      String(agreement.sellerId) === String(req.user._id);
    
    if (!canActivate) {
      return res.status(403).json({
        success: false,
        message: 'Only the seller or admin can activate this agreement'
      });
    }

    await agreement.activate(req.user._id);

    res.json({
      success: true,
      message: 'Price agreement activated successfully',
      data: { agreement }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Reject price agreement (admin or seller)
router.patch('/:id/reject', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const agreement = await PriceAgreement.findById(req.params.id);
    
    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'Price agreement not found'
      });
    }

    // Check authorization
    const canReject = 
      req.user.roles.includes('admin') ||
      String(agreement.sellerId) === String(req.user._id);
    
    if (!canReject) {
      return res.status(403).json({
        success: false,
        message: 'Only the seller or admin can reject this agreement'
      });
    }

    const { reason } = req.body;
    await agreement.reject(reason || 'No reason provided');

    res.json({
      success: true,
      message: 'Price agreement rejected',
      data: { agreement }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Cancel price agreement (creator or admin)
router.patch('/:id/cancel', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const agreement = await PriceAgreement.findById(req.params.id);
    
    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'Price agreement not found'
      });
    }

    // Check authorization
    const canCancel = 
      req.user.roles.includes('admin') ||
      String(agreement.createdBy) === String(req.user._id);
    
    if (!canCancel) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator or admin can cancel this agreement'
      });
    }

    agreement.status = 'cancelled';
    await agreement.save();

    res.json({
      success: true,
      message: 'Price agreement cancelled',
      data: { agreement }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get active price agreements for a product (B2B buyers and sellers)
router.get('/active/product/:productId', authenticate, authorize('farmer', 'business', 'restaurant', 'admin'), validateObjectId('productId'), async (req, res) => {
  try {
    const { productId } = req.params;
    const { buyerId } = req.query;

    // If buyer not specified, use current user (if business/restaurant)
    const effectiveBuyerId = buyerId || 
      (req.user.roles.some(r => ['business', 'restaurant'].includes(r)) ? req.user._id : null);

    if (!effectiveBuyerId && !req.user.roles.includes('admin')) {
      return res.status(400).json({
        success: false,
        message: 'Buyer ID is required'
      });
    }

    const agreements = await PriceAgreement.findActiveAgreements(
      null, // sellerId - any seller
      effectiveBuyerId,
      productId
    ).populate('sellerId', 'name email')
      .populate('buyerId', 'name email')
      .populate('productId', 'name unit basePrice');

    res.json({
      success: true,
      data: { agreements }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get price for quantity (public for authenticated B2B users)
router.post('/calculate-price', authenticate, authorize('business', 'restaurant', 'admin'), async (req, res) => {
  try {
    const { productId, sellerId, buyerId, quantity } = req.body;

    const agreements = await PriceAgreement.findActiveAgreements(sellerId, buyerId, productId);

    if (agreements.length === 0) {
      return res.json({
        success: true,
        data: { 
          hasAgreement: false,
          message: 'No active price agreement found'
        }
      });
    }

    // Use first active agreement
    const agreement = agreements[0];
    const price = agreement.getPriceForQuantity(quantity);

    if (!price) {
      return res.json({
        success: true,
        data: { 
          hasAgreement: true,
          applicablePrice: null,
          message: 'Quantity does not match any tier in the agreement'
        }
      });
    }

    res.json({
      success: true,
      data: {
        hasAgreement: true,
        applicablePrice: price,
        agreementId: agreement._id,
        tiers: agreement.tiers
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
