import test from 'node:test';
import assert from 'node:assert/strict';

import { getSeasonalAvailability } from '../utils/seasonal.util.js';

test('seasonal availability marks products in season from availableMonths', () => {
  const availability = getSeasonalAvailability({ availableMonths: [5, 6, 7] }, new Date('2026-06-15T00:00:00Z'));

  assert.equal(availability.status, 'in_season');
  assert.equal(availability.badgeLabel, 'In Season');
});

test('seasonal availability surfaces a coming-soon badge for future months', () => {
  const availability = getSeasonalAvailability({ availableMonths: [11, 12] }, new Date('2026-06-15T00:00:00Z'));

  assert.equal(availability.status, 'coming_soon');
  assert.match(availability.badgeLabel, /^Coming /);
});
