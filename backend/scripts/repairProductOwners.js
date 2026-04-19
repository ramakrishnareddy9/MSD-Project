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

  const farmerUsers = users.filter((u) => Array.isArray(u.roles) && u.roles.includes('farmer'));
  if (farmerUsers.length === 0) {
    throw new Error('No farmer users available to repair product ownership.');
  }

  const products = await Product.find({}).select('_id name ownerId').lean();
  const orphanProducts = products.filter((p) => !validUserIds.has(String(p.ownerId)));

  const mapping = orphanProducts.map((product, index) => {
    const owner = farmerUsers[index % farmerUsers.length];
    return {
      productId: String(product._id),
      productName: product.name,
      oldOwnerId: String(product.ownerId),
      newOwnerId: String(owner._id),
      newOwnerEmail: owner.email
    };
  });

  if (APPLY && mapping.length > 0) {
    const bulkOps = mapping.map((m) => ({
      updateOne: {
        filter: { _id: m.productId },
        update: { $set: { ownerId: m.newOwnerId } }
      }
    }));

    await Product.bulkWrite(bulkOps);
  }

  console.log(JSON.stringify({
    mongoUri: MONGODB_URI,
    mode: APPLY ? 'apply' : 'dry-run',
    orphanProductsFound: orphanProducts.length,
    repaired: APPLY ? mapping.length : 0,
    mapping
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
