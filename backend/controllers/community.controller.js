import Community from '../models/Community.model.js';
import CommunityPool from '../models/CommunityPool.model.js';
import ChatMessage from '../models/ChatMessage.model.js';

// Get all communities available to user
export const getAllCommunities = async (req, res) => {
  try {
    const communities = await Community.find();
    res.json({ success: true, data: { communities } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get communities user has joined
export const getMyCommunities = async (req, res) => {
  try {
    const communities = await Community.find({ 'members.user': req.user._id });
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
