import mongoose from 'mongoose';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import InventoryLot from '../models/InventoryLot.model.js';
import PriceAgreement from '../models/PriceAgreement.model.js';
import MarketplaceRequest from '../models/MarketplaceRequest.model.js';
import Commission from '../models/Commission.model.js';
import User from '../models/User.model.js';
import { notifyUsers } from '../utils/notification.util.js';
import { assertTransactionVerification } from '../utils/verification.util.js';

/**
 * Order Service - Centralized business logic for order management
 * Handles order creation, validation, commission calculation, and fulfillment
 * Addresses: Issue 21, 22, 35, 42 - Extract logic, centralize commission, atomicity
 */
export class OrderService {
  /**
   * Calculate commission rate based on order type and seller type
   * Centralized to prevent duplication (Issue 22)
   */
  static getCommissionRate(orderType, sellerType = 'farmer') {
    const rates = {
      b2c: 0.10, // 10% for B2C
      b2b: 0.05  // 5% for B2B
    };
    return rates[orderType] || rates.b2c;
  }

  /**
   * Calculate total with all fees and taxes
   */
  static calculateTotal(subtotal, orderType) {
    const deliveryFee = orderType === 'b2b' ? 0 : 50;
    const tax = subtotal * 0.05; // 5% GST
    return {
      subtotal,
      deliveryFee,
      tax,
      total: subtotal + deliveryFee + tax
    };
  }

  /**
   * Check if MongoDB supports transactions
   */
  static supportsMongoTransactions() {
    if (process.env.DISABLE_MONGO_TRANSACTIONS === 'true') {
      return false;
    }
    if (mongoose.connection.readyState !== 1) {
      return false;
    }
    const topologyType = mongoose.connection.client?.topology?.description?.type;
    return ['ReplicaSetWithPrimary', 'Sharded', 'LoadBalanced'].includes(topologyType);
  }

