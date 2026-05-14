import cron from 'node-cron';
import mongoose from 'mongoose';
import InventoryLot from '../models/InventoryLot.model.js';
import MarketplaceRequest from '../models/MarketplaceRequest.model.js';

/**
 * Inventory Cleanup Scheduler
 * Runs periodically to clean up expired inventory reservations and marketplace requests
 */

async function cleanupExpiredReservations() {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('⏸️  MongoDB not connected, skipping inventory cleanup');
      return [];
    }
    
    console.log('🧹 Starting inventory reservation cleanup...');
    
    const result = await InventoryLot.cleanupAllExpiredReservations();
    
    console.log(`✅ Cleaned up ${result.length} inventory lots with expired reservations`);
    
    return result;
  } catch (error) {
    console.error('❌ Error in inventory cleanup scheduler:', error);
    // Don't throw error to prevent server crash
    return [];
  }
}

/**
 * Expire old marketplace requests (72h default)
 * Prevents requests from cluttering user dashboards indefinitely
 */
async function expireOldMarketplaceRequests() {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('⏸️  MongoDB not connected, skipping marketplace request expiry');
      return { modifiedCount: 0 };
    }
    
    console.log('🧹 Starting marketplace request expiry cleanup...');
    
    const result = await MarketplaceRequest.expireOldRequests();
    
    console.log(`✅ Expired ${result.modifiedCount} old marketplace requests`);
    
    return result;
  } catch (error) {
    console.error('❌ Error expiring marketplace requests:', error);
    // Don't throw error to prevent server crash
    return { modifiedCount: 0 };
  }
}

/**
 * Initialize the inventory cleanup scheduler
 * Runs every 5 minutes to check for expired reservations and marketplace requests
 */
export function startInventoryCleanupScheduler() {
  console.log('🚀 Starting inventory cleanup scheduler...');
  
  // Run every 5 minutes: '*/5 * * * *'
  const schedule = '*/5 * * * *';
  
  cron.schedule(schedule, async () => {
    console.log('\n⏰ Cleanup triggered at', new Date().toISOString());
    await cleanupExpiredReservations();
    await expireOldMarketplaceRequests();
  });
  
  console.log(`✅ Inventory cleanup scheduler running with cron: ${schedule}`);
  
  // Run immediately on startup, but with delay
  setTimeout(async () => {
    console.log('🔄 Running initial cleanup...');
    await cleanupExpiredReservations();
    await expireOldMarketplaceRequests();
  }, 10000); // Wait 10 seconds after server starts
}

export default {
  startInventoryCleanupScheduler,
  cleanupExpiredReservations,
  expireOldMarketplaceRequests
};
