// API service layer for FarmKart frontend
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

// ─── Silent refresh state ──────────────────────────────────────────────────────
// Prevents infinite refresh loops and deduplicates concurrent refresh attempts.
let isRefreshing = false;
let refreshPromise = null;

/**
 * Attempt a silent token refresh by calling POST /auth/refresh.
 * The refresh cookie is sent automatically by the browser.
 * Returns true if refresh succeeded, false otherwise.
 */
const attemptSilentRefresh = async () => {
  // If a refresh is already in-flight, piggyback on it
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// ─── Core API helper ───────────────────────────────────────────────────────────
/**
 * Make an API call with automatic silent refresh on 401.
 * When the access token expires (15 min), the first 401 triggers a
 * POST /auth/refresh using the long-lived refresh cookie. If refresh
 * succeeds the original request is retried exactly once.
 */
const apiCall = async (endpoint, options = {}, _isRetry = false) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const config = {
    ...options,
    headers,
    // Send httpOnly cookies automatically with every request
    credentials: 'include'
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      // On 401, attempt a silent refresh once (skip for auth endpoints to avoid loops)
      if (
        response.status === 401 &&
        !_isRetry &&
        !endpoint.startsWith('/auth/refresh') &&
        !endpoint.startsWith('/auth/login') &&
        !endpoint.startsWith('/auth/register')
      ) {
        const refreshed = await attemptSilentRefresh();
        if (refreshed) {
          // Retry the original request with the new access token cookie
          return apiCall(endpoint, options, true);
        }
      }

      const error = new Error(data?.message || 'API request failed');
      error.status = response.status;
      error.endpoint = endpoint;
      error.details = data?.errors || [];
      throw error;
    }

    return data;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('API Error:', error);
    }
    throw error;
  }
};

// ===== AUTH API =====
export const authAPI = {
  login: async (email, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  register: async (userData) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  forgotPassword: async (email) => {
    return apiCall('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  resetPassword: async (token, password, confirmPassword) => {
    return apiCall('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password, confirmPassword })
    });
  },

  getCurrentUser: async () => {
    return apiCall('/auth/me');
  },

  refresh: async () => {
    return apiCall('/auth/refresh', {
      method: 'POST'
    });
  },

  logout: async () => {
    return apiCall('/auth/logout', {
      method: 'POST'
    });
  }
};

// ===== USER API =====
export const userAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/users?${query}`);
  },

  getById: async (id) => {
    return apiCall(`/users/${id}`);
  },

  update: async (id, userData) => {
    return apiCall(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  delete: async (id) => {
    return apiCall(`/users/${id}`, {
      method: 'DELETE'
    });
  }
};

// ===== PRODUCT API =====
export const productAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/products?${query}`);
  },

  getCropCatalog: async () => {
    return apiCall('/products/crops/catalog');
  },

  getById: async (id) => {
    return apiCall(`/products/${id}`);
  },

  create: async (productData) => {
    return apiCall('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },

  update: async (id, productData) => {
    return apiCall(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  },

  delete: async (id) => {
    return apiCall(`/products/${id}`, {
      method: 'DELETE'
    });
  },

  search: async (searchTerm, filters = {}) => {
    const params = { search: searchTerm, ...filters };
    return productAPI.getAll(params);
  }
};

// ===== CATEGORY API =====
export const categoryAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/categories?${query}`);
  },

  getById: async (id) => {
    return apiCall(`/categories/${id}`);
  },

  create: async (categoryData) => {
    return apiCall('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData)
    });
  },

  update: async (id, categoryData) => {
    return apiCall(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData)
    });
  },

  delete: async (id) => {
    return apiCall(`/categories/${id}`, {
      method: 'DELETE'
    });
  }
};

// ===== ORDER API =====
export const orderAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/orders?${query}`);
  },

  getById: async (id) => {
    return apiCall(`/orders/${id}`);
  },

  create: async (orderData) => {
    return apiCall('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },

  updateStatus: async (id, status) => {
    return apiCall(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  requestDelivery: async (id, vehicleId) => {
    return apiCall(`/orders/${id}/request-delivery`, {
      method: 'PATCH',
      body: JSON.stringify({ vehicleId })
    });
  },

  respondDeliveryRequest: async (id, action, vehicleId) => {
    return apiCall(`/orders/${id}/delivery-response`, {
      method: 'PATCH',
      body: JSON.stringify({ action, vehicleId })
    });
  },

  update: async (id, orderData) => {
    return apiCall(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData)
    });
  },

  getMyOrders: async (userId, type = null) => {
    const params = { buyerId: userId };
    if (type) params.type = type;
    return orderAPI.getAll(params);
  },

  getSellerOrders: async (sellerId, type = null) => {
    const params = { sellerId };
    if (type) params.type = type;
    return orderAPI.getAll(params);
  }
};

// ===== INVENTORY API =====
export const inventoryAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/inventory?${query}`);
  },

  getById: async (id) => {
    return apiCall(`/inventory/${id}`);
  },

  create: async (lotData) => {
    return apiCall('/inventory', {
      method: 'POST',
      body: JSON.stringify(lotData)
    });
  },

  update: async (id, lotData) => {
    return apiCall(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(lotData)
    });
  },

  delete: async (id) => {
    return apiCall(`/inventory/${id}`, {
      method: 'DELETE'
    });
  },

  getByProduct: async (productId) => {
    return inventoryAPI.getAll({ productId });
  },

  getByLocation: async (locationId) => {
    return inventoryAPI.getAll({ locationId });
  }
};

// ===== LOCATION API =====
export const locationAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/locations?${query}`);
  },

  getById: async (id) => {
    return apiCall(`/locations/${id}`);
  },

  create: async (locationData) => {
    return apiCall('/locations', {
      method: 'POST',
      body: JSON.stringify(locationData)
    });
  },

  update: async (id, locationData) => {
    return apiCall(`/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(locationData)
    });
  },

  delete: async (id) => {
    return apiCall(`/locations/${id}`, {
      method: 'DELETE'
    });
  }
};

// ===== REVIEW API =====
export const reviewAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/reviews?${query}`);
  },

  create: async (reviewData) => {
    return apiCall('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
  },

  getByProduct: async (productId) => {
    return reviewAPI.getAll({ productId });
  },

  getByUser: async (userId) => {
    return reviewAPI.getAll({ userId });
  }
};

// ===== PAYMENT API =====
export const paymentAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/payments?${query}`);
  },

  getById: async (id) => {
    return apiCall(`/payments/${id}`);
  },

  create: async (paymentData) => {
    return apiCall('/payments', {
      method: 'POST',
      headers: {
        'Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify(paymentData)
    });
  },

  markSuccess: async (id, data) => {
    return apiCall(`/payments/${id}/success`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  markFailed: async (id, reason) => {
    return apiCall(`/payments/${id}/failed`, {
      method: 'PATCH',
      body: JSON.stringify({ reason })
    });
  },

  processRefund: async (id, amount, reason) => {
    return apiCall(`/payments/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason })
    });
  },

  getStats: async (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const query = new URLSearchParams(params).toString();
    return apiCall(`/payments/stats/overview?${query}`);
  }
};

// ===== PRICE AGREEMENT API =====
export const priceAgreementAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/price-agreements?${query}`);
  },

  getById: async (id) => {
    return apiCall(`/price-agreements/${id}`);
  },

  create: async (agreementData) => {
    return apiCall('/price-agreements', {
      method: 'POST',
      body: JSON.stringify(agreementData)
    });
  },

  update: async (id, agreementData) => {
    return apiCall(`/price-agreements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(agreementData)
    });
  },

  approve: async (id, notes) => {
    return apiCall(`/price-agreements/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ notes })
    });
  },

  reject: async (id, reason) => {
    return apiCall(`/price-agreements/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason })
    });
  },

  cancel: async (id, reason) => {
    return apiCall(`/price-agreements/${id}/cancel`, {
      method: 'DELETE',
      body: JSON.stringify({ reason })
    });
  }
};

