# Dashboard API Migration Guide

This document provides the migration pattern for converting all dashboards from mock data to real API calls.

## Pattern to Follow

### 1. **BusinessDashboard.jsx**

**Before (Mock Data):**
```javascript
const [businessName] = useState('FreshMart Wholesale');
const [metrics] = useState({ revenue: 45000, orders: 234, products: 45 });
const [products] = useState([...hardcoded products...]);
```

**After (API Data):**
```javascript
import { analyticsAPI, userAPI, productAPI, orderAPI } from '../../services/api';

const [businessData, setBusinessData] = useState(null);
const [metrics, setMetrics] = useState({});
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchBusinessData = async () => {
    try {
      setLoading(true);
      
      // Get current user (business profile)
      const userRes = await authAPI.getCurrentUser();
      if (userRes.success) setBusinessData(userRes.data);
      
      // Get business metrics
      const metricsRes = await analyticsAPI.getUserMetrics(userRes.data._id);
      if (metricsRes.success) setMetrics(metricsRes.data.sellerMetrics);
      
      // Get business products
      const productsRes = await productAPI.getAll({ ownerId: userRes.data._id });
      if (productsRes.success) setProducts(productsRes.data.products);
    } catch (error) {
      console.error('Error fetching business data:', error);
    } finally {
      setLoading(false);
    }
  };
  fetchBusinessData();
}, []);
```

### 2. **FarmerDashboard.jsx**

**Key Changes:**
- Replace `globalOrders` mock with: `orderAPI.getAll({ sellerId: userId })`
- Replace `crops` mock with: `productAPI.getAll({ ownerId: userId })`
- Replace `inventory` mock with: `inventoryAPI.getByLocation(locationId)`
- Replace `totalEarnings` with: `analyticsAPI.getUserMetrics(userId).data.sellerMetrics.totalEarned`

```javascript
useEffect(() => {
  const fetchFarmerData = async () => {
    const user = await authAPI.getCurrentUser();
    const userId = user.data._id;
    
    // Get orders as seller
    const orders = await orderAPI.getAll({ sellerId: userId });
    
    // Get products (crops)
    const crops = await productAPI.getAll({ ownerId: userId });
    
    // Get inventory  
    const inventory = await inventoryAPI.getByProduct(...);
    
    // Get earnings
    const metrics = await analyticsAPI.getUserMetrics(userId);
    
    setFarmerMetrics(metrics.data);
    setOrders(orders.data.orders);
    setCrops(crops.data.products);
  };
  fetchFarmerData();
}, []);
```

### 3. **CustomerDashboard.jsx**

**Key Changes:**
- Replace `cartItems` with: `cartAPI.getCart()`
- Replace `wishlist` with: `wishlistAPI.getWishlist()`
- Replace `myOrders` with: `orderAPI.getMyOrders(userId)`
- Replace `recommendations` with: `productAPI.getAll({ limit: 10 })`

```javascript
useEffect(() => {
  const fetchCustomerData = async () => {
    const user = await authAPI.getCurrentUser();
    
    const [cart, wishlist, orders, products] = await Promise.all([
      cartAPI.getCart(),
      wishlistAPI.getWishlist(),
      orderAPI.getMyOrders(user.data._id),
      productAPI.getAll({ limit: 10, sort: '-createdAt' })
    ]);
    
    setCart(cart.data);
    setWishlist(wishlist.data);
    setOrders(orders.data);
    setRecommendations(products.data.products);
  };
  fetchCustomerData();
}, []);
```

### 4. **DeliveryDashboard.jsx** (Both SmallScale & LargeScale)

**Key Changes:**
- Replace `defaultAssignments` with: `deliveryAPI.tasks.getAll({ driverId: userId })`
- Replace `vehicles` with: `vehicleAPI.getAll({ ownerId: userId })`
- Replace `routes` with: `deliveryAPI.shipments.getAll({ driverId: userId })`
- Replace `earnings` with: `analyticsAPI.getUserMetrics(userId)`

```javascript
useEffect(() => {
  const fetchDeliveryData = async () => {
    const user = await authAPI.getCurrentUser();
    
    const [tasks, vehicles, shipments, metrics] = await Promise.all([
      deliveryAPI.tasks.getAll({ driverId: user.data._id }),
      vehicleAPI.getAll({ ownerId: user.data._id }),
      deliveryAPI.shipments.getAll({ driverId: user.data._id }),
      analyticsAPI.getUserMetrics(user.data._id)
    ]);
    
    setTasks(tasks.data);
    setVehicles(vehicles.data);
    setShipments(shipments.data);
    setMetrics(metrics.data);
  };
  fetchDeliveryData();
}, []);
```

### 5. **RestaurantDashboard.jsx**

**Key Changes:**
- Replace `dailyDraft` with: `recurringOrderAPI.getAll({ sellerId: userId, status: 'active' })`
- Replace `orders` with: `orderAPI.getAll({ sellerId: userId })`
- Replace `menu` with: `productAPI.getAll({ ownerId: userId })`

```javascript
useEffect(() => {
  const fetchRestaurantData = async () => {
    const user = await authAPI.getCurrentUser();
    
    const [recurring, orders, menu] = await Promise.all([
      recurringOrderAPI.getAll({ sellerId: user.data._id }),
      orderAPI.getAll({ sellerId: user.data._id }),
      productAPI.getAll({ ownerId: user.data._id })
    ]);
    
    setRecurringOrders(recurring.data);
    setOrders(orders.data);
    setMenu(menu.data.products);
  };
  fetchRestaurantData();
}, []);
```

### 6. **CommunityDashboard.jsx**

**Key Changes:**
- Replace `bulkOrders` with: `communityAPI.getPools(communityId)`
- Replace `members` with: `userAPI.getAll()` + filter by community
- Replace `contributions` with: `communityAPI.contributeToPool()` history

```javascript
useEffect(() => {
  const fetchCommunityData = async () => {
    const community = await communityAPI.getMy();
    
    const [pools, users, chat] = await Promise.all([
      communityAPI.getPools(community.data._id),
      userAPI.getAll({ role: 'farmer' }),
      communityAPI.getChat(community.data._id)
    ]);
    
    setCommunity(community.data);
    setPools(pools.data);
    setMembers(users.data);
    setChat(chat.data);
  };
  fetchCommunityData();
}, []);
```

## Common Imports to Add

All dashboards should start with:
```javascript
import { authAPI, userAPI, productAPI, orderAPI } from '../../services/api';
import { cartAPI, wishlistAPI, notificationAPI } from '../../services/api';
import { vehicleAPI, analyticsAPI } from '../../services/api';
import { deliveryAPI, recurringOrderAPI, communityAPI, inventoryAPI } from '../../services/api';
```

## Error Handling Pattern

For all API calls, wrap in try-catch:
```javascript
try {
  setLoading(true);
  const response = await apiMethod();
  if (response.success) {
    setData(response.data);
  } else {
    showSnackbar('Error loading data', 'error');
  }
} catch (error) {
  console.error('Error:', error);
  showSnackbar(error.message || 'Network error', 'error');
} finally {
  setLoading(false);
}
```

## UI Enhancement Tip

Add a loading spinner while data fetches:
```javascript
if (loading) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}
```

## Testing Checklist After Updates

- [ ] Dashboard loads without hardcoded data
- [ ] Real data displays from API
- [ ] Error states handled gracefully
- [ ] Loading state shows while fetching
- [ ] All previous UI/styling preserved
- [ ] Responsive design still works
- [ ] No console errors
- [ ] Network tab shows correct API calls

---

For questions or to verify the API contract, check `/services/api.js` in the FrontEnd source code.
