import User from '../models/User.model.js';
import FarmerProfile from '../models/FarmerProfile.model.js';
import BusinessProfile from '../models/BusinessProfile.model.js';
import RestaurantProfile from '../models/RestaurantProfile.model.js';
import DeliveryProfile from '../models/DeliveryProfile.model.js';
import TravelAgencyProfile from '../models/TravelAgencyProfile.model.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const AUTH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const AUTH_COOKIE_NAME = 'farmkart_token';
const EMAIL_OTP_TTL_MS = 1000 * 60 * 10;
const PHONE_OTP_TTL_MS = 1000 * 60 * 10;

const parseBool = (value) => String(value || '').toLowerCase() === 'true';

const getAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = process.env.AUTH_COOKIE_SAMESITE || (isProduction ? 'none' : 'lax');
  const secure = process.env.AUTH_COOKIE_SECURE ? parseBool(process.env.AUTH_COOKIE_SECURE) : isProduction;

  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: AUTH_TOKEN_TTL_MS,
    path: '/'
  };
};

const buildAuthUserPayload = (user) => {
  if (!user) return null;

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    roles: user.roles,
    status: user.status,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    kycStatus: user.kycStatus,
    address: user.address,
    city: user.city,
    profileImage: user.profileImage
  };
};

const issueAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
};

const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...getAuthCookieOptions(),
    maxAge: undefined,
    expires: new Date(0)
  });
};

const getPasswordResetBaseUrl = (req) => {
  return process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
};

const buildPasswordResetUrl = (req, token) => {
  const baseUrl = getPasswordResetBaseUrl(req).replace(/\/$/, '');
  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
};

const generateSixDigitOtp = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

const createOtpPayload = (ttlMs) => {
  const otp = generateSixDigitOtp();
  return {
    otp,
    otpHash: hashOtp(otp),
    otpExpires: new Date(Date.now() + ttlMs)
  };
};

const createEmailOtpPayload = () => createOtpPayload(EMAIL_OTP_TTL_MS);

const createPhoneOtpPayload = () => createOtpPayload(PHONE_OTP_TTL_MS);

const hashRefreshToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const persistRefreshTokenHash = async (userId, token) => {
  if (!userId || !token) return;

  await User.findByIdAndUpdate(userId, {
    refreshTokenHash: hashRefreshToken(token)
  });
};

const clearRefreshTokenHash = async (userId) => {
  if (!userId) return;

  await User.findByIdAndUpdate(userId, {
    $unset: { refreshTokenHash: '' }
  });
};

const isOtpHashMatch = (submittedOtp, storedHash) => {
  const submittedHash = hashOtp(submittedOtp);
  if (!storedHash || submittedHash.length !== storedHash.length) return false;

  return crypto.timingSafeEqual(Buffer.from(submittedHash, 'hex'), Buffer.from(storedHash, 'hex'));
};

const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT || 587);

  if (!smtpHost || !smtpUser || !smtpPassword) {
    return false;
  }

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword
      }
    });

    await transporter.sendMail({
      from: process.env.MAIL_FROM || smtpUser,
      to,
      subject: 'Reset your FarmKart password',
      text: `Use this link to reset your password: ${resetUrl}`,
      html: `<p>Use this link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 15 minutes.</p>`
    });

    return true;
  } catch {
    return false;
  }
};

const sendVerificationOtpEmail = async ({ to, otp }) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT || 587);

  if (!smtpHost || !smtpUser || !smtpPassword) {
    return false;
  }

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword
      }
    });

    await transporter.sendMail({
      from: process.env.MAIL_FROM || smtpUser,
      to,
      subject: 'Verify your FarmKart email',
      text: `Your FarmKart verification code is ${otp}. This code expires in 10 minutes.`,
      html: `<p>Your FarmKart verification code is <strong>${otp}</strong>.</p><p>This code expires in 10 minutes.</p>`
    });

    return true;
  } catch {
    return false;
  }
};

