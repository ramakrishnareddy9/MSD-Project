/**
 * RBAC (Role-Based Access Control) Security Module
 * 
 * CRITICAL SECURITY ISSUE: Role Escalation Vulnerability
 * 
 * Problem: Users can send {"role": "admin"} in requests
 * Risk: Backend validates authentication but not authorization consistently
 * Solution: Centralized RBAC with explicit role checks on EVERY protected route
 * 
 * Design Principles:
 * 1. Never trust roles from request body - ONLY from JWT token
 * 2. Explicit authorization on every protected route (fail-secure)
 * 3. Comprehensive audit logging of auth decisions
 * 4. Role immutability except through admin processes
 * 5. Principle of least privilege
 */


/**
 * CRITICAL: Define all valid roles in system
 * This is the source of truth for role validation
 */
export const VALID_ROLES = {
  ADMIN: 'admin',
  FARMER: 'farmer',
  CUSTOMER: 'customer',
  BUSINESS: 'business',
  RESTAURANT: 'restaurant',
  TRAVEL_AGENCY: 'travel_agency',
  DELIVERY: 'delivery',
  DELIVERY_LARGE: 'delivery_large',
  DELIVERY_SMALL: 'delivery_small',
  COMMUNITY: 'community'
};

/**
 * Role hierarchy for privilege escalation detection
 * Higher index = higher privilege
 */
export const ROLE_HIERARCHY = {
  [VALID_ROLES.CUSTOMER]: 0,
  [VALID_ROLES.FARMER]: 1,
  [VALID_ROLES.BUSINESS]: 1,
  [VALID_ROLES.RESTAURANT]: 1,
  [VALID_ROLES.TRAVEL_AGENCY]: 1,
  [VALID_ROLES.DELIVERY]: 1,
  [VALID_ROLES.DELIVERY_LARGE]: 1,
  [VALID_ROLES.DELIVERY_SMALL]: 1,
  [VALID_ROLES.COMMUNITY]: 2,
  [VALID_ROLES.ADMIN]: 999 // Highest privilege
};

/**
 * Validate that a role string is valid
 * Prevents typos and malicious role injections
 */
export function isValidRole(role) {
  if (typeof role !== 'string') return false;
  return Object.values(VALID_ROLES).includes(role);
}

/**
 * Validate all roles in an array
 */
export function areValidRoles(roles) {
  if (!Array.isArray(roles)) return false;
  return roles.every(role => isValidRole(role));
}

/**
 * CRITICAL SECURITY CHECK
 * Verify that roles in request body match JWT roles
 * Detects privilege escalation attempts
 */
export function validateRolesNotEscalated(req) {
  // If request contains role data, it MUST match JWT
  if (req.body?.role || req.body?.roles) {
    const requestRoles = req.body.roles || (req.body.role ? [req.body.role] : []);
    const tokenRoles = req.user?.roles || [];

    // Check if any requested role is not in token
    const hasInvalidRoles = requestRoles.some(role => 
      !tokenRoles.includes(role)
    );

    if (hasInvalidRoles) {
      return {
        valid: false,
        reason: 'PRIVILEGE_ESCALATION_ATTEMPT',
        requestedRoles: requestRoles,
        tokenRoles: tokenRoles,
        invalidRoles: requestRoles.filter(r => !tokenRoles.includes(r))
      };
    }

    // Check if requesting role removal (e.g., admin trying to remove own admin role)
    if (requestRoles.length < tokenRoles.length) {
      return {
        valid: false,
        reason: 'ROLE_MODIFICATION_ATTEMPT',
        message: 'Cannot modify own roles through API'
      };
    }
  }

  return { valid: true };
}

/**
 * Get the highest privilege role for a user
 * Useful for determining overall privilege level
 */
export function getHighestPrivilegeRole(roles) {
  if (!Array.isArray(roles) || roles.length === 0) {
    return null;
  }

  return roles.reduce((highest, current) => {
    const currentLevel = ROLE_HIERARCHY[current] ?? -1;
    const highestLevel = ROLE_HIERARCHY[highest] ?? -1;
    return currentLevel > highestLevel ? current : highest;
  });
}

