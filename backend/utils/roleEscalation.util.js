/**
 * Role Escalation Detection & Prevention System
 * 
 * Comprehensive security layer to prevent unauthorized privilege escalation
 * 
 * Attack Vectors Protected Against:
 * 1. Direct role modification in request body
 * 2. Role injection attacks
 * 3. Invalid role injection
 * 4. Cross-role boundary violation
 * 5. Multi-session privilege escalation
 * 6. JWT tampering with role claims
 */

import User from '../models/User.model.js';
import { VALID_ROLES, ROLE_HIERARCHY } from '../middleware/rbac.middleware.js';

/**
 * Severity levels for escalation attempts
 */
export const ESCALATION_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Track escalation attempts for rate limiting
 * Prevents brute-force privilege escalation attempts
 */
const escalationAttempts = new Map(); // userId -> { count, timestamp, attempts: [] }
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

/**
 * Record an escalation attempt
 * Returns true if limit exceeded
 */
export function recordEscalationAttempt(userId, details) {
  const now = Date.now();
  const key = String(userId);
  
  let record = escalationAttempts.get(key);
  
  if (!record || (now - record.timestamp) > ATTEMPT_WINDOW) {
    // New window
    record = {
      count: 0,
      timestamp: now,
      attempts: []
    };
  }
  
  record.count++;
  record.attempts.push({
    timestamp: new Date().toISOString(),
    ...details
  });
  
  escalationAttempts.set(key, record);
  
  return record.count > MAX_ATTEMPTS;
}

/**
 * Get escalation attempt history for a user
 */
export function getEscalationAttempts(userId) {
  return escalationAttempts.get(String(userId)) || {
    count: 0,
    timestamp: null,
    attempts: []
  };
}

/**
 * Clear escalation attempts for a user (after remediation)
 */
export function clearEscalationAttempts(userId) {
  escalationAttempts.delete(String(userId));
}

/**
 * CRITICAL: Verify JWT roles haven't been tampered with
 * Compares JWT roles against database user record
 */
export async function validateJWTRoles(userId, tokenRoles) {
  try {
    const user = await User.findById(userId).select('roles status');
    
    if (!user) {
      return {
        valid: false,
        reason: 'USER_NOT_FOUND',
        severity: ESCALATION_SEVERITY.HIGH,
        detail: 'User record does not exist in database'
      };
    }

    // Check if account is suspended
    if (user.status === 'suspended') {
      return {
        valid: false,
        reason: 'ACCOUNT_SUSPENDED',
        severity: ESCALATION_SEVERITY.HIGH,
        detail: 'User account has been suspended'
      };
    }

    // Validate token roles are in database
    const databaseRoles = user.roles || [];
    const tokenRolesSet = new Set(tokenRoles || []);
    const databaseRolesSet = new Set(databaseRoles);

    // Check for token roles not in database (escalation attempt)
    const unauthorizedRoles = tokenRoles.filter(r => !databaseRolesSet.has(r));
    if (unauthorizedRoles.length > 0) {
      return {
        valid: false,
        reason: 'JWT_ROLE_MISMATCH',
        severity: ESCALATION_SEVERITY.CRITICAL,
        detail: 'Token contains roles not assigned in database',
        tokenRoles,
        databaseRoles,
        unauthorizedRoles
      };
    }

    // Check for database roles missing from token (account upgraded)
    // This is OK if it's admin adding roles, but suspicious if user's roles increased
    const missingRoles = databaseRoles.filter(r => !tokenRolesSet.has(r));
    if (missingRoles.length > 0 && missingRoles.includes('admin')) {
      // Admin role added but not in token - might be old token
      return {
        valid: false,
        reason: 'TOKEN_STALE',
        severity: ESCALATION_SEVERITY.MEDIUM,
        detail: 'Token does not reflect latest role assignments',
        databaseRoles,
        tokenRoles,
        missingRoles
      };
    }

    return {
      valid: true,
      reason: 'VALID',
      severity: ESCALATION_SEVERITY.LOW,
      databaseRoles,
      tokenRoles
    };
  } catch (error) {
    console.error('Error validating JWT roles', { error: error.message });
    return {
      valid: false,
      reason: 'VALIDATION_ERROR',
      severity: ESCALATION_SEVERITY.HIGH,
      detail: error.message
    };
  }
}

