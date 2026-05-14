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
  getInventoryAnalytics
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

export default router;
