import test from 'node:test';
import assert from 'node:assert/strict';

import Payout from '../models/Payout.model.js';
import { processPayout } from '../controllers/payout.controller.js';

const createMockRes = () => {
  const res = {
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
  };

  return res;
};

test('processPayout marks pending payout as processed', async () => {
  const originalFindById = Payout.findById;
  let markProcessedCalledWith = null;

  try {
    Payout.findById = async () => ({
      status: 'pending',
      markProcessed: async (paymentReference) => {
        markProcessedCalledWith = paymentReference;
      }
    });

    const req = {
      user: { roles: ['admin'] },
      params: { id: 'payout-1' },
      body: { paymentReference: 'UTR-123456' }
    };
    const res = createMockRes();

    await processPayout(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.success, true);
    assert.equal(markProcessedCalledWith, 'UTR-123456');
  } finally {
    Payout.findById = originalFindById;
  }
});

test('processPayout requires payment reference', async () => {
  const req = {
    user: { roles: ['admin'] },
    params: { id: 'payout-1' },
    body: {}
  };
  const res = createMockRes();

  await processPayout(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body?.message, 'paymentReference is required');
});

test('processPayout blocks non-admin users', async () => {
  const req = {
    user: { roles: ['farmer'] },
    params: { id: 'payout-1' },
    body: { paymentReference: 'UTR-123456' }
  };
  const res = createMockRes();

  await processPayout(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body?.message, 'Only admins can process payouts');
});