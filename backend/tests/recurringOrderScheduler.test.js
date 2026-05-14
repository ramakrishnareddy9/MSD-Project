import test from 'node:test';
import assert from 'node:assert/strict';

import mongoose from 'mongoose';
import RecurringOrder from '../models/RecurringOrder.model.js';
import Order from '../models/Order.model.js';
import Commission from '../models/Commission.model.js';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';
import PriceAgreement from '../models/PriceAgreement.model.js';
import InventoryManager from '../services/inventory.manager.js';
import { processRecurringOrder } from '../services/recurringOrderScheduler.js';

const makeRecurringOrder = () => ({
  _id: 'recurring-1',
  buyerId: 'buyer-1',
  type: 'b2c',
  deliveryAddress: {
    line1: '123 Farm Lane',
    line2: '',
    city: 'Pune',
    state: 'MH',
    postalCode: '411001',
    country: 'India'
  },
  itemsTemplate: [
    { productId: 'product-1', quantity: 2 }
  ],
  isProcessing: false,
  recordSuccess: async () => {},
  recordFailure: async () => {}
});

test('processRecurringOrder rolls back created records in non-transaction mode', async () => {
  const originalDisableMongoTransactions = process.env.DISABLE_MONGO_TRANSACTIONS;
  const originalReadyState = mongoose.connection.readyState;
  const originalFindOneAndUpdate = RecurringOrder.findOneAndUpdate;
  const originalFindByIdAndUpdate = RecurringOrder.findByIdAndUpdate;
  const originalFindById = User.findById;
  const originalProductFindById = Product.findById;
  const originalOrderSave = Order.prototype.save;
  const originalOrderFindByIdAndDelete = Order.findByIdAndDelete;
  const originalCommissionSave = Commission.prototype.save;
  const originalCommissionFindByIdAndDelete = Commission.findByIdAndDelete;
  const originalReserveForOrder = InventoryManager.reserveForOrder;
  const originalCancelReservation = InventoryManager.cancelReservation;
  const originalPriceAgreementFindById = PriceAgreement.findById;

  const calls = {
    cancelReservation: [],
    orderDeletes: [],
    commissionDeletes: [],
    recordSuccess: 0,
    recordFailure: 0,
    processingFlagClears: 0
  };

  const recurringOrder = makeRecurringOrder();

  try {
    process.env.DISABLE_MONGO_TRANSACTIONS = 'true';
    mongoose.connection.readyState = 1;

    RecurringOrder.findOneAndUpdate = async () => ({ ...recurringOrder, isProcessing: true });
    RecurringOrder.findByIdAndUpdate = async () => {
      calls.processingFlagClears += 1;
      return null;
    };

    User.findById = async () => ({ _id: recurringOrder.buyerId, status: 'active' });
    Product.findById = async () => ({
      _id: 'product-1',
      status: 'active',
      ownerId: 'seller-1',
      basePrice: 100,
      name: 'Tomatoes',
      unit: 'kg'
    });
    PriceAgreement.findById = async () => null;

    InventoryManager.reserveForOrder = async () => ({
      success: true,
      reservedLots: [{ lotId: 'lot-1' }]
    });
    InventoryManager.cancelReservation = async ({ orderId }) => {
      calls.cancelReservation.push(String(orderId));
      return { success: true };
    };

    Order.prototype.save = async function saveMock() {
      return this;
    };
    Order.findByIdAndDelete = async (orderId) => {
      calls.orderDeletes.push(String(orderId));
      return null;
    };

    Commission.prototype.save = async function saveMock() {
      return this;
    };
    Commission.findByIdAndDelete = async (commissionId) => {
      calls.commissionDeletes.push(String(commissionId));
      return null;
    };

    recurringOrder.recordSuccess = async () => {
      calls.recordSuccess += 1;
      throw new Error('post-reservation failure');
    };
    recurringOrder.recordFailure = async () => {
      calls.recordFailure += 1;
    };

    const result = await processRecurringOrder(recurringOrder);

    assert.equal(result.success, false);
    assert.equal(result.error, 'post-reservation failure');
    assert.equal(calls.cancelReservation.length, 1);
    assert.equal(calls.orderDeletes.length, 1);
    assert.equal(calls.commissionDeletes.length, 1);
    assert.equal(calls.recordSuccess, 1);
    assert.equal(calls.recordFailure, 1);
    assert.equal(calls.processingFlagClears, 1);
  } finally {
    process.env.DISABLE_MONGO_TRANSACTIONS = originalDisableMongoTransactions;
    mongoose.connection.readyState = originalReadyState;
    RecurringOrder.findOneAndUpdate = originalFindOneAndUpdate;
    RecurringOrder.findByIdAndUpdate = originalFindByIdAndUpdate;
    User.findById = originalFindById;
    Product.findById = originalProductFindById;
    Order.prototype.save = originalOrderSave;
    Order.findByIdAndDelete = originalOrderFindByIdAndDelete;
    Commission.prototype.save = originalCommissionSave;
    Commission.findByIdAndDelete = originalCommissionFindByIdAndDelete;
    InventoryManager.reserveForOrder = originalReserveForOrder;
    InventoryManager.cancelReservation = originalCancelReservation;
    PriceAgreement.findById = originalPriceAgreementFindById;
  }
});
