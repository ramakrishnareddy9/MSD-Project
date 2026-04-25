import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

const ACCESS_COOKIE_NAME = 'farmkart_token';

/**
 * Extract the short-lived access token from the request.
 * Priority: httpOnly cookie > Authorization header.
 * This lets the browser handle auth automatically via cookies while
 * keeping backward compatibility with "Bearer <token>" for non-browser clients.
 */
const extractAccessToken = (req) => {
  // 1. Try httpOnly cookie first (set by auth.controller.js)
  if (req.cookies && req.cookies[ACCESS_COOKIE_NAME]) {
    return req.cookies[ACCESS_COOKIE_NAME];
  }

  // 2. Fall back to Authorization header (for Postman / external clients)
  const authHeader = req.headers.authorization || '';
  const parts = authHeader.split(' ').filter(Boolean);

  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  } else if (parts.length === 1 && parts[0]) {
    return parts[0];
  }

  return null;
};

/**
 * Authentication Middleware
 * Verifies the short-lived access token and attaches user to request object.
 * When the access token has expired the frontend is expected to silently call
 * POST /auth/refresh (which uses the refresh cookie) to obtain a new one.
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = extractAccessToken(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure this is an access token, not a refresh token
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        message: 'Invalid token type'
      });
    }
    
    // Find user and exclude password
    const user = await User.findById(decoded.userId).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      });
    }

    // Check if user is suspended
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Account has been suspended',
        message: 'Account has been suspended'
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Token expired'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if no token
 * Useful for routes that work differently for authenticated users
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractAccessToken(req);
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded.type || decoded.type === 'access') {
        const user = await User.findById(decoded.userId).select('-passwordHash');
        
        if (user && user.status === 'active') {
          req.user = user;
        }
      }
    }
    
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};
