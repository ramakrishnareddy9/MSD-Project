import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
	validateRegister,
	validateLogin,
	validateForgotPassword,
	validateResetPassword,
	validateVerifyEmailOtp
} from '../middleware/validation.middleware.js';
import { verifyEmailOtpLimiter, resendEmailOtpLimiter } from '../middleware/authOtpRateLimit.middleware.js';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

// Register
router.post('/register', validateRegister, authController.register);

// Login
router.post('/login', validateLogin, authController.login);

// Silent token refresh (uses refresh cookie to issue new access token)
router.post('/refresh', authController.refresh);

// Logout (clears httpOnly auth cookies and revokes refresh token)
router.post('/logout', authController.logout);
// Forgot password
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);

// Reset password
router.post('/reset-password', validateResetPassword, authController.resetPassword);

// Email verification (OTP)
router.post('/verify-email', verifyEmailOtpLimiter, authenticate, validateVerifyEmailOtp, authController.verifyEmail);

// Resend verification OTP
router.post('/resend-verification', resendEmailOtpLimiter, authenticate, authController.resendVerificationOtp);

// Get current user
router.get('/me', authenticate, authController.me);

export default router;
