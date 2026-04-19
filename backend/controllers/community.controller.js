import Community from '../models/Community.model.js';
import CommunityPool from '../models/CommunityPool.model.js';
import ChatMessage from '../models/ChatMessage.model.js';

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

// Get pools for a community
export const getCommunityPools = async (req, res) => {
  try {
    const pools = await CommunityPool.find({ community: req.params.id })
      .populate('product')
      .populate('contributions.member', 'name email');
    res.json({ success: true, data: { pools } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
        minBulkQty: Number(minBulkQty) > 0 ? Number(minBulkQty) : 50,
        totalQty: 0,
        status: 'collecting',
        contributions: []
      });
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