  /**
   * Validate delivery address
   * Issue 26 - Add delivery address validation
   */
  static validateDeliveryAddress(address) {
    if (!address) {
      throw new Error('Delivery address is required');
    }

    const requiredFields = ['line1', 'city', 'state', 'postalCode', 'country'];
    const missingFields = requiredFields.filter(field => !address[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing delivery address fields: ${missingFields.join(', ')}`);
    }

    if (!/^\d{5,6}$/.test(address.postalCode)) {
      throw new Error('Invalid postal code format');
    }

    return true;
  }

  /**
   * Process order items and calculate pricing
   * Handles B2B pricing agreements and marketplace requests
   * Issue 15 - Fixes farmer name reference
   * Issue 42 - Apply community discount to pool orders
   */
  static async processOrderItems({
    orderItems,
    type,
    buyerId,
    marketplaceRequest,
    communityPoolId,
    session = null,
    useTransaction = false
  }) {
    const processedItems = [];
    let subtotal = 0;
    let resolvedSellerId = null;
    let resolvedPriceAgreementId = null;
    const reservedLotIds = [];

    // Load community discount if this is a pool order
    let communityDiscount = 0;
    if (communityPoolId) {
      const CommunityPool = require('../models/CommunityPool.model.js').default;
      const Community = require('../models/Community.model.js').default;
      
      const poolQuery = CommunityPool.findById(communityPoolId).populate('community');
      if (useTransaction) {
        poolQuery.session(session);
      }
      const pool = await poolQuery;
      
      if (pool && pool.community) {
        communityDiscount = pool.community.discount / 100; // Convert 10 to 0.10
      }
    }

    if (marketplaceRequest) {
      resolvedSellerId = marketplaceRequest.matchedFarmerId;
    }

    // Process each order item
    for (const item of orderItems) {
      let productQuery = Product.findById(item.productId);
      if (useTransaction) {
        productQuery = productQuery.session(session);
      }
      const product = await productQuery;

      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      if (product.status !== 'active') {
        throw new Error(`Product ${product.name} is not available (status: ${product.status})`);
      }

      // Resolve seller from first item
      if (!resolvedSellerId) {
        resolvedSellerId = product.ownerId;
      }

      // Validate all items from same seller
      if (String(product.ownerId) !== String(resolvedSellerId)) {
        throw new Error('All order items must belong to the same seller');
      }

      // Determine unit price
      let unitPrice = product.basePrice;

      // Marketplace request negotiated price
      if (marketplaceRequest) {
        const productMatchesRequest = String(product._id) === String(
          marketplaceRequest.productId?._id || marketplaceRequest.productId
        );
        if (!productMatchesRequest) {
          throw new Error('Negotiated order item does not match requested product');
        }
        unitPrice = Number(marketplaceRequest.agreedPrice);
      }

      // B2B price agreement
      if (type === 'b2b' && !marketplaceRequest) {
        const agreementQuery = PriceAgreement.findOne({
          buyerId,
          sellerId: product.ownerId,
          productId: item.productId,
          status: 'active',
          validFrom: { $lte: new Date() },
          validUntil: { $gt: new Date() }
        });

        if (useTransaction) {
          agreementQuery.session(session);
        }

        const agreement = await agreementQuery;

        if (agreement) {
          const tier = agreement.tiers.find(
            t => item.quantity >= t.minQuantity &&
              (!t.maxQuantity || item.quantity <= t.maxQuantity)
          );

          if (tier) {
            unitPrice = tier.price;
            if (!resolvedPriceAgreementId) {
              resolvedPriceAgreementId = agreement._id;
            }
          }
        }
      }

      // Issue 42 - Apply community discount
      const discountedUnitPrice = unitPrice * (1 - communityDiscount);

      // Reserve inventory
      const reservationQuery = InventoryLot.reserveAvailableLot({
        productId: product._id,
        quantity: item.quantity,
        session: useTransaction ? session : null
      });

      if (useTransaction && !reservationQuery.session) {
        reservationQuery.session(session);
      }

      const inventory = await reservationQuery;

      if (!inventory) {
        throw new Error(`Insufficient inventory for ${product.name}`);
      }

      reservedLotIds.push(inventory._id);

      // Populate farmer info to get actual name (Issue 15)
      let farmerName = 'Unknown Farmer';
      const farmerQuery = User.findById(product.ownerId).select('name');
      if (useTransaction) {
        farmerQuery.session(session);
      }
      const farmer = await farmerQuery;
      if (farmer) {
        farmerName = farmer.name;
      }

      // Build processed item with all snapshot data
      const itemTotal = discountedUnitPrice * item.quantity;
      processedItems.push({
        productId: product._id,
        productName: product.name,
        productImage: product.images?.[0],
        farmerId: product.ownerId,
        farmerName, // Fixed: now properly populated from User
        categoryId: product.categoryId,
        quantity: item.quantity,
        unit: product.unit,
        unitPrice: discountedUnitPrice,
        totalPrice: itemTotal,
        discountApplied: (product.basePrice - discountedUnitPrice) * item.quantity,
        lotId: inventory._id
      });

      subtotal += itemTotal;
    }

    return {
      processedItems,
      subtotal,
      resolvedSellerId,
      resolvedPriceAgreementId,
      reservedLotIds,
      communityDiscount
    };
  }

  /**
   * Create order with all validations and atomic transaction
   * Issue 2, 22, 35 - Fix race condition, centralize commission, ensure atomicity
   */
  static async createOrder({
    type,
    buyerId,
    orderItems,
    deliveryAddress,
    marketplaceRequestId,
    communityPoolId,
    idempotencyKey // Issue 34 - Idempotency
  }) {
    // Validation
    this.validateDeliveryAddress(deliveryAddress);

    const useTransaction = this.supportsMongoTransactions();
    let session = null;
    let marketplaceRequest = null;

    if (useTransaction) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      // Load marketplace request if provided
      if (marketplaceRequestId) {
        const mrQuery = MarketplaceRequest.findById(marketplaceRequestId).populate(
          'productId',
          'name ownerId'
        );
        if (useTransaction) {
          mrQuery.session(session);
        }

        marketplaceRequest = await mrQuery;

        if (!marketplaceRequest) {
          throw new Error('Negotiation request not found');
        }

        if (String(marketplaceRequest.requesterId) !== String(buyerId)) {
          throw new Error('Only the requester can place order against this negotiation');
        }

        if (
          marketplaceRequest.status !== 'accepted' ||
          !marketplaceRequest.buyerAccepted ||
          !marketplaceRequest.farmerAccepted ||
          !Number(marketplaceRequest.agreedPrice)
        ) {
          throw new Error('Cannot proceed: Both parties must accept the negotiated price');
        }
      }

      // Process items and calculate pricing
      const {
        processedItems,
        subtotal,
        resolvedSellerId,
        resolvedPriceAgreementId,
        reservedLotIds,
        communityDiscount
      } = await this.processOrderItems({
        orderItems,
        type,
        buyerId,
        marketplaceRequest,
        communityPoolId,
        session,
        useTransaction
      });

      if (!resolvedSellerId) {
        throw new Error('Could not determine seller for order');
      }

      // Calculate totals
      const totals = this.calculateTotal(subtotal, type);

      // Verification check
      const verificationCheck = assertTransactionVerification(
        { _id: buyerId },
        totals.total,
        type
      );
      if (!verificationCheck.ok) {
        throw new Error(verificationCheck.message);
      }

      // Calculate commission - centralized (Issue 22)
      const commissionRate = this.getCommissionRate(type);
      const commissionAmount = subtotal * commissionRate;

      // Create order (Issue 2 - now atomic via transaction)
      const order = new Order({
        type,
        buyerId,
        sellerId: resolvedSellerId,
        orderItems: processedItems,
        subtotal: totals.subtotal,
        deliveryFee: totals.deliveryFee,
        tax: totals.tax,
        total: totals.total,
        currency: 'INR',
        deliveryAddress,
        priceAgreementId: resolvedPriceAgreementId,
        marketplaceRequestId: marketplaceRequestId || null,
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
          updatedBy: buyerId,
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
          arrayFilters: [{ 'elem.status': 'active' }]
        };

        if (useTransaction) {
          updateOptions.session = session;
        }

        await InventoryLot.findByIdAndUpdate(
          item.lotId,
          {
            $set: {
              'reservations.$[elem].orderId': order._id,
              'reservations.$[elem].status': 'confirmed'
            }
          },
          updateOptions
        );
      }

      // Create commission record (Issue 35 - now atomic in same transaction)
      const commission = new Commission({
        orderId: order._id,
        orderNumber: order.orderNumber,
        sellerId: resolvedSellerId,
        sellerType: 'farmer',
        orderAmount: subtotal,
        commissionRate,
        commissionAmount,
        sellerPayout: subtotal - commissionAmount,
        status: 'pending',
        metadata: {
          orderType: type,
          productCount: processedItems.length,
          deliveryFee: totals.deliveryFee,
          region: deliveryAddress?.state,
          communityPoolId: communityPoolId || null,
          communityDiscountPercent: communityDiscount ? (communityDiscount * 100) : 0
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

      // Issue 23 - Improved error handling for notifications
      try {
        await notifyUsers([buyerId, resolvedSellerId], {
          title: 'Order Placed',
          message: `Order ${order.orderNumber} has been placed and is awaiting processing.`,
          type: 'order',
          relatedId: order._id
        });
      } catch (notificationError) {
        console.warn('Notification failed for order:', order._id, notificationError.message);
        // Log but don't fail the order - notifications are best-effort
      }

      return order;
    } catch (error) {
      if (useTransaction && session) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  /**
   * Finalize successful payment and transition order status
   * Issue 25 - More abstracted fulfillment process
   */
  static async finalizePayment(orderId, paymentId) {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'pending') {
      throw new Error(`Cannot finalize payment for order with status: ${order.status}`);
    }

    // Update order to confirmed
    order.status = 'confirmed';
    order.statusHistory.push({
      status: 'confirmed',
      timestamp: new Date(),
      notes: `Payment confirmed - ${paymentId}`
    });

    await order.save();

    // Update commission to collected
    const commission = await Commission.findOne({ orderId });
    if (commission) {
      commission.status = 'collected';
      commission.collectedAt = new Date();
      await commission.save();
    }

    // Trigger notifications
    try {
      await notifyUsers([order.buyerId, order.sellerId], {
        title: 'Order Confirmed',
        message: `Order ${order.orderNumber} has been confirmed. Processing will begin shortly.`,
        type: 'order',
        relatedId: orderId
      });
    } catch (notificationError) {
      console.warn('Notification failed for order finalization:', orderId, notificationError.message);
    }

    return order;
  }
}

export default OrderService;
