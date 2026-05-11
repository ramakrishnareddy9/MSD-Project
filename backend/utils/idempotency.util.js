import crypto from 'crypto';

/**
 * Idempotency Key Store - Prevents duplicate payment processing
 * Issue 34 - Add idempotency key for payment creation
 * 
 * In production, this should use Redis for distributed systems
 * For now using in-memory with TTL cleanup
 */

class IdempotencyStore {
  constructor() {
    this.store = new Map();
    this.ttl = 24 * 60 * 60 * 1000; // 24 hours
    this.cleanupInterval = 60 * 60 * 1000; // Cleanup every hour
    this.startCleanup();
  }

  /**
   * Store request result with idempotency key
   */
  store(idempotencyKey, result, metadata = {}) {
    const entry = {
      result,
      metadata,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.ttl
    };

    this.store.set(idempotencyKey, entry);
    return entry;
  }

  /**
   * Retrieve stored result if exists and not expired
   */
  get(idempotencyKey) {
    const entry = this.store.get(idempotencyKey);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(idempotencyKey);
      return null;
    }

    return entry;
  }

  /**
   * Check if key exists
   */
  has(idempotencyKey) {
    return this.get(idempotencyKey) !== null;
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Start periodic cleanup
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop cleanup
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

export const idempotencyStore = new IdempotencyStore();

/**
 * Middleware for handling idempotent requests
 * Usage: Apply to endpoints that should be idempotent (POST /payments, POST /orders)
 */
export const idempotencyMiddleware = (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'];

  if (!idempotencyKey) {
    // Some endpoints require idempotency key
    if (req.path.includes('/payments') || req.path.includes('/checkout')) {
      return res.status(400).json({
        success: false,
        message: 'Idempotency-Key header is required for this operation'
      });
    }
    return next();
  }

  // Validate idempotency key format (UUID-like)
  if (!/^[a-f0-9\-]{36}$/i.test(idempotencyKey)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Idempotency-Key format. Must be a valid UUID.'
    });
  }

  // Check if we've already processed this key
  const previousResult = idempotencyStore.get(idempotencyKey);
  if (previousResult) {
    // Return previous result with 200 OK
    // Note: Idempotency means returning 200, not 201, for duplicates
    return res.status(200).json({
      success: true,
      isDuplicate: true,
      message: 'This is a duplicate request. Returning previous result.',
      data: previousResult.result
    });
  }

  // Store the idempotency key so we can check later
  req.idempotencyKey = idempotencyKey;

  // Wrap res.json to capture responses
  const originalJson = res.json;
  res.json = function(data) {
    // Only store successful responses (2xx status)
    if (res.statusCode >= 200 && res.statusCode < 300 && req.idempotencyKey) {
      idempotencyStore.store(req.idempotencyKey, data, {
        statusCode: res.statusCode,
        timestamp: new Date().toISOString(),
        userId: req.user?._id
      });
    }
    return originalJson.call(this, data);
  };

  next();
};

/**
 * Generate idempotency key
 */
export const generateIdempotencyKey = () => {
  return crypto.randomUUID();
};

export default {
  idempotencyStore,
  idempotencyMiddleware,
  generateIdempotencyKey
};
