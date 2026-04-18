import User from '../models/User.model.js';
import Order from '../models/Order.model.js';
import Payment from '../models/Payment.model.js';
import Product from '../models/Product.model.js';
import Commission from '../models/Commission.model.js';

// @desc    Get platform dashboard metrics
// @route   GET /api/analytics/dashboard
// @access  Admin only
export const getDashboardMetrics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    
    // Calculate total revenue (sum of all order totals)
    const revenueData = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' }
        }
      }
    ]);
    
    const totalRevenue = revenueData[0]?.totalRevenue || 0;
    const avgOrderValue = revenueData[0]?.avgOrderValue || 0;
    
    // Recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email');
    
    // Orders by status
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Users by role
    const usersByRole = await User.aggregate([
      {
        $unwind: '$roles'
      },
      {
        $group: {
          _id: '$roles',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Top sellers (by number of orders)
    const topSellers = await Order.aggregate([
      {
        $group: {
          _id: '$sellerId',
          orderCount: { $sum: 1 },
          totalSales: { $sum: '$total' }
        }
      },
      { $sort: { orderCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'seller'
        }
      },
      { $unwind: '$seller' },
      {
        $project: {
          _id: '$seller._id',
          name: '$seller.name',
          email: '$seller.email',
          orderCount: 1,
          totalSales: 1
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalOrders,
        totalProducts,
        totalRevenue,
        avgOrderValue,
        recentOrders,
        ordersByStatus,
        usersByRole,
        topSellers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user profile metrics
// @route   GET /api/analytics/user/:userId
// @access  Private
export const getUserMetrics = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // As buyer
    const ordersAsBuyer = await Order.countDocuments({ buyerId: userId });
    const totalSpent = await Order.aggregate([
      { $match: { buyerId: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    // As seller
    const ordersAsSeller = await Order.countDocuments({ sellerId: userId });
    const totalEarned = await Order.aggregate([
      { $match: { sellerId: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    const products = await Product.countDocuments({ ownerId: userId });
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          roles: user.roles
        },
        buyerMetrics: {
          totalOrders: ordersAsBuyer,
          totalSpent: totalSpent[0]?.total || 0
        },
        sellerMetrics: {
          totalOrders: ordersAsSeller,
          totalEarned: totalEarned[0]?.total || 0,
          totalProducts: products
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get revenue metrics
// @route   GET /api/analytics/revenue
// @access  Admin only
export const getRevenueMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const revenues = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          dailyRevenue: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const totalRevenue = await Order.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        dailyRevenues: revenues
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get order analytics
// @route   GET /api/analytics/orders
// @access  Admin or Seller
export const getOrderAnalytics = async (req, res) => {
  try {
    const { sellerId } = req.query;
    
    const query = sellerId ? { sellerId: sellerId } : {};
    
    const ordersByStatus = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const ordersByType = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const avgOrderValue = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          avgValue: { $avg: '$total' },
          minValue: { $min: '$total' },
          maxValue: { $max: '$total' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        ordersByStatus,
        ordersByType,
        avgOrderValue: avgOrderValue[0] || { avgValue: 0, minValue: 0, maxValue: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get product analytics
// @route   GET /api/analytics/products
// @access  Admin or Seller
export const getProductAnalytics = async (req, res) => {
  try {
    const { ownerId } = req.query;
    
    const query = ownerId ? { ownerId: ownerId } : {};
    
    const products = await Product.countDocuments(query);
    const activeProducts = await Product.countDocuments({ ...query, status: 'active' });
    
    // Most ordered products
    const topProducts = await Order.aggregate([
      { $unwind: '$orderItems' },
      {
        $group: {
          _id: '$orderItems.productId',
          totalOrdered: { $sum: '$orderItems.quantity' },
          totalRevenue: { $sum: '$orderItems.totalPrice' }
        }
      },
      { $sort: { totalOrdered: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: '$product._id',
          name: '$product.name',
          totalOrdered: 1,
          totalRevenue: 1
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalProducts: products,
        activeProducts: activeProducts,
        topProducts: topProducts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
