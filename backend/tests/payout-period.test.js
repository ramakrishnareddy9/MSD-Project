import test from 'node:test';
import assert from 'node:assert/strict';
import { getPayoutPeriodWindow, isPayoutCycleDue } from '../utils/payoutPeriod.util.js';

test('payout period helper', async (t) => {
  await t.test('weekly payouts are due on Monday and span the previous week', async () => {
    const monday = new Date('2026-05-11T10:00:00.000Z');
    assert.equal(isPayoutCycleDue('weekly', monday), true);

    const window = getPayoutPeriodWindow('weekly', monday);
    assert.ok(window);
    assert.equal(window.periodEnd.getDay(), 1);
    assert.equal(window.periodEnd.getDate(), 11);
    assert.equal(window.periodStart.getDate(), 4);
    assert.equal(Math.round((window.periodEnd - window.periodStart) / (1000 * 60 * 60 * 24)), 7);
  });

  await t.test('monthly payouts are due on the first and span the previous month', async () => {
    const first = new Date('2026-06-01T10:00:00.000Z');
    assert.equal(isPayoutCycleDue('monthly', first), true);

    const window = getPayoutPeriodWindow('monthly', first);
    assert.ok(window);
    assert.equal(window.periodEnd.getDate(), 1);
    assert.equal(window.periodStart.getDate(), 1);
    assert.equal(window.periodEnd.getMonth(), 5);
    assert.equal(window.periodStart.getMonth(), 4);
  });
});