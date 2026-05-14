import CommissionConfig from '../models/CommissionConfig.model.js';

let _cache = null;
let _cacheAt = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export async function getCommissionConfig(forceReload = false) {
  const now = Date.now();
  if (!forceReload && _cache && (now - _cacheAt) < CACHE_TTL_MS) {
    return _cache;
  }

  try {
    const cfg = await CommissionConfig.getSingleton();
    _cache = cfg;
    _cacheAt = Date.now();
    return cfg;
  } catch {
    return {
      b2cRate: 0.10,
      b2bRate: 0.05
    };
  }
}

export async function getCommissionRate(orderType = 'b2c') {
  const cfg = await getCommissionConfig();
  if (String(orderType).toLowerCase() === 'b2b') return Number(cfg.b2bRate || 0.05);
  return Number(cfg.b2cRate || 0.10);
}

export async function setCommissionRates({ b2cRate, b2bRate, updatedBy }) {
  const cfg = await CommissionConfig.getSingleton();
  if (typeof b2cRate === 'number') cfg.b2cRate = b2cRate;
  if (typeof b2bRate === 'number') cfg.b2bRate = b2bRate;
  if (updatedBy) cfg.updatedBy = updatedBy;
  await cfg.save();
  _cache = cfg;
  _cacheAt = Date.now();
  return cfg;
}

export default { getCommissionConfig, getCommissionRate, setCommissionRates };
