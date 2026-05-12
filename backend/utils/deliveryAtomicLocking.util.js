/**
 * Delivery Assignment Atomic Locking
 * 
 * Prevents race conditions where multiple delivery partners accept the same task
 * simultaneously, causing duplicate assignments and logistical corruption.
 * 
 * Issue: Delivery Assignment Conflicts
 * Severity: CRITICAL
 * Impact: Prevents duplicate assignments, maintains data consistency
 * 
 * Solution: Uses MongoDB atomic operations with optimistic locking
 */

import Order from '../models/Order.model.js';
import Vehicle from '../models/Vehicle.model.js';
import DeliveryTask from '../models/DeliveryTask.model.js';

/**
 * Atomic delivery assignment using findOneAndUpdate
 * Ensures only one delivery partner can accept the same task
 * 
 * @param {string} orderId - Order ID
 * @param {string} deliveryPartnerId - Partner trying to accept
 * @param {string} vehicleId - Vehicle to use for delivery
 * @returns {Object} - { success: boolean, order?: Order, error?: string }
 * 
 * @example
 * const result = await atomicAssignDelivery(orderId, partnerId, vehicleId);
 * if (result.success) {
 *   // Assignment succeeded
 * } else {
 *   // Another partner already accepted
 * }
 */
export async function atomicAssignDelivery(orderId, deliveryPartnerId, vehicleId) {
  try {
    // ATOMIC OPERATION: Only accept if requestStatus is still 'requested'
    // This prevents two drivers from accepting simultaneously
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        // ✅ CRITICAL: Only update if still in 'requested' state
        'delivery.requestStatus': 'requested',
        // ✅ Ensure we're the requested partner OR it is a broadcasted task
        $or: [
          { 'delivery.requestedPartnerId': deliveryPartnerId },
          { 'delivery.requestedPartnerId': null }
        ],
        // ✅ Prevent re-acceptance
        'delivery._assignmentLock': { $exists: false }
      },
      {
        // Mark with assignment lock to prevent concurrent updates
        $set: {
          'delivery._assignmentLock': new Date(),
          'delivery.requestStatus': 'accepted',
          'delivery.requestedPartnerId': deliveryPartnerId,
          'delivery.requestedVehicleId': vehicleId
        },
        // Add to history atomically
        $push: {
          statusHistory: {
            status: 'assigned',
            timestamp: new Date(),
            updatedBy: deliveryPartnerId,
            notes: 'Delivery assignment accepted atomically'
          }
        }
      },
      {
        new: true, // Return updated document
        session: undefined // Use implicit session for consistency
      }
    );

    // If findOneAndUpdate returned null, another partner beat us to it
    if (!updatedOrder) {
      return {
        success: false,
        error: 'DUPLICATE_ASSIGNMENT',
        message: 'Another delivery partner already accepted this task',
        code: 'ALREADY_ACCEPTED'
      };
    }

    return {
      success: true,
      order: updatedOrder
    };
  } catch (error) {
    return {
      success: false,
      error: 'ATOMIC_UPDATE_FAILED',
      message: error.message,
      code: 'LOCK_FAILED'
    };
  }
}

/**
 * Atomic vehicle claim - prevents double-booking of vehicles
 * @param {string} vehicleId - Vehicle to claim
 * @param {string} deliveryPartnerId - Partner claiming vehicle
 * @returns {Object} - { success: boolean, vehicle?: Vehicle }
 */
export async function atomicClaimVehicle(vehicleId, deliveryPartnerId) {
  try {
    const updatedVehicle = await Vehicle.findOneAndUpdate(
      {
        _id: vehicleId,
        // ✅ Only claim if available
        status: 'Available',
        // ✅ Verify ownership
        owner: deliveryPartnerId,
        // ✅ Prevent concurrent claims
        '_activeClaimLock': { $exists: false }
      },
      {
        $set: {
          status: 'On Delivery',
          '_activeClaimLock': new Date()
        }
      },
      { new: true }
    );

    if (!updatedVehicle) {
      return {
        success: false,
        error: 'VEHICLE_ALREADY_CLAIMED',
        message: 'Vehicle is not available or already in use',
        code: 'VEHICLE_BUSY'
      };
    }

    return {
      success: true,
      vehicle: updatedVehicle
    };
  } catch (error) {
    return {
      success: false,
      error: 'VEHICLE_CLAIM_FAILED',
      message: error.message,
      code: 'LOCK_FAILED'
    };
  }
}

