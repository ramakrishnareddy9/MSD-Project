import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as communityController from '../controllers/community.controller.js';

const router = express.Router();

router.get('/', authenticate, communityController.getAllCommunities);
router.get('/mine', authenticate, communityController.getMyCommunities);
router.post('/:id/join', authenticate, communityController.joinCommunity);

router.get('/:id/pools', authenticate, communityController.getCommunityPools);
router.post('/pools/:poolId/contribute', authenticate, communityController.contributeToPool);

router.get('/:id/chat', authenticate, communityController.getCommunityChat);
router.post('/:id/chat', authenticate, communityController.sendChatMessage);

export default router;
