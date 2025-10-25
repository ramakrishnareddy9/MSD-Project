import express from 'express';
import InventoryLot from '../models/InventoryLot.model.js';

const router = express.Router();

// Get inventory lots
router.get('/', async (req, res) => {
  try {
    const { productId, locationId, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (productId) query.productId = productId;
    if (locationId) query.locationId = locationId;

    const lots = await InventoryLot.find(query)
      .populate('productId', 'name unit images')
      .populate('locationId', 'name type address')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ expiryDate: 1 });

    const count = await InventoryLot.countDocuments(query);

    res.json({
      success: true,
      data: {
        lots,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get lot by ID
router.get('/:id', async (req, res) => {
  try {
    const lot = await InventoryLot.findById(req.params.id)
      .populate('productId')
      .populate('locationId');
    
    if (!lot) {
      return res.status(404).json({
        success: false,
        message: 'Inventory lot not found'
      });
    }

    res.json({
      success: true,
      data: { lot }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create inventory lot
router.post('/', async (req, res) => {
  try {
    const lot = new InventoryLot(req.body);
    await lot.save();

    res.status(201).json({
      success: true,
      message: 'Inventory lot created successfully',
      data: { lot }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update inventory lot
router.put('/:id', async (req, res) => {
  try {
    const lot = await InventoryLot.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: 'Inventory lot not found'
      });
    }

    res.json({
      success: true,
      message: 'Inventory lot updated successfully',
      data: { lot }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete inventory lot
router.delete('/:id', async (req, res) => {
  try {
    const lot = await InventoryLot.findByIdAndDelete(req.params.id);

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: 'Inventory lot not found'
      });
    }

    res.json({
      success: true,
      message: 'Inventory lot deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
