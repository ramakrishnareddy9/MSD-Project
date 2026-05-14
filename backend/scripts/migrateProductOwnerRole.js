/**
 * Migration script to backfill ownerRole field for all existing products.
 * This denormalizes the owner's primary role into the Product document,
 * eliminating the need for User collection joins in catalog queries.
 * 
 * Usage: node migrateProductOwnerRole.js
 */

import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';

const migrateProductOwnerRole = async () => {
  try {
    console.log('🔄 Starting Product ownerRole migration...\n');

    const products = await Product.find({}).select('_id ownerId ownerRole');
    const totalProducts = products.length;

    if (totalProducts === 0) {
      console.log('✅ No products to migrate.');
      process.exit(0);
    }

    console.log(`📊 Found ${totalProducts} products to process.\n`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < totalProducts; i++) {
      const product = products[i];

      try {
        // Skip if ownerRole already set
        if (product.ownerRole) {
          skipped++;
          if ((i + 1) % 100 === 0) console.log(`  Skipped ${skipped} products with existing ownerRole...`);
          continue;
        }

        // Fetch owner and extract primary role
        const owner = await User.findById(product.ownerId).select('roles').lean();
        if (!owner || !owner.roles || owner.roles.length === 0) {
          console.warn(`⚠️  Product ${product._id}: Owner not found or has no roles, skipping.`);
          skipped++;
          continue;
        }

        // Update product with owner's primary role
        const primaryRole = owner.roles[0];
        await Product.findByIdAndUpdate(product._id, { ownerRole: primaryRole });

        updated++;

        // Log progress every 100 updates
        if (updated % 100 === 0) {
          console.log(`  ✓ Updated ${updated}/${totalProducts} products...`);
        }
      } catch (error) {
        console.error(`❌ Error processing product ${product._id}:`, error.message);
        failed++;
      }
    }

    console.log(`\n📈 Migration complete:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⊘ Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);

    if (failed === 0) {
      console.log(`\n✨ All products successfully migrated!`);
    } else {
      console.log(`\n⚠️  Migration completed with ${failed} errors.`);
    }

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Connect and run migration
const main = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/farmkart';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    await migrateProductOwnerRole();
  } catch (error) {
    console.error('Connection error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

main();
