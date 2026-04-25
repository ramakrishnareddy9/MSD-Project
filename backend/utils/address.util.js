const CITY_COORDINATE_LOOKUP = new Map([
  ['ahmedabad', [72.5714, 23.0225]],
  ['bangalore', [77.5946, 12.9716]],
  ['bengaluru', [77.5946, 12.9716]],
  ['deesa', [72.1803, 24.2505]],
  ['hyderabad', [78.4867, 17.3850]],
  ['mumbai', [72.8777, 19.0760]],
  ['nashik', [73.7898, 20.0063]],
  ['pune', [73.8567, 18.5204]]
]);

const CITY_STATE_LOOKUP = new Map([
  ['ahmedabad', 'Gujarat'],
  ['bangalore', 'Karnataka'],
  ['bengaluru', 'Karnataka'],
  ['deesa', 'Gujarat'],
  ['hyderabad', 'Telangana'],
  ['mumbai', 'Maharashtra'],
  ['nashik', 'Maharashtra'],
  ['pune', 'Maharashtra']
]);

const CITY_POSTAL_LOOKUP = new Map([
  ['ahmedabad', '380001'],
  ['bangalore', '560001'],
  ['bengaluru', '560001'],
  ['deesa', '385535'],
  ['hyderabad', '500001'],
  ['mumbai', '400001'],
  ['nashik', '422001'],
  ['pune', '411001']
]);

const normalizeCityKey = (city) => String(city || '').trim().toLowerCase();

export const getAddressTypeForRoles = (roles = []) => {
  if (roles.includes('farmer')) return 'farm';
  if (roles.includes('business')) return 'warehouse';
  if (roles.includes('restaurant')) return 'restaurant';
  if (roles.includes('delivery')) return 'office';
  if (roles.includes('delivery_large')) return 'warehouse';
  if (roles.includes('delivery_small')) return 'home';
  if (roles.includes('travel_agency')) return 'office';
  if (roles.includes('admin')) return 'office';
  return 'home';
};

export const getCoordinatesForCity = (city) => {
  const cityKey = normalizeCityKey(city);
  return CITY_COORDINATE_LOOKUP.get(cityKey) || [0, 0];
};

export const getStateForCity = (city) => {
  const cityKey = normalizeCityKey(city);
  return CITY_STATE_LOOKUP.get(cityKey) || 'Unknown';
};

export const getPostalCodeForCity = (city) => {
  const cityKey = normalizeCityKey(city);
  return CITY_POSTAL_LOOKUP.get(cityKey) || '000000';
};

export const buildCanonicalAddress = ({
  roles = [],
  address,
  city,
  state,
  postalCode,
  country,
  line2,
  coordinates
}) => {
  const normalizedCity = String(city || '').trim();
  const normalizedAddress = String(address || '').trim();
  const addressCoordinates = Array.isArray(coordinates?.coordinates) && coordinates.coordinates.length === 2
    ? coordinates.coordinates
    : getCoordinatesForCity(normalizedCity);

  return {
    type: getAddressTypeForRoles(roles),
    line1: normalizedAddress || `${normalizedCity || 'Primary'} Address`,
    line2: String(line2 || '').trim(),
    city: normalizedCity || 'Unknown',
    state: String(state || '').trim() || getStateForCity(normalizedCity),
    postalCode: String(postalCode || '').trim() || getPostalCodeForCity(normalizedCity),
    country: String(country || '').trim() || 'India',
    coordinates: {
      type: 'Point',
      coordinates: addressCoordinates
    }
  };
};

export const isCanonicalAddressCoordinate = (coordinates) => {
  return Array.isArray(coordinates) && coordinates.length === 2 && coordinates.some((value) => Number(value) !== 0);
};