import express from 'express';
import { getCart, addItemToCart, updateCartItem, removeItemFromCart, clearCart } from '../controllers/cart.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate); // Require authentication for all cart routes

router.route('/')
  .get(getCart)
  .post(addItemToCart)
  .delete(clearCart);

router.route('/:productId')
  .put(updateCartItem)
  .delete(removeItemFromCart);

export default router;
