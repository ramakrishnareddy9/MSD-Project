import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { getConfig, updateConfig } from '../controllers/commissionConfig.controller.js';

const router = express.Router();

// Public: get current config (cached)
router.get('/', authenticate, authorize('admin'), getConfig);

// Admin: update rates
router.patch('/', authenticate, authorize('admin'), updateConfig);

export default router;
