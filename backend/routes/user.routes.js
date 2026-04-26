import express from 'express';
import User from '../models/User.model.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validateObjectId } from '../middleware/validation.middleware.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role, status, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (role) query.roles = role;
    if (status) query.status = status;

    const users = await User.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
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

// Update verification state (admin only)
router.patch('/:id/verification', authenticate, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const { emailVerified, phoneVerified, kycStatus, status } = req.body;

    const updatePayload = {};

    if (typeof emailVerified === 'boolean') {
      updatePayload.emailVerified = emailVerified;
    }

    if (typeof phoneVerified === 'boolean') {
      updatePayload.phoneVerified = phoneVerified;
    }

    if (typeof kycStatus === 'string' && ['not_started', 'pending', 'verified', 'rejected'].includes(kycStatus)) {
      updatePayload.kycStatus = kycStatus;
    }

    if (typeof status === 'string' && ['active', 'suspended', 'pending_verification'].includes(status)) {
      updatePayload.status = status;
    }

    if (!Object.keys(updatePayload).length) {
      return res.status(400).json({
        success: false,
        message: 'No valid verification fields provided'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Verification status updated successfully',
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get user by ID (admin or self)
router.get('/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const isAdmin = req.user.roles?.includes('admin');
    const isSelf = String(req.user._id) === String(req.params.id);

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only access your own profile'
      });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update user (admin or self)
router.put('/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const isAdmin = req.user.roles?.includes('admin');
    const isSelf = String(req.user._id) === String(req.params.id);

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only update your own profile'
      });
    }

    const allowedSelfFields = [
      'name', 'email', 'phone', 'addresses'
    ];

    const updatePayload = isAdmin
      ? req.body
      : Object.fromEntries(
          Object.entries(req.body || {}).filter(([key]) => allowedSelfFields.includes(key))
        );

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
