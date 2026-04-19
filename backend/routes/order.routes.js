import express from 'express';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import InventoryLot from '../models/InventoryLot.model.js';
import PriceAgreement from '../models/PriceAgreement.model.js';
import Commission from '../models/Commission.model.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validateOrder, validateObjectId } from '../middleware/validation.middleware.js';

const router = express.Router();

// Get all orders (auth required - buyers see their own, sellers see received, admin sees all)
router.get('/', authenticate, async (req, res) => {
  try {
    const { buyerId, sellerId, type, status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    const isAdmin = req.user.roles?.includes('admin');

    if (isAdmin) {
      if (buyerId) query.buyerId = buyerId;
      if (sellerId) query.sellerId = sellerId;
    } else {
      // Non-admin users can only see orders where they are buyer or seller.
      query.$or = [{ buyerId: req.user._id }, { sellerId: req.user._id }];
    }
    if (type) query.type = type;
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('buyerId', 'name email phone')
      .populate('sellerId', 'name email phone')
      .populate('orderItems.productId', 'name images')
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
}, validateOrder, async (req, res) => {
  let session = null;
  const useTransaction = false;
  
  try {
    const { type, sellerId, orderItems, deliveryAddress } = req.body;
    const buyerId = req.user._id;
    let resolvedSellerId = sellerId || null;
    let resolvedPriceAgreementId = null;
    let subtotal = 0;
    const processedItems = [];
    
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
      
      if (type === 'b2b') {
        const agreementQuery = PriceAgreement.findOne({
          buyerId,
          farmerId: product.ownerId,
          productId: item.productId,
          status: 'active',
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
            unitPrice = tier.pricePerUnit;
            if (!resolvedPriceAgreementId) {
              resolvedPriceAgreementId = agreement._id;
            }
          }
        }
      }
      
      // Reserve inventory with timeout
      const inventoryQuery = InventoryLot.findOne({
        productId: product._id,
        $expr: { $gte: [{ $subtract: ['$quantity', '$reservedQuantity'] }, item.quantity] }
      });

      if (useTransaction) {
        inventoryQuery.session(session);
      }

      const inventory = await inventoryQuery;
      
      if (!inventory) {
        throw new Error(`Insufficient inventory for ${product.name}`);
      }
      
      // Reserve inventory (will auto-expire in 30 minutes)
      await inventory.reserve(null, item.quantity); // Order ID will be set after creation
      
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
        arrayFilters: [{ 'elem.status': 'active', 'elem.orderId': null }]
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
    if (useTransaction) {
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
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

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

// Update order (admin or owner only)
router.put('/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

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
