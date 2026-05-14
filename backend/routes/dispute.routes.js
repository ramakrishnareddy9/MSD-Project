import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validateObjectId } from '../middleware/validation.middleware.js';
import { createDispute, listDisputes, resolveDispute } from '../controllers/dispute.controller.js';

const router = express.Router();

router.post('/', authenticate, createDispute);
router.get('/', authenticate, listDisputes);
router.patch('/:id', authenticate, authorize('admin'), validateObjectId('id'), resolveDispute);

export default router;
