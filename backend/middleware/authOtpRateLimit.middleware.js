import rateLimit from 'express-rate-limit';

const isLocalDevRequest = (ip = '') => {
  const normalizedIp = String(ip || '').trim();
  return normalizedIp === '::1' || normalizedIp === '127.0.0.1' || normalizedIp.startsWith('::ffff:127.0.0.1');
};

const shouldSkipLimiter = (req) => process.env.NODE_ENV !== 'production' && isLocalDevRequest(req.ip);

export const verifyEmailOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 8 : 50,
  message: 'Too many email verification attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipLimiter
});

export const resendEmailOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 3 : 20,
  message: 'Too many OTP resend requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipLimiter
});