/**
 * Check if a role has higher privilege than another
 */
export function hasHigherPrivilege(role1, role2) {
  return (ROLE_HIERARCHY[role1] ?? -1) > (ROLE_HIERARCHY[role2] ?? -1);
}

/**
 * Audit log for authorization events
 * CRITICAL: Track all auth decisions for compliance
 */
function logAuthEvent(eventType, req, details) {
  const event = {
    timestamp: new Date().toISOString(),
    eventType,
    userId: req.user?._id,
    userRoles: req.user?.roles,
    endpoint: req.originalUrl,
    method: req.method,
    ip: req.ip,
    ...details
  };

  if (eventType === 'AUTHORIZATION_DENIED') {
    console.warn(`🚫 AUTH DENIED: ${req.user?._id} tried to access ${req.method} ${req.originalUrl}`, event);
  } else if (eventType === 'PRIVILEGE_ESCALATION_ATTEMPT') {
    console.error(`🚨 PRIVILEGE ESCALATION ATTEMPT by ${req.user?._id}`, event);
  } else if (eventType === 'ROLE_VALIDATION_FAILED') {
    console.error(`🚨 INVALID ROLE ATTEMPTED by ${req.user?._id}`, event);
  }
}

/**
 * Enhanced Authorization Middleware
 * 
 * Features:
 * 1. Validates roles come only from JWT
 * 2. Checks for privilege escalation attempts
 * 3. Logs all auth decisions
 * 4. Fails secure (deny if uncertain)
 * 
 * @param {...string} allowedRoles - Array of allowed role names
 * @returns {Function} Express middleware
 * 
 * @example
 * router.post('/products', authenticate, authorize('farmer', 'admin'), createProduct);
 * router.delete('/admin/users/:id', authenticate, authorize('admin'), deleteUser);
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // CRITICAL SECURITY CHECK 1: User must be authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // CRITICAL SECURITY CHECK 2: Validate roles are valid format
    if (!Array.isArray(req.user.roles)) {
      logAuthEvent('ROLE_VALIDATION_FAILED', req, {
        reason: 'Invalid roles format in token',
        tokenRoles: req.user.roles
      });
      return res.status(401).json({
        success: false,
        error: 'INVALID_ROLES',
        message: 'Invalid roles in authentication token',
        code: 'INVALID_TOKEN'
      });
    }

    // CRITICAL SECURITY CHECK 3: Validate all roles are known roles
    if (!areValidRoles(req.user.roles)) {
      const invalidRoles = req.user.roles.filter(r => !isValidRole(r));
      logAuthEvent('ROLE_VALIDATION_FAILED', req, {
        reason: 'Unknown role in token',
        invalidRoles,
        tokenRoles: req.user.roles
      });
      return res.status(401).json({
        success: false,
        error: 'INVALID_ROLE',
        message: 'Token contains unknown roles',
        code: 'INVALID_ROLE_IN_TOKEN'
      });
    }

    // CRITICAL SECURITY CHECK 4: Detect privilege escalation attempt
    const escapeCheck = validateRolesNotEscalated(req);
    if (!escapeCheck.valid) {
      logAuthEvent('PRIVILEGE_ESCALATION_ATTEMPT', req, escapeCheck);
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Unauthorized privilege escalation attempt detected',
        code: 'PRIVILEGE_ESCALATION_BLOCKED',
        severity: 'CRITICAL'
      });
    }

    // CRITICAL SECURITY CHECK 5: Check user has required role
    const hasAllowedRole = req.user.roles.some(role => 
      allowedRoles.includes(role)
    );

    if (!hasAllowedRole) {
      logAuthEvent('AUTHORIZATION_DENIED', req, {
        requiredRoles: allowedRoles,
        userRoles: req.user.roles,
        reason: 'User lacks required role(s)'
      });
      
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.roles
      });
    }

    // All checks passed
    next();
  };
};

/**
 * Require ALL specified roles (user must have every role)
 * Stricter than authorize() - for multi-role requirements
 * 
 * @example
 * router.post('/admin/special', authenticate, requireAllRoles('admin', 'verified'), specialAction);
 */
