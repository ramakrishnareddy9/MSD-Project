import express from 'express';
import { 
  getAllVehicles, 
  getVehicleById, 
  createVehicle, 
  updateVehicle, 
  deleteVehicle,
  updateVehicleStatus,
  assignDriver,
  updateVehicleLocation
} from '../controllers/vehicle.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

router.use(authenticate);

// Get all vehicles
router.get('/', getAllVehicles);

// Get vehicle by ID
router.get('/:id', getVehicleById);

// Create vehicle (Business, Delivery, Restaurant)
router.post('/', authorize('business', 'delivery_large', 'delivery_small', 'restaurant'), createVehicle);

// Update vehicle
router.put('/:id', updateVehicle);

// Delete vehicle
router.delete('/:id', deleteVehicle);

// Update status
router.patch('/:id/status', updateVehicleStatus);

// Assign driver
router.patch('/:id/driver', assignDriver);

// Update location
router.patch('/:id/location', updateVehicleLocation);

export default router;
