import dotenv from 'dotenv';
import mongoose from 'mongoose';

import User from '../models/User.model.js';
import Product from '../models/Product.model.js';
import Category from '../models/Category.model.js';
import Cart from '../models/Cart.model.js';
import Wishlist from '../models/Wishlist.model.js';
import Order from '../models/Order.model.js';
import InventoryLot from '../models/InventoryLot.model.js';
import Location from '../models/Location.model.js';
import Community from '../models/Community.model.js';
import CommunityPool from '../models/CommunityPool.model.js';
import Vehicle from '../models/Vehicle.model.js';
import Payment from '../models/Payment.model.js';
import DeliveryProfile from '../models/DeliveryProfile.model.js';
import Shipment from '../models/Shipment.model.js';
import DeliveryTask from '../models/DeliveryTask.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/farmkart';

function extractValues(source, path) {
  const parts = path.split('.');

  const walk = (value, index) => {
    if (value === null || value === undefined) return [];
    if (index >= parts.length) return [value];

    const key = parts[index];

    if (Array.isArray(value)) {
      return value.flatMap((item) => walk(item, index));
    }

    return walk(value[key], index + 1);
  };

  return walk(source, 0);
}

function toObjectIdString(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof mongoose.Types.ObjectId) return String(value);
  if (typeof value === 'object' && value._id) return String(value._id);
  return null;
}

async function buildRefSet(model) {
  const ids = await model.find({}).select('_id').lean();
  return new Set(ids.map((doc) => String(doc._id)));
}

async function checkRelation({ name, fromModel, fromPath, toModel, filter = {} }) {
  const [fromDocs, toIdSet] = await Promise.all([
    fromModel.find(filter).select(fromPath).lean(),
    buildRefSet(toModel)
  ]);

  const missing = [];
  let totalRefs = 0;

  for (const doc of fromDocs) {
    const values = extractValues(doc, fromPath)
      .map(toObjectIdString)
      .filter(Boolean);

    for (const refId of values) {
      totalRefs += 1;
      if (!toIdSet.has(refId)) {
        missing.push({ fromId: String(doc._id), missingRefId: refId });
      }
    }
  }

  return {
    relation: name,
    from: fromModel.modelName,
    path: fromPath,
    to: toModel.modelName,
    documentsChecked: fromDocs.length,
    referencesChecked: totalRefs,
    missingCount: missing.length,
    sampleMissing: missing.slice(0, 10)
  };
}

async function run() {
  await mongoose.connect(MONGODB_URI);

  const checks = [
    { name: 'Product.ownerId -> User', fromModel: Product, fromPath: 'ownerId', toModel: User },
    { name: 'Product.categoryId -> Category', fromModel: Product, fromPath: 'categoryId', toModel: Category },

    { name: 'Cart.user -> User', fromModel: Cart, fromPath: 'user', toModel: User },
    { name: 'Cart.items.product -> Product', fromModel: Cart, fromPath: 'items.product', toModel: Product },

    { name: 'Wishlist.user -> User', fromModel: Wishlist, fromPath: 'user', toModel: User },
    { name: 'Wishlist.products -> Product', fromModel: Wishlist, fromPath: 'products', toModel: Product },

    { name: 'Order.buyerId -> User', fromModel: Order, fromPath: 'buyerId', toModel: User },
    { name: 'Order.sellerId -> User', fromModel: Order, fromPath: 'sellerId', toModel: User },
    { name: 'Order.orderItems.productId -> Product', fromModel: Order, fromPath: 'orderItems.productId', toModel: Product },
    { name: 'Order.orderItems.categoryId -> Category', fromModel: Order, fromPath: 'orderItems.categoryId', toModel: Category },
    { name: 'Order.orderItems.lotId -> InventoryLot', fromModel: Order, fromPath: 'orderItems.lotId', toModel: InventoryLot },

    { name: 'InventoryLot.productId -> Product', fromModel: InventoryLot, fromPath: 'productId', toModel: Product },
    { name: 'InventoryLot.locationId -> Location', fromModel: InventoryLot, fromPath: 'locationId', toModel: Location },
    { name: 'InventoryLot.reservations.orderId -> Order', fromModel: InventoryLot, fromPath: 'reservations.orderId', toModel: Order },

    { name: 'Community.admin -> User', fromModel: Community, fromPath: 'admin', toModel: User },
    { name: 'Community.members.user -> User', fromModel: Community, fromPath: 'members.user', toModel: User },

    { name: 'CommunityPool.community -> Community', fromModel: CommunityPool, fromPath: 'community', toModel: Community },
    { name: 'CommunityPool.product -> Product', fromModel: CommunityPool, fromPath: 'product', toModel: Product },
    { name: 'CommunityPool.contributions.member -> User', fromModel: CommunityPool, fromPath: 'contributions.member', toModel: User },
    { name: 'CommunityPool.assignedFarmer -> User', fromModel: CommunityPool, fromPath: 'assignedFarmer', toModel: User },

    { name: 'DeliveryProfile.userId -> User', fromModel: DeliveryProfile, fromPath: 'userId', toModel: User },
    { name: 'Shipment.deliveryPartnerId -> User', fromModel: Shipment, fromPath: 'deliveryPartnerId', toModel: User },
    { name: 'DeliveryTask.deliveryPartnerId -> User', fromModel: DeliveryTask, fromPath: 'deliveryPartnerId', toModel: User },
    { name: 'DeliveryTask.orderId -> Order', fromModel: DeliveryTask, fromPath: 'orderId', toModel: Order },
    { name: 'DeliveryTask.shipmentId -> Shipment', fromModel: DeliveryTask, fromPath: 'shipmentId', toModel: Shipment },

    { name: 'Vehicle.owner -> User', fromModel: Vehicle, fromPath: 'owner', toModel: User },
    { name: 'Vehicle.driver -> User', fromModel: Vehicle, fromPath: 'driver', toModel: User },

    { name: 'Payment.orderId -> Order', fromModel: Payment, fromPath: 'orderId', toModel: Order }
  ];

  const results = [];
  for (const check of checks) {
    const result = await checkRelation(check);
    results.push(result);
  }

  const summary = {
    mongoUri: MONGODB_URI,
    checkedAt: new Date().toISOString(),
    checksRun: results.length,
    totalReferencesChecked: results.reduce((sum, r) => sum + r.referencesChecked, 0),
    totalMissingReferences: results.reduce((sum, r) => sum + r.missingCount, 0),
    failingRelations: results.filter((r) => r.missingCount > 0).map((r) => r.relation)
  };

  console.log('=== DB RELATION INTEGRITY REPORT ===');
  console.log(JSON.stringify({ summary, results }, null, 2));

  await mongoose.disconnect();

  if (summary.totalMissingReferences > 0) {
    process.exitCode = 2;
  }
}

run().catch(async (error) => {
  console.error('Integrity check failed:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors
  }
  process.exit(1);
});
