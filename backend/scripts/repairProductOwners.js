import dotenv from 'dotenv';
import mongoose from 'mongoose';

import User from '../models/User.model.js';
import Product from '../models/Product.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/farmkart';
const APPLY = process.argv.includes('--apply');

async function run() {
  await mongoose.connect(MONGODB_URI);

  const users = await User.find({}).select('_id roles email name').lean();
  const validUserIds = new Set(users.map((u) => String(u._id)));

  const products = await Product.find({}).select('_id name ownerId status isDeleted').lean();
  const orphanProducts = products.filter(
    (p) => !validUserIds.has(String(p.ownerId)) && !p.isDeleted
  );

  const mapping = orphanProducts.map((product) => ({
    productId: String(product._id),
    productName: product.name,
    orphanedOwnerId: String(product.ownerId),
    action: 'soft-delete'
  }));

  if (APPLY && mapping.length > 0) {
    // SAFE: soft-delete orphaned products instead of blindly reassigning them
    // to existing farmers who never created them. Admin can review and manually
    // re-assign ownership if needed.
    const bulkOps = mapping.map((m) => ({
      updateOne: {
        filter: { _id: m.productId },
        update: {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            status: 'inactive'
          }
        }
      }
    }));

    await Product.bulkWrite(bulkOps);
  }

  console.log(JSON.stringify({
    mongoUri: MONGODB_URI,
    mode: APPLY ? 'apply' : 'dry-run',
    orphanProductsFound: orphanProducts.length,
    softDeleted: APPLY ? mapping.length : 0,
    note: APPLY
      ? 'Orphaned products have been soft-deleted. Review and manually re-assign via admin dashboard if needed.'
      : 'Dry-run: no changes made. Run with --apply to soft-delete these products.',
    orphans: mapping
  }, null, 2));

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Repair failed:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors
  }
  process.exit(1);
});
