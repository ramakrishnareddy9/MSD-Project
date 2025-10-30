// API service layer for FarmKart frontend
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = () => {
  const user = localStorage.getItem('farmkart_user');
  if (user) {
    try {
      const parsed = JSON.parse(user);
      return parsed.token;
    } catch {
      return null;
    }
  }
  return null;
};

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
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

  getCurrentUser: async () => {
    return apiCall('/auth/me');
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
  recurringOrder: recurringOrderAPI,
  delivery: deliveryAPI,
  commission: commissionAPI
};
