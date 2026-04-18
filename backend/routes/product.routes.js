import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validateProduct, validateObjectId } from '../middleware/validation.middleware.js';
import * as productController from '../controllers/product.controller.js';

const router = express.Router();

// Get all products
router.get('/', productController.getAllProducts);

// Get product by ID
router.get('/:id', productController.getProductById);

// Create product (farmers and admins only)
router.post(
  '/',
  authenticate,
  authorize('farmer', 'admin'),
  // Ensure ownerId defaults to the authenticated farmer if not provided
  (req, res, next) => {
    if (!req.body.ownerId && req.user.roles?.includes('farmer')) {
      req.body.ownerId = req.user._id;
    }
    next();
  },
  validateProduct,
  productController.createProduct
);

// Update product (owner or admin)
router.put('/:id', authenticate, validateObjectId('id'), productController.updateProduct);

// Delete product (owner or admin)
router.delete('/:id', authenticate, validateObjectId('id'), productController.deleteProduct);

export default router;
