import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import User from '../models/User.model.js';
import { register, login, refresh, logout, verifyEmail, resendVerificationOtp, verifyPhone, resendPhoneOtp } from '../controllers/auth.controller.js';

const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    cookieCalls: [],
    cookie(name, value, options) {
      this.cookieCalls.push({ name, value, options });
      return this;
    },
    clearCookie(name, options) {
      this.clearCookieCalls.push({ name, options });
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };

  res.clearCookieCalls = [];

  return res;
};

const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

test('register rejects admin role self-assignment', async () => {
  const originalFindOne = User.findOne;
  const originalSave = User.prototype.save;
  const originalJwtSecret = process.env.JWT_SECRET;

  let saveCalled = false;

  try {
    process.env.JWT_SECRET = 'unit-test-secret';
    User.findOne = async () => null;
    User.prototype.save = async function saveMock() {
      saveCalled = true;
      return this;
    };

    const req = {
      body: {
        email: 'admin-register@example.com',
        phone: '+911234567891',
        password: 'StrongPass1',
        name: 'Admin Candidate',
        roles: ['admin']
      }
    };
    const res = createMockRes();

    await register(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body?.success, false);
    assert.equal(res.body?.message, 'Admin role cannot be assigned during public registration');
    assert.equal(saveCalled, false);
  } finally {
    User.findOne = originalFindOne;
    User.prototype.save = originalSave;
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

test('register stores hashed OTP with expiry and returns OTP in non-production', async () => {
  const originalFindOne = User.findOne;
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;
  const originalSave = User.prototype.save;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  const savedSnapshots = [];
  const refreshTokenUpdates = [];

  try {
    process.env.JWT_SECRET = 'unit-test-secret';
    process.env.NODE_ENV = 'test';

    User.findOne = async () => null;
    User.findByIdAndUpdate = async (userId, update) => {
      refreshTokenUpdates.push({ userId, update });
      return null;
    };
    User.prototype.save = async function saveMock() {
      savedSnapshots.push({
        emailOtpHash: this.emailOtpHash,
        emailOtpExpires: this.emailOtpExpires,
        phoneOtpHash: this.phoneOtpHash,
        phoneOtpExpires: this.phoneOtpExpires,
        email: this.email
      });
      return this;
    };

    const req = {
      body: {
        email: 'otp-register@example.com',
        phone: '+911234567890',
        password: 'StrongPass1',
        name: 'Otp Register User',
        roles: ['customer']
      }
    };
    const res = createMockRes();

    await register(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body?.success, true);
    assert.equal(savedSnapshots.length >= 1, true);

    const firstSave = savedSnapshots[0];
    assert.match(firstSave.emailOtpHash, /^[a-f0-9]{64}$/);
    assert.equal(firstSave.emailOtpExpires instanceof Date, true);
    assert.equal(firstSave.emailOtpExpires.getTime() > Date.now(), true);
    assert.match(firstSave.phoneOtpHash, /^[a-f0-9]{64}$/);
    assert.equal(firstSave.phoneOtpExpires instanceof Date, true);
    assert.equal(firstSave.phoneOtpExpires.getTime() > Date.now(), true);

    const otpFromResponse = res.body?.data?.verificationOtp;
    const phoneOtpFromResponse = res.body?.data?.phoneVerificationOtp;
    assert.match(String(otpFromResponse), /^\d{6}$/);
    assert.match(String(phoneOtpFromResponse), /^\d{6}$/);
    assert.equal(hashOtp(otpFromResponse), firstSave.emailOtpHash);
    assert.equal(hashOtp(phoneOtpFromResponse), firstSave.phoneOtpHash);
    assert.equal(refreshTokenUpdates.length, 1);
    assert.match(refreshTokenUpdates[0].update.refreshTokenHash, /^[a-f0-9]{64}$/);
  } finally {
    User.findOne = originalFindOne;
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
    User.prototype.save = originalSave;
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test('login stores hashed refresh token', async () => {
  const originalFindOne = User.findOne;
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;
  const originalJwtSecret = process.env.JWT_SECRET;

  const refreshTokenUpdates = [];

  const fakeUser = {
    _id: 'login-user-1',
    email: 'login-refresh@example.com',
    roles: ['customer'],
    status: 'active',
    emailVerified: true,
    phoneVerified: true,
    kycStatus: 'not_started',
    comparePassword: async () => true,
    save: async () => fakeUser
  };

  try {
    process.env.JWT_SECRET = 'unit-test-secret';
    User.findOne = async () => fakeUser;
    User.findByIdAndUpdate = async (userId, update) => {
      refreshTokenUpdates.push({ userId, update });
      return null;
    };

    const req = { body: { email: fakeUser.email, password: 'StrongPass1' } };
    const res = createMockRes();

    await login(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.success, true);
    assert.equal(refreshTokenUpdates.length, 1);
    assert.match(refreshTokenUpdates[0].update.refreshTokenHash, /^[a-f0-9]{64}$/);
    assert.equal(res.cookieCalls.length, 1);
  } finally {
    User.findOne = originalFindOne;
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

test('refresh rejects mismatched refresh token hash', async () => {
  const originalFindById = User.findById;
  const originalJwtSecret = process.env.JWT_SECRET;

  try {
    process.env.JWT_SECRET = 'unit-test-secret';

    const validToken = jwt.sign({ userId: 'refresh-user-1', roles: ['customer'] }, process.env.JWT_SECRET, { expiresIn: '7d' });
    User.findById = async () => ({
      _id: 'refresh-user-1',
      status: 'active',
      roles: ['customer'],
      refreshTokenHash: hashOtp('different-token')
    });

    const req = { cookies: { farmkart_token: validToken } };
    const res = createMockRes();

    await refresh(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body?.success, false);
    assert.equal(res.body?.message, 'Session expired');
    assert.equal(res.clearCookieCalls.length, 1);
  } finally {
    User.findById = originalFindById;
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

test('refresh rotates the stored refresh token hash', async () => {
  const originalFindById = User.findById;
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;
  const originalJwtSecret = process.env.JWT_SECRET;

  const updates = [];

  try {
    process.env.JWT_SECRET = 'unit-test-secret';

    const validToken = jwt.sign({ userId: 'refresh-user-2', roles: ['customer'] }, process.env.JWT_SECRET, { expiresIn: '7d' });
    User.findById = async () => ({
      _id: 'refresh-user-2',
      status: 'active',
      roles: ['customer'],
      refreshTokenHash: hashOtp(validToken)
    });
    User.findByIdAndUpdate = async (userId, update) => {
      updates.push({ userId, update });
      return null;
    };

    const req = { cookies: { farmkart_token: validToken } };
    const res = createMockRes();

    await refresh(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.success, true);
    assert.equal(updates.length, 1);
    assert.match(updates[0].update.refreshTokenHash, /^[a-f0-9]{64}$/);
    assert.equal(updates[0].update.refreshTokenHash, hashOtp(res.cookieCalls[0].value));
    assert.equal(res.cookieCalls.length, 1);
  } finally {
    User.findById = originalFindById;
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

test('logout clears stored refresh token hash', async () => {
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;
  const updates = [];

  try {
    User.findByIdAndUpdate = async (userId, update) => {
      updates.push({ userId, update });
      return null;
    };

    const req = { user: { _id: 'logout-user-1' } };
    const res = createMockRes();

    await logout(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.success, true);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].userId, 'logout-user-1');
    assert.equal(Object.prototype.hasOwnProperty.call(updates[0].update, '$unset'), true);
    assert.equal(Object.prototype.hasOwnProperty.call(updates[0].update.$unset, 'refreshTokenHash'), true);
    assert.equal(res.clearCookieCalls.length, 1);
  } finally {
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

test('verifyEmail succeeds for valid unexpired OTP and clears OTP fields', async () => {
  const originalFindById = User.findById;

  const otp = '123456';
  let saveCalled = false;

  const fakeUser = {
    _id: 'user-1',
    email: 'verify@example.com',
    emailVerified: false,
    status: 'pending_verification',
    emailOtpHash: hashOtp(otp),
    emailOtpExpires: new Date(Date.now() + 5 * 60 * 1000),
    save: async () => {
      saveCalled = true;
    }
  };

  try {
    User.findById = async () => fakeUser;

    const req = { user: { _id: 'user-1' }, body: { otp } };
    const res = createMockRes();

    await verifyEmail(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.success, true);
    assert.equal(saveCalled, true);
    assert.equal(fakeUser.emailVerified, true);
    assert.equal(fakeUser.status, 'active');
    assert.equal(fakeUser.emailOtpHash, undefined);
    assert.equal(fakeUser.emailOtpExpires, undefined);
  } finally {
    User.findById = originalFindById;
  }
});

test('verifyEmail rejects invalid OTP', async () => {
  const originalFindById = User.findById;

  let saveCalled = false;
  const fakeUser = {
    _id: 'user-2',
    email: 'invalid@example.com',
    emailVerified: false,
    status: 'pending_verification',
    emailOtpHash: hashOtp('654321'),
    emailOtpExpires: new Date(Date.now() + 5 * 60 * 1000),
    save: async () => {
      saveCalled = true;
    }
  };

  try {
    User.findById = async () => fakeUser;

    const req = { user: { _id: 'user-2' }, body: { otp: '111111' } };
    const res = createMockRes();

    await verifyEmail(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body?.success, false);
    assert.equal(res.body?.message, 'Invalid or expired OTP');
    assert.equal(saveCalled, false);
    assert.equal(fakeUser.emailVerified, false);
  } finally {
    User.findById = originalFindById;
  }
});

test('verifyEmail rejects expired OTP', async () => {
  const originalFindById = User.findById;

  let saveCalled = false;
  const fakeUser = {
    _id: 'user-3',
    email: 'expired@example.com',
    emailVerified: false,
    status: 'pending_verification',
    emailOtpHash: hashOtp('222222'),
    emailOtpExpires: new Date(Date.now() - 60 * 1000),
    save: async () => {
      saveCalled = true;
    }
  };

  try {
    User.findById = async () => fakeUser;

    const req = { user: { _id: 'user-3' }, body: { otp: '222222' } };
    const res = createMockRes();

    await verifyEmail(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body?.success, false);
    assert.equal(res.body?.message, 'Invalid or expired OTP');
    assert.equal(saveCalled, false);
  } finally {
    User.findById = originalFindById;
  }
});

test('resendVerificationOtp rotates OTP hash and expiry', async () => {
  const originalFindById = User.findById;
  const originalNodeEnv = process.env.NODE_ENV;

  const previousHash = hashOtp('999999');
  const previousExpiry = new Date(Date.now() - 5 * 60 * 1000);

  const fakeUser = {
    _id: 'user-4',
    email: 'resend@example.com',
    emailVerified: false,
    emailOtpHash: previousHash,
    emailOtpExpires: previousExpiry,
    save: async function saveMock() {
      return this;
    }
  };

  try {
    process.env.NODE_ENV = 'test';
    User.findById = async () => fakeUser;

    const req = { user: { _id: 'user-4' } };
    const res = createMockRes();

    await resendVerificationOtp(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.success, true);

    const otpFromResponse = res.body?.data?.verificationOtp;
    assert.match(String(otpFromResponse), /^\d{6}$/);
    assert.equal(fakeUser.emailOtpHash, hashOtp(otpFromResponse));
    assert.equal(fakeUser.emailOtpExpires instanceof Date, true);
    assert.equal(fakeUser.emailOtpExpires.getTime() > Date.now(), true);
    assert.equal(fakeUser.emailOtpExpires.getTime() !== previousExpiry.getTime() || fakeUser.emailOtpHash !== previousHash, true);
  } finally {
    User.findById = originalFindById;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test('verifyPhone succeeds for valid unexpired OTP and clears OTP fields', async () => {
  const originalFindById = User.findById;

  const otp = '246810';
  let saveCalled = false;

  const fakeUser = {
    _id: 'user-5',
    email: 'phone-verify@example.com',
    phoneVerified: false,
    status: 'pending_verification',
    phoneOtpHash: hashOtp(otp),
    phoneOtpExpires: new Date(Date.now() + 5 * 60 * 1000),
    save: async () => {
      saveCalled = true;
    }
  };

  try {
    User.findById = async () => fakeUser;

    const req = { user: { _id: 'user-5' }, body: { otp } };
    const res = createMockRes();

    await verifyPhone(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.success, true);
    assert.equal(saveCalled, true);
    assert.equal(fakeUser.phoneVerified, true);
    assert.equal(fakeUser.status, 'active');
    assert.equal(fakeUser.phoneOtpHash, undefined);
    assert.equal(fakeUser.phoneOtpExpires, undefined);
  } finally {
    User.findById = originalFindById;
  }
});

test('resendPhoneOtp rotates phone OTP hash and expiry', async () => {
  const originalFindById = User.findById;
  const originalNodeEnv = process.env.NODE_ENV;

  const previousHash = hashOtp('777777');
  const previousExpiry = new Date(Date.now() - 5 * 60 * 1000);

  const fakeUser = {
    _id: 'user-6',
    phone: '+911234567895',
    phoneVerified: false,
    phoneOtpHash: previousHash,
    phoneOtpExpires: previousExpiry,
    save: async () => {
      return this;
    }
  };

  try {
    process.env.NODE_ENV = 'test';
    User.findById = async () => fakeUser;

    const req = { user: { _id: 'user-6' } };
    const res = createMockRes();

    await resendPhoneOtp(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.success, true);
    assert.notEqual(fakeUser.phoneOtpHash, previousHash);
    assert.equal(fakeUser.phoneOtpExpires instanceof Date, true);
    assert.equal(fakeUser.phoneOtpExpires.getTime() > Date.now(), true);

    const otpFromResponse = res.body?.data?.phoneVerificationOtp;
    assert.match(String(otpFromResponse), /^\d{6}$/);
    assert.equal(hashOtp(otpFromResponse), fakeUser.phoneOtpHash);
  } finally {
    User.findById = originalFindById;
    process.env.NODE_ENV = originalNodeEnv;
  }
});
