import DOMPurify from 'isomorphic-dompurify';
import mongoSanitize from 'express-mongo-sanitize';

/**
 * Sanitization Utilities - Issue 39 - Prevent XSS and injection attacks
 */

/**
 * Sanitize string input to prevent XSS
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
};

/**
 * Sanitize object fields
 */
export const sanitizeObject = (obj, fieldsToSanitize = []) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj };
  
  fieldsToSanitize.forEach(field => {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeString(sanitized[field]);
    }
  });

  return sanitized;
};

/**
 * Express middleware for sanitizing MongoDB queries
 * Removes $ and . from user input to prevent NoSQL injection
 */
export const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Potential NoSQL injection detected in field: ${key}`);
  }
});

/**
 * Custom sanitization middleware for text fields
 * Sanitizes common user input fields
 */
export const sanitizeUserInput = (req, res, next) => {
  const textFields = [
    'name', 'description', 'message', 'notes', 'title', 'content',
    'address', 'city', 'state', 'comments', 'feedback'
  ];

  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    textFields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = sanitizeString(req.body[field]);
      }
    });
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    textFields.forEach(field => {
      if (req.query[field] && typeof req.query[field] === 'string') {
        req.query[field] = sanitizeString(req.query[field]);
      }
    });
  }

  next();
};

export default {
  sanitizeString,
  sanitizeObject,
  mongoSanitizeMiddleware,
  sanitizeUserInput
};
