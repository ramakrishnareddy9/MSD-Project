import express from 'express';
import { getWishlist, addItemToWishlist, removeItemFromWishlist, clearWishlist } from '../controllers/wishlist.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate); // Require authentication for all wishlist routes

router.route('/')
  .get(getWishlist)
  .post(addItemToWishlist)
  .delete(clearWishlist);

router.route('/:productId')
  .delete(removeItemFromWishlist);

export default router;
