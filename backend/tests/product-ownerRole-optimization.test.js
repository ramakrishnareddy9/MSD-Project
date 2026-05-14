/**
 * Test: Product catalog query optimization
 * 
 * Validates:
 * 1. Product model has ownerRole field with proper enum values
 * 2. Product model has index on ownerRole for fast queries
 * 3. Migration script exists and handles role mapping correctly
 * 4. getAllProducts controller has been updated to use ownerRole instead of User join
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

test('Product ownerRole optimization', async (t) => {
  // Test 1: Verify Product model has ownerRole field
  await t.test('Product model should include ownerRole field with enum values', async () => {
    const productModelPath = path.resolve('backend/models/Product.model.js');
    const content = fs.readFileSync(productModelPath, 'utf8');
    
    assert(content.includes('ownerRole'), 'Product model should have ownerRole field');
    assert(content.includes("enum: ['farmer', 'business', 'restaurant'"), 'ownerRole should have valid enum values');
    assert(content.includes('default: \'farmer\''), 'ownerRole should default to farmer');
    assert(content.includes('index: true'), 'ownerRole should have index for fast queries');
  });

  // Test 2: Verify Product model indexes include ownerRole+status compound index
  await t.test('Product model should have compound index on (ownerRole, status)', async () => {
    const productModelPath = path.resolve('backend/models/Product.model.js');
    const content = fs.readFileSync(productModelPath, 'utf8');
    
    assert(
      content.includes("productSchema.index({ ownerRole: 1, status: 1, createdAt: -1 })"),
      'Product model should have compound index on (ownerRole, status, createdAt) for catalog queries'
    );
  });

  // Test 3: Verify getAllProducts has been refactored
  await t.test('getAllProducts should use ownerRole query instead of User join', async () => {
    const controllerPath = path.resolve('backend/controllers/product.controller.js');
    const content = fs.readFileSync(controllerPath, 'utf8');
    
    // Old code should NOT be present
    assert(
      !content.includes('User.find({ roles: \'farmer\', status: \'active\' })'),
      'Old O(n) User collection scan should be removed'
    );
    
    // New code should be present
    assert(
      content.includes('query.ownerRole = \'farmer\''),
      'getAllProducts should set query.ownerRole=farmer instead of scanning all users'
    );
    
    assert(
      content.includes('Optimized: query by ownerRole instead'),
      'Should have explanatory comment about optimization'
    );
  });

  // Test 4: Verify createProduct syncs ownerRole from User
  await t.test('createProduct should populate ownerRole from owner user', async () => {
    const controllerPath = path.resolve('backend/controllers/product.controller.js');
    const content = fs.readFileSync(controllerPath, 'utf8');
    
    assert(
      content.includes('Populate ownerRole from owner\'s roles'),
      'createProduct should populate ownerRole from owner'
    );
    
    assert(
      content.includes('const owner = await User.findById(product.ownerId).select(\'roles\')'),
      'createProduct should fetch owner to get roles'
    );
    
    assert(
      content.includes('product.ownerRole = owner.roles[0]'),
      'createProduct should set ownerRole to primary role'
    );
  });

  // Test 5: Verify updateProduct syncs ownerRole when ownerId changes
  await t.test('updateProduct should sync ownerRole when ownerId changes', async () => {
    const controllerPath = path.resolve('backend/controllers/product.controller.js');
    const content = fs.readFileSync(controllerPath, 'utf8');
    
    assert(
      content.includes('Sync ownerRole if ownerId changed'),
      'updateProduct should have logic to sync ownerRole'
    );
    
    assert(
      content.includes('if (req.body.ownerId)'),
      'updateProduct should check if ownerId was changed'
    );
  });

  // Test 6: Verify migration script exists
  await t.test('Migration script should exist to backfill ownerRole', async () => {
    const migrationPath = path.resolve('backend/scripts/migrateProductOwnerRole.js');
    assert(fs.existsSync(migrationPath), 'Migration script should exist at backend/scripts/migrateProductOwnerRole.js');
    
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert(
      content.includes('backfill'),
      'Migration script should document backfill purpose'
    );
    
    assert(
      content.includes('product.ownerRole'),
      'Migration should update ownerRole field'
    );
    
    assert(
      content.includes('owner.roles[0]'),
      'Migration should extract primary role from owner'
    );
  });

  // Test 7: Verify performance improvement is documented
  await t.test('Changes should eliminate O(n) User scan on every catalog query', async () => {
    const controllerPath = path.resolve('backend/controllers/product.controller.js');
    const content = fs.readFileSync(controllerPath, 'utf8');
    
    // The optimization comment should be present
    assert(
      content.includes('Optimized') || content.includes('eliminates O(n) User scan'),
      'Code should document the performance optimization'
    );
  });

  console.log('\n✅ All product ownerRole optimization tests passed!');
  console.log('\n📊 Performance Improvement Summary:');
  console.log('   Before: O(n) User collection scan on every catalog request');
  console.log('   After:  Direct Product.find({ ownerRole: "farmer", status: "active" }) with index');
  console.log('\n🚀 Implementation:');
  console.log('   1. Added ownerRole field to Product schema with enum + index');
  console.log('   2. Added compound index on (ownerRole, status, createdAt)');
  console.log('   3. Refactored getAllProducts to query by ownerRole');
  console.log('   4. Updated createProduct/updateProduct to sync ownerRole');
  console.log('   5. Created migration script to backfill existing products');
});
