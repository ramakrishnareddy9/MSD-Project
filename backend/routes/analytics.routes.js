import express from 'express';
import { 
  getDashboardMetrics,
  getUserMetrics,
  getRevenueMetrics,
  getOrderAnalytics,
  getProductAnalytics,
  getFarmerAnalytics,
  getAdminDeepAnalytics,
  getCustomerAnalytics,
  getInventoryAnalytics,
  getGMVAnalytics,
  getTakeRateAnalytics,
  getTopFarmersAnalytics,
  getTopCropsAnalytics,
  getRegionalDemandAnalytics,
  getFarmerEarningsTrends
} from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.use(authenticate);

// Admin dashboard metrics
router.get('/dashboard', authorize('admin'), getDashboardMetrics);

// User profile metrics
router.get('/user/:userId', getUserMetrics);

// Revenue metrics
router.get('/revenue', authorize('admin'), getRevenueMetrics);

// Order analytics
router.get('/orders', getOrderAnalytics);

// Product analytics
router.get('/products', getProductAnalytics);

// Farmer analytics
router.get('/farmer', getFarmerAnalytics);

// Admin deep analytics
router.get('/admin/deep', authorize('admin'), getAdminDeepAnalytics);

// Customer analytics
router.get('/customer', getCustomerAnalytics);

// Inventory analytics
router.get('/inventory', authorize('admin', 'farmer'), getInventoryAnalytics);

// ────────────────────────────────────────────────────────
// Advanced Analytics Endpoints (Admin Only)
// ────────────────────────────────────────────────────────

// GMV (Gross Merchandise Value) analytics by period
// Query params: period (daily|weekly|monthly|yearly)
router.get('/admin/gmv', authorize('admin'), getGMVAnalytics);

// Take rate (commission/GMV) analytics by period
// Query params: period (daily|weekly|monthly|yearly)
router.get('/admin/take-rate', authorize('admin'), getTakeRateAnalytics);

// Top farmers analytics with earnings trends
// Query params: limit (1-50), period (monthly)
router.get('/admin/top-farmers', authorize('admin'), getTopFarmersAnalytics);

// Top crops (most-ordered) analytics
// Query params: limit (1-50), sortBy (quantity|revenue)
router.get('/admin/top-crops', authorize('admin'), getTopCropsAnalytics);

// Regional demand heatmap analytics
router.get('/admin/regional-demand', authorize('admin'), getRegionalDemandAnalytics);

// Farmer earnings trends over time
// Query params: sellerId (optional, admin only), period (daily|weekly|monthly|yearly)
router.get('/admin/farmer-earnings', authorize('admin', 'farmer'), getFarmerEarningsTrends);

export default router;
