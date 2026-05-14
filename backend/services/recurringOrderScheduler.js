import cron from 'node-cron';
import mongoose from 'mongoose';
import RecurringOrder from '../models/RecurringOrder.model.js';
import Order from '../models/Order.model.js';
import Commission from '../models/Commission.model.js';
import Product from '../models/Product.model.js';
import InventoryLot from '../models/InventoryLot.model.js';
import User from '../models/User.model.js';
import PriceAgreement from '../models/PriceAgreement.model.js';
import Category from '../models/Category.model.js';
import InventoryManager from './inventory.manager.js';
import { calculateDeliveryFeeForOrder } from '../utils/deliveryFee.util.js';
import { getCommissionRate } from '../utils/commission.util.js';

const supportsMongoTransactions = () => {
  if (process.env.DISABLE_MONGO_TRANSACTIONS === 'true') {
    return false;
  }

  if (mongoose.connection.readyState !== 1) {
    return false;
  }

  const topologyType = mongoose.connection.client?.topology?.description?.type;
  return ['ReplicaSetWithPrimary', 'Sharded', 'LoadBalanced'].includes(topologyType);
};

/**
 * Recurring Order Scheduler Service
 * Polls due schedules and generates Orders atomically with inventory reservation
 * 
 * FIXES: Issue 2, 8, 11
 * - Issue 2: Uses InventoryManager for race-condition-free reservations
 * - Issue 8: Creates commission atomically with order
 * - Issue 11: Prevents double-processing with isProcessing flag
 * 
 * Per BACKEND_API_PROMPT.md lines 564-574 and SYSTEM_OVERVIEW_PROMPT.md lines 354-359
 */

/**
 * Process a single recurring order
 * Creates an Order from the recurring template with atomic inventory reservation
 * 
 * Prevents double-processing: Only one worker can process same recurring order
 * (checked via isProcessing flag at database level)
 */
