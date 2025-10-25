import mongoose from 'mongoose';

const inventoryLotSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  reservedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  harvestDate: Date,
  expiryDate: Date,
  batchNumber: String,
  qualityGrade: {
    type: String,
    enum: ['A', 'B', 'C'],
    default: 'A'
  },
  storageCondition: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
inventoryLotSchema.index({ productId: 1, locationId: 1, expiryDate: 1 });
inventoryLotSchema.index({ expiryDate: 1 });
inventoryLotSchema.index({ locationId: 1, quantity: 1 });

// Virtual for available quantity
inventoryLotSchema.virtual('availableQuantity').get(function() {
  return this.quantity - this.reservedQuantity;
});

const InventoryLot = mongoose.model('InventoryLot', inventoryLotSchema);

export default InventoryLot;
