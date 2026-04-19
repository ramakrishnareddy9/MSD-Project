import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Product from '../models/Product.model.js';
import InventoryLot from '../models/InventoryLot.model.js';
import Location from '../models/Location.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/farmkart';
const APPLY = process.argv.includes('--apply');

const DEFAULT_COORDS = [78.4867, 17.3850];

async function ensureOwnerLocation(ownerId) {
  let location = await Location.findOne({ ownerId, status: 'active' }).sort({ createdAt: 1 });
  if (location) return location;

  if (!APPLY) {
    return {
      _id: null,
      simulated: true,
      ownerId,
      name: 'Auto Warehouse',
      type: 'warehouse'
    };
  }

  location = await Location.create({
    type: 'warehouse',
    name: 'Auto Warehouse',
    ownerId,
    address: {
      line1: 'Auto-generated inventory location',
      city: 'Hyderabad',
      state: 'TS',
      postalCode: '500001',
      country: 'India'
    },
    coordinates: {
      type: 'Point',
      coordinates: DEFAULT_COORDS
    },
    status: 'active'
  });

  return location;
}

async function run() {
  await mongoose.connect(MONGODB_URI);

  const activeProducts = await Product.find({ status: 'active' })
    .select('_id ownerId name stockQuantity minOrderQuantity')
    .lean();

  const results = [];

  for (const product of activeProducts) {
    const lots = await InventoryLot.find({ productId: product._id })
      .select('_id quantity reservedQuantity locationId')
      .lean();

    const totalQty = lots.reduce((sum, lot) => sum + (lot.quantity || 0), 0);
    const totalReserved = lots.reduce((sum, lot) => sum + (lot.reservedQuantity || 0), 0);
    const availableQty = Math.max(0, totalQty - totalReserved);

    const targetQty = Math.max(
      Number(product.stockQuantity || 0),
      Number(product.minOrderQuantity || 0),
      25
    );

    const itemResult = {
      productId: String(product._id),
      productName: product.name,
      hadLots: lots.length > 0,
      lotsCount: lots.length,
      previousStockQuantity: Number(product.stockQuantity || 0),
      lotTotalQuantity: totalQty,
      lotReservedQuantity: totalReserved,
      lotAvailableQuantity: availableQty,
      action: 'none'
    };

    if (lots.length === 0) {
      const location = await ensureOwnerLocation(product.ownerId);

      itemResult.action = 'create-lot';
      itemResult.newLotQuantity = targetQty;
      itemResult.locationId = location?._id ? String(location._id) : null;

      if (APPLY) {
        await InventoryLot.create({
          productId: product._id,
          locationId: location._id,
          quantity: targetQty,
          reservedQuantity: 0,
          qualityGrade: 'A'
        });
      }

      if (APPLY) {
        await Product.updateOne({ _id: product._id }, { $set: { stockQuantity: targetQty, status: 'active' } });
      }

      itemResult.updatedStockQuantity = targetQty;
    } else {
      itemResult.action = 'sync-stock';
      itemResult.updatedStockQuantity = availableQty;

      if (APPLY) {
        await Product.updateOne(
          { _id: product._id },
          {
            $set: {
              stockQuantity: availableQty,
              status: availableQty > 0 ? 'active' : 'out_of_stock'
            }
          }
        );
      }
    }

    results.push(itemResult);
  }

  const summary = {
    mongoUri: MONGODB_URI,
    mode: APPLY ? 'apply' : 'dry-run',
    productsChecked: results.length,
    createdLots: results.filter((r) => r.action === 'create-lot').length,
    stockSynced: results.filter((r) => r.action === 'sync-stock').length
  };

  console.log(JSON.stringify({ summary, results }, null, 2));

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Inventory sync failed:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
