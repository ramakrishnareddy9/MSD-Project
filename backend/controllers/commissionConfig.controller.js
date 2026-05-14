import { getCommissionConfig, setCommissionRates } from '../utils/commission.util.js';

export const getConfig = async (req, res) => {
  try {
    const cfg = await getCommissionConfig(true);
    res.json({ success: true, data: { b2cRate: cfg.b2cRate, b2bRate: cfg.b2bRate } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateConfig = async (req, res) => {
  try {
    const { b2cRate, b2bRate } = req.body;
    const updated = await setCommissionRates({ b2cRate: typeof b2cRate === 'number' ? b2cRate : undefined, b2bRate: typeof b2bRate === 'number' ? b2bRate : undefined, updatedBy: req.user._id });
    res.json({ success: true, message: 'Commission rates updated', data: { b2cRate: updated.b2cRate, b2bRate: updated.b2bRate } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default { getConfig, updateConfig };
