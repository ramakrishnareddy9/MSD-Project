import mongoose from 'mongoose';

const commissionConfigSchema = new mongoose.Schema({
  b2cRate: { type: Number, default: 0.10, min: 0, max: 1 },
  b2bRate: { type: Number, default: 0.05, min: 0, max: 1 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Single document pattern - ensure only one exists
commissionConfigSchema.statics.getSingleton = async function() {
  let cfg = await this.findOne();
  if (!cfg) {
    cfg = await this.create({});
  }
  return cfg;
};

const CommissionConfig = mongoose.model('CommissionConfig', commissionConfigSchema);

export default CommissionConfig;
