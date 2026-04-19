import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validateProduct, validateObjectId } from '../middleware/validation.middleware.js';
import * as productController from '../controllers/product.controller.js';
import Category from '../models/Category.model.js';

const router = express.Router();

// Get all products
router.get('/', productController.getAllProducts);

// Get approved crop catalog (India crop list + seasons)
router.get('/crops/catalog', productController.getCropCatalog);

// Get product by ID
router.get('/:id', productController.getProductById);

// Create product (farmers and admins only)
router.post(
  '/',
  authenticate,
  authorize('farmer', 'admin'),
  // Ensure ownerId defaults to the authenticated farmer if not provided
  async (req, res, next) => {
    try {
      if (!req.body.ownerId && req.user.roles?.includes('farmer')) {
        req.body.ownerId = req.user._id;
      }

      // Auto-assign a default category when not provided.
      // This keeps farmer crop creation working in environments where categories were not seeded.
      if (!req.body.categoryId) {
        let category = await Category.findOne({ isActive: true }).sort({ displayOrder: 1, name: 1 });
        if (!category) {
          category = await Category.create({
            name: 'General',
            slug: 'general',
            description: 'Default category for uncategorized products',
            isActive: true
          });
        }
        req.body.categoryId = category._id;
      }

      next();
    } catch (error) {
      next(error);
    }
  },
  validateProduct,
  productController.createProduct
);

// Update product (owner or admin)
router.put('/:id', authenticate, validateObjectId('id'), productController.updateProduct);

// Delete product (owner or admin)
router.delete('/:id', authenticate, validateObjectId('id'), productController.deleteProduct);

export default router;
