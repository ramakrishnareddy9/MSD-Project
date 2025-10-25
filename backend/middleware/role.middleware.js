/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if authenticated user has required role(s)
 * Per BACKEND_API_PROMPT.md lines 360-370
 */

/**
 * Authorize middleware - restricts access to specific roles
 * @param {...string} allowedRoles - Array of allowed role names
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.post('/products', authenticate, authorize('farmer', 'admin'), createProduct);
 * router.get('/admin/analytics', authenticate, authorize('admin'), getAnalytics);
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Authentication required'
      });
    }

    // Check if user has at least one of the allowed roles
    const hasAllowedRole = req.user.roles.some(role => 
      allowedRoles.includes(role)
    );

    if (!hasAllowedRole) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Insufficient permissions',
        required: allowedRoles,
        current: req.user.roles
      });
    }

    next();
  };
};

/**
 * Require all specified roles (user must have ALL roles)
 * @param {...string} requiredRoles - Array of required role names
 */
export const requireAllRoles = (...requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const hasAllRoles = requiredRoles.every(role =>
      req.user.roles.includes(role)
    );

    if (!hasAllRoles) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Missing required roles',
        required: requiredRoles,
        current: req.user.roles
      });
    }

    next();
  };
};

/**
 * Check ownership - ensures user can only modify their own resources
 * @param {string} ownerField - Field name containing owner ID (default: 'userId')
 */
export const checkOwnership = (ownerField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Admins can access all resources
    if (req.user.roles.includes('admin')) {
      return next();
    }

    // Check ownership in request body or params
    const resourceOwnerId = req.body[ownerField] || req.params[ownerField];
    
    if (resourceOwnerId && resourceOwnerId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - You can only modify your own resources'
      });
    }

    next();
  };
};

/**
 * Admin only middleware - shorthand for authorize('admin')
 */
export const adminOnly = authorize('admin');

/**
 * Farmer only middleware
 */
export const farmerOnly = authorize('farmer');

/**
 * Business or Restaurant buyers
 */
export const b2bBuyers = authorize('business', 'restaurant');

/**
 * All buyer roles
 */
export const buyersOnly = authorize('customer', 'business', 'restaurant');

/**
 * Delivery partners (both scales)
 */
export const deliveryOnly = authorize('delivery');