const sendVerificationOtpSms = async ({ to, otp }) => {
  const message = `Your FarmKart verification code is ${otp}. It expires in 10 minutes.`;

  const sendViaTwilio = async () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return false;
    }

    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: String(to),
        Body: message
      })
    });

    return response.ok;
  };

  const sendViaMsg91 = async () => {
    const authKey = process.env.MSG91_AUTH_KEY;
    const sender = process.env.MSG91_SENDER_ID || 'FARMKT';
    const route = process.env.MSG91_ROUTE || '4';
    const country = process.env.MSG91_COUNTRY || '91';

    if (!authKey) {
      return false;
    }

    const endpoint = 'https://api.msg91.com/api/v2/sendsms';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authkey: authKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        sender,
        route,
        country,
        mobiles: String(to).replace(/\D/g, ''),
        message
      })
    });

    return response.ok;
  };

  const smsWebhookUrl = process.env.SMS_WEBHOOK_URL;
  if (!to) {
    return false;
  }

  const smsToken = process.env.SMS_WEBHOOK_TOKEN;

  try {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      return await sendViaTwilio();
    }

    if (process.env.MSG91_AUTH_KEY) {
      return await sendViaMsg91();
    }

    if (!smsWebhookUrl) {
      return false;
    }

    const response = await fetch(smsWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(smsToken ? { Authorization: `Bearer ${smsToken}` } : {})
      },
      body: JSON.stringify({
        to,
        otp,
        purpose: 'phone_verification',
        message
      })
    });

    return response.ok;
  } catch {
    return false;
  }
};