/**
 * CRITICAL: Detect if user is trying to escalate privilege
 * 
 * Checks:
 * 1. Are new roles higher privilege than existing?
 * 2. Is user trying to grant themselves admin?
 * 3. Are requested roles valid?
 * 4. Has user exceeded attempt limit?
 */
export function detectPrivilegeEscalation(userId, currentRoles, requestedRoles) {
  const issues = [];

  // Check 1: Invalid roles
  const invalidRoles = requestedRoles.filter(r => !Object.values(VALID_ROLES).includes(r));
  if (invalidRoles.length > 0) {
    issues.push({
      type: 'INVALID_ROLES',
      severity: ESCALATION_SEVERITY.HIGH,
      detail: `Invalid roles: ${invalidRoles.join(', ')}`
    });
  }

  // Check 2: Privilege increase
  const currentMaxPrivilege = Math.max(
    ...currentRoles.map(r => ROLE_HIERARCHY[r] ?? -1)
  );
  const requestedMaxPrivilege = Math.max(
    ...requestedRoles.map(r => ROLE_HIERARCHY[r] ?? -1)
  );

  if (requestedMaxPrivilege > currentMaxPrivilege) {
    // Check if requesting admin privilege
    if (requestedRoles.includes(VALID_ROLES.ADMIN) && 
        !currentRoles.includes(VALID_ROLES.ADMIN)) {
      issues.push({
        type: 'ADMIN_ESCALATION_ATTEMPT',
        severity: ESCALATION_SEVERITY.CRITICAL,
        detail: 'User attempting to grant themselves admin role',
        fromRoles: currentRoles,
        toRoles: requestedRoles
      });
    } else {
      issues.push({
        type: 'PRIVILEGE_ESCALATION',
        severity: ESCALATION_SEVERITY.HIGH,
        detail: 'User attempting to increase privilege level',
        fromRoles: currentRoles,
        toRoles: requestedRoles,
        privilegeIncrease: requestedMaxPrivilege - currentMaxPrivilege
      });
    }
  }

  // Check 3: Attempt rate limiting
  const attempts = getEscalationAttempts(userId);
  if (attempts.count >= MAX_ATTEMPTS) {
    issues.push({
      type: 'RATE_LIMIT_EXCEEDED',
      severity: ESCALATION_SEVERITY.CRITICAL,
      detail: `Too many escalation attempts (${attempts.count}/${MAX_ATTEMPTS})`,
      window: '15 minutes',
      nextAttemptTime: new Date(attempts.timestamp + ATTEMPT_WINDOW).toISOString()
    });
  }

  return {
    isEscalation: issues.length > 0,
    issues,
    maxSeverity: issues.length > 0 
      ? issues.reduce((max, issue) => {
          const severityOrder = {
            [ESCALATION_SEVERITY.LOW]: 1,
            [ESCALATION_SEVERITY.MEDIUM]: 2,
            [ESCALATION_SEVERITY.HIGH]: 3,
            [ESCALATION_SEVERITY.CRITICAL]: 4
          };
          return severityOrder[issue.severity] > severityOrder[max] ? issue.severity : max;
        }, ESCALATION_SEVERITY.LOW)
      : null
  };
}

/**
 * CRITICAL: Sanitize user object to ensure roles can't be modified client-side
 * Remove all role-related fields from request body before processing
 */
