import mongoose from 'mongoose';
import crypto from 'crypto';
import { softDeletePlugin } from '../utils/softDelete.plugin.js';

const joinRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reminderSentAt: {
    type: Date
  }
});

const communitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Community name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedDate: {
      type: Date,
      default: Date.now
    }
  }],
  discount: {
    type: Number,
    default: 10,
    min: 0,
    max: 100
  },

  // ── New fields ──────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  type: {
    type: String,
    enum: ['farmer_cooperative', 'buyers_club', 'neighborhood', 'restaurant_group', 'other'],
    default: 'other'
  },
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  maxMembers: {
    type: Number,
    default: 100,
    min: 2
  },
  rules: {
    type: String,
    default: ''
  },
  joinRequests: [joinRequestSchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Soft-delete support
communitySchema.plugin(softDeletePlugin);

// ── Indexes ───────────────────────────────────────────────────────────
communitySchema.index({ inviteCode: 1 }, { unique: true, sparse: true });
communitySchema.index({ admin: 1 });
communitySchema.index({ 'members.user': 1 });
communitySchema.index({ status: 1 });

// ── Virtual: pools belonging to this community ────────────────────────
communitySchema.virtual('pools', {
  ref: 'CommunityPool',
  localField: '_id',
  foreignField: 'community'
});

// ── Auto-generate invite code on creation ─────────────────────────────
communitySchema.pre('save', function (next) {
  if (!this.inviteCode) {
    // 8-character URL-safe random code
    this.inviteCode = crypto.randomBytes(6).toString('base64url').slice(0, 8);
  }
  next();
});

export default mongoose.model('Community', communitySchema);
