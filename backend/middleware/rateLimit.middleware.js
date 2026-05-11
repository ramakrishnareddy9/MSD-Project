import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Middleware
 * Issue 37 - Add rate limiting on order creation
 * Issue 5 - Implement rate limiting middleware
 */

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false // Disable `X-RateLimit-*` headers
});

// Stricter limiter for payment/order endpoints
export const orderLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 order creation attempts per minute
  message: 'Too many order creation attempts. Please wait before trying again.',
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

// Payment endpoint limiter (strictest)
export const paymentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // limit each IP to 3 payment attempts per minute
  message: 'Too many payment attempts. Please wait before trying again.',
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

// Auth endpoint limiter
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful attempts
  skipFailedRequests: false
});

// OTP rate limiter
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 OTP requests per hour
  message: 'Too many OTP requests. Please try again later.',
  skipSuccessfulRequests: false
});

export default {
  apiLimiter,
  orderLimiter,
  paymentLimiter,
  authLimiter,
  otpLimiter
};
