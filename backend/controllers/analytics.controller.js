import User from '../models/User.model.js';
import Order from '../models/Order.model.js';
import Payment from '../models/Payment.model.js';
import Product from '../models/Product.model.js';
import Commission from '../models/Commission.model.js';
import InventoryLot from '../models/InventoryLot.model.js';
import mongoose from 'mongoose';

const canAccessUserMetrics = (requestUser, targetUserId) => {
  if (!requestUser) {
    return false;
  }

  if (requestUser.roles?.includes('admin')) {
    return true;
  }

  return String(requestUser._id) === String(targetUserId);
};

// @desc    Get platform dashboard metrics
// @route   GET /api/analytics/dashboard
// @access  Admin only
export const getDashboardMetrics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    
    // Calculate realized revenue from completed orders only.
    const revenueData = await Order.aggregate([
      {
        $match: { status: 'delivered' }
      },
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

    if (!canAccessUserMetrics(req.user, userId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this user metrics data'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // As buyer: only count delivered orders as "spent" (exclude cancelled/pending)
    const ordersAsBuyer = await Order.countDocuments({
      buyerId: userId,
      status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
    });
    const totalSpent = await Order.aggregate([
      {
        $match: {
          buyerId: new mongoose.Types.ObjectId(userId),
          status: { $in: ['delivered'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // As seller: only count delivered orders as "earned"
    const ordersAsSeller = await Order.countDocuments({
      sellerId: userId,
      status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
    });
    const totalEarned = await Order.aggregate([
      {
        $match: {
          sellerId: new mongoose.Types.ObjectId(userId),
          status: { $in: ['delivered'] }
        }
      },
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
    
    // Revenue is only recognized from orders that have been delivered.
    // Cancelled/pending/processing orders must NEVER be counted as revenue.
    const revenueStatusFilter = { status: { $in: ['delivered'] } };

    const revenues = await Order.aggregate([
      { $match: { ...query, ...revenueStatusFilter } },
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

    // Also compute pipeline (confirmed + processing + shipped) for visibility
    const pipelineRevenue = await Order.aggregate([
      { $match: { ...query, status: { $in: ['confirmed', 'processing', 'shipped'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const totalRevenue = await Order.aggregate([
      { $match: { ...query, ...revenueStatusFilter } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        pipelineRevenue: pipelineRevenue[0]?.total || 0,
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

    const isAdmin = req.user.roles?.includes('admin');
    const effectiveSellerId = sellerId || (isAdmin ? null : req.user._id);

    if (!isAdmin && sellerId && String(sellerId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access another seller\'s analytics'
      });
    }

    const query = effectiveSellerId
      ? { sellerId: new mongoose.Types.ObjectId(effectiveSellerId) }
      : {};
    
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

const getDateLabel = (value) => new Date(value).toISOString().slice(0, 7);

export const getFarmerAnalytics = async (req, res) => {
  try {
    const sellerId = req.query.sellerId || req.user._id;
    if (!req.user.roles?.includes('admin') && String(req.user._id) !== String(sellerId)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to access this farmer analytics data' });
    }

    const since = new Date();
    since.setMonth(since.getMonth() - 12);

    const cropPriceTrend = await Order.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(sellerId), status: 'delivered', createdAt: { $gte: since } } },
      { $unwind: '$orderItems' },
      {
        $group: {
          _id: {
            crop: '$orderItems.productName',
            month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
          },
          avgPrice: { $avg: '$orderItems.unitPrice' },
          totalQuantity: { $sum: '$orderItems.quantity' }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    const demandForecast = await Order.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(sellerId), status: 'delivered', createdAt: { $gte: since } } },
      { $unwind: '$orderItems' },
      {
        $group: {
          _id: '$orderItems.productName',
          unitsSold: { $sum: '$orderItems.quantity' },
          revenue: { $sum: '$orderItems.totalPrice' }
        }
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 10 }
    ]);

    const earningsVsCommission = await Commission.aggregate([
      {
        $match: {
          sellerId: new mongoose.Types.ObjectId(sellerId),
          status: { $in: ['collected', 'processing', 'paid'] }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: { $ifNull: ['$processedAt', '$createdAt'] } } },
          grossAmount: { $sum: '$orderAmount' },
          commissionAmount: { $sum: '$commissionAmount' },
          payoutAmount: { $sum: '$sellerPayout' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        cropPriceTrend,
        demandForecast,
        earningsVsCommission
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminDeepAnalytics = async (req, res) => {
  try {
    const platformGmv = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, gmv: { $sum: '$total' }, orders: { $sum: 1 } } }
    ]);

    const commissionTotals = await Commission.aggregate([
      { $match: { status: { $in: ['collected', 'processing', 'paid'] } } },
      { $group: { _id: null, commission: { $sum: '$commissionAmount' } } }
    ]);

    const topFarmers = await Order.aggregate([
      { $match: { status: 'delivered' } },
      {
        $group: {
          _id: '$sellerId',
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
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
          revenue: 1,
          orders: 1
        }
      }
    ]);

    const cropByRegion = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $unwind: '$orderItems' },
      {
        $group: {
          _id: {
            region: '$deliveryAddress.state',
            crop: '$orderItems.productName'
          },
          totalOrdered: { $sum: '$orderItems.quantity' },
          totalRevenue: { $sum: '$orderItems.totalPrice' }
        }
      },
      { $sort: { totalOrdered: -1 } },
      { $limit: 20 }
    ]);

    const gmv = platformGmv[0]?.gmv || 0;
    const commission = commissionTotals[0]?.commission || 0;

    res.json({
      success: true,
      data: {
        platformGmv: gmv,
        takeRate: gmv > 0 ? (commission / gmv) * 100 : 0,
        topFarmers,
        cropByRegion
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCustomerAnalytics = async (req, res) => {
  try {
    const userId = req.query.userId || req.user._id;
    if (!req.user.roles?.includes('admin') && String(req.user._id) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to access this customer analytics data' });
    }

    const orderFrequency = await Order.aggregate([
      { $match: { buyerId: new mongoose.Types.ObjectId(userId), status: 'delivered' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          orderCount: { $sum: 1 },
          basketSize: { $avg: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const user = await User.findById(userId).select('loyaltyPoints loyaltyPointsHistory');
    const loyaltyPointsHistory = (user?.loyaltyPointsHistory || []).map((entry) => ({
      points: entry.points,
      reason: entry.reason,
      awardedAt: entry.awardedAt,
      expiresAt: entry.expiresAt
    }));

    const expiryWarnings = loyaltyPointsHistory.filter((entry) => entry.expiresAt && new Date(entry.expiresAt).getTime() <= Date.now() + (14 * 24 * 60 * 60 * 1000));

    res.json({
      success: true,
      data: {
        orderFrequency,
        averageBasketSize: orderFrequency.reduce((sum, bucket) => sum + (bucket.basketSize || 0), 0) / Math.max(orderFrequency.length, 1),
        loyaltyPoints: user?.loyaltyPoints || 0,
        loyaltyPointsHistory,
        expiryWarnings
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInventoryAnalytics = async (req, res) => {
  try {
    const lots = await InventoryLot.aggregate([
      {
        $group: {
          _id: '$productId',
          stockQuantity: { $sum: { $subtract: ['$quantity', '$reservedQuantity'] } },
          earliestExpiry: { $min: '$expiryDate' }
        }
      },
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
          stockQuantity: 1,
          earliestExpiry: 1
        }
      }
    ]);

    const nearExpiryAlerts = await InventoryLot.aggregate([
      {
        $match: {
          expiryDate: {
            $gte: new Date(),
            $lte: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000))
          }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: 1,
          productId: 1,
          productName: '$product.name',
          quantity: 1,
          expiryDate: 1
        }
      }
    ]);

    const recentVelocity = await Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)) } } },
      { $unwind: '$orderItems' },
      {
        $group: {
          _id: '$orderItems.productId',
          unitsSold: { $sum: '$orderItems.quantity' }
        }
      }
    ]);

    const velocityMap = new Map(recentVelocity.map((entry) => [String(entry._id), entry.unitsSold / 30]));
    const stockMap = new Map(lots.map((entry) => [String(entry._id), entry]));

    const reorderSuggestions = lots.map((entry) => {
      const dailyVelocity = velocityMap.get(String(entry._id)) || 0;
      const daysOfStockRemaining = dailyVelocity > 0 ? entry.stockQuantity / dailyVelocity : null;

      return {
        productId: entry._id,
        name: entry.name,
        stockQuantity: entry.stockQuantity,
        daysOfStockRemaining,
        shouldReorder: daysOfStockRemaining != null ? daysOfStockRemaining <= 14 : entry.stockQuantity <= 10
      };
    });

    res.json({
      success: true,
      data: {
        products: lots,
        nearExpiryAlerts,
        reorderSuggestions,
        stockCoverage: Array.from(stockMap.values())
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get GMV (Gross Merchandise Value) analytics by period
// @route   GET /api/analytics/gmv
// @access  Admin only
export const getGMVAnalytics = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query; // daily, weekly, monthly, yearly

    let dateFormat;
    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        dateFormat = '%Y-W%V'; // Week number
        break;
      case 'yearly':
        dateFormat = '%Y';
        break;
      case 'monthly':
      default:
        dateFormat = '%Y-%m';
    }

    // GMV by period
    const gmvByPeriod = await Order.aggregate([
      { $match: { status: 'delivered' } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          gmv: { $sum: '$total' },
          orderCount: { $sum: 1 },
          subtotal: { $sum: '$subtotal' },
          tax: { $sum: '$tax' },
          deliveryFee: { $sum: '$deliveryFee' },
          avgOrderValue: { $avg: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Overall GMV
    const totalGmv = await Order.aggregate([
      { $match: { status: 'delivered' } },
      {
        $group: {
          _id: null,
          gmv: { $sum: '$total' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$total' },
          minOrderValue: { $min: '$total' },
          maxOrderValue: { $max: '$total' }
        }
      }
    ]);

    // GMV by order type
    const gmvByType = await Order.aggregate([
      { $match: { status: 'delivered' } },
      {
        $group: {
          _id: '$type',
          gmv: { $sum: '$total' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$total' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        total: totalGmv[0] || { gmv: 0, orderCount: 0, avgOrderValue: 0 },
        byPeriod: gmvByPeriod,
        byOrderType: gmvByType
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get take rate (commission/GMV) analytics
// @route   GET /api/analytics/take-rate
// @access  Admin only
export const getTakeRateAnalytics = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query; // daily, weekly, monthly, yearly

    let dateFormat;
    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        dateFormat = '%Y-W%V';
        break;
      case 'yearly':
        dateFormat = '%Y';
        break;
      case 'monthly':
      default:
        dateFormat = '%Y-%m';
    }

    // Take rate by period
    const takeRateByPeriod = await Order.aggregate([
      { $match: { status: 'delivered' } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          gmv: { $sum: '$total' },
          commission: { $sum: { $multiply: ['$total', '$commission.rate'] } },
          orderCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 1,
          gmv: 1,
          commission: 1,
          orderCount: 1,
          takeRate: {
            $cond: [{ $gt: ['$gmv', 0] }, { $multiply: [{ $divide: ['$commission', '$gmv'] }, 100] }, 0]
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Overall take rate
    const overallStats = await Order.aggregate([
      { $match: { status: 'delivered' } },
      {
        $group: {
          _id: null,
          gmv: { $sum: '$total' },
          commission: { $sum: { $multiply: ['$total', '$commission.rate'] } }
        }
      },
      {
        $project: {
          gmv: 1,
          commission: 1,
          takeRate: {
            $cond: [{ $gt: ['$gmv', 0] }, { $multiply: [{ $divide: ['$commission', '$gmv'] }, 100] }, 0]
          }
        }
      }
    ]);

    // Take rate by order type
    const takeRateByType = await Order.aggregate([
      { $match: { status: 'delivered' } },
      {
        $group: {
          _id: '$type',
          gmv: { $sum: '$total' },
          commission: { $sum: { $multiply: ['$total', '$commission.rate'] } },
          orderCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 1,
          gmv: 1,
          commission: 1,
          orderCount: 1,
          takeRate: {
            $cond: [{ $gt: ['$gmv', 0] }, { $multiply: [{ $divide: ['$commission', '$gmv'] }, 100] }, 0]
          }
        }
      }
    ]);

    // Commission collection status
    const commissionStatus = await Commission.aggregate([
      {
        $group: {
          _id: '$status',
          amount: { $sum: '$commissionAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        overall: overallStats[0] || { gmv: 0, commission: 0, takeRate: 0 },
        byPeriod: takeRateByPeriod,
        byOrderType: takeRateByType,
        commissionStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get top farmers analytics with earnings trends
// @route   GET /api/analytics/top-farmers
// @access  Admin only
export const getTopFarmersAnalytics = async (req, res) => {
  try {
    const { limit = 10, period = 'monthly' } = req.query;
    const topLimit = Math.min(parseInt(limit) || 10, 50);

    // Top farmers by revenue
    const topFarmers = await Order.aggregate([
      { $match: { status: 'delivered' } },
      {
        $group: {
          _id: '$sellerId',
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$total' },
          totalItems: { $sum: { $size: '$orderItems' } }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: topLimit },
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
          _id: 1,
          name: '$seller.name',
          email: '$seller.email',
          totalRevenue: 1,
          totalOrders: 1,
          avgOrderValue: 1,
          totalItems: 1
        }
      }
    ]);

    // Commission breakdown for top farmers
    const farmerCommissions = await Commission.aggregate([
      { $match: { status: { $in: ['collected', 'processing', 'paid'] } } },
      {
        $group: {
          _id: '$sellerId',
          totalOrderAmount: { $sum: '$orderAmount' },
          totalCommissionCharged: { $sum: '$commissionAmount' },
          totalPayoutAmount: { $sum: '$sellerPayout' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 1,
          totalOrderAmount: 1,
          totalCommissionCharged: 1,
          totalPayoutAmount: 1,
          orderCount: 1,
          effectiveCommissionRate: {
            $cond: [
              { $gt: ['$totalOrderAmount', 0] },
              { $multiply: [{ $divide: ['$totalCommissionCharged', '$totalOrderAmount'] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    const commissionMap = new Map(farmerCommissions.map((f) => [String(f._id), f]));

    // Enrich top farmers with commission data
    const enrichedFarmers = topFarmers.map((farmer) => {
      const commData = commissionMap.get(String(farmer._id)) || {};
      return {
        ...farmer,
        commission: {
          totalCharged: commData.totalCommissionCharged || 0,
          totalPayout: commData.totalPayoutAmount || 0,
          effectiveRate: commData.effectiveCommissionRate || 0
        }
      };
    });

    // Farmer earnings over time (for first 5 top farmers)
    const topFarmerIds = topFarmers.slice(0, 5).map((f) => f._id);
    const earningsTrend = await Order.aggregate([
      { $match: { status: 'delivered', sellerId: { $in: topFarmerIds } } },
      {
        $group: {
          _id: {
            sellerId: '$sellerId',
            period: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
          },
          revenue: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id.sellerId',
          foreignField: '_id',
          as: 'seller'
        }
      },
      { $unwind: '$seller' },
      {
        $project: {
          _id: 1,
          farmerName: '$seller.name',
          revenue: 1,
          orderCount: 1
        }
      },
      { $sort: { '_id.period': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        topFarmers: enrichedFarmers,
        earningsTrend
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get top crops (most-ordered) analytics
// @route   GET /api/analytics/top-crops
// @access  Admin only
export const getTopCropsAnalytics = async (req, res) => {
  try {
    const { limit = 10, sortBy = 'quantity' } = req.query; // sortBy: quantity, revenue
    const topLimit = Math.min(parseInt(limit) || 10, 50);
    const sortField = sortBy === 'revenue' ? 'totalRevenue' : 'totalQuantity';

    // Top crops by quantity and revenue
    const topCrops = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $unwind: '$orderItems' },
      {
        $group: {
          _id: {
            productId: '$orderItems.productId',
            productName: '$orderItems.productName'
          },
          totalQuantity: { $sum: '$orderItems.quantity' },
          totalRevenue: { $sum: '$orderItems.totalPrice' },
          totalTax: { $sum: '$orderItems.taxAmount' },
          avgUnitPrice: { $avg: '$orderItems.unitPrice' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { [sortField]: -1 } },
      { $limit: topLimit },
      {
        $lookup: {
          from: 'products',
          localField: '_id.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: '$_id.productId',
          productName: '$_id.productName',
          category: { $ifNull: ['$product.category', 'Unknown'] },
          totalQuantity: 1,
          totalRevenue: 1,
          totalTax: 1,
          avgUnitPrice: 1,
          orderCount: 1,
          avgQuantityPerOrder: { $divide: ['$totalQuantity', { $max: [1, '$orderCount'] }] }
        }
      }
    ]);

    // Top crops by region
    const topCropsByRegion = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $unwind: '$orderItems' },
      {
        $group: {
          _id: {
            state: '$deliveryAddress.state',
            crop: '$orderItems.productName'
          },
          totalQuantity: { $sum: '$orderItems.quantity' },
          totalRevenue: { $sum: '$orderItems.totalPrice' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 20 }
    ]);

    // Crop demand trend over time
    const cropTrend = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $unwind: '$orderItems' },
      {
        $group: {
          _id: {
            crop: '$orderItems.productName',
            month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
          },
          quantity: { $sum: '$orderItems.quantity' },
          revenue: { $sum: '$orderItems.totalPrice' }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        topCrops,
        topCropsByRegion,
        cropTrend
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get regional demand heatmap analytics
// @route   GET /api/analytics/regional-demand
// @access  Admin only
export const getRegionalDemandAnalytics = async (req, res) => {
  try {
    // Overall regional demand
    const regionalDemand = await Order.aggregate([
      { $match: { status: 'delivered' } },
      {
        $group: {
          _id: {
            state: '$deliveryAddress.state',
            city: '$deliveryAddress.city'
          },
          orderCount: { $sum: 1 },
          totalGmv: { $sum: '$total' },
          totalItems: { $sum: { $size: '$orderItems' } },
          avgOrderValue: { $avg: '$total' },
          totalTax: { $sum: '$tax' },
          totalDeliveryFee: { $sum: '$deliveryFee' }
        }
      },
      { $sort: { totalGmv: -1 } }
    ]);

    // Demand by state (for heatmap)
    const demandByState = await Order.aggregate([
      { $match: { status: 'delivered' } },
      {
        $group: {
          _id: '$deliveryAddress.state',
          orderCount: { $sum: 1 },
          totalGmv: { $sum: '$total' },
          totalItems: { $sum: { $size: '$orderItems' } },
          avgOrderValue: { $avg: '$total' },
          buyerCount: { $sum: 1 },
          uniqueBuyers: { $addToSet: '$buyerId' }
        }
      },
      {
        $project: {
          _id: 1,
          orderCount: 1,
          totalGmv: 1,
          totalItems: 1,
          avgOrderValue: 1,
          uniqueBuyerCount: { $size: '$uniqueBuyers' }
        }
      },
      { $sort: { totalGmv: -1 } }
    ]);

    // Regional trends over time
    const regionalTrends = await Order.aggregate([
      { $match: { status: 'delivered' } },
      {
        $group: {
          _id: {
            state: '$deliveryAddress.state',
            month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
          },
          orderCount: { $sum: 1 },
          gmv: { $sum: '$total' }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    // Top products by region (demand heatmap detail)
    const topProductsByRegion = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $unwind: '$orderItems' },
      {
        $group: {
          _id: {
            state: '$deliveryAddress.state',
            product: '$orderItems.productName'
          },
          quantity: { $sum: '$orderItems.quantity' },
          revenue: { $sum: '$orderItems.totalPrice' }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 50 }
    ]);

    res.json({
      success: true,
      data: {
        regionalDemand,
        demandByState,
        regionalTrends,
        topProductsByRegion
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get farmer earnings trends over time
// @route   GET /api/analytics/farmer-earnings
// @access  Admin only or Farmer for their own data
export const getFarmerEarningsTrends = async (req, res) => {
  try {
    const { sellerId, period = 'monthly' } = req.query;

    // Authorization check
    const isAdmin = req.user.roles?.includes('admin');
    const isFarmer = req.user.roles?.some((role) => ['farmer', 'business'].includes(role));

    if (!isAdmin && !isFarmer) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access farmer earnings data'
      });
    }

    const targetSellerId = sellerId || req.user._id;

    if (!isAdmin && String(targetSellerId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view another farmer\'s earnings'
      });
    }

    let dateFormat;
    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        dateFormat = '%Y-W%V';
        break;
      case 'yearly':
        dateFormat = '%Y';
        break;
      case 'monthly':
      default:
        dateFormat = '%Y-%m';
    }

    // Earnings by period
    const earningsByPeriod = await Order.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(targetSellerId), status: 'delivered' } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          grossRevenue: { $sum: '$total' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$total' },
          totalItems: { $sum: { $size: '$orderItems' } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Commission breakdown by period
    const commissionByPeriod = await Commission.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(targetSellerId) } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: { $ifNull: ['$collectedAt', '$createdAt'] } } },
          orderAmount: { $sum: '$orderAmount' },
          commissionCharged: { $sum: '$commissionAmount' },
          payoutAmount: { $sum: '$sellerPayout' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 1,
          orderAmount: 1,
          commissionCharged: 1,
          payoutAmount: 1,
          orderCount: 1,
          commissionRate: {
            $cond: [
              { $gt: ['$orderAmount', 0] },
              { $multiply: [{ $divide: ['$commissionCharged', '$orderAmount'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Overall statistics
    const overallStats = await Order.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(targetSellerId), status: 'delivered' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          totalItems: { $sum: { $size: '$orderItems' } },
          avgOrderValue: { $avg: '$total' },
          minOrderValue: { $min: '$total' },
          maxOrderValue: { $max: '$total' }
        }
      }
    ]);

    // Payout status breakdown
    const payoutStatus = await Commission.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(targetSellerId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$commissionAmount' },
          totalPayout: { $sum: '$sellerPayout' }
        }
      }
    ]);

    // Top products by this farmer
    const topProducts = await Order.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(targetSellerId), status: 'delivered' } },
      { $unwind: '$orderItems' },
      {
        $group: {
          _id: '$orderItems.productName',
          quantity: { $sum: '$orderItems.quantity' },
          revenue: { $sum: '$orderItems.totalPrice' },
          avgPrice: { $avg: '$orderItems.unitPrice' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        period,
        overall: overallStats[0] || {
          totalRevenue: 0,
          totalOrders: 0,
          totalItems: 0,
          avgOrderValue: 0
        },
        earningsByPeriod,
        commissionByPeriod,
        payoutStatus,
        topProducts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