export const requireAllRoles = (...requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Validate roles format
    if (!Array.isArray(req.user.roles) || !areValidRoles(req.user.roles)) {
      logAuthEvent('ROLE_VALIDATION_FAILED', req, {
        reason: 'Invalid roles in token'
      });
      return res.status(401).json({
        success: false,
        error: 'INVALID_ROLE',
        message: 'Invalid roles in authentication token',
        code: 'INVALID_TOKEN'
      });
    }

    // Check for privilege escalation
    const escapeCheck = validateRolesNotEscalated(req);
    if (!escapeCheck.valid) {
      logAuthEvent('PRIVILEGE_ESCALATION_ATTEMPT', req, escapeCheck);
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Unauthorized privilege escalation attempt detected',
        code: 'PRIVILEGE_ESCALATION_BLOCKED',
        severity: 'CRITICAL'
      });
    }

    // Check user has ALL required roles
    const hasAllRoles = requiredRoles.every(role =>
      req.user.roles.includes(role)
    );

    if (!hasAllRoles) {
      logAuthEvent('AUTHORIZATION_DENIED', req, {
        requiredRoles,
        userRoles: req.user.roles,
        reason: 'User missing one or more required roles'
      });
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Missing required roles',
        code: 'MISSING_REQUIRED_ROLES',
        required: requiredRoles,
        current: req.user.roles
      });
    }

    next();
  };
};

/**
 * Check resource ownership - user can only access their own resources
 * Admins bypass this check
 * 
 * @param {string} ownerField - Field name containing owner ID (default: 'userId')
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/users/:id/orders', authenticate, checkOwnership('userId'), getOrders);
 */
export const checkOwnership = (ownerField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Validate roles format
    if (!Array.isArray(req.user.roles) || !areValidRoles(req.user.roles)) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_ROLE',
        message: 'Invalid roles in authentication token',
        code: 'INVALID_TOKEN'
      });
    }

    // Admins can access all resources
    if (req.user.roles.includes(VALID_ROLES.ADMIN)) {
      return next();
    }

    // For non-admins, check ownership
    const resourceOwnerId = req.body?.[ownerField] || req.params?.[ownerField];
    
    if (resourceOwnerId && String(resourceOwnerId) !== String(req.user._id)) {
      logAuthEvent('OWNERSHIP_CHECK_FAILED', req, {
        field: ownerField,
        resourceOwnerId,
        userId: req.user._id,
        reason: 'User attempted to access resource they do not own'
      });
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You can only access your own resources',
        code: 'NOT_OWNER',
        requestedResource: resourceOwnerId,
        ownId: req.user._id
      });
    }

    next();
  };
};

/**
 * Admin-only middleware - shorthand for authorize('admin')
 * Most restrictive access level
 */
export const adminOnly = authorize(VALID_ROLES.ADMIN);

/**
 * Farmer-only middleware
 */
export const farmerOnly = authorize(VALID_ROLES.FARMER);

/**
 * Customer-only middleware
 */
export const customerOnly = authorize(VALID_ROLES.CUSTOMER);

/**
 * Business, Restaurant, or Travel Agency (B2B buyers)
 */
export const b2bBuyers = authorize(
  VALID_ROLES.BUSINESS,
  VALID_ROLES.RESTAURANT,
  VALID_ROLES.TRAVEL_AGENCY
);

/**
 * All buyer roles (B2C and B2B)
 */
export const buyersOnly = authorize(
  VALID_ROLES.CUSTOMER,
  VALID_ROLES.BUSINESS,
  VALID_ROLES.RESTAURANT,
  VALID_ROLES.TRAVEL_AGENCY
);

