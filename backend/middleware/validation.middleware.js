import { body, param, query, validationResult } from 'express-validator';

/**
 * Request Validation Middleware
 * Uses express-validator for input validation
 * Per BACKEND_API_PROMPT.md lines 462-480
 */

/**
 * Validation result handler
 * Checks for validation errors and returns formatted response
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
};

/**
 * User Registration Validation
 * Per BACKEND_API_PROMPT.md lines 467-478
 */
export const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('phone')
    .matches(/^[+]?[\d\s\-()]+$/)
    .withMessage('Valid phone number is required'),
  
  body('roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array'),
  
  body('roles.*')
    .optional()
    .isIn(['customer', 'farmer', 'business', 'restaurant', 'delivery', 'admin'])
    .withMessage('Invalid role'),
  
  handleValidationErrors
];

/**
 * User Login Validation
 */
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Product Creation/Update Validation
 */
export const validateProduct = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  
  body('categoryId')
    .isMongoId()
    .withMessage('Valid category ID is required'),
  
  body('ownerId')
    .isMongoId()
    .withMessage('Valid owner ID is required'),
  
  body('basePrice')
    .isFloat({ min: 0 })
    .withMessage('Base price must be a positive number'),
  
  body('unit')
    .isIn(['kg', 'g', 'liter', 'ml', 'piece', 'dozen', 'bag', 'box'])
    .withMessage('Invalid unit'),
  
  body('status')
    .optional()
    .isIn(['active', 'out_of_stock', 'discontinued', 'pending_approval'])
    .withMessage('Invalid status'),
  
  handleValidationErrors
];

/**
 * Order Creation Validation
 */
export const validateOrder = [
  body('type')
    .isIn(['b2c', 'b2b'])
    .withMessage('Order type must be b2c or b2b'),
  
  body('buyerId')
    .isMongoId()
    .withMessage('Valid buyer ID is required'),
  
  body('sellerId')
    .optional()
    .isMongoId()
    .withMessage('Valid seller ID is required'),
  
  body('orderItems')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  
  body('orderItems.*.productId')
    .isMongoId()
    .withMessage('Valid product ID is required for each item'),
  
  body('orderItems.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  
  body('orderItems.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number'),
  
  body('total')
    .isFloat({ min: 0 })
    .withMessage('Total must be a positive number'),
  
  handleValidationErrors
];

/**
 * Review Creation Validation
 */
export const validateReview = [
  body('userId')
    .isMongoId()
    .withMessage('Valid user ID is required'),
  
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
  
  handleValidationErrors
];

/**
 * MongoDB ObjectId Validation (for params)
 */
export const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
  
  handleValidationErrors
];

/**
 * Pagination Validation (for query params)
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

/**
 * Search Query Validation
 */
export const validateSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),
  
  query('status')
    .optional()
    .isIn(['active', 'out_of_stock', 'discontinued'])
    .withMessage('Invalid status'),
  
  handleValidationErrors
];

/**
 * Recurring Order Validation
 */
export const validateRecurringOrder = [
  body('type')
    .isIn(['b2c', 'b2b'])
    .withMessage('Order type must be b2c or b2b'),
  
  body('itemsTemplate')
    .isArray({ min: 1 })
    .withMessage('Items template must contain at least one item'),
  
  body('itemsTemplate.*.productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  
  body('itemsTemplate.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),

  // Delivery address snapshot validation
  body('deliveryAddress.line1')
    .isString().notEmpty()
    .withMessage('Delivery address line1 is required'),
  body('deliveryAddress.city')
    .isString().notEmpty()
    .withMessage('Delivery address city is required'),
  body('deliveryAddress.state')
    .isString().notEmpty()
    .withMessage('Delivery address state is required'),
  body('deliveryAddress.postalCode')
    .isString().notEmpty()
    .withMessage('Delivery address postal code is required'),
  
  body('schedule.frequency')
    .isIn(['weekly', 'biweekly', 'monthly', 'custom'])
    .withMessage('Invalid frequency'),
  
  body('schedule.nextRunAt')
    .isISO8601()
    .withMessage('Next run date must be a valid ISO 8601 date'),
  
  body('schedule.endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  handleValidationErrors
];
