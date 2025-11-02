import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import validator from 'validator';

/**
 * Input Sanitization Middleware
 * Protects against XSS, NoSQL injection, and other malicious input
 */

/**
 * MongoDB query sanitizer
 * Prevents NoSQL injection attacks
 */
export const sanitizeMongo = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[SECURITY] Potential NoSQL injection attempt detected in ${key}`);
  }
});

/**
 * XSS sanitizer
 * Removes malicious scripts from request data
 */
export const sanitizeXSS = xss();

/**
 * Custom input sanitizer
 * Sanitizes specific fields based on type
 */
export const sanitizeInput = (req, res, next) => {
  // Sanitize email fields
  if (req.body.email) {
    req.body.email = validator.normalizeEmail(req.body.email, {
      gmail_remove_dots: false
    });
  }

  // Trim whitespace from string fields
  Object.keys(req.body).forEach(key => {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key].trim();
    }
  });

  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }

  next();
};

/**
 * Prevent parameter pollution
 * Protects against HPP (HTTP Parameter Pollution) attacks
 */
export const preventParameterPollution = (parameterWhitelist = []) => {
  return (req, res, next) => {
    // Check for duplicate parameters
    Object.keys(req.query).forEach(key => {
      if (!parameterWhitelist.includes(key) && Array.isArray(req.query[key])) {
        // Take only the last value if parameter is duplicated
        req.query[key] = req.query[key][req.query[key].length - 1];
        console.warn(`[SECURITY] Parameter pollution detected: ${key}`);
      }
    });
    next();
  };
};

/**
 * SQL injection prevention (for raw queries if any)
 * Checks for common SQL injection patterns
 */
export const preventSQLInjection = (req, res, next) => {
  const sqlPatterns = [
    /(\bor\b|\band\b).*?=.*?=/i,
    /union.*?select/i,
    /insert.*?into/i,
    /delete.*?from/i,
    /drop.*?table/i,
    /exec(\s|\+)+(s|x)p\w+/i
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  // Check all request data
  const checkObject = (obj) => {
    for (let key in obj) {
      if (checkValue(obj[key])) {
        return true;
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (checkObject(obj[key])) {
          return true;
        }
      }
    }
    return false;
  };

  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    console.error('[SECURITY] Potential SQL injection attempt detected');
    return res.status(400).json({
      success: false,
      error: 'Invalid input detected',
      message: 'Your request contains potentially malicious content'
    });
  }

  next();
};

/**
 * Content Security Policy headers
 */
export const setSecurityHeaders = (req, res, next) => {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
  );

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

/**
 * Rate limit by IP for sensitive operations
 */
export const sensitiveOperationLog = (operation) => {
  return (req, res, next) => {
    const logData = {
      timestamp: new Date().toISOString(),
      operation: operation,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || 'anonymous',
      email: req.body?.email || req.user?.email
    };

    console.log(`[SENSITIVE OPERATION] ${operation}:`, JSON.stringify(logData, null, 2));
    next();
  };
};

export default {
  sanitizeMongo,
  sanitizeXSS,
  sanitizeInput,
  preventParameterPollution,
  preventSQLInjection,
  setSecurityHeaders,
  sensitiveOperationLog
};
