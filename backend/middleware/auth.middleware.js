import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request object
 * Per BACKEND_API_PROMPT.md lines 342-355
 */
export const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header.
    // Accept both "Bearer <token>" and raw token to tolerate client differences.
    const authHeader = req.headers.authorization || '';
    const parts = authHeader.split(' ').filter(Boolean);
    let token = null;

    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      token = parts[1];
    } else if (parts.length === 1 && parts[0]) {
      token = parts[0];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
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
    const authHeader = req.headers.authorization || '';
    const parts = authHeader.split(' ').filter(Boolean);
    let token = null;

    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      token = parts[1];
    } else if (parts.length === 1 && parts[0]) {
      token = parts[0];
    }
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-passwordHash');
      
      if (user && user.status === 'active') {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};
