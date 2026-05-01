import Community from '../models/Community.model.js';
import CommunityPool from '../models/CommunityPool.model.js';
import ChatMessage from '../models/ChatMessage.model.js';
import CommunityAnnouncement from '../models/CommunityAnnouncement.model.js';
import Product from '../models/Product.model.js';
import MarketplaceRequest from '../models/MarketplaceRequest.model.js';
import Vehicle from '../models/Vehicle.model.js';
import { notifyUser, notifyUsers } from '../utils/notification.util.js';

const COMMUNITY_MIN_BULK_QTY = 50;

const buildPoolFarmerProductsQuery = (poolProduct) => {
  if (!poolProduct) return null;

  const query = {
    status: 'active',
    name: poolProduct.name,
    unit: poolProduct.unit
  };

  if (poolProduct.categoryId) {
    query.categoryId = poolProduct.categoryId;
  }

  return query;
};

// ─── Create a new community ──────────────────────────────────────────
export const createCommunity = async (req, res) => {
  try {
    const { name, description, discount, type, maxMembers, rules } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Name and description are required'
      });
    }

    const community = await new Community({
      name: name.trim(),
      description: description.trim(),
      admin: req.user._id,
      members: [{ user: req.user._id }],
      discount: typeof discount === 'number' ? discount : 10,
      type: type || 'other',
      maxMembers: typeof maxMembers === 'number' && maxMembers >= 2 ? maxMembers : 100,
      rules: rules || '',
      status: 'active'
    }).save();

    await community.populate('admin', 'name email');
    await community.populate('members.user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Community created successfully',
      data: { community }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get all communities available to user ───────────────────────────
export const getAllCommunities = async (req, res) => {
  try {
    const communities = await Community.find({ status: 'active' })
      .populate('admin', 'name email')
      .populate('members.user', 'name email');
    res.json({ success: true, data: { communities } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get communities user has joined ─────────────────────────────────
export const getMyCommunities = async (req, res) => {
  try {
    const communities = await Community.find({ 'members.user': req.user._id })
      .populate('admin', 'name email')
      .populate('members.user', 'name email');
    res.json({ success: true, data: { communities } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get communities managed by the current user ─────────────────────
export const getMyAdminCommunities = async (req, res) => {
  try {
    const communities = await Community.find({ admin: req.user._id })
      .populate('admin', 'name email phone roles')
      .populate('members.user', 'name email phone roles');

    res.json({ success: true, data: { communities } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Join a community (direct — adds join request for admin approval) ─
export const joinCommunity = async (req, res) => {
  try {
    const { message } = req.body;
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    if (community.status !== 'active') {
      return res.status(400).json({ success: false, message: 'This community is not accepting new members' });
    }

    // Check if already a member
    const isMember = community.members.some(
      m => m.user.toString() === req.user._id.toString()
    );
    if (isMember) {
      return res.status(400).json({ success: false, message: 'Already a member' });
    }

    // Check max members
    if (community.members.length >= community.maxMembers) {
      return res.status(400).json({ success: false, message: 'Community has reached its maximum member capacity' });
    }

    // Check if already has a pending request
    const hasPendingRequest = community.joinRequests.some(
      jr => jr.user.toString() === req.user._id.toString() && jr.status === 'pending'
    );
    if (hasPendingRequest) {
      return res.status(400).json({ success: false, message: 'You already have a pending join request' });
    }

    community.joinRequests.push({
      user: req.user._id,
      message: message || '',
      status: 'pending'
    });
    await community.save();

    // Notify community admin
    await notifyUser({
      userId: community.admin,
      title: 'New join request',
      message: `${req.user.name || 'A user'} wants to join ${community.name}.`,
      type: 'alert',
      relatedId: community._id
    });

    res.json({ success: true, message: 'Join request submitted. Awaiting admin approval.', data: { community } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Join by invite code (direct add, no approval needed) ────────────
export const joinByInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ success: false, message: 'Invite code is required' });
    }

    const community = await Community.findOne({ inviteCode: inviteCode.trim() });
    if (!community) {
      return res.status(404).json({ success: false, message: 'Invalid invite code' });
    }

    if (community.status !== 'active') {
      return res.status(400).json({ success: false, message: 'This community is not accepting new members' });
    }

    const isMember = community.members.some(
      m => m.user.toString() === req.user._id.toString()
    );
    if (isMember) {
      return res.status(400).json({ success: false, message: 'Already a member' });
    }

    if (community.members.length >= community.maxMembers) {
      return res.status(400).json({ success: false, message: 'Community has reached its maximum member capacity' });
    }

    community.members.push({ user: req.user._id });
    await community.save();

    await community.populate('admin', 'name email');
    await community.populate('members.user', 'name email');

    // Notify admin
    await notifyUser({
      userId: community.admin,
      title: 'New member joined',
      message: `${req.user.name || 'A user'} joined ${community.name} via invite code.`,
      type: 'alert',
      relatedId: community._id
    });

    res.json({ success: true, message: 'Joined community successfully', data: { community } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Lookup community by invite code ─────────────────────────────────
export const getCommunityByInviteCode = async (req, res) => {
  try {
    const community = await Community.findOne({ inviteCode: req.params.code, status: 'active' })
      .populate('admin', 'name email')
      .select('name description type admin members.length discount maxMembers');

    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found or inactive' });
    }

    res.json({
      success: true,
      data: {
        community: {
          _id: community._id,
          name: community.name,
          description: community.description,
          type: community.type,
          admin: community.admin,
          memberCount: community.members?.length || 0,
          maxMembers: community.maxMembers,
          discount: community.discount
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Review a join request (admin only) ──────────────────────────────
export const reviewJoinRequest = async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be "approve" or "reject"' });
    }

    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    if (community.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only community admin can review join requests' });
    }

    const joinRequest = community.joinRequests.id(req.params.requestId);
    if (!joinRequest) {
      return res.status(404).json({ success: false, message: 'Join request not found' });
    }

    if (joinRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Join request already ${joinRequest.status}` });
    }

    joinRequest.reviewedAt = new Date();
    joinRequest.reviewedBy = req.user._id;

    if (action === 'approve') {
      if (community.members.length >= community.maxMembers) {
        return res.status(400).json({ success: false, message: 'Community has reached its maximum member capacity' });
      }

      joinRequest.status = 'approved';
      community.members.push({ user: joinRequest.user });

      await notifyUser({
        userId: joinRequest.user,
        title: 'Join request approved',
        message: `Your request to join ${community.name} has been approved!`,
        type: 'system',
        relatedId: community._id
      });
    } else {
      joinRequest.status = 'rejected';

      await notifyUser({
        userId: joinRequest.user,
        title: 'Join request rejected',
        message: `Your request to join ${community.name} has been rejected.`,
        type: 'system',
        relatedId: community._id
      });
    }

    await community.save();

    res.json({
      success: true,
      message: `Join request ${action}d successfully`,
      data: { joinRequest }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Leave a community ──────────────────────────────────────────────
export const leaveCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    const currentUserId = req.user._id.toString();
    const memberIndex = community.members.findIndex(
      (member) => member.user.toString() === currentUserId
    );

    if (memberIndex === -1) {
      return res.status(400).json({ success: false, message: 'You are not a member of this community' });
    }

    const isAdmin = community.admin.toString() === currentUserId;
    const communityName = community.name || 'Community';

    if (isAdmin) {
      const otherMembers = community.members.filter(
        (member) => member.user.toString() !== currentUserId
      );

      if (otherMembers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Admin cannot leave community with active members. Transfer ownership or delete the community first.'
        });
      }

      // Soft-delete the community and related data
      await CommunityPool.softDeleteMany({ community: community._id });
      await community.softDelete();

      await notifyUser({
        userId: req.user._id,
        title: 'Community deleted',
        message: `${communityName} was deleted after you left as the last member.`,
        type: 'system',
        relatedId: community._id
      });

      return res.json({
        success: true,
        message: 'Community deleted because admin left and no members were remaining'
      });
    }

    community.members.splice(memberIndex, 1);
    await community.save();

    await notifyUser({
      userId: community.admin,
      title: 'Member left community',
      message: `${req.user.name || 'A member'} left ${communityName}.`,
      type: 'alert',
      relatedId: community._id
    });

    return res.json({ success: true, message: 'You left the community successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Transfer community ownership ───────────────────────────────────
export const transferOwnership = async (req, res) => {
  try {
    const { newAdminId } = req.body;

    if (!newAdminId) {
      return res.status(400).json({ success: false, message: 'newAdminId is required' });
    }

    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    const currentUserId = req.user._id.toString();
    if (community.admin.toString() !== currentUserId) {
      return res.status(403).json({ success: false, message: 'Only current admin can transfer ownership' });
    }

    if (community.admin.toString() === String(newAdminId)) {
      return res.status(400).json({ success: false, message: 'Selected user is already the admin' });
    }

    const isMember = community.members.some(
      (member) => member.user.toString() === String(newAdminId)
    );

    if (!isMember) {
      return res.status(400).json({ success: false, message: 'New admin must be a community member' });
    }

    community.admin = newAdminId;
    await community.save();
    await community.populate('admin', 'name email');
    await community.populate('members.user', 'name email');

    const communityName = community.name || 'Community';
    await Promise.all([
      notifyUser({
        userId: newAdminId,
        title: 'Community ownership transferred',
        message: `You are now the admin of ${communityName}.`,
        type: 'system',
        relatedId: community._id
      }),
      notifyUser({
        userId: req.user._id,
        title: 'Ownership transfer completed',
        message: `You transferred ${communityName} ownership successfully.`,
        type: 'system',
        relatedId: community._id
      })
    ]);

    return res.json({
      success: true,
      message: 'Community ownership transferred successfully',
      data: { community }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Delete a community (soft-delete) ────────────────────────────────
export const deleteCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    if (community.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only community admin can delete this community' });
    }

    const communityName = community.name || 'Community';
    const memberIds = (community.members || []).map((member) => member.user);

    await notifyUsers(memberIds, {
      title: 'Community deleted',
      message: `${communityName} has been deleted by the admin.`,
      type: 'alert',
      relatedId: community._id
    });

    // Soft-delete community and related pools
    await CommunityPool.softDeleteMany({ community: community._id });
    await community.softDelete();

    return res.json({ success: true, message: 'Community deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get announcements for a community (members only) ────────────────
export const getCommunityAnnouncements = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    const isMember = (community.members || []).some(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'You are not a member of this community' });
    }

    const announcements = await CommunityAnnouncement.find({ community: community._id })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ success: true, data: { announcements } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Create announcement (community admin only) ─────────────────────
export const createCommunityAnnouncement = async (req, res) => {
  try {
    const { title, message, type = 'info', notifyMembers = true } = req.body;

    if (!title || !String(title).trim() || !message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'title and message are required' });
    }

    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    if (community.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only community admin can create announcements' });
    }

    const announcement = await CommunityAnnouncement.create({
      community: community._id,
      createdBy: req.user._id,
      title: String(title).trim(),
      message: String(message).trim(),
      type
    });

    await announcement.populate('createdBy', 'name email');

    if (notifyMembers) {
      const memberIds = (community.members || [])
        .map((member) => member.user)
        .filter((userId) => userId.toString() !== req.user._id.toString());

      await notifyUsers(memberIds, {
        title: `Announcement: ${String(title).trim()}`,
        message: `${community.name}: ${String(message).trim().slice(0, 180)}`,
        type: 'message',
        relatedId: announcement._id
      });
    }

    return res.status(201).json({
      success: true,
      message: notifyMembers
        ? 'Announcement posted and notifications sent successfully'
        : 'Announcement posted successfully',
      data: { announcement }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get pools for a community ──────────────────────────────────────
export const getCommunityPools = async (req, res) => {
  try {
    const pools = await CommunityPool.find({ community: req.params.id })
      .populate({ path: 'product', populate: { path: 'ownerId', select: 'name email' } })
      .populate('assignedFarmer', 'name email')
      .populate('assignedVehicle', 'name type capacity status plateNumber')
      .populate('assignedDeliveryPartner', 'name email phone')
      .populate('contributions.member', 'name email');

    let hasUpdates = false;
    pools.forEach((pool) => {
      const normalizedMinBulkQty = Math.max(COMMUNITY_MIN_BULK_QTY, Number(pool.minBulkQty || 0));
      if (Number(pool.minBulkQty || 0) !== normalizedMinBulkQty) {
        pool.minBulkQty = normalizedMinBulkQty;
        hasUpdates = true;
      }

      if (['collecting', 'ready'].includes(pool.status)) {
        const shouldBeReady = Number(pool.totalQty || 0) >= normalizedMinBulkQty;
        const expectedStatus = shouldBeReady ? 'ready' : 'collecting';
        if (pool.status !== expectedStatus) {
          pool.status = expectedStatus;
          hasUpdates = true;
        }
      }
    });

    if (hasUpdates) {
      await Promise.all(pools.filter((pool) => pool.isModified()).map((pool) => pool.save()));
    }

    res.json({ success: true, data: { pools } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── List eligible farmers for a community pool (members only) ──────
export const getPoolFarmers = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    const isMember = (community.members || []).some(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'You are not a member of this community' });
    }

    const pool = await CommunityPool.findOne({
      _id: req.params.poolId,
      community: req.params.id
    }).populate('product');

    if (!pool) {
      return res.status(404).json({ success: false, message: 'Community pool not found' });
    }

    const productQuery = buildPoolFarmerProductsQuery(pool.product);
    if (!productQuery) {
      return res.status(400).json({ success: false, message: 'Pool product is invalid' });
    }

    const candidateProducts = await Product.find(productQuery)
      .populate('ownerId', 'name email phone roles status')
      .sort({ basePrice: 1, createdAt: -1 });

    const farmersMap = new Map();

    candidateProducts.forEach((product) => {
      const owner = product.ownerId;
      if (!owner || owner.status !== 'active' || !owner.roles?.includes('farmer')) {
        return;
      }

      const farmerId = String(owner._id);
      const mappedEntry = {
        farmerId,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        productId: String(product._id),
        price: Number(product.basePrice || 0),
        unit: product.unit,
        stockQuantity: Number(product.stockQuantity || 0),
        minOrderQuantity: Number(product.minOrderQuantity || 1)
      };

      const existing = farmersMap.get(farmerId);
      if (!existing || mappedEntry.price < existing.price) {
        farmersMap.set(farmerId, mappedEntry);
      }
    });

    const farmers = Array.from(farmersMap.values()).sort((a, b) => a.price - b.price);

    return res.json({
      success: true,
      data: {
        farmers,
        poolId: String(pool._id),
        product: {
          id: String(pool.product?._id || ''),
          name: pool.product?.name,
          unit: pool.product?.unit
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Contribute to a pool ───────────────────────────────────────────
export const contributeToPool = async (req, res) => {
  try {
    const { qty, amount } = req.body;
    const pool = await CommunityPool.findById(req.params.poolId);
    if (!pool) {
      return res.status(404).json({ success: false, message: 'Pool not found' });
    }

    if (['ordered', 'delivered', 'allocated'].includes(pool.status)) {
      return res.status(400).json({
        success: false,
        message: `This pool is already ${pool.status}. New contributions are not allowed.`
      });
    }

    if (Number(pool.minBulkQty || 0) < COMMUNITY_MIN_BULK_QTY) {
      pool.minBulkQty = COMMUNITY_MIN_BULK_QTY;
    }

    pool.contributions.push({
      member: req.user._id,
      qty,
      amount
    });
    
    pool.totalQty += qty;
    
    if (pool.totalQty >= pool.minBulkQty && pool.status === 'collecting') {
      pool.status = 'ready';
    }

    await pool.save();
    
    res.json({ success: true, message: 'Contribution added', data: { pool } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Contribute to a pool by community + product (upsert pool if missing)
export const contributeToCommunityPool = async (req, res) => {
  try {
    const { productId, qty, amount, minBulkQty } = req.body;

    if (!productId || !qty || Number(qty) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'productId and qty (> 0) are required'
      });
    }

    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    const isMember = community.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'You are not a member of this community' });
    }

    let pool = await CommunityPool.findOne({
      community: req.params.id,
      product: productId
    });

    if (!pool) {
      pool = await CommunityPool.create({
        community: req.params.id,
        product: productId,
        minBulkQty: Math.max(
          COMMUNITY_MIN_BULK_QTY,
          Number(minBulkQty) > 0 ? Number(minBulkQty) : COMMUNITY_MIN_BULK_QTY
        ),
        totalQty: 0,
        status: 'collecting',
        contributions: []
      });
    }

    if (['ordered', 'delivered', 'allocated'].includes(pool.status)) {
      return res.status(400).json({
        success: false,
        message: `This pool is already ${pool.status}. New contributions are not allowed.`
      });
    }

    if (Number(pool.minBulkQty || 0) < COMMUNITY_MIN_BULK_QTY) {
      pool.minBulkQty = COMMUNITY_MIN_BULK_QTY;
    }

    const normalizedQty = Number(qty);
    const normalizedAmount = Number(amount) || 0;

    pool.contributions.push({
      member: req.user._id,
      qty: normalizedQty,
      amount: normalizedAmount
    });

    pool.totalQty += normalizedQty;

    if (pool.totalQty >= pool.minBulkQty && pool.status === 'collecting') {
      pool.status = 'ready';
    }

    await pool.save();
    await pool.populate('product');
    await pool.populate('contributions.member', 'name email');

    res.json({ success: true, message: 'Contribution added', data: { pool } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Place a bulk order from a pool with a selected farmer ────────────────
export const orderPoolFromFarmer = async (req, res) => {
  try {
    const { farmerId, vehicleId } = req.body;

    if (!farmerId) {
      return res.status(400).json({
        success: false,
        message: 'farmerId is required'
      });
    }

    const community = await Community.findById(req.params.id).select('admin members name');
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    if (community.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only community admin can place pool orders'
      });
    }

    const pool = await CommunityPool.findOne({
      _id: req.params.poolId,
      community: req.params.id
    }).populate('product');

    if (!pool) {
      return res.status(404).json({ success: false, message: 'Community pool not found' });
    }

    if (pool.status !== 'ready') {
      return res.status(400).json({
        success: false,
        message: 'Pool is not ready for ordering yet'
      });
    }

    if (Number(pool.totalQty || 0) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Pool has no quantity to order'
      });
    }

    const productQuery = buildPoolFarmerProductsQuery(pool.product);
    if (!productQuery) {
      return res.status(400).json({ success: false, message: 'Pool product is invalid' });
    }

    const farmerProduct = await Product.findOne({
      ...productQuery,
      ownerId: farmerId
    }).populate('ownerId', 'name email');

    if (!farmerProduct) {
      return res.status(400).json({
        success: false,
        message: 'Selected farmer does not have an active matching product'
      });
    }

    let vehicle = null;
    if (vehicleId) {
      vehicle = await Vehicle.findById(vehicleId).populate('owner', 'name email');
      if (!vehicle) {
        return res.status(404).json({ success: false, message: 'Vehicle not found' });
      }
      if (vehicle.status !== 'Available') {
        return res.status(400).json({
          success: false,
          message: 'Selected vehicle is not available'
        });
      }
    }

    const contributorIds = (pool.contributions || []).map((entry) => entry.member);

    const request = await MarketplaceRequest.create({
      requesterId: req.user._id,
      requesterRole: 'community',
      requesterType: 'community',
      cropName: farmerProduct.name,
      productId: farmerProduct._id,
      quantity: Number(pool.totalQty || 0),
      unit: farmerProduct.unit || 'kg',
      offeredPrice: Number(farmerProduct.basePrice || 0),
      currentOfferPrice: Number(farmerProduct.basePrice || 0),
      lastOfferedBy: 'buyer',
      buyerAccepted: true,
      farmerAccepted: false,
      status: 'open',
      matchedFarmerId: farmerId,
      communityContext: {
        communityId: community._id,
        poolId: pool._id,
        contributorIds
      },
      delivery: {
        requestedVehicleId: vehicle ? vehicle._id : undefined,
        requestedPartnerId: vehicle?.owner?._id,
        requestedAt: vehicle ? new Date() : undefined,
        requestStatus: vehicle ? 'requested' : 'none'
      },
      notes: `Community bulk order from ${community.name}`
    });

    pool.status = 'ordered';
    pool.assignedFarmer = farmerId;
    if (vehicle) {
      pool.assignedVehicle = vehicle._id;
      pool.assignedDeliveryPartner = vehicle.owner?._id;
      pool.deliveryRequestedAt = new Date();
      pool.deliveryRequestStatus = 'requested';
    }
    await pool.save();

    await notifyUser({
      userId: farmerId,
      title: 'New community pool order',
      message: `${community.name} placed a bulk order for ${farmerProduct.name}.`,
      type: 'order',
      relatedId: request._id
    });

    if (vehicle?.owner?._id) {
      await notifyUser({
        userId: vehicle.owner._id,
        title: 'Vehicle assigned for delivery',
        message: `Your vehicle ${vehicle.name || vehicle.plateNumber || ''} has been requested for a community delivery.`,
        type: 'alert',
        relatedId: request._id
      });
    }

    await pool.populate('assignedFarmer', 'name email phone');
    await pool.populate('assignedVehicle', 'name type capacity status plateNumber');

    return res.json({
      success: true,
      message: 'Bulk order sent to farmer successfully',
      data: {
        pool,
        request
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get chat messages for a community ─────────────────────────────────────
export const getCommunityChat = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id).select('admin members');
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    const currentUserId = req.user._id.toString();
    const isAdmin = community.admin.toString() === currentUserId;
    const isMember = (community.members || []).some(
      (member) => member.user.toString() === currentUserId
    );

    if (!isAdmin && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this community'
      });
    }

    const messages = await ChatMessage.find({ community: req.params.id })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 })
      .limit(200);

    return res.json({ success: true, data: { messages } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Send a chat message to a community ────────────────────────────────────
export const sendChatMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const community = await Community.findById(req.params.id).select('admin members');
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    const currentUserId = req.user._id.toString();
    const isAdmin = community.admin.toString() === currentUserId;
    const isMember = (community.members || []).some(
      (member) => member.user.toString() === currentUserId
    );

    if (!isAdmin && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this community'
      });
    }

    const chatMessage = await ChatMessage.create({
      community: community._id,
      sender: req.user._id,
      message: String(message).trim()
    });

    await chatMessage.populate('sender', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: chatMessage }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
