/**
 * Order State Machine
 * 
 * Enforces valid order status transitions through a finite state machine.
 * Prevents invalid state transitions like: delivered -> pending, cancelled -> shipped
 * 
 * Issue: Order State Transition Violations
 * Severity: HIGH
 * Impact: Prevents workflow corruption and data integrity issues
 */

/**
 * Valid state transitions for orders
 * Maps current status -> array of allowed next statuses
 * 
 * Workflow:
 * pending -> confirmed (buyer confirms order)
 * confirmed -> processing (seller prepares order)
 * processing -> shipped (order dispatched)
 * shipped -> delivered (order received by buyer)
 * 
 * From any state -> cancelled (can cancel if not already delivered/cancelled)
 */
export const STATE_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [], // Final state: no transitions allowed
  cancelled: []   // Final state: no transitions allowed
};

/**
 * Order status enum - source of truth for valid statuses
 */
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

/**
 * Get all valid statuses
 */
export const VALID_STATUSES = Object.values(ORDER_STATUS);

/**
 * Check if a status is valid
 * @param {string} status - Status to validate
 * @returns {boolean} - True if status is valid
 */
export function isValidStatus(status) {
  return VALID_STATUSES.includes(String(status || '').toLowerCase());
}

/**
 * Check if a transition is allowed
 * @param {string} currentStatus - Current order status
 * @param {string} newStatus - Desired new status
 * @returns {Object} - { allowed: boolean, reason?: string }
 * 
 * @example
 * canTransition('pending', 'confirmed') // { allowed: true }
 * canTransition('delivered', 'pending') // { allowed: false, reason: '...' }
 * canTransition('pending', 'invalid')   // { allowed: false, reason: '...' }
 */
export function canTransition(currentStatus, newStatus) {
  const current = String(currentStatus || '').toLowerCase();
  const next = String(newStatus || '').toLowerCase();

  // Check if current status is valid
  if (!isValidStatus(current)) {
    return {
      allowed: false,
      reason: `Invalid current status: "${current}"`,
      code: 'INVALID_CURRENT_STATUS'
    };
  }

  // Check if new status is valid
  if (!isValidStatus(next)) {
    return {
      allowed: false,
      reason: `Invalid new status: "${next}"`,
      code: 'INVALID_NEW_STATUS'
    };
  }

  // Check if same status (no-op)
  if (current === next) {
    return {
      allowed: false,
      reason: `Order is already in status "${current}"`,
      code: 'NO_STATUS_CHANGE'
    };
  }

  // Check if transition is allowed
  const allowedTransitions = STATE_TRANSITIONS[current];
  if (!allowedTransitions || !allowedTransitions.includes(next)) {
    return {
      allowed: false,
      reason: `Cannot transition from "${current}" to "${next}". Allowed transitions from "${current}": ${allowedTransitions.join(', ') || 'none'}`,
      code: 'INVALID_TRANSITION',
      allowedTransitions: allowedTransitions || []
    };
  }

  return {
    allowed: true
  };
}

/**
 * Get allowed transitions for a status
 * @param {string} status - Current status
 * @returns {Array<string>} - Array of allowed next statuses
 */
export function getAllowedTransitions(status) {
  const normalized = String(status || '').toLowerCase();
  if (!isValidStatus(normalized)) {
    return [];
  }
  return STATE_TRANSITIONS[normalized] || [];
}

/**
 * Check if status is a final state (no transitions allowed)
 * @param {string} status - Status to check
 * @returns {boolean} - True if status is final
 */
export function isFinalState(status) {
  const normalized = String(status || '').toLowerCase();
  const allowed = getAllowedTransitions(normalized);
  return allowed.length === 0;
}

/**
 * Validate and attempt transition
 * @param {string} currentStatus - Current order status
 * @param {string} newStatus - Desired new status
 * @param {Object} options - Additional validation options
 * @param {string} options.userRole - Role of user requesting transition (for role-specific rules)
 * @returns {Object} - { valid: boolean, error?: string, ...result }
 */
export function validateTransition(currentStatus, newStatus, options = {}) {
  // Check if transition is allowed
  const transitionCheck = canTransition(currentStatus, newStatus);
  
  if (!transitionCheck.allowed) {
    return {
      valid: false,
      error: transitionCheck.reason,
      code: transitionCheck.code,
      allowedTransitions: transitionCheck.allowedTransitions
    };
  }

  // Role-specific validation (optional)
  const roleValidation = validateRoleCanTransition(currentStatus, newStatus, options.userRole);
  if (!roleValidation.valid) {
    return {
      valid: false,
      error: roleValidation.error,
      code: 'ROLE_CANNOT_TRANSITION'
    };
  }

  return {
    valid: true,
    currentStatus,
    newStatus,
    transitionReason: getTransitionDescription(currentStatus, newStatus)
  };
}

/**
 * Get role-specific transition rules
 * @param {string} currentStatus - Current status
 * @param {string} newStatus - New status
 * @param {string} userRole - User's role
 * @returns {Object} - { valid: boolean, error?: string }
 */
