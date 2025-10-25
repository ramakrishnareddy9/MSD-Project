import express from 'express';
import Location from '../models/Location.model.js';

const router = express.Router();

// Get all locations
router.get('/', async (req, res) => {
  try {
    const { type, status, ownerId } = req.query;
    
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (ownerId) query.ownerId = ownerId;

    const locations = await Location.find(query)
      .populate('ownerId', 'name email phone')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: { locations }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get location by ID
router.get('/:id', async (req, res) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate('ownerId', 'name email phone');
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.json({
      success: true,
      data: { location }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create location
router.post('/', async (req, res) => {
  try {
    const location = new Location(req.body);
    await location.save();

    res.status(201).json({
      success: true,
      message: 'Location created successfully',
      data: { location }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update location
router.put('/:id', async (req, res) => {
  try {
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: { location }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete location
router.delete('/:id', async (req, res) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.json({
      success: true,
      message: 'Location deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
