import { useState, useCallback } from 'react';
import { orderAPI, marketplaceRequestAPI } from '../services/api';

/**
 * Custom hook to manage farmer orders data
 * Handles fetching orders where farmer is seller
 */
export const useFarmerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [openRequests, setOpenRequests] = useState([]);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mapOrderToCard = (order, index) => ({
    id: index + 1,
    orderId: order._id || order.id,
    customer: order.buyerId?.name || 'Customer',
    crop: order.orderItems?.[0]?.productName || 'Product',
    quantity: `${order.orderItems?.[0]?.quantity || 0} kg`,
    amount: order.total || 0,
    status: order.status || 'pending',
    date: new Date(order.createdAt).toLocaleDateString(),
    rawStatus: order.status
  });

  const mapRequestToCard = (request, statusLabel = 'Open') => ({
    id: request._id || request.id,
    requestNumber: request.requestNumber,
    business: request.requesterId?.name || 'Business/Restaurant/Community',
    crop: request.cropName || 'Crop',
    quantity: `${request.quantity || 0} ${request.unit || 'kg'}`,
    priceOffered: Number(request.currentOfferPrice ?? request.farmerResponse?.offeredPrice ?? request.offeredPrice ?? 0),
    location: request.location || 'India',
    deadline: request.requiredBy ? new Date(request.requiredBy).toLocaleDateString() : 'N/A',
    status: statusLabel,
    rawStatus: request.status,
    lastOfferedBy: request.lastOfferedBy,
    type: request.requesterType || request.requesterRole || 'business'
  });

  const fetchOrders = useCallback(async (farmerId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderAPI.getAll({ sellerId: farmerId });
      
      if (response.success && response.data?.orders) {
        const mappedOrders = response.data.orders.map(mapOrderToCard);
        setOrders(mappedOrders);
        return mappedOrders;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOpenRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await marketplaceRequestAPI.getOpenForFarmer();
      
      if (response.success) {
        const openReqs = response.data?.requests || [];
        const mapped = openReqs.map(req => mapRequestToCard(req, 'Open'));
        setOpenRequests(mapped);
        return mapped;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching open requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAcceptedRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await marketplaceRequestAPI.getFarmerAccepted();
      
      if (response.success) {
        const acceptedReqs = response.data?.requests || [];
        const mapped = acceptedReqs.map(req => mapRequestToCard(req, 'Accepted'));
        setAcceptedRequests(mapped);
        return mapped;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching accepted requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrderStatus = useCallback(async (orderId, status) => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderAPI.updateStatus(orderId, { status });
      
      if (response.success) {
        setOrders(prev => prev.map(order => 
          order.orderId === orderId 
            ? { ...order, status, rawStatus: status }
            : order
        ));
        return response.data;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error updating order status:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    orders,
    openRequests,
    acceptedRequests,
    loading,
    error,
    fetchOrders,
    fetchOpenRequests,
    fetchAcceptedRequests,
    updateOrderStatus
  };
};
