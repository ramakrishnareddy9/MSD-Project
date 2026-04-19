import User from '../models/User.model.js';
import FarmerProfile from '../models/FarmerProfile.model.js';
import BusinessProfile from '../models/BusinessProfile.model.js';
import RestaurantProfile from '../models/RestaurantProfile.model.js';
import DeliveryProfile from '../models/DeliveryProfile.model.js';
import TravelAgencyProfile from '../models/TravelAgencyProfile.model.js';
import jwt from 'jsonwebtoken';

export const register = async (req, res) => {
  let createdUserId = null;
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Server authentication is not configured'
      });
    }

    const { email, phone, password, name, roles, profileData, address, city } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = String(phone || '').trim();
    const normalizedName = String(name || '').trim();
    const safeRoles = Array.isArray(roles) && roles.length > 0 ? [...new Set(roles)] : ['customer'];

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { phone: normalizedPhone }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }

    const defaultRole = safeRoles[0] || 'customer';
    const farmerDefaults = {
      farmName: profileData?.farmer?.farmName || `${normalizedName}'s Farm`,
      totalLand: profileData?.farmer?.totalLand || '',
      experience: profileData?.farmer?.experience || ''
    };
    const businessDefaults = {
      businessType: profileData?.business?.businessType || 'Business',
      owner: profileData?.business?.owner || normalizedName,
      gst: profileData?.business?.gst || profileData?.business?.gstNumber || ''
    };
    const restaurantDefaults = {
      businessType: profileData?.restaurant?.businessType || 'Restaurant'
    };
    const deliveryDefaults = {
      accountType: safeRoles.includes('delivery_large') ? 'Large-Scale Transporter' : safeRoles.includes('delivery_small') ? 'Last-Mile Delivery' : ''
    };

    // Create user
    const user = new User({
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash: password, // Will be hashed by pre-save hook
      name: normalizedName,
      roles: safeRoles,
      address: String(address || profileData?.address || '').trim(),
      city: String(city || profileData?.city || '').trim(),
      ...(defaultRole === 'farmer' ? farmerDefaults : {}),
      ...(defaultRole === 'business' ? businessDefaults : {}),
      ...(defaultRole === 'restaurant' ? restaurantDefaults : {}),
      ...((defaultRole === 'delivery_large' || defaultRole === 'delivery_small') ? deliveryDefaults : {})
    });

    await user.save();
    createdUserId = user._id;

    // Create profile based on role
    if (safeRoles.length > 0) {
      for (const role of safeRoles) {
        if (role === 'farmer' && profileData?.farmer) {
          await new FarmerProfile({ userId: user._id, ...profileData.farmer }).save();
        } else if (role === 'business' && profileData?.business) {
          await new BusinessProfile({ userId: user._id, ...profileData.business }).save();
        } else if (role === 'restaurant' && profileData?.restaurant) {
          await new RestaurantProfile({ userId: user._id, ...profileData.restaurant }).save();
        } else if (role === 'travel_agency' && profileData?.travelAgency) {
          await new TravelAgencyProfile({ userId: user._id, ...profileData.travelAgency }).save();
        } else if ((role === 'delivery_large' || role === 'delivery_small') && profileData?.delivery) {
          await new DeliveryProfile({ userId: user._id, ...profileData.delivery }).save();
        }
      }
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, roles: user.roles },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user, token }
    });
  } catch (error) {
    if (createdUserId) {
      // Roll back user creation if downstream profile creation failed.
      try {
        await User.findByIdAndDelete(createdUserId);
      } catch {
        // Best-effort rollback; preserve original error response below.
      }
    }

    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Server authentication is not configured'
      });
    }

    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check status
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended'
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, roles: user.roles },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: { user, token }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const me = async (req, res) => {
  try {
    res.json({
      success: true,
      data: { user: req.user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