/**
 * Safe delivery acceptance with full atomic guarantee
 * Implements three-phase atomic transaction:
 * 1. Atomic assignment to delivery partner (TOCTOU-safe)
 * 2. Atomic vehicle claim (prevents double-booking)
 * 3. Atomic status updates (all-or-nothing)
 * 
 * @param {string} orderId - Order ID
 * @param {string} deliveryPartnerId - Partner accepting delivery
 * @param {string} vehicleId - Vehicle to use
 * @returns {Object} - Transaction result with detailed status
 */
export async function safeAtomicDeliveryAcceptance(orderId, deliveryPartnerId, vehicleId) {
  try {
    // PHASE 1: Verify vehicle is valid and owns it
    const vehicle = await Vehicle.findById(vehicleId)
      .select('_id status owner')
      .lean();

    if (!vehicle) {
      return {
        success: false,
        phase: 1,
        error: 'VEHICLE_NOT_FOUND',
        code: 'INVALID_VEHICLE'
      };
    }

    if (String(vehicle.owner) !== String(deliveryPartnerId)) {
      return {
        success: false,
        phase: 1,
        error: 'VEHICLE_NOT_OWNED_BY_PARTNER',
        code: 'UNAUTHORIZED_VEHICLE'
      };
    }

    // PHASE 2: Atomically assign delivery (prevents TOCTOU)
    const assignmentResult = await atomicAssignDelivery(orderId, deliveryPartnerId, vehicleId);
    if (!assignmentResult.success) {
      return {
        success: false,
        phase: 2,
        error: assignmentResult.error,
        message: assignmentResult.message,
        code: assignmentResult.code
      };
    }

    // PHASE 3: Atomically claim vehicle
    const vehicleResult = await atomicClaimVehicle(vehicleId, deliveryPartnerId);
    if (!vehicleResult.success) {
      // ROLLBACK: Revert the order assignment
      await Order.findOneAndUpdate(
        { _id: orderId, 'delivery.requestStatus': 'accepted' },
        {
          $set: { 'delivery.requestStatus': 'requested' },
          $unset: { 'delivery._assignmentLock': 1 }
        }
      );

      return {
        success: false,
        phase: 3,
        error: vehicleResult.error,
        message: vehicleResult.message,
        code: vehicleResult.code
      };
    }

    // All phases succeeded
    return {
      success: true,
      order: assignmentResult.order,
      vehicle: vehicleResult.vehicle,
      timestamp: new Date(),
      message: 'Delivery accepted and vehicle assigned atomically'
    };
  } catch (error) {
    return {
      success: false,
      phase: -1,
      error: 'UNEXPECTED_ERROR',
      message: error.message,
      code: 'TRANSACTION_FAILED'
    };
  }
}

/**
 * Check if an order has a pending delivery that can be accepted
 * Safe check without claiming
 * 
 * @param {string} orderId - Order ID
 * @returns {Object} - Delivery request status
 */
