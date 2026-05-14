import { useState, useCallback } from 'react';
import { payoutAPI, analyticsAPI } from '../services/api';

/**
 * Custom hook to manage farmer payouts data
 */
export const useFarmerPayouts = () => {
  const [payouts, setPayouts] = useState([]);
  const [summary, setSummary] = useState({
    grossAmount: 0,
    commissionDeducted: 0,
    netAmount: 0,
    pendingAmount: 0,
    processedAmount: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPayouts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await payoutAPI.getMy();
      
      if (response.success && response.data) {
        setPayouts(response.data.payouts || []);
        setSummary(response.data.summary || {
          grossAmount: 0,
          commissionDeducted: 0,
          netAmount: 0,
          pendingAmount: 0,
          processedAmount: 0
        });
        return response.data;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching payouts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestPayout = useCallback(async (amount) => {
    try {
      setLoading(true);
      setError(null);
      const response = await payoutAPI.request({ amount });
      
      if (response.success) {
        // Refresh payouts after request
        await fetchPayouts();
        return response.data;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error requesting payout:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPayouts]);

  return {
    payouts,
    summary,
    loading,
    error,
    fetchPayouts,
    requestPayout
  };
};

/**
 * Custom hook to manage farmer metrics and analytics
 */
export const useFarmerMetrics = () => {
  const [metrics, setMetrics] = useState({
    totalCrops: 0,
    activeSales: 0,
    monthlyEarnings: 0,
    customerRating: 0,
    totalOrders: 0,
    pendingOrders: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMetrics = useCallback(async (farmerId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsAPI.getUserMetrics(farmerId);
      
      if (response.success && response.data?.sellerMetrics) {
        const seller = response.data.sellerMetrics;
        const newMetrics = {
          totalCrops: response.data.productCount || 0,
          activeSales: seller.totalOrders || 0,
          monthlyEarnings: seller.totalEarned || 0,
          customerRating: seller.averageRating || 4.7,
          totalOrders: seller.totalOrders || 0,
          pendingOrders: seller.pendingOrders || 0
        };
        setMetrics(newMetrics);
        return newMetrics;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    metrics,
    loading,
    error,
    fetchMetrics
  };
};