// ===== RECURRING ORDER API =====
export const recurringOrderAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/recurring-orders?${query}`);
  },

  getById: async (id) => {
    return apiCall(`/recurring-orders/${id}`);
  },

  create: async (orderData) => {
    return apiCall('/recurring-orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },

  update: async (id, orderData) => {
    return apiCall(`/recurring-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData)
    });
  },

  pause: async (id) => {
    return apiCall(`/recurring-orders/${id}/pause`, {
      method: 'PATCH'
    });
  },

  resume: async (id) => {
    return apiCall(`/recurring-orders/${id}/resume`, {
      method: 'PATCH'
    });
  },

  cancel: async (id) => {
    return apiCall(`/recurring-orders/${id}`, {
      method: 'DELETE'
    });
  }
};

// ===== MARKETPLACE REQUEST API =====
export const marketplaceRequestAPI = {
  create: async (requestData) => {
    return apiCall('/marketplace-requests', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  },

  getMyRequests: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/marketplace-requests?${query}`);
  },

  getOpenForFarmer: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/marketplace-requests/open-for-farmer?${query}`);
  },

  getFarmerAccepted: async () => {
    return apiCall('/marketplace-requests/farmer/accepted');
  },

  respond: async (id, responseData) => {
    return apiCall(`/marketplace-requests/${id}/respond`, {
      method: 'PATCH',
      body: JSON.stringify(responseData)
    });
  },

  buyerRespond: async (id, responseData) => {
    return apiCall(`/marketplace-requests/${id}/buyer-respond`, {
      method: 'PATCH',
      body: JSON.stringify(responseData)
    });
  }
};

// ===== DELIVERY API =====
export const deliveryAPI = {
  // Shipment methods (long-haul)
  shipments: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiCall(`/delivery/shipments?${query}`);
    },

    getById: async (id) => {
      return apiCall(`/delivery/shipments/${id}`);
    },

    create: async (shipmentData) => {
      return apiCall('/delivery/shipments', {
        method: 'POST',
        body: JSON.stringify(shipmentData)
      });
    },

    updateTracking: async (id, coordinates, checkpoint) => {
      return apiCall(`/delivery/shipments/${id}/tracking`, {
        method: 'PATCH',
        body: JSON.stringify({ coordinates, checkpoint })
      });
    },

    markDelivered: async (id) => {
      return apiCall(`/delivery/shipments/${id}/deliver`, {
        method: 'PATCH'
      });
    }
  },

  // Delivery task methods (last-mile)
  tasks: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiCall(`/delivery/tasks?${query}`);
    },

    getById: async (id) => {
      return apiCall(`/delivery/tasks/${id}`);
    },

    create: async (taskData) => {
      return apiCall('/delivery/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
      });
    },

    accept: async (id) => {
      return apiCall(`/delivery/tasks/${id}/accept`, {
        method: 'PATCH'
      });
    },

    start: async (id) => {
      return apiCall(`/delivery/tasks/${id}/start`, {
        method: 'PATCH'
      });
    },

    complete: async (id, proof) => {
      return apiCall(`/delivery/tasks/${id}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ proof })
      });
    },

    updateLocation: async (id, coordinates) => {
      return apiCall(`/delivery/tasks/${id}/location`, {
        method: 'PATCH',
        body: JSON.stringify({ coordinates })
      });
    }
  }
};

// ===== COMMISSION API (Admin) =====
export const commissionAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/commissions?${query}`);
  },

  getById: async (id) => {
    return apiCall(`/commissions/${id}`);
  },

  getSettlementSummary: async (sellerId, cycleId) => {
    return apiCall(`/commissions/settlement/${sellerId}/${cycleId}`);
  },

  markCollected: async (id) => {
    return apiCall(`/commissions/${id}/collect`, {
      method: 'PATCH'
    });
  },

  processPayout: async (id, paymentDetails) => {
    return apiCall(`/commissions/${id}/payout`, {
      method: 'POST',
      body: JSON.stringify(paymentDetails)
    });
  },

  addAdjustment: async (id, type, amount, reason) => {
    return apiCall(`/commissions/${id}/adjustment`, {
      method: 'POST',
      body: JSON.stringify({ type, amount, reason })
    });
  }
};