export const register = async (req, res) => {
  let createdUserId = null;
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Server authentication is not configured'
      });
    }

    const { email, phone, password, name, roles, profileData, address, city } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = String(phone || '').trim();
    const normalizedName = String(name || '').trim();
    const safeRoles = Array.isArray(roles) && roles.length > 0 ? [...new Set(roles)] : ['customer'];

    if (safeRoles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Admin role cannot be assigned during public registration'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { phone: normalizedPhone }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }

    // Create user
    const user = new User({
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash: password, // Will be hashed by pre-save hook
      name: normalizedName,
      roles: safeRoles,
      status: 'pending_verification',
      emailVerified: false,
      phoneVerified: false,
      kycStatus: 'not_started',
      address: String(address || profileData?.address || '').trim(),
      city: String(city || profileData?.city || '').trim(),
    });

    const { otp: emailOtp, otpHash: emailOtpHash, otpExpires: emailOtpExpires } = createEmailOtpPayload();
    const { otp: phoneOtp, otpHash: phoneOtpHash, otpExpires: phoneOtpExpires } = createPhoneOtpPayload();
    user.emailOtpHash = emailOtpHash;
    user.emailOtpExpires = emailOtpExpires;
    user.phoneOtpHash = phoneOtpHash;
    user.phoneOtpExpires = phoneOtpExpires;

    await user.save();
    createdUserId = user._id;

    // Create role-specific profiles (authoritative source for role data).
    if (safeRoles.includes('farmer')) {
      const farmerInput = profileData?.farmer || {};
      const parsedFarmSize = Number(farmerInput.farmSize ?? farmerInput.totalLand);
      await new FarmerProfile({
        userId: user._id,
        ...farmerInput,
        farmName: farmerInput.farmName || `${normalizedName}'s Farm`,
        farmSize: Number.isFinite(parsedFarmSize) && parsedFarmSize > 0 ? parsedFarmSize : 1
      }).save();
    }

    if (safeRoles.includes('business')) {
      const businessInput = profileData?.business || {};
      const normalizedCompanyType = String(businessInput.companyType || businessInput.businessType || 'retailer').toLowerCase();
      const allowedCompanyTypes = ['wholesaler', 'processor', 'manufacturer', 'retailer'];
      await new BusinessProfile({
        userId: user._id,
        ...businessInput,
        companyName: businessInput.companyName || `${normalizedName} Business`,
        companyType: allowedCompanyTypes.includes(normalizedCompanyType) ? normalizedCompanyType : 'retailer',
        gstNumber: businessInput.gstNumber || businessInput.gst || undefined
      }).save();
    }

    if (safeRoles.includes('restaurant')) {
      const restaurantInput = profileData?.restaurant || {};
      await new RestaurantProfile({
        userId: user._id,
        ...restaurantInput,
        restaurantName: restaurantInput.restaurantName || `${normalizedName} Restaurant`
      }).save();
    }

    if (safeRoles.includes('travel_agency')) {
      const travelAgencyInput = profileData?.travelAgency || {};
      await new TravelAgencyProfile({
        userId: user._id,
        ...travelAgencyInput,
        agencyName: travelAgencyInput.agencyName || `${normalizedName} Travels`
      }).save();
    }

    if (safeRoles.some((role) => role === 'delivery_large' || role === 'delivery_small')) {
      const deliveryInput = profileData?.delivery || {};
      const normalizedScale = String(deliveryInput.scale || (safeRoles.includes('delivery_large') ? 'large' : 'small')).toLowerCase();
      await new DeliveryProfile({
        userId: user._id,
        ...deliveryInput,
        companyName: deliveryInput.companyName || `${normalizedName} Logistics`,
        scale: normalizedScale === 'large' ? 'large' : 'small'
      }).save();
    }

    const [emailOtpSent, smsOtpSent] = await Promise.all([
      sendVerificationOtpEmail({ to: user.email, otp: emailOtp }),
      sendVerificationOtpSms({ to: user.phone, otp: phoneOtp })
    ]);

    if (!emailOtpSent && !smsOtpSent && process.env.NODE_ENV === 'production') {
      throw new Error('Unable to send verification OTPs at this time. Please try again later.');
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, roles: user.roles },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await persistRefreshTokenHash(user._id, token);
    issueAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email and phone using the OTPs sent to your inbox and phone.',
      data: {
        user: buildAuthUserPayload(user),
        ...(process.env.NODE_ENV !== 'production'
          ? {
              verificationOtp: emailOtp,
              otpExpiresAt: user.emailOtpExpires,
              phoneVerificationOtp: phoneOtp,
              phoneOtpExpiresAt: user.phoneOtpExpires
            }
          : {})
      }
    });
  } catch (error) {
    if (createdUserId) {
      // Roll back user creation if downstream profile creation failed.
      try {
        await User.findByIdAndDelete(createdUserId);
      } catch {
        // Best-effort rollback; preserve original error response below.
      }
    }

    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Server authentication is not configured'
      });
    }

    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check status
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended'
      });
    }

    // Record last login timestamp (best-effort — don't block on failure)
    try {
      user.lastLogin = new Date();
      await user.save();
    } catch { /* ignore */ }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, roles: user.roles },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await persistRefreshTokenHash(user._id, token);
    issueAuthCookie(res, token);

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: buildAuthUserPayload(user) }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const me = async (req, res) => {
  try {
    res.json({
      success: true,
      data: { user: buildAuthUserPayload(req.user) }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const logout = async (req, res) => {
  try {
    await clearRefreshTokenHash(req.user?._id);
    clearAuthCookie(res);
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const refresh = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Server authentication is not configured'
      });
    }

    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No session token found'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Session expired'
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.status === 'suspended') {
      clearAuthCookie(res);
      return res.status(401).json({
        success: false,
        message: 'Session expired'
      });
    }

    if (!user.refreshTokenHash || user.refreshTokenHash !== hashRefreshToken(token)) {
      clearAuthCookie(res);
      return res.status(401).json({
        success: false,
        message: 'Session expired'
      });
    }

    const refreshedToken = jwt.sign(
      { userId: user._id, roles: user.roles },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await persistRefreshTokenHash(user._id, refreshedToken);

    issueAuthCookie(res, refreshedToken);

    return res.json({
      success: true,
      message: 'Session refreshed',
      data: { user: buildAuthUserPayload(user) }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const otp = String(req.body?.otp || '').trim();
    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.emailVerified) {
      return res.json({
        success: true,
        message: 'Email is already verified',
        data: { user: buildAuthUserPayload(user) }
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    const isOtpExpired = !user.emailOtpExpires || new Date() > user.emailOtpExpires;
    if (!user.emailOtpHash || isOtpExpired || !isOtpHashMatch(otp, user.emailOtpHash)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    user.emailVerified = true;
    user.emailOtpHash = undefined;
    user.emailOtpExpires = undefined;
    if (user.status === 'pending_verification') {
      user.status = 'active';
    }
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: { user: buildAuthUserPayload(user) }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const verifyPhone = async (req, res) => {
  try {
    const otp = String(req.body?.otp || '').trim();
    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.phoneVerified) {
      return res.json({
        success: true,
        message: 'Phone is already verified',
        data: { user: buildAuthUserPayload(user) }
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    const isOtpExpired = !user.phoneOtpExpires || new Date() > user.phoneOtpExpires;
    if (!user.phoneOtpHash || isOtpExpired || !isOtpHashMatch(otp, user.phoneOtpHash)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    user.phoneVerified = true;
    user.phoneOtpHash = undefined;
    user.phoneOtpExpires = undefined;
    if (user.status === 'pending_verification') {
      user.status = 'active';
    }
    await user.save();

    res.json({
      success: true,
      message: 'Phone verified successfully',
      data: { user: buildAuthUserPayload(user) }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const resendVerificationOtp = async (req, res) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    const { otp, otpHash, otpExpires } = createEmailOtpPayload();
    user.emailOtpHash = otpHash;
    user.emailOtpExpires = otpExpires;
    await user.save();

    const [emailOtpSent, smsOtpSent] = await Promise.all([
      sendVerificationOtpEmail({ to: user.email, otp }),
      sendVerificationOtpSms({ to: user.phone, otp })
    ]);

    if (!emailOtpSent && !smsOtpSent && process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        success: false,
        message: 'Unable to send email verification OTP at this time. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'Verification OTP sent successfully',
      ...(process.env.NODE_ENV !== 'production' ? { data: { verificationOtp: otp, otpExpiresAt: user.emailOtpExpires } } : {})
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const resendPhoneOtp = async (req, res) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.phoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Phone is already verified'
      });
    }

    const { otp, otpHash, otpExpires } = createPhoneOtpPayload();
    user.phoneOtpHash = otpHash;
    user.phoneOtpExpires = otpExpires;
    await user.save();

    const smsSent = await sendVerificationOtpSms({ to: user.phone, otp });

    if (!smsSent && process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        success: false,
        message: 'Unable to send phone verification OTP at this time. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'Phone verification OTP sent successfully',
      ...(process.env.NODE_ENV !== 'production' ? { data: { phoneVerificationOtp: otp, phoneOtpExpiresAt: user.phoneOtpExpires } } : {})
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Server authentication is not configured'
      });
    }

    const { email } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.json({
        success: true,
        message: 'If the account exists, a password reset link has been sent'
      });
    }

    const resetToken = jwt.sign(
      { userId: user._id, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    const resetUrl = buildPasswordResetUrl(req, resetToken);
    const emailSent = await sendPasswordResetEmail({ to: user.email, resetUrl });

    return res.json({
      success: true,
      message: 'If the account exists, a password reset link has been sent',
      ...(process.env.NODE_ENV !== 'production' && !emailSent ? { data: { resetUrl } } : {})
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Server authentication is not configured'
      });
    }

    const { token, password } = req.body;
    let decodedToken;

    try {
      decodedToken = jwt.verify(String(token || '').trim(), process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired'
      });
    }

    if (decodedToken?.purpose !== 'password_reset' || !decodedToken?.userId) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired'
      });
    }

    const user = await User.findById(decodedToken.userId);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired'
      });
    }

    user.passwordHash = password;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