export async function processRecurringOrder(recurringOrder) {
  const useTransaction = supportsMongoTransactions();
  let session = null;
  let createdOrder = null;
  let createdCommission = null;
  let reservationSucceeded = false;
  let reservationOrderId = null;

  if (useTransaction) {
    session = await mongoose.startSession();
    session.startTransaction();
  }
  
  try {
    console.log(`Processing recurring order: ${recurringOrder._id}`);
    
    // Atomically claim the recurring order for processing.
    // Using findOneAndUpdate with filter {isProcessing: {$ne: true}} ensures only
    // ONE worker can proceed even if multiple scheduler instances run concurrently.
    const claimed = await RecurringOrder.findOneAndUpdate(
      { _id: recurringOrder._id, isProcessing: { $ne: true } },
      { $set: { isProcessing: true, processingStartedAt: new Date() } },
      { new: true, session: useTransaction ? session : null }
    );

    if (!claimed) {
      console.log(`⏭️  Recurring order ${recurringOrder._id} already being processed by another worker`);
      return { success: false, error: 'Already processing' };
    }
    
    // Optionally fetch buyer
    const buyerQuery = User.findById(recurringOrder.buyerId);
    if (useTransaction) {
      buyerQuery.session(session);
    }
    const buyer = await buyerQuery;
    if (!buyer) throw new Error('Buyer not found');
    
    // Use delivery address snapshot stored on recurring order
    const deliveryAddress = recurringOrder.deliveryAddress;
    if (!deliveryAddress || !deliveryAddress.line1) {
      throw new Error('Recurring order missing delivery address');
    }
    
    // Process items and prepare order data (DON'T reserve yet)
    const orderItems = [];
    const itemsToReserve = [];
    reservationOrderId = new mongoose.Types.ObjectId();
    let subtotal = 0;
    let sellerId = null;
    
    for (const template of recurringOrder.itemsTemplate) {
      // Get current product details
      const productQuery = Product.findById(template.productId);
      if (useTransaction) {
        productQuery.session(session);
      }
      const product = await productQuery;
      
      if (!product || product.status !== 'active') {
        throw new Error(`Product ${template.productId} is not available`);
      }
      
      // Check max price cap if specified
      if (template.maxPrice && product.basePrice > template.maxPrice) {
        throw new Error(`Product ${product.name} price exceeds maximum (₹${template.maxPrice})`);
      }
      
      // Set seller ID (assuming all products from same farmer)
      if (!sellerId) {
        sellerId = product.ownerId;
      }
      
      // Build order item
      const itemTotal = product.basePrice * template.quantity;
      orderItems.push({
        productId: product._id,
        productName: product.name,
        categoryId: product.categoryId,
        quantity: template.quantity,
        unit: product.unit,
        unitPrice: product.basePrice,
        totalPrice: itemTotal
      });
      
      // Collect for batch reservation
      itemsToReserve.push({
        productId: product._id,
        quantity: template.quantity
      });
      
      subtotal += itemTotal;
    }
    
    // CRITICAL FIX (Issue 2, 11): Use InventoryManager for atomic reservation
    // This:
    // 1. Prevents race conditions (uses locks + MongoDB transactions)
    // 2. Prevents double-processing (isProcessing flag already set)
    // 3. Rolls back partial failures (all-or-nothing)
    // 4. Automatically cleans expired reservations (TTL)
    // 5. Syncs product cache (stockQuantity)
    const reservationResult = await InventoryManager.reserveForOrder({
      orderItems: itemsToReserve,
      orderId: reservationOrderId,
      buyerId: recurringOrder.buyerId,
      session: useTransaction ? session : null,
      requestId: `recurring-${recurringOrder._id}-${Date.now()}`
    });

    if (!reservationResult.success) {
      throw new Error(reservationResult.error || 'Failed to reserve inventory for recurring order');
    }
    reservationSucceeded = true;

    const reservedLotIds = reservationResult.reservedLots.map((reservedLot) => reservedLot.lotId);
    orderItems.forEach((item, index) => {
      item.lotId = reservedLotIds[index];
    });

    // Calculate totals from the reserved lot location and delivery coordinates
    const deliveryFeeResult = await calculateDeliveryFeeForOrder({
      orderType: recurringOrder.type,
      lotIds: reservedLotIds,
      deliveryAddressCoordinates: deliveryAddress.coordinates,
      session: useTransaction ? session : null
    });
    const deliveryFee = deliveryFeeResult.deliveryFee;
    const categoryIds = [...new Set(orderItems.map((item) => item.categoryId).filter(Boolean).map((categoryId) => String(categoryId)))];
    const categoryDocs = categoryIds.length > 0
      ? await Category.find({ _id: { $in: categoryIds } }).select('gstRate').session(useTransaction ? session : null)
      : [];
    const gstRateMap = new Map(categoryDocs.map((category) => [String(category._id), Number(category.gstRate ?? 0.05)]));
    const tax = Number(orderItems.reduce((sum, item) => {
      const gstRate = gstRateMap.get(String(item.categoryId)) ?? 0.05;
      const taxAmount = Number((item.totalPrice * gstRate).toFixed(2));
      item.gstRate = gstRate;
      item.taxAmount = taxAmount;
      return sum + taxAmount;
    }, 0).toFixed(2));
    const total = subtotal + deliveryFee + tax;

    // Create order (conform to Order.model.js schema)
    const order = new Order({
      type: recurringOrder.type,
      buyerId: recurringOrder.buyerId,
      sellerId: sellerId,
      orderItems,
      subtotal,
      deliveryFee,
      tax,
      total,
      currency: 'INR',
      deliveryAddress: {
        line1: deliveryAddress.line1,
        line2: deliveryAddress.line2,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        postalCode: deliveryAddress.postalCode,
        country: deliveryAddress.country,
        coordinates: deliveryAddress.coordinates
      },
      paymentTerms: recurringOrder.type === 'b2b' ? 'net_15' : 'prepaid',
      notes: `Auto-generated from recurring order ${recurringOrder._id}`
    });

    if (useTransaction) {
      await order.save({ session });
    } else {
      await order.save();
    }
    createdOrder = order;

    // Commission rate: prefer the negotiated rate from a PriceAgreement when one
    // exists (B2B orders), otherwise fall back to platform defaults.
    let commissionRate = await getCommissionRate(recurringOrder.type);
    if (order.priceAgreementId) {
      const agreement = await PriceAgreement.findById(order.priceAgreementId)
        .select('commissionRate')
        .session(useTransaction ? session : null);
      if (agreement?.commissionRate != null) {
        commissionRate = agreement.commissionRate;
      }
    }
    const commissionAmount = subtotal * commissionRate;

    const commission = new Commission({
      orderId: order._id,
      orderNumber: order.orderNumber,
      sellerId: sellerId,
      sellerType: 'farmer',
      orderAmount: subtotal,
      commissionRate,
      commissionAmount,
      sellerPayout: subtotal - commissionAmount,
      status: 'pending',
      metadata: {
        orderType: recurringOrder.type,
        productCount: orderItems.length,
        deliveryFee,
        region: deliveryAddress?.state,
        isRecurringOrder: true,
        recurringOrderId: recurringOrder._id
      }
    });

    if (useTransaction) {
      await commission.save({ session });
    } else {
      await commission.save();
    }
    createdCommission = commission;
    
    if (useTransaction && session) {
      await session.commitTransaction();
    }

    // Record success and advance schedule
    await recurringOrder.recordSuccess(order._id);
    
    // Clear processing flag
    await RecurringOrder.findByIdAndUpdate(
      recurringOrder._id,
      {
        $set: { isProcessing: false }
      }
    );
    
    console.log(`✅ Successfully created order ${order.orderNumber} from recurring order ${recurringOrder._id}`);
    
    return { success: true, orderId: order._id };
    
  } catch (error) {
    if (useTransaction && session) {
      await session.abortTransaction();
    } else {
      // Manual rollback path for standalone MongoDB deployments.
      // InventoryManager rolls back partial reservations on its own if the
      // reservation step fails; this cleanup handles the scheduler-owned
      // documents created before the failure.
      if (reservationSucceeded && createdOrder?._id) {
        try {
          await InventoryManager.cancelReservation({ orderId: reservationOrderId });
        } catch (rollbackError) {
          console.error(
            `Failed to roll back inventory for recurring order ${recurringOrder._id}:`,
            rollbackError.message
          );
        }
      }

      if (createdCommission?._id) {
        try {
          await Commission.findByIdAndDelete(createdCommission._id);
        } catch (rollbackError) {
          console.error(
            `Failed to remove commission for recurring order ${recurringOrder._id}:`,
            rollbackError.message
          );
        }
      }

      if (createdOrder?._id) {
        try {
          await Order.findByIdAndDelete(createdOrder._id);
        } catch (rollbackError) {
          console.error(
            `Failed to remove order for recurring order ${recurringOrder._id}:`,
            rollbackError.message
          );
        }
      }
    }
    
    // Clear processing flag on error
    try {
      await RecurringOrder.findByIdAndUpdate(
        recurringOrder._id,
        {
          $set: { isProcessing: false }
        }
      );
    } catch (flagError) {
      console.error(`Failed to clear processing flag: ${flagError.message}`);
    }
    
    console.error(`❌ Failed to process recurring order ${recurringOrder._id}:`, error.message);
    
    // Record failure
    await recurringOrder.recordFailure(error);
    
    return { success: false, error: error.message };
  } finally {
    if (session) {
      session.endSession();
    }
  }
}