// ===== COMMUNITY API =====
export const communityAPI = {
  create: async (communityData) => {
    return apiCall('/communities', {
      method: 'POST',
      body: JSON.stringify(communityData)
    });
  },

  getAll: async () => {
    return apiCall(`/communities`);
  },

  getMy: async () => {
    return apiCall(`/communities/mine`);
  },

  getMyAdmin: async () => {
    return apiCall(`/communities/mine/admin`);
  },

  join: async (id) => {
    return apiCall(`/communities/${id}/join`, {
      method: 'POST'
    });
  },

  leave: async (id) => {
    return apiCall(`/communities/${id}/leave`, {
      method: 'POST'
    });
  },

  transferOwnership: async (id, newAdminId) => {
    return apiCall(`/communities/${id}/transfer-ownership`, {
      method: 'POST',
      body: JSON.stringify({ newAdminId })
    });
  },

  delete: async (id) => {
    return apiCall(`/communities/${id}`, {
      method: 'DELETE'
    });
  },

  getAnnouncements: async (communityId) => {
    return apiCall(`/communities/${communityId}/announcements`);
  },

  createAnnouncement: async (communityId, announcementData) => {
    return apiCall(`/communities/${communityId}/announcements`, {
      method: 'POST',
      body: JSON.stringify(announcementData)
    });
  },

  getPools: async (id) => {
    return apiCall(`/communities/${id}/pools`);
  },

  getPoolFarmers: async (communityId, poolId) => {
    return apiCall(`/communities/${communityId}/pools/${poolId}/farmers`);
  },

  orderPool: async (communityId, poolId, farmerId, vehicleId) => {
    return apiCall(`/communities/${communityId}/pools/${poolId}/order`, {
      method: 'POST',
      body: JSON.stringify({ farmerId, vehicleId })
    });
  },

  contributeToCommunity: async (communityId, contributionData) => {
    return apiCall(`/communities/${communityId}/pools/contribute`, {
      method: 'POST',
      body: JSON.stringify(contributionData)
    });
  },

  contributeToPool: async (poolId, contributionData) => {
    return apiCall(`/communities/pools/${poolId}/contribute`, {
      method: 'POST',
      body: JSON.stringify(contributionData)
    });
  },

  getChat: async (id) => {
    return apiCall(`/communities/${id}/chat`);
  },

  sendChatMessage: async (id, message) => {
    return apiCall(`/communities/${id}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }
};

// ===== CART API =====
export const cartAPI = {
  getCart: async () => {
    return apiCall('/cart');
  },

  addItem: async (productId, qty = 1) => {
    return apiCall('/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, qty })
    });
  },

  updateItem: async (productId, qty) => {
    return apiCall(`/cart/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ productId, qty })
    });
  },

  removeItem: async (productId) => {
    return apiCall(`/cart/${productId}`, {
      method: 'DELETE'
    });
  },

  clear: async () => {
    return apiCall('/cart', {
      method: 'DELETE'
    });
  }
};

// ===== WISHLIST API =====
export const wishlistAPI = {
  getWishlist: async () => {
    return apiCall('/wishlist');
  },

  addItem: async (productId) => {
    return apiCall('/wishlist', {
      method: 'POST',
      body: JSON.stringify({ productId })
    });
  },

  removeItem: async (productId) => {
    return apiCall(`/wishlist/${productId}`, {
      method: 'DELETE'
    });
  },

  clear: async () => {
    return apiCall('/wishlist', {
      method: 'DELETE'
    });
  }
};

