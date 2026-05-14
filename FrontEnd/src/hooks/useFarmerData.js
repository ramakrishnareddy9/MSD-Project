import { useState, useCallback } from 'react';
import { productAPI, orderAPI, payoutAPI, analyticsAPI, notificationAPI } from '../services/api';

export function useFarmerData() {
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async (opts = {}) => {
    setLoading(true);
    try {
      const [productsRes, ordersRes, payoutsRes, metricsRes, notificationsRes] = await Promise.all([
        productAPI.getAll({ ownerId: opts.ownerId, page: 1, limit: 50 }),
        orderAPI.getAll({ sellerId: opts.ownerId, page: 1, limit: 50 }),
        payoutAPI.getMy(),
        analyticsAPI.getFarmer({ sellerId: opts.ownerId }),
        notificationAPI.getAll({ page: 1, limit: 20 })
      ]);

      return {
        products: productsRes?.data?.products || productsRes || [],
        orders: ordersRes?.data?.orders || ordersRes || [],
        payouts: payoutsRes?.data?.payouts || payoutsRes || [],
        metrics: metricsRes?.data || {},
        notifications: notificationsRes?.data || []
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, fetchAll };
}
