import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import mongoose from 'mongoose';
import MarketplaceRequest from '../models/MarketplaceRequest.model.js';
import User from '../models/User.model.js';

// Mock data
const testUser = {
  name: 'Test Farmer',
  email: `farmer-${Date.now()}@test.com`,
  passwordHash: crypto.createHash('sha256').update('testpassword').digest('hex'),
  roles: ['farmer'],
  phone: `98765432${Math.random().toString().slice(2, 4)}`, // Unique phone
  profileCompleted: true
};

const testMarketplaceRequest = {
  requesterId: null, // Will be set after user creation
  requesterRole: 'farmer',
  requesterType: 'business', // Business requesting from farmer
  cropName: 'Rice',
  quantity: 100,
  unit: 'kg',
  offeredPrice: 2500,
  currentOfferPrice: 2500,
  location: 'Andhra Pradesh'
};

describe('MarketplaceRequest Expiry Functionality', () => {
  let testUserId;

  before(async () => {
    try {
      // Connect to MongoDB
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmkart_test');
      }

      // Create test user
      const user = await User.create(testUser);
      testUserId = user._id;
      console.log('✅ Test user created:', testUserId);
    } catch (error) {
      console.error('❌ Setup error:', error);
      throw error;
    }
  });

  after(async () => {
    try {
      // Cleanup
      if (testUserId) {
        await User.deleteOne({ _id: testUserId });
      }
      await MarketplaceRequest.deleteMany({ requesterId: testUserId });
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('⚠️  Cleanup warning:', error.message);
    }
  });

  it('should set expiresAt to 72 hours from now on creation', async () => {
    const now = Date.now();
    const request = await MarketplaceRequest.create({
      ...testMarketplaceRequest,
      requesterId: testUserId
    });

    assert.ok(request.expiresAt, 'expiresAt should be set');
    const diffMs = request.expiresAt - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    // Check it's approximately 72 hours (within 1 minute)
    assert.ok(diffHours > 71.98 && diffHours < 72.02, 
      `expiresAt should be ~72 hours from now, got ${diffHours.toFixed(2)} hours`);
    
    assert.strictEqual(request.status, 'open', 'Initial status should be open');
    
    await MarketplaceRequest.deleteOne({ _id: request._id });
  });

  it('should expire requests past expiresAt with open status', async () => {
    // Create request with past expiresAt
    const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
    
    const request = await MarketplaceRequest.create({
      ...testMarketplaceRequest,
      requesterId: testUserId,
      status: 'open',
      expiresAt: pastDate
    });

    assert.strictEqual(request.status, 'open', 'Initial status should be open');

    // Run expiry cleanup
    const result = await MarketplaceRequest.expireOldRequests();
    assert.ok(result.modifiedCount >= 1, 'Should modify at least 1 request');

    // Verify request is now expired
    const updatedRequest = await MarketplaceRequest.findById(request._id);
    assert.strictEqual(updatedRequest.status, 'expired', 'Status should be expired');

    await MarketplaceRequest.deleteOne({ _id: request._id });
  });

  it('should expire countered requests past expiresAt', async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
    
    const request = await MarketplaceRequest.create({
      ...testMarketplaceRequest,
      requesterId: testUserId,
      status: 'countered',
      requesterType: 'restaurant', // Different type
      currentOfferPrice: 2800,
      expiresAt: pastDate
    });

    const result = await MarketplaceRequest.expireOldRequests();

    const updatedRequest = await MarketplaceRequest.findById(request._id);
    assert.strictEqual(updatedRequest.status, 'expired', 'Countered request should expire');

    await MarketplaceRequest.deleteOne({ _id: request._id });
  });

  it('should NOT expire requests in terminal states (fulfilled, cancelled)', async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago

    // Create fulfilled request
    const fulfilledRequest = await MarketplaceRequest.create({
      ...testMarketplaceRequest,
      requesterId: testUserId,
      status: 'fulfilled',
      requesterType: 'community',
      expiresAt: pastDate
    });

    // Create cancelled request
    const cancelledRequest = await MarketplaceRequest.create({
      ...testMarketplaceRequest,
      requesterId: testUserId,
      status: 'cancelled',
      requesterType: 'travel_agency',
      expiresAt: pastDate
    });

    const beforeCount = await MarketplaceRequest.countDocuments({
      _id: { $in: [fulfilledRequest._id, cancelledRequest._id] },
      status: { $in: ['fulfilled', 'cancelled'] }
    });
    assert.strictEqual(beforeCount, 2, 'Should have 2 terminal status requests');

    // Run expiry cleanup
    await MarketplaceRequest.expireOldRequests();

    // Verify they remain unchanged
    const updatedFulfilled = await MarketplaceRequest.findById(fulfilledRequest._id);
    const updatedCancelled = await MarketplaceRequest.findById(cancelledRequest._id);

    assert.strictEqual(updatedFulfilled.status, 'fulfilled', 'Fulfilled should not expire');
    assert.strictEqual(updatedCancelled.status, 'cancelled', 'Cancelled should not expire');

    await MarketplaceRequest.deleteMany({
      _id: { $in: [fulfilledRequest._id, cancelledRequest._id] }
    });
  });

  it('should support valid state transitions including expired', async () => {
    const request = new MarketplaceRequest({
      ...testMarketplaceRequest,
      requesterId: testUserId,
      status: 'open'
    });

    // Test transitions to expired
    assert.ok(request.canTransitionTo('expired'), 'open → expired should be valid');
    
    request.status = 'countered';
    assert.ok(request.canTransitionTo('expired'), 'countered → expired should be valid');
    
    request.status = 'accepted';
    assert.ok(request.canTransitionTo('expired'), 'accepted → expired should be valid');
    
    // Expired should be terminal
    request.status = 'expired';
    assert.ok(!request.canTransitionTo('open'), 'expired → open should not be valid');
    assert.ok(!request.canTransitionTo('countered'), 'expired → countered should not be valid');
  });

  it('should include expired in status enum', async () => {
    const request = new MarketplaceRequest({
      ...testMarketplaceRequest,
      requesterId: testUserId,
      status: 'expired'
    });

    assert.strictEqual(request.status, 'expired', 'Status enum should include expired');
  });
});
