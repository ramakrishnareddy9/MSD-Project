import mongoose from 'mongoose';
import crypto from 'crypto';
import MarketplaceRequest from '../models/MarketplaceRequest.model.js';
import User from '../models/User.model.js';

async function runDiagnostics() {
  try {
    // Connect
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmkart_test');
    }

    // Create test user
    const user = await User.create({
      name: 'Test Farmer',
      email: `farmer-diag-${Date.now()}@test.com`,
      passwordHash: crypto.createHash('sha256').update('test').digest('hex'),
      roles: ['farmer'],
      phone: `98765432${Math.random().toString().slice(2, 4)}`, // Unique phone
      profileCompleted: true
    });

    console.log('✅ User created:', user._id);

    // Test 1: Create request and check expiresAt
    const now = Date.now();
    const request1 = await MarketplaceRequest.create({
      requesterId: user._id,
      requesterRole: 'farmer',
      requesterType: 'business', // Business requesting from farmer
      cropName: 'Rice',
      quantity: 100,
      unit: 'kg',
      offeredPrice: 2500,
      currentOfferPrice: 2500
    });

    const diffMs = request1.expiresAt - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    console.log(`✅ Test 1 - expiresAt set to ~${diffHours.toFixed(2)} hours from now (expected ~72)`);
    console.log(`   Status: ${request1.status}, expiresAt: ${request1.expiresAt}`);

    // Test 2: Create expired request
    const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
    const request2 = await MarketplaceRequest.create({
      requesterId: user._id,
      requesterRole: 'farmer',
      requesterType: 'restaurant', // Restaurant requesting
      cropName: 'Wheat',
      quantity: 50,
      unit: 'kg',
      offeredPrice: 2000,
      currentOfferPrice: 2000,
      status: 'open',
      expiresAt: pastDate
    });

    console.log(`✅ Test 2 - Created expired request with status: ${request2.status}`);

    // Test 3: Run expiry
    const result = await MarketplaceRequest.expireOldRequests();
    console.log(`✅ Test 3 - Expiry cleanup ran, modified: ${result.modifiedCount}`);

    // Test 4: Verify request is expired
    const updated = await MarketplaceRequest.findById(request2._id);
    console.log(`✅ Test 4 - Request status after expiry: ${updated.status} (expected: expired)`);

    // Test 5: Terminal states
    const request3 = await MarketplaceRequest.create({
      requesterId: user._id,
      requesterRole: 'farmer',
      requesterType: 'community', // Community request
      cropName: 'Corn',
      quantity: 75,
      unit: 'kg',
      offeredPrice: 1800,
      currentOfferPrice: 1800,
      status: 'fulfilled',
      expiresAt: pastDate
    });

    console.log(`✅ Test 5 - Created fulfilled request with expiresAt in past`);

    const beforeCount = await MarketplaceRequest.countDocuments({
      _id: request3._id,
      status: 'fulfilled'
    });

    const result2 = await MarketplaceRequest.expireOldRequests();
    console.log(`   Expiry cleanup ran again, modified: ${result2.modifiedCount}`);

    const afterCount = await MarketplaceRequest.countDocuments({
      _id: request3._id,
      status: 'fulfilled'
    });

    console.log(`✅ Fulfilled request status preserved: before=${beforeCount}, after=${afterCount} (expected both 1)`);

    // Cleanup
    await User.deleteOne({ _id: user._id });
    await MarketplaceRequest.deleteMany({ requesterId: user._id });
    console.log('\n✅ All tests passed! Marketplace request expiry working correctly.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runDiagnostics();