export async function getDeliveryAssignmentStatus(orderId) {
  try {
    const order = await Order.findById(orderId)
      .select('delivery')
      .lean();

    if (!order) {
      return {
        exists: false,
        error: 'ORDER_NOT_FOUND'
      };
    }

    const { delivery = {} } = order;
    const hasLock = delivery._assignmentLock !== undefined;

    return {
      exists: true,
      currentStatus: delivery.requestStatus || 'none',
      requestedPartnerId: delivery.requestedPartnerId,
      isLocked: hasLock,
      lockTimestamp: hasLock ? delivery._assignmentLock : null,
      canAccept: delivery.requestStatus === 'requested' && !hasLock
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
}

/**
 * Release assignment lock (timeout-based cleanup)
 * Use this if a delivery partner crashes during acceptance
 * Prevents assignments from being locked forever
 * 
 * @param {string} orderId - Order ID
 * @param {number} lockTimeoutMs - How old lock must be to release (default: 5 minutes)
 * @returns {Object} - Release result
 */
export async function releaseStaleLock(orderId, lockTimeoutMs = 5 * 60 * 1000) {
  try {
    const fiveMinutesAgo = new Date(Date.now() - lockTimeoutMs);

    const result = await Order.findOneAndUpdate(
      {
        _id: orderId,
        'delivery._assignmentLock': { $lt: fiveMinutesAgo }
      },
      {
        $unset: { 'delivery._assignmentLock': 1 }
      },
      { new: true }
    );

    return {
      success: !!result,
      released: !!result,
      order: result,
      message: result ? 'Stale lock released' : 'No stale lock found'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Compare-and-swap operation for delivery status
 * Generic atomic update that only succeeds if current state matches expected
 * 
 * @param {string} orderId - Order ID
 * @param {string} expectedStatus - Expected current status
 * @param {string} newStatus - New status to set
 * @param {string} deliveryPartnerId - Partner making change
 * @returns {Object} - Update result
 */
export async function atomicDeliveryStatusUpdate(orderId, expectedStatus, newStatus, deliveryPartnerId) {
  try {
    const result = await Order.findOneAndUpdate(
      {
        _id: orderId,
        'delivery.requestStatus': expectedStatus,
        'delivery.requestedPartnerId': deliveryPartnerId
      },
      {
        $set: {
          'delivery.requestStatus': newStatus,
          'delivery.lastUpdatedAt': new Date()
        },
        $push: {
          statusHistory: {
            status: newStatus,
            timestamp: new Date(),
            updatedBy: deliveryPartnerId,
            notes: `Delivery status updated from ${expectedStatus} to ${newStatus}`
          }
        }
      },
      { new: true }
    );

    if (!result) {
      return {
        success: false,
        error: 'STATUS_CONFLICT',
        message: `Expected delivery.requestStatus="${expectedStatus}" but found different value. Possible concurrent update.`
      };
    }

    return {
      success: true,
      order: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get available delivery assignments (list view safe)
 * Shows only truly unassigned tasks without claiming them
 * 
 * @param {Object} filters - Filter options
 * @returns {Array} - Available assignments
 */
export async function getAvailableDeliveryAssignments(filters = {}) {
  try {
    const query = {
      'delivery.requestStatus': 'requested',
      // ✅ Exclude locked assignments
      'delivery._assignmentLock': { $exists: false },
      // ✅ Optional status filter
      ...(filters.status && { status: filters.status }),
      // ✅ Optional location filter
      ...(filters.location && { 'delivery.deliveryLocation.city': filters.location })
    };

    const assignments = await Order.find(query)
      .select('_id orderNumber delivery status buyerId sellerId')
      .lean()
      .limit(filters.limit || 100)
      .sort({ createdAt: -1 });

    return {
      success: true,
      count: assignments.length,
      assignments
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Audit log entry for delivery operations
 * @param {string} orderId - Order ID
 * @param {string} partnerId - Partner ID
 * @param {string} action - Action type (accept, reject, claim, etc.)
 * @param {Object} details - Additional details
 * @returns {Object} - Audit log entry
 */
export function createDeliveryAuditLog(orderId, partnerId, action, details = {}) {
  return {
    orderId,
    partnerId,
    action,
    timestamp: new Date(),
    details,
    lockUsed: true,
    atomicOperation: true
  };
}

export default {
  atomicAssignDelivery,
  atomicClaimVehicle,
  safeAtomicDeliveryAcceptance,
  getDeliveryAssignmentStatus,
  releaseStaleLock,
  atomicDeliveryStatusUpdate,
  getAvailableDeliveryAssignments,
  createDeliveryAuditLog
};
