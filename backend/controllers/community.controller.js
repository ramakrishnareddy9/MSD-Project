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

// Create a new community
export const createCommunity = async (req, res) => {
  try {
    const { name, description, discount } = req.body;

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
      discount: typeof discount === 'number' ? discount : 10
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

// Get all communities available to user
export const getAllCommunities = async (req, res) => {
  try {
    const communities = await Community.find()
      .populate('admin', 'name email')
      .populate('members.user', 'name email');
    res.json({ success: true, data: { communities } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get communities user has joined
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

// Get communities managed by the current user
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

// Join a community
export const joinCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }
    
    // Check if already a member
    const isMember = community.members.some(
      m => m.user.toString() === req.user._id.toString()
    );
    if (isMember) {
      return res.status(400).json({ success: false, message: 'Already a member' });
    }

    community.members.push({ user: req.user._id });
    await community.save();
    
    res.json({ success: true, message: 'Joined community', data: { community } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Leave a community
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

      await Promise.all([
        CommunityPool.deleteMany({ community: community._id }),
        ChatMessage.deleteMany({ community: community._id }),
        Community.findByIdAndDelete(community._id)
      ]);

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

// Transfer community ownership
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

// Delete a community
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

    await Promise.all([
      CommunityPool.deleteMany({ community: community._id }),
      ChatMessage.deleteMany({ community: community._id }),
      CommunityAnnouncement.deleteMany({ community: community._id }),
      Community.findByIdAndDelete(community._id)
    ]);

    return res.json({ success: true, message: 'Community deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get announcements for a community (members only)
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

// Create announcement (community admin only)
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

// Get pools for a community
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

// List eligible farmers for a community pool (members only)
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

// Contribute to a pool
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

// Contribute to a pool by community + product (upsert pool if missing)
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

// Place bulk order from community pool to farmer (admin only)
export const orderPoolFromFarmer = async (req, res) => {
  try {
    const { farmerId, vehicleId } = req.body || {};

    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    if (community.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only community admin can place bulk orders' });
    }

    const pool = await CommunityPool.findOne({
      _id: req.params.poolId,
      community: req.params.id
    }).populate('product');

    if (!pool) {
      return res.status(404).json({ success: false, message: 'Community pool not found' });
    }

    if (pool.status === 'ordered' || pool.status === 'delivered' || pool.status === 'allocated') {
      return res.status(400).json({ success: false, message: `Pool is already in ${pool.status} state` });
    }

    if (Number(pool.minBulkQty || 0) < COMMUNITY_MIN_BULK_QTY) {
      pool.minBulkQty = COMMUNITY_MIN_BULK_QTY;
    }

    if (pool.totalQty < pool.minBulkQty) {
      return res.status(400).json({
        success: false,
        message: 'Pool has not reached minimum bulk quantity yet'
      });
    }

    if (!vehicleId) {
      return res.status(400).json({ success: false, message: 'vehicleId is required for community bulk order delivery' });
    }

    const productQuery = buildPoolFarmerProductsQuery(pool.product);
    if (!productQuery) {
      return res.status(400).json({ success: false, message: 'Pool product is invalid' });
    }

    const candidateProducts = await Product.find(productQuery)
      .populate('ownerId', 'name email phone roles status')
      .sort({ basePrice: 1, createdAt: -1 });

    const eligibleProducts = candidateProducts.filter((product) => {
      const owner = product.ownerId;
      return owner && owner.status === 'active' && owner.roles?.includes('farmer');
    });

    if (!eligibleProducts.length) {
      return res.status(400).json({ success: false, message: 'No eligible farmers found for this community pool order' });
    }

    let product = null;

    if (farmerId) {
      product = eligibleProducts.find(
        (candidate) => String(candidate.ownerId?._id || candidate.ownerId) === String(farmerId)
      );

      if (!product) {
        return res.status(400).json({ success: false, message: 'Selected farmer is not eligible for this pool product' });
      }
    } else if (eligibleProducts.length === 1) {
      product = eligibleProducts[0];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Multiple farmers are available. Please select a farmer before placing this order.'
      });
    }

    const ownerRoles = product.ownerId?.roles || [];
    if (!ownerRoles.includes('farmer')) {
      return res.status(400).json({ success: false, message: 'Bulk order can be placed only with a farmer-owned crop product' });
    }

    const vehicle = await Vehicle.findById(vehicleId).populate('owner', 'roles status name email');
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Selected delivery vehicle was not found' });
    }

    const vehicleOwnerRoles = vehicle.owner?.roles || [];
    const isDeliveryPartnerVehicle = vehicleOwnerRoles.some((role) => ['delivery', 'delivery_large', 'delivery_small'].includes(role));
    const isOwnerActive = vehicle.owner?.status === 'active';
    if (!isDeliveryPartnerVehicle || !isOwnerActive) {
      return res.status(400).json({ success: false, message: 'Selected vehicle must belong to an active delivery partner' });
    }

    if (vehicle.status !== 'Available') {
      return res.status(400).json({ success: false, message: 'Selected delivery vehicle is not currently available' });
    }

    if (Number(vehicle.capacity || 0) < Number(pool.totalQty || 0)) {
      return res.status(400).json({
        success: false,
        message: `Selected vehicle capacity (${Number(vehicle.capacity || 0)} kg) is less than pool quantity (${Number(pool.totalQty || 0)} kg)`
      });
    }

    const totalAmount = (pool.contributions || []).reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const contributorIds = [
      ...new Set(
        (pool.contributions || [])
          .map((contribution) => String(contribution.member || '').trim())
          .filter(Boolean)
      )
    ];
    const offeredPrice = pool.totalQty > 0
      ? Number((totalAmount / pool.totalQty).toFixed(2))
      : Number(product.basePrice ?? product.price ?? 0);

    const marketplaceRequest = await MarketplaceRequest.create({
      requesterId: req.user._id,
      requesterRole: req.user.roles?.[0] || 'community',
      requesterType: 'community',
      productId: product._id,
      cropName: product.name,
      quantity: Number(pool.totalQty),
      unit: product.unit || 'kg',
      offeredPrice,
      currentOfferPrice: offeredPrice,
      lastOfferedBy: 'buyer',
      buyerAccepted: true,
      farmerAccepted: false,
      negotiationHistory: [{
        offeredBy: 'buyer',
        price: offeredPrice,
        message: `Community bulk order placed for ${pool.totalQty} ${product.unit || 'kg'}`
      }],
      location: 'India',
      notes: `Community ${community.name} bulk order from pool ${pool._id}`,
      status: 'open',
      matchedFarmerId: product.ownerId?._id || product.ownerId,
      communityContext: {
        communityId: community._id,
        poolId: pool._id,
        contributorIds
      },
      delivery: {
        requestedVehicleId: vehicle._id,
        requestedPartnerId: vehicle.owner?._id || vehicle.owner,
        requestedAt: new Date(),
        requestStatus: 'requested'
      }
    });

    pool.status = 'ordered';
    pool.assignedFarmer = product.ownerId?._id || product.ownerId;
    pool.assignedVehicle = vehicle._id;
    pool.assignedDeliveryPartner = vehicle.owner?._id || vehicle.owner;
    pool.deliveryRequestedAt = new Date();
    pool.deliveryRequestStatus = 'requested';
    pool.deliveredAt = undefined;
    await pool.save();
    await pool.populate('assignedFarmer', 'name email');

    await Promise.all([
      notifyUser({
        userId: product.ownerId?._id || product.ownerId,
        title: 'New community bulk order',
        message: `${community.name} placed a bulk order for ${product.name} (${pool.totalQty} ${product.unit || 'kg'}).`,
        type: 'order',
        relatedId: marketplaceRequest._id
      }),
      notifyUsers((community.members || []).map((member) => member.user), {
        title: 'Bulk order placed',
        message: `Community admin placed a bulk order to farmer for ${product.name} and requested vehicle ${vehicle.name}.`,
        type: 'order',
        relatedId: marketplaceRequest._id
      }),
      notifyUser({
        userId: vehicle.owner?._id || vehicle.owner,
        title: 'Community delivery vehicle requested',
        message: `${community.name} requested your vehicle ${vehicle.name} for ${product.name} (${pool.totalQty} ${product.unit || 'kg'}).`,
        type: 'delivery',
        relatedId: marketplaceRequest._id
      })
    ]);

    return res.json({
      success: true,
      message: 'Bulk order has been sent to farmer successfully',
      data: { pool, request: marketplaceRequest }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get community chat
export const getCommunityChat = async (req, res) => {
  try {
    const messages = await ChatMessage.find({ community: req.params.id })
      .populate('sender', 'name')
      .sort('createdAt');
    res.json({ success: true, data: { messages } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send chat message
export const sendChatMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const msg = new ChatMessage({
      community: req.params.id,
      sender: req.user._id,
      message
    });
    await msg.save();
    await msg.populate('sender', 'name');
    
    res.json({ success: true, data: { message: msg } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
