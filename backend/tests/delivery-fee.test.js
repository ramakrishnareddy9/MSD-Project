import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDeliveryFeeFromCoordinates,
  getTieredDeliveryFee,
  haversineDistanceKm
} from '../utils/deliveryFee.util.js';

test('delivery fee tiers and distance calculation', async (t) => {
  await t.test('applies the tiered fee schedule by distance', async () => {
    assert.equal(getTieredDeliveryFee(0), 40);
    assert.equal(getTieredDeliveryFee(19.9), 40);
    assert.equal(getTieredDeliveryFee(20.1), 80);
    assert.equal(getTieredDeliveryFee(50), 80);
    assert.equal(getTieredDeliveryFee(50.1), 120);
    assert.equal(getTieredDeliveryFee(100.1), 160);
  });

  await t.test('calculates a real haversine distance between coordinates', async () => {
    const distance = haversineDistanceKm([78.4867, 17.385], [78.5506, 17.4333]);
    assert.ok(distance > 0, 'distance should be greater than 0');
  });

  await t.test('keeps B2B delivery free', async () => {
    const fee = calculateDeliveryFeeFromCoordinates({
      orderType: 'b2b',
      originCoordinates: [78.4867, 17.385],
      destinationCoordinates: [78.5506, 17.4333]
    });

    assert.equal(fee.deliveryFee, 0);
    assert.equal(fee.feeTier, 'b2b-free');
  });
});