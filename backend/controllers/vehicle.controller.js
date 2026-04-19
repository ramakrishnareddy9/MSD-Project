import Vehicle from '../models/Vehicle.model.js';

// @desc    Get all vehicles
// @route   GET /api/vehicles
// @access  Private
export const getAllVehicles = async (req, res) => {
  try {
    const { ownerId, status } = req.query;
    
    const query = {};
    const isAdmin = req.user.roles?.includes('admin');

    if (ownerId) {
      if (!isAdmin && ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access vehicles for this owner'
        });
      }
      query.owner = ownerId;
    } else if (!isAdmin) {
      query.owner = req.user._id;
    }

    if (status) query.status = status;
    
    const vehicles = await Vehicle.find(query)
      .populate('owner', 'name email phone')
      .populate('driver', 'name email phone');
    
    res.status(200).json({
      success: true,
      data: vehicles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get vehicle by ID
// @route   GET /api/vehicles/:id
// @access  Private
export const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('owner', 'name email phone')
      .populate('driver', 'name email phone');
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const isAdmin = req.user.roles?.includes('admin');
    const isOwner = vehicle.owner && vehicle.owner._id.toString() === req.user._id.toString();
    const isDriver = vehicle.driver && vehicle.driver._id.toString() === req.user._id.toString();
    if (!isAdmin && !isOwner && !isDriver) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this vehicle'
      });
    }
    
    res.status(200).json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create vehicle
// @route   POST /api/vehicles
// @access  Private (Business, Delivery, Restaurant)
export const createVehicle = async (req, res) => {
  try {
    const { name, type, capacity, plateNumber, plate } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name and type are required'
      });
    }
    
    const vehicle = await Vehicle.create({
      owner: req.user._id,
      name,
      type,
      capacity,
      plateNumber: plateNumber || plate,
      status: 'Available'
    });
    
    res.status(201).json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Private (Owner only)
export const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }
    
    // Check ownership
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this vehicle'
      });
    }
    
    const updatePayload = { ...req.body };
    if (updatePayload.plate && !updatePayload.plateNumber) {
      updatePayload.plateNumber = updatePayload.plate;
      delete updatePayload.plate;
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedVehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private (Owner only)
export const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }
    
    // Check ownership
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this vehicle'
      });
    }
    
    await Vehicle.deleteOne({ _id: req.params.id });
    
    res.status(200).json({
      success: true,
      message: 'Vehicle deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update vehicle status
// @route   PATCH /api/vehicles/:id/status
// @access  Private (Owner or Admin)
export const updateVehicleStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const isAdmin = req.user.roles?.includes('admin');
    if (!isAdmin && vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this vehicle status'
      });
    }
    
    vehicle.status = status;
    await vehicle.save();
    
    res.status(200).json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Assign driver to vehicle
// @route   PATCH /api/vehicles/:id/driver
// @access  Private (Owner)
export const assignDriver = async (req, res) => {
  try {
    const { driverId } = req.body;
    
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }
    
    // Check ownership
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this vehicle'
      });
    }
    
    vehicle.driver = driverId;
    await vehicle.save();
    
    await vehicle.populate('driver', 'name email phone');
    
    res.status(200).json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update vehicle location
// @route   PATCH /api/vehicles/:id/location
// @access  Private (Driver or Owner)
export const updateVehicleLocation = async (req, res) => {
  try {
    const { address, lat, lng } = req.body;
    
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const isAdmin = req.user.roles?.includes('admin');
    const isOwner = vehicle.owner?.toString() === req.user._id.toString();
    const isDriver = vehicle.driver?.toString() === req.user._id.toString();
    if (!isAdmin && !isOwner && !isDriver) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this vehicle location'
      });
    }
    
    vehicle.currentLocation = {
      address,
      coordinates: { lat, lng }
    };
    
    await vehicle.save();
    
    res.status(200).json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
