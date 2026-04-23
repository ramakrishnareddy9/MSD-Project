import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as communityController from '../controllers/community.controller.js';

const router = express.Router();

router.post('/', authenticate, communityController.createCommunity);
router.get('/', authenticate, communityController.getAllCommunities);
router.get('/mine', authenticate, communityController.getMyCommunities);
router.get('/mine/admin', authenticate, communityController.getMyAdminCommunities);
router.post('/:id/join', authenticate, communityController.joinCommunity);
router.post('/:id/leave', authenticate, communityController.leaveCommunity);
router.post('/:id/transfer-ownership', authenticate, communityController.transferOwnership);
router.delete('/:id', authenticate, communityController.deleteCommunity);
router.get('/:id/announcements', authenticate, communityController.getCommunityAnnouncements);
router.post('/:id/announcements', authenticate, communityController.createCommunityAnnouncement);

router.get('/:id/pools', authenticate, communityController.getCommunityPools);
router.post('/:id/pools/contribute', authenticate, communityController.contributeToCommunityPool);
router.get('/:id/pools/:poolId/farmers', authenticate, communityController.getPoolFarmers);
router.post('/:id/pools/:poolId/order', authenticate, communityController.orderPoolFromFarmer);
router.post('/pools/:poolId/contribute', authenticate, communityController.contributeToPool);

router.get('/:id/chat', authenticate, communityController.getCommunityChat);
router.post('/:id/chat', authenticate, communityController.sendChatMessage);

export default router;
