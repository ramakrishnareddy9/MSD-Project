import test from 'node:test';
import assert from 'node:assert/strict';

import Dispute from '../models/Dispute.model.js';
import Order from '../models/Order.model.js';
import Payment from '../models/Payment.model.js';
import { createDispute, listDisputes, resolveDispute } from '../controllers/dispute.controller.js';

const createMockRes = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  }
});

test('createDispute opens a dispute for a delivered order within the window', async () => {
  const originalFindById = Order.findById;
  const originalFindOne = Dispute.findOne;
  const originalCreate = Dispute.create;
  let createdPayload = null;

  try {
    Order.findById = async () => ({
      _id: 'order-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      status: 'delivered',
      actualDeliveryDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      orderNumber: 'ORD-1'
    });
    Dispute.findOne = async () => null;
    Dispute.create = async (payload) => {
      createdPayload = payload;
      return { _id: 'dispute-1', ...payload };
    };

    const req = {
      user: { _id: 'buyer-1' },
      body: {
        orderId: 'order-1',
        reason: 'damaged',
        description: 'Box was damaged on arrival',
        evidenceImages: ['https://example.com/evidence.jpg']
      }
    };
    const res = createMockRes();

    await createDispute(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body?.success, true);
    assert.equal(createdPayload.reason, 'damaged');
    assert.equal(createdPayload.evidenceImages.length, 1);
  } finally {
    Order.findById = originalFindById;
    Dispute.findOne = originalFindOne;
    Dispute.create = originalCreate;
  }
});

test('resolveDispute triggers a refund when requested', async () => {
  const originalFindById = Dispute.findById;
  const originalOrderFindById = Order.findById;
  const originalFindOne = Payment.findOne;
  let refundCalled = false;

  try {
    Dispute.findById = async () => ({
      _id: 'dispute-1',
      orderId: 'order-1',
      buyerId: 'buyer-1',
      status: 'open',
      save: async function() { return this; }
    });
    Order.findById = async () => ({
      _id: 'order-1',
      orderNumber: 'ORD-1',
      sellerId: 'seller-1'
    });
    Payment.findOne = async () => ({
      _id: 'payment-1',
      processRefund: async () => {
        refundCalled = true;
      }
    });

    const req = {
      user: { _id: 'admin-1' },
      params: { id: 'dispute-1' },
      body: { resolution: 'resolved_refund', resolutionNotes: 'Refund approved' }
    };
    const res = createMockRes();

    await resolveDispute(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.success, true);
    assert.equal(refundCalled, true);
  } finally {
    Dispute.findById = originalFindById;
    Order.findById = originalOrderFindById;
    Payment.findOne = originalFindOne;
  }
});

test('listDisputes returns only the current buyer disputes for non-admin users', async () => {
  const originalFind = Dispute.find;
  const originalCountDocuments = Dispute.countDocuments;
  const originalPopulate = Dispute.populate;
  let capturedQuery = null;

  try {
    Dispute.find = (query) => {
      capturedQuery = query;
      return {
        populate: () => ({
          populate: () => ({
            populate: () => ({
              sort: () => ({
                limit: () => ({
                  skip: async () => ([{ _id: 'dispute-1' }])
                })
              })
            })
          })
        })
      };
    };
    Dispute.countDocuments = async () => 1;
    Dispute.populate = originalPopulate;

    const req = {
      user: { _id: 'buyer-1', roles: ['customer'] },
      query: { status: 'open', limit: '20' }
    };
    const res = createMockRes();

    await listDisputes(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.success, true);
    assert.equal(capturedQuery.buyerId, 'buyer-1');
    assert.equal(capturedQuery.status, 'open');
    assert.equal(res.body?.data?.disputes?.length, 1);
  } finally {
    Dispute.find = originalFind;
    Dispute.countDocuments = originalCountDocuments;
    Dispute.populate = originalPopulate;
  }
});