// ===== NOTIFICATION API =====
export const notificationAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/notifications?${query}`);
  },

  create: async (notificationData) => {
    return apiCall('/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData)
    });
  },

  markAsRead: async (id) => {
    return apiCall(`/notifications/${id}/read`, {
      method: 'PUT'
    });
  },

  markAllAsRead: async () => {
    return apiCall('/notifications/read-all', {
      method: 'PUT'
    });
  },

  delete: async (id) => {
    return apiCall(`/notifications/${id}`, {
      method: 'DELETE'
    });
  }
};

// ===== VEHICLE API =====
export const vehicleAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/vehicles?${query}`);
  },

  getMarketplaceVehicles: async (params = {}) => {
    const query = new URLSearchParams({ marketplace: 'true', ...params }).toString();
    return apiCall(`/vehicles?${query}`);
  },

  getById: async (id) => {
    return apiCall(`/vehicles/${id}`);
  },

  create: async (vehicleData) => {
    return apiCall('/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicleData)
    });
  },

  update: async (id, vehicleData) => {
    return apiCall(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vehicleData)
    });
  },

  delete: async (id) => {
    return apiCall(`/vehicles/${id}`, {
      method: 'DELETE'
    });
  },

  updateStatus: async (id, status) => {
    return apiCall(`/vehicles/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  assignDriver: async (id, driverId) => {
    return apiCall(`/vehicles/${id}/driver`, {
      method: 'PATCH',
      body: JSON.stringify({ driverId })
    });
  },

  updateLocation: async (id, address, lat, lng) => {
    return apiCall(`/vehicles/${id}/location`, {
      method: 'PATCH',
      body: JSON.stringify({ address, lat, lng })
    });
  }
};

// ===== ANALYTICS API =====
export const analyticsAPI = {
  getDashboardMetrics: async () => {
    return apiCall('/analytics/dashboard');
  },

  getUserMetrics: async (userId) => {
    return apiCall(`/analytics/user/${userId}`);
  },

  getRevenueMetrics: async (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const query = new URLSearchParams(params).toString();
    return apiCall(`/analytics/revenue?${query}`);
  },

  getOrderAnalytics: async (sellerId) => {
    const params = sellerId ? { sellerId } : {};
    const query = new URLSearchParams(params).toString();
    return apiCall(`/analytics/orders?${query}`);
  },

  getProductAnalytics: async (ownerId) => {
    const params = ownerId ? { ownerId } : {};
    const query = new URLSearchParams(params).toString();
    return apiCall(`/analytics/products?${query}`);
  }
};

// ===== UTILITY / HELPER API METHODS =====
export const searchAPI = {
  // Global search across products, users, communities
  search: async (query, filters = {}) => {
    const params = { q: query, ...filters };
    const queryStr = new URLSearchParams(params).toString();
    return apiCall(`/search?${queryStr}`);
  },

  // Search products by name, category, location
  searchProducts: async (query, filters = {}) => {
    return productAPI.search(query, filters);
  },

  // Search users (farmers, businesses, delivery partners)
  searchUsers: async (query, userType = null) => {
    const params = { search: query };
    if (userType) params.role = userType;
    return userAPI.getAll(params);
  },

  // Search by location
  searchByLocation: async (state, city = null, radius = null) => {
    const params = { state };
    if (city) params.city = city;
    if (radius) params.radius = radius;
    return locationAPI.getAll(params);
  }
};

export const filterAPI = {
  // Get products with pagination
  getProductsPaginated: async (page = 1, limit = 20, filters = {}) => {
    return productAPI.getAll({ page, limit, ...filters });
  },

  // Get orders with filters
  getOrdersFiltered: async (filters = {}, page = 1, limit = 20) => {
    return orderAPI.getAll({ ...filters, page, limit });
  },

  // Get users with role filtering
  getUsersByRole: async (role, page = 1, limit = 20) => {
    return userAPI.getAll({ role, page, limit });
  },

  // Get products by category
  getByCategory: async (categoryName, page = 1, limit = 20) => {
    return productAPI.getAll({ category: categoryName, page, limit });
  },

  // Get available products (in stock)
  getAvailableProducts: async (page = 1, limit = 20) => {
    return productAPI.getAll({ status: 'active', inStock: true, page, limit });
  },

  // Get high-rated products
  getTopRatedProducts: async (minRating = 4.0, limit = 20) => {
    return productAPI.getAll({ minRating, sortBy: 'rating', sortOrder: 'desc', limit });
  }
};

export const statisticsAPI = {
  // Get trending products
  getTrendingProducts: async (days = 30, limit = 10) => {
    return apiCall(`/analytics/trending-products?days=${days}&limit=${limit}`);
  },

  // Get best sellers
  getBestSellers: async (limit = 10) => {
    return apiCall(`/analytics/best-sellers?limit=${limit}`);
  },

  // Get platform stats
  getPlatformStats: async () => {
    return apiCall(`/analytics/platform-stats`);
  },

  // Get price trends for a product
  getPriceTrends: async (productId, days = 30) => {
    return apiCall(`/analytics/price-trends/${productId}?days=${days}`);
  },

  // Get user activity stats
  getUserActivity: async (userId, days = 30) => {
    return apiCall(`/analytics/user-activity/${userId}?days=${days}`);
  }
};

export const batchAPI = {
  // Bulk update order statuses
  updateOrderStatuses: async (orderIds, status) => {
    return apiCall('/orders/bulk-update-status', {
      method: 'PATCH',
      body: JSON.stringify({ orderIds, status })
    });
  },

  // Bulk delete products (admin only)
  deleteProducts: async (productIds) => {
    return apiCall('/products/bulk-delete', {
      method: 'DELETE',
      body: JSON.stringify({ productIds })
    });
  },

  // Bulk mark notifications as read
  markNotificationsRead: async (notificationIds) => {
    return apiCall('/notifications/bulk-read', {
      method: 'PATCH',
      body: JSON.stringify({ notificationIds })
    });
  },

  // Bulk create orders (for recurring orders)
  createMultipleOrders: async (ordersData) => {
    return apiCall('/orders/bulk-create', {
      method: 'POST',
      body: JSON.stringify({ orders: ordersData })
    });
  }
};

export const exportAPI = {
  // Export orders to CSV
  exportOrders: async (filters = {}) => {
    const query = new URLSearchParams({ ...filters, format: 'csv' }).toString();
    return apiCall(`/export/orders?${query}`);
  },

  // Export products to CSV
  exportProducts: async (filters = {}) => {
    const query = new URLSearchParams({ ...filters, format: 'csv' }).toString();
    return apiCall(`/export/products?${query}`);
  },

  // Export analytics report
  exportAnalytics: async (reportType = 'dashboard', format = 'pdf') => {
    return apiCall(`/export/analytics?type=${reportType}&format=${format}`);
  },

  // Export transaction history
  exportTransactions: async (startDate, endDate, format = 'csv') => {
    const query = new URLSearchParams({ startDate, endDate, format }).toString();
    return apiCall(`/export/transactions?${query}`);
  }
};

export const settingsAPI = {
  // Get user settings
  getSettings: async () => {
    return apiCall('/settings/user');
  },

  // Update user settings
  updateSettings: async (settingsData) => {
    return apiCall('/settings/user', {
      method: 'PUT',
      body: JSON.stringify(settingsData)
    });
  },

  // Get notification preferences
  getNotificationPreferences: async () => {
    return apiCall('/settings/notifications');
  },

  // Update notification preferences
  updateNotificationPreferences: async (preferences) => {
    return apiCall('/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });
  },

  // Get privacy settings
  getPrivacySettings: async () => {
    return apiCall('/settings/privacy');
  },

  // Update privacy settings
  updatePrivacySettings: async (settings) => {
    return apiCall('/settings/privacy', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }
};

export default {
  auth: authAPI,
  user: userAPI,
  product: productAPI,
  category: categoryAPI,
  order: orderAPI,
  inventory: inventoryAPI,
  location: locationAPI,
  review: reviewAPI,
  payment: paymentAPI,
  priceAgreement: priceAgreementAPI,
  marketplaceRequest: marketplaceRequestAPI,
  recurringOrder: recurringOrderAPI,
  delivery: deliveryAPI,
  commission: commissionAPI,
  community: communityAPI,
  search: searchAPI,
  filter: filterAPI,
  statistics: statisticsAPI,
  batch: batchAPI,
  export: exportAPI,
  settings: settingsAPI
};
