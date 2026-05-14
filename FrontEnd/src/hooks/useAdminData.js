import { useState, useCallback } from 'react';
import { analyticsAPI, userAPI, orderAPI, disputeAPI } from '../services/api';

/**
 * Custom hook to manage admin metrics and analytics
 */
export const useAdminMetrics = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalOrders: 0,
    revenue: 0,
    farmers: 0,
    customers: 0,
    transporters: 0,
    businesses: 0,
    pendingApprovals: 0,
    reportedIssues: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const metricsData = await analyticsAPI.getDashboardMetrics();
      
      if (metricsData.success && metricsData.data) {
        const metrics = metricsData.data;
        
        // Calculate user distribution by role
        const roleCount = {};
        metrics.usersByRole?.forEach(role => {
          roleCount[role._id] = role.count;
        });
        
        setStats({
          totalUsers: metrics.totalUsers || 0,
          activeUsers: metrics.activeUsers || 0,
          totalOrders: metrics.totalOrders || 0,
          revenue: metrics.totalRevenue || 0,
          farmers: roleCount['farmer'] || 0,
          customers: roleCount['customer'] || 0,
          transporters: (roleCount['delivery_large'] || 0) + (roleCount['delivery_small'] || 0),
          businesses: roleCount['business'] || 0,
          pendingApprovals: metrics.pendingApprovals || 0,
          reportedIssues: metrics.reportedIssues || 0
        });
        
        // Transform recent orders
        const ordersForDisplay = metrics.recentOrders?.slice(0, 4).map((order, idx) => ({
          id: idx + 1,
          customer: order.buyerId?.name || 'Unknown',
          farmer: order.sellerId?.name || 'Unknown',
          product: order.orderItems?.[0]?.productName || 'Product',
          amount: order.total || 0,
          status: order.status || 'Pending',
          date: new Date(order.createdAt).toLocaleDateString()
        })) || [];
        
        setRecentOrders(ordersForDisplay);
        return { stats, recentOrders: ordersForDisplay };
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stats,
    recentOrders,
    loading,
    error,
    fetchMetrics
  };
};

/**
 * Custom hook to manage admin users list
 */
export const useAdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async (limit = 20, page = 1, filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await userAPI.getAll({ limit, page, ...filters });
      
      if (response.success && response.data) {
        const usersForDisplay = response.data.map((user, idx) => ({
          id: idx + 1,
          userId: user._id,
          name: user.name || 'Unknown',
          role: user.roles?.[0] || 'customer',
          email: user.email || '',
          status: user.status || 'active',
          joined: new Date(user.createdAt).toLocaleDateString(),
          orders: user.orderCount || 0,
          rating: user.rating || 0
        })) || [];
        
        setUsers(usersForDisplay);
        setTotal(response.total || usersForDisplay.length);
        return usersForDisplay;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserStatus = useCallback(async (userId, status) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await userAPI.update(userId, { status });
      
      if (response.success) {
        setUsers(prev => prev.map(user => 
          user.userId === userId 
            ? { ...user, status }
            : user
        ));
        return response.data;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error updating user status:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (userId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await userAPI.delete(userId);
      
      if (response.success) {
        setUsers(prev => prev.filter(user => user.userId !== userId));
        return true;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error deleting user:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    users,
    total,
    loading,
    error,
    fetchUsers,
    updateUserStatus,
    deleteUser
  };
};

/**
 * Custom hook to manage admin orders
 */
export const useAdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const fetchOrders = useCallback(async (limit = 20, filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await orderAPI.getAll({ limit, ...filters });
      
      if (response.success && response.data?.orders) {
        const ordersForDisplay = response.data.orders.map((order, idx) => ({
          id: idx + 1,
          orderId: order._id,
          customer: order.buyerId?.name || 'Unknown',
          farmer: order.sellerId?.name || 'Unknown',
          product: order.orderItems?.[0]?.productName || 'Product',
          amount: order.total || 0,
          status: order.status || 'Pending',
          date: new Date(order.createdAt).toLocaleDateString()
        })) || [];
        
        setOrders(ordersForDisplay);
        setTotal(response.data.total || ordersForDisplay.length);
        return ordersForDisplay;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    orders,
    total,
    loading,
    error,
    fetchOrders
  };
};

/**
 * Custom hook to manage admin disputes
 */
export const useAdminDisputes = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDisputes = useCallback(async (limit = 25) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await disputeAPI.getAll({ limit });
      
      if (response.success) {
        setDisputes(response.data.disputes || []);
        return response.data.disputes || [];
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching disputes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDisputeStatus = useCallback(async (disputeId, resolution) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await disputeAPI.resolve(disputeId, { resolution });
      
      if (response.success) {
        setDisputes(prev => prev.map(dispute => 
          dispute._id === disputeId 
            ? { ...dispute, status: 'resolved', resolution }
            : dispute
        ));
        return response.data;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error resolving dispute:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    disputes,
    loading,
    error,
    fetchDisputes,
    updateDisputeStatus
  };
};