/**
 * Main scheduler function
 * Runs periodically to check for due recurring orders
 */
async function checkDueOrders() {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('⏸️  MongoDB not connected, skipping recurring order check');
      return;
    }
    
    console.log('🔄 Checking for due recurring orders...');
    
    // Find all active recurring orders that are due
    const dueOrders = await RecurringOrder.find({
      status: 'active',
      'schedule.nextRunAt': { $lte: new Date() }
    }).limit(50); // Process max 50 at a time
    
    if (dueOrders.length === 0) {
      console.log('No due recurring orders found');
      return;
    }
    
    console.log(`Found ${dueOrders.length} due recurring orders`);
    
    // Process each recurring order
    const results = await Promise.allSettled(
      dueOrders.map(order => processRecurringOrder(order))
    );
    
    // Summary
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;
    
    console.log(`✅ Processed ${successful} recurring orders successfully, ${failed} failed`);
    
  } catch (error) {
    console.error('❌ Error in recurring order scheduler:', error);
    // Don't throw to prevent server crash
  }
}

/**
 * Initialize the scheduler
 * Runs every 10 minutes
 */
export function startRecurringOrderScheduler() {
  console.log('🚀 Starting recurring order scheduler...');
  
  // Run every 10 minutes: '*/10 * * * *'
  // For testing, you can use '*/1 * * * *' (every minute)
  const schedule = '*/10 * * * *';
  
  cron.schedule(schedule, () => {
    console.log('\n⏰ Recurring order scheduler triggered at', new Date().toISOString());
    checkDueOrders();
  });
  
  console.log(`✅ Scheduler running with cron: ${schedule}`);
  
  // Run immediately on startup for testing
  setTimeout(() => {
    console.log('🔄 Running initial check...');
    checkDueOrders();
  }, 5000); // Wait 5 seconds after server starts
}

/**
 * Manual trigger for testing
 */
export async function triggerSchedulerManually() {
  console.log('🔄 Manually triggering recurring order scheduler...');
  await checkDueOrders();
}

export default {
  startRecurringOrderScheduler,
  triggerSchedulerManually,
  checkDueOrders
};