export function sanitizeUserUpdateRequest(body) {
  if (!body) return body;

  const sanitized = { ...body };
  
  // Remove all role-related fields
  const forbiddenFields = [
    'role', 'roles', 'admin', 'isAdmin', 'adminStatus', 'privilege', 'privileges',
    'permissions', 'permission', 'clearance', 'accessLevel', 'roleId', 'roleIds',
    'groupId', 'groupIds', 'group', 'groups', 'membershipLevel'
  ];

  forbiddenFields.forEach(field => {
    delete sanitized[field];
  });

  return sanitized;
}

/**
 * CRITICAL: Validate request doesn't contain role escalation attempts
 * Deep check through nested objects
 */
export function validateNoRoleEscalationInRequest(body, depth = 0, path = '') {
  if (depth > 5) {
    // Prevent deep recursion attacks
    return { valid: true };
  }

  if (!body || typeof body !== 'object') {
    return { valid: true };
  }

  const roleKeywords = [
    'role', 'admin', 'privilege', 'permission', 'access', 'level',
    'group', 'clearance', 'tier', 'membership', 'claim', 'scope'
  ];

  for (const [key, value] of Object.entries(body)) {
    const currentPath = path ? `${path}.${key}` : key;
    const keyLower = key.toLowerCase();

    // Check if key contains role keywords
    const isSuspiciousKey = roleKeywords.some(keyword => 
      keyLower.includes(keyword)
    );

    if (isSuspiciousKey && value !== null && value !== undefined) {
      return {
        valid: false,
        reason: 'ROLE_ESCALATION_FIELD_DETECTED',
        field: currentPath,
        value: typeof value === 'string' ? value : '[object]'
      };
    }

    // Recurse into objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = validateNoRoleEscalationInRequest(value, depth + 1, currentPath);
      if (!nested.valid) return nested;
    }

    // Check array items
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (typeof value[i] === 'object' && value[i] !== null) {
          const nested = validateNoRoleEscalationInRequest(
            value[i],
            depth + 1,
            `${currentPath}[${i}]`
          );
          if (!nested.valid) return nested;
        }
      }
    }
  }

  return { valid: true };
}

/**
 * Log a role escalation attempt with full context
 * Used for security monitoring and compliance
 */
export function logEscalationAttempt(userId, details, severity = ESCALATION_SEVERITY.HIGH) {
  const event = {
    timestamp: new Date().toISOString(),
    eventType: 'ROLE_ESCALATION_ATTEMPT',
    userId,
    severity,
    ...details
  };

  if (severity === ESCALATION_SEVERITY.CRITICAL) {
    console.error(`🚨 CRITICAL: Role escalation attempt by ${userId}`, event);
  } else if (severity === ESCALATION_SEVERITY.HIGH) {
    console.error(`🔴 HIGH: Role escalation attempt by ${userId}`, event);
  } else {
    console.warn(`🟡 Role escalation attempt by ${userId}`, event);
  }

  // Record for rate limiting
  recordEscalationAttempt(userId, details);

  return event;
}

/**
 * Get security context for a user
 * Used for monitoring and compliance
 */
export async function getUserSecurityContext(userId) {
  try {
    const user = await User.findById(userId).select('roles status lastLogin createdAt');
    const attempts = getEscalationAttempts(userId);

    return {
      userId,
      roles: user?.roles || [],
      status: user?.status || 'unknown',
      lastLogin: user?.lastLogin,
      createdAt: user?.createdAt,
      escalationAttempts: attempts.count,
      recentAttempts: attempts.attempts?.slice(-3) || [],
      isRateLimited: attempts.count >= MAX_ATTEMPTS
    };
  } catch (error) {
    console.error('Error getting user security context', { error: error.message });
    return null;
  }
}

export default {
  ESCALATION_SEVERITY,
  recordEscalationAttempt,
  getEscalationAttempts,
  clearEscalationAttempts,
  validateJWTRoles,
  detectPrivilegeEscalation,
  sanitizeUserUpdateRequest,
  validateNoRoleEscalationInRequest,
  logEscalationAttempt,
  getUserSecurityContext
};
