import cron from 'node-cron';
import mongoose from 'mongoose';
import RecurringOrder from '../models/RecurringOrder.model.js';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import InventoryLot from '../models/InventoryLot.model.js';
import User from '../models/User.model.js';

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
 * Per BACKEND_API_PROMPT.md lines 564-574 and SYSTEM_OVERVIEW_PROMPT.md lines 354-359
 */

/**
 * Process a single recurring order
 * Creates an Order from the recurring template
 */
async function processRecurringOrder(recurringOrder) {
  const useTransaction = supportsMongoTransactions();
  let session = null;
  const reservationToken = new mongoose.Types.ObjectId();
  const reservedLotIds = [];

  if (useTransaction) {
    session = await mongoose.startSession();
    session.startTransaction();
  }
  
  try {
    console.log(`Processing recurring order: ${recurringOrder._id}`);
    
    // Optionally fetch buyer (not required for address anymore)
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
    
    // Process items and check inventory
    const orderItems = [];
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
      
      // Reserve inventory atomically (works with and without transactions)
      const inventory = await InventoryLot.reserveAvailableLot({
        productId: product._id,
        orderId: reservationToken,
        quantity: template.quantity,
        session: useTransaction ? session : null
      });

      if (!inventory) {
        throw new Error(`Insufficient inventory for ${product.name}`);
      }
      reservedLotIds.push(inventory._id);
      
      // Set seller ID (assuming all products from same farmer)
      if (!sellerId) {
        sellerId = product.ownerId;
      }
      
      // Build order item
      const itemTotal = product.basePrice * template.quantity;
      orderItems.push({
        productId: product._id,
        productName: product.name,
        quantity: template.quantity,
        unit: product.unit,
        unitPrice: product.basePrice,
        totalPrice: itemTotal,
        lotId: inventory._id
      });
      
      subtotal += itemTotal;
    }
    
    // Calculate totals (simplified - add delivery fee, tax logic as needed)
    const deliveryFee = recurringOrder.type === 'b2b' ? 0 : 50;
    const tax = subtotal * 0.05; // 5% tax
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

    // Replace temporary reservation token with real order ID.
    for (const item of orderItems) {
      const updateOptions = {
        arrayFilters: [{ 'elem.status': 'active', 'elem.orderId': reservationToken }]
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
    
    if (useTransaction && session) {
      await session.commitTransaction();
    }

    // Record success and advance schedule
    await recurringOrder.recordSuccess(order._id);
    
    console.log(`✅ Successfully created order ${order.orderNumber} from recurring order ${recurringOrder._id}`);
    
    return { success: true, orderId: order._id };
    
  } catch (error) {
    if (!useTransaction && reservedLotIds.length > 0) {
      // Compensating rollback for standalone MongoDB without transactions.
      for (const lotId of reservedLotIds) {
        try {
          const lot = await InventoryLot.findById(lotId);
          if (lot) {
            await lot.cancelReservation(reservationToken);
          }
        } catch (rollbackError) {
          console.error(`Failed to rollback reservation for lot ${lotId}:`, rollbackError.message);
        }
      }
    }

    if (useTransaction && session) {
      await session.abortTransaction();
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
