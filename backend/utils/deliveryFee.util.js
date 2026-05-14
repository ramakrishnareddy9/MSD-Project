import InventoryLot from '../models/InventoryLot.model.js';

const EARTH_RADIUS_KM = 6371;

const DELIVERY_FEE_TIERS = [
  { maxKm: 20, fee: 40 },
  { maxKm: 50, fee: 80 },
  { maxKm: 100, fee: 120 }
];

const normalizeCoordinates = (value) => {
  if (Array.isArray(value) && value.length === 2) {
    return value.map(Number);
  }

  if (Array.isArray(value?.coordinates) && value.coordinates.length === 2) {
    return value.coordinates.map(Number);
  }

  return null;
};

export const haversineDistanceKm = (originCoordinates, destinationCoordinates) => {
  const origin = normalizeCoordinates(originCoordinates);
  const destination = normalizeCoordinates(destinationCoordinates);

  if (!origin || !destination) {
    return null;
  }

  const [originLng, originLat] = origin;
  const [destinationLng, destinationLat] = destination;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(destinationLat - originLat);
  const deltaLng = toRadians(destinationLng - originLng);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(toRadians(originLat)) * Math.cos(toRadians(destinationLat)) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

export const getTieredDeliveryFee = (distanceKm) => {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return 50;
  }

  for (const tier of DELIVERY_FEE_TIERS) {
    if (distanceKm <= tier.maxKm) {
      return tier.fee;
    }
  }

  return 160;
};

export const calculateDeliveryFeeFromCoordinates = ({ orderType, originCoordinates, destinationCoordinates }) => {
  if (orderType === 'b2b') {
    return { deliveryFee: 0, distanceKm: 0, feeTier: 'b2b-free' };
  }

  const distanceKm = haversineDistanceKm(originCoordinates, destinationCoordinates);
  if (distanceKm == null) {
    return { deliveryFee: 50, distanceKm: null, feeTier: 'fallback-flat' };
  }

  return {
    deliveryFee: getTieredDeliveryFee(distanceKm),
    distanceKm,
    feeTier: 'distance-tiered'
  };
};

export async function calculateDeliveryFeeForOrder({ orderType, lotIds = [], deliveryAddressCoordinates, session = null }) {
  if (orderType === 'b2b') {
    return { deliveryFee: 0, distanceKm: 0, feeTier: 'b2b-free' };
  }

  const destinationCoordinates = normalizeCoordinates(deliveryAddressCoordinates);
  const firstLotId = lotIds.find(Boolean);

  if (!firstLotId || !destinationCoordinates) {
    return { deliveryFee: 50, distanceKm: null, feeTier: 'fallback-flat' };
  }

  const lotQuery = InventoryLot.findById(firstLotId)
    .select('locationId')
    .populate({ path: 'locationId', select: 'coordinates' });

  if (session) {
    lotQuery.session(session);
  }

  const lot = await lotQuery;
  const originCoordinates = normalizeCoordinates(lot?.locationId?.coordinates);

  return calculateDeliveryFeeFromCoordinates({
    orderType,
    originCoordinates,
    destinationCoordinates
  });
}