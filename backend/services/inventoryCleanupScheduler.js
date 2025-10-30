import cron from 'node-cron';
import InventoryLot from '../models/InventoryLot.model.js';

/**
 * Inventory Cleanup Scheduler
 * Runs periodically to clean up expired inventory reservations
 */

async function cleanupExpiredReservations() {
  try {
    console.log('🧹 Starting inventory reservation cleanup...');
    
    const result = await InventoryLot.cleanupAllExpiredReservations();
    
    console.log(`✅ Cleaned up ${result.length} inventory lots with expired reservations`);
    
    return result;
  } catch (error) {
    console.error('❌ Error in inventory cleanup scheduler:', error);
    throw error;
  }
}

/**
 * Initialize the inventory cleanup scheduler
 * Runs every 5 minutes to check for expired reservations
 */
export function startInventoryCleanupScheduler() {
  console.log('🚀 Starting inventory cleanup scheduler...');
  
  // Run every 5 minutes: '*/5 * * * *'
  const schedule = '*/5 * * * *';
  
  cron.schedule(schedule, () => {
    console.log('\n⏰ Inventory cleanup triggered at', new Date().toISOString());
    cleanupExpiredReservations();
  });
  
  console.log(`✅ Inventory cleanup scheduler running with cron: ${schedule}`);
  
  // Run immediately on startup
  setTimeout(() => {
    console.log('🔄 Running initial inventory cleanup...');
    cleanupExpiredReservations();
  }, 3000); // Wait 3 seconds after server starts
}

export default {
  startInventoryCleanupScheduler,
  cleanupExpiredReservations
};
