import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { getMyPayouts, processPayout } from '../controllers/payout.controller.js';

const router = express.Router();

router.get('/me', authenticate, getMyPayouts);
router.patch('/:id/process', authenticate, authorize('admin'), processPayout);

export default router;