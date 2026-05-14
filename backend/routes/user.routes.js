import express from 'express';
import User from '../models/User.model.js';
import { notifyUser } from '../utils/notification.util.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validateObjectId } from '../middleware/validation.middleware.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role, status, page = 1, limit = 10 } = req.query;
    const cappedLimit = Math.min(Number(limit) || 10, 100);
    
    const query = {};
    if (role) query.roles = role;
    if (status) query.status = status;

    const users = await User.find(query)
      .limit(cappedLimit)
      .skip((page - 1) * cappedLimit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        totalPages: Math.ceil(count / cappedLimit),
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

    // Issue 38 - Prevent privilege escalation: Users cannot self-update roles or verification status
    const allowedSelfFields = [
      'name', 'email', 'phone', 'addresses'
    ];
    const forbiddenFields = ['roles', 'emailVerified', 'phoneVerified', 'kycStatus', 'status'];

    // Issue 38 - Prevent privilege escalation
    let updatePayload = isAdmin
      ? req.body
      : Object.fromEntries(
          Object.entries(req.body || {}).filter(([key]) => allowedSelfFields.includes(key))
        );
    
    // Extra safety: even if admin flag somehow bypassed, block role updates for self
    if (isSelf) {
      forbiddenFields.forEach(field => delete updatePayload[field]);
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

// Delete user (admin only) — soft delete for compliance & audit trail
router.delete('/:id', authenticate, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.softDelete();

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

// Submit KYC documents (self-service — any authenticated user)
// Sets kycStatus to 'pending' so admins can review it.
router.post('/me/kyc-submit', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.kycStatus === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Your KYC is already verified',
        kycStatus: 'verified'
      });
    }

    const { documentType, documentNumber, documentUrl, selfieUrl } = req.body;
    if (!documentType || !documentNumber) {
      return res.status(400).json({
        success: false,
        message: 'documentType and documentNumber are required'
      });
    }

    // Store KYC submission in user record
    user.kycStatus = 'pending';
    user.kycDocuments = {
      documentType: String(documentType).trim(),
      documentNumber: String(documentNumber).trim(),
      documentUrl: documentUrl || undefined,
      selfieUrl: selfieUrl || undefined,
      submittedAt: new Date()
    };
    await user.save();

    await notifyUser({
      userId: user._id,
      title: 'KYC submitted',
      message: 'Your KYC documents were submitted successfully and are waiting for admin review.',
      type: 'system',
      relatedId: user._id
    });

    res.json({
      success: true,
      message: 'KYC submitted successfully. An admin will review your documents shortly.',
      data: { kycStatus: user.kycStatus }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: approve or reject KYC for a user
router.patch('/:id/kyc', authenticate, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const { decision, reason } = req.body;
    const normalizedDecision = String(decision || '').toLowerCase();

    if (!['verified', 'rejected'].includes(normalizedDecision)) {
      return res.status(400).json({
        success: false,
        message: 'decision must be "verified" or "rejected"'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.kycStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot review KYC with status "${user.kycStatus}". Only pending submissions can be reviewed.`
      });
    }

    user.kycStatus = normalizedDecision;
    if (user.kycDocuments) {
      user.kycDocuments.reviewedAt = new Date();
      user.kycDocuments.reviewedBy = req.user._id;
      user.kycDocuments.rejectionReason = normalizedDecision === 'rejected' ? (reason || 'Documents not acceptable') : undefined;
    }
    await user.save();

    // Notify the user of the KYC decision
    try {
      await notifyUser({
        userId: user._id,
        title: normalizedDecision === 'verified' ? 'KYC Approved' : 'KYC Rejected',
        message: normalizedDecision === 'verified'
          ? 'Your identity has been verified. You can now list products and perform seller actions.'
          : `Your KYC was rejected: ${reason || 'Documents not acceptable'}. Please re-submit with valid documents.`,
        type: 'system',
        relatedId: user._id
      });
    } catch { /* best-effort */ }

    res.json({
      success: true,
      message: `KYC ${normalizedDecision} successfully`,
      data: { kycStatus: user.kycStatus, userId: user._id }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