/**
 * Delivery partner roles (all scales)
 */
export const deliveryOnly = authorize(
  VALID_ROLES.DELIVERY,
  VALID_ROLES.DELIVERY_LARGE,
  VALID_ROLES.DELIVERY_SMALL
);

/**
 * Community pool managers
 */
export const communityOnly = authorize(VALID_ROLES.COMMUNITY);

/**
 * Sellers (farmers or businesses)
 */
export const sellersOnly = authorize(
  VALID_ROLES.FARMER,
  VALID_ROLES.BUSINESS,
  VALID_ROLES.RESTAURANT
);

/**
 * Middleware to strip role-related fields from request body
 * Prevents users from attempting to modify roles through API
 * 
 * Should be placed early in middleware chain (before handlers)
 */
export const stripRoleFields = (req, res, next) => {
  if (req.body) {
    // Delete any role-related fields user might have tried to add
    delete req.body.role;
    delete req.body.roles;
    delete req.body.admin;
    delete req.body.isAdmin;
    delete req.body.adminStatus;
  }
  next();
};

/**
 * Strict role validation for admin actions
 * Use when admin is modifying user roles
 * 
 * @example
 * router.put('/admin/users/:id/roles', authenticate, adminOnly, validateRoleChange, updateUserRoles);
 */
export const validateRoleChange = (req, res, next) => {
  const { roles } = req.body;

  // Must be trying to change roles
  if (!roles) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'No roles provided for update',
      code: 'MISSING_ROLES'
    });
  }

  // Must be an array
  if (!Array.isArray(roles)) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Roles must be an array',
      code: 'INVALID_ROLES_FORMAT'
    });
  }

  // All roles must be valid
  if (!areValidRoles(roles)) {
    const invalidRoles = roles.filter(r => !isValidRole(r));
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid role(s)',
      code: 'INVALID_ROLE_VALUES',
      invalidRoles,
      validRoles: Object.values(VALID_ROLES)
    });
  }

  // Cannot make non-admin into admin without explicit approval
  if (roles.includes(VALID_ROLES.ADMIN) && 
      !req.user.roles.includes(VALID_ROLES.ADMIN)) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Only existing admins can grant admin role',
      code: 'ADMIN_ONLY_CHANGE'
    });
  }

  next();
};

/**
 * KYC enforcement middleware
 * Blocks seller/delivery actions when KYC is not yet verified.
 * Place after authenticate on any route where identity proof is required
 * (e.g. listing products, accepting delivery tasks).
 *
 * @example
 * router.post('/products', authenticate, requireKYC, createProduct);
 */
export const requireKYC = (req, res, next) => {
  // Admins and customers are exempt
  const exemptRoles = [VALID_ROLES.ADMIN, VALID_ROLES.CUSTOMER];
  const hasExemptRole = req.user?.roles?.some(r => exemptRoles.includes(r));
  if (hasExemptRole) return next();

  const kycStatus = req.user?.kycStatus;
  if (kycStatus !== 'verified') {
    logAuthEvent('KYC_NOT_VERIFIED', req, {
      kycStatus,
      reason: 'User attempted a KYC-gated action without verified identity'
    });
    return res.status(403).json({
      success: false,
      error: 'KYC_REQUIRED',
      message: 'Identity verification (KYC) is required before performing this action. Please complete KYC in your profile.',
      code: 'KYC_NOT_VERIFIED',
      kycStatus: kycStatus || 'not_started'
    });
  }

  next();
};

export default {
  VALID_ROLES,
  ROLE_HIERARCHY,
  isValidRole,
  areValidRoles,
  validateRolesNotEscalated,
  getHighestPrivilegeRole,
  hasHigherPrivilege,
  authorize,
  requireAllRoles,
  checkOwnership,
  adminOnly,
  farmerOnly,
  customerOnly,
  b2bBuyers,
  buyersOnly,
  deliveryOnly,
  communityOnly,
  sellersOnly,
  stripRoleFields,
  validateRoleChange,
  requireKYC
};