export function validateRoleCanTransition(currentStatus, newStatus, userRole) {
  if (!userRole) {
    // No role validation if not specified
    return { valid: true };
  }

  const next = String(newStatus || '').toLowerCase();

  // Business rules by role:
  // - Only delivery partners can transition to 'shipped' or 'delivered'
  // - Only sellers (farmers) can transition to 'confirmed' or 'processing'
  // - Admins can do anything (no restriction)
  // - Buyers can only cancel (pending -> cancelled)

  if (userRole === 'admin') {
    return { valid: true };
  }

  if (userRole === 'delivery' || userRole === 'delivery_large' || userRole === 'delivery_small') {
    if (!['shipped', 'delivered'].includes(next)) {
      return {
        valid: false,
        error: `Delivery partners can only update status to "shipped" or "delivered", not "${next}"`
      };
    }
    return { valid: true };
  }

  if (userRole === 'farmer' || userRole === 'business' || userRole === 'restaurant') {
    if (!['confirmed', 'processing', 'cancelled'].includes(next)) {
      return {
        valid: false,
        error: `Sellers can only update status to "confirmed", "processing", or "cancelled", not "${next}"`
      };
    }
    return { valid: true };
  }

  if (userRole === 'customer') {
    if (next !== 'cancelled') {
      return {
        valid: false,
        error: `Customers can only cancel orders, not update to "${next}"`
      };
    }
    return { valid: true };
  }

  return { valid: true };
}

/**
 * Get human-readable description of a transition
 * @param {string} currentStatus - Current status
 * @param {string} newStatus - New status
 * @returns {string} - Description of what the transition means
 */
export function getTransitionDescription(currentStatus, newStatus) {
  const descriptions = {
    'pending->confirmed': 'Order confirmed by buyer',
    'confirmed->processing': 'Seller started processing order',
    'processing->shipped': 'Order has been dispatched for delivery',
    'shipped->delivered': 'Order delivered to buyer',
    'pending->cancelled': 'Order cancelled by buyer',
    'confirmed->cancelled': 'Order cancelled',
    'processing->cancelled': 'Order cancelled during processing',
    'shipped->cancelled': 'Order cancelled after shipment (high priority)',
    'delivered->cancelled': 'INVALID: Cannot cancel delivered order',
    'cancelled->*': 'INVALID: Cannot transition from cancelled state'
  };

  const current = String(currentStatus || '').toLowerCase();
  const next = String(newStatus || '').toLowerCase();
  const key = `${current}->${next}`;
  
  return descriptions[key] || `Order status changed from ${current} to ${next}`;
}

/**
 * Get transition metadata (timing, notifications, side effects)
 * @param {string} currentStatus - Current status
 * @param {string} newStatus - New status
 * @returns {Object} - Metadata about the transition
 */
export function getTransitionMetadata(currentStatus, newStatus) {
  const current = String(currentStatus || '').toLowerCase();
  const next = String(newStatus || '').toLowerCase();

  const metadata = {
    triggerNotification: true,
    notificationType: 'order_status_change',
    releaseInventory: false,
    releaseVehicle: false,
    triggerPayment: false,
    logEvent: true
  };

  // Specific side effects based on transition
  if (next === 'delivered') {
    metadata.triggerPayment = true;
    metadata.notificationType = 'order_delivered';
  }

  if (next === 'cancelled') {
    metadata.releaseInventory = true;
    metadata.releaseVehicle = true;
    metadata.notificationType = 'order_cancelled';
  }

  if (next === 'shipped') {
    metadata.notificationType = 'order_shipped';
  }

  return metadata;
}

/**
 * Create a middleware for validating order status transitions
 * Usage: router.patch('/:id/status', validateOrderTransition(), handler)
 * @returns {Function} - Express middleware
 */
export function validateOrderTransitionMiddleware() {
  return (req, res, next) => {
    const { newStatus, reason } = req.body;

    // Check if newStatus is provided
    if (!newStatus) {
      return res.status(400).json({
        success: false,
        error: 'Order status is required',
        code: 'MISSING_STATUS'
      });
    }

    // Store in request for handler to use
    req.validatedTransition = {
      newStatus: String(newStatus).toLowerCase(),
      reason: reason || undefined,
      isValidStatus: isValidStatus(newStatus)
    };

    next();
  };
}

/**
 * Get all valid transitions starting from any status
 * @returns {Object} - Complete state transition map
 */
export function getStateTransitionMap() {
  return STATE_TRANSITIONS;
}

/**
 * Get summary of state machine rules
 * @returns {Object} - Rules summary
 */
export function getStateMachineSummary() {
  return {
    totalStates: VALID_STATUSES.length,
    states: VALID_STATUSES,
    transitions: STATE_TRANSITIONS,
    finalStates: VALID_STATUSES.filter(status => isFinalState(status)),
    initialState: ORDER_STATUS.PENDING,
    description: 'Finite state machine for order workflows'
  };
}

/**
 * Audit log entry for state transition
 * @param {string} orderId - Order ID
 * @param {string} currentStatus - From status
 * @param {string} newStatus - To status
 * @param {string} userId - User making change
 * @param {string} reason - Reason for transition
 * @returns {Object} - Audit log entry
 */
export function createTransitionAuditLog(orderId, currentStatus, newStatus, userId, reason = '') {
  return {
    orderId,
    timestamp: new Date(),
    transition: `${currentStatus} -> ${newStatus}`,
    fromStatus: currentStatus,
    toStatus: newStatus,
    initiatedBy: userId,
    reason: reason || getTransitionDescription(currentStatus, newStatus),
    metadata: getTransitionMetadata(currentStatus, newStatus),
    isValid: canTransition(currentStatus, newStatus).allowed
  };
}

export default {
  STATE_TRANSITIONS,
  ORDER_STATUS,
  VALID_STATUSES,
  isValidStatus,
  canTransition,
  getAllowedTransitions,
  isFinalState,
  validateTransition,
  validateRoleCanTransition,
  getTransitionDescription,
  getTransitionMetadata,
  validateOrderTransitionMiddleware,
  getStateTransitionMap,
  getStateMachineSummary,
  createTransitionAuditLog
};
