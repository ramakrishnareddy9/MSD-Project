# FarmKart React Frontend Implementation Prompt

## Overview

Create a **responsive single-page application (SPA)** using **React.js** for the FarmKart agricultural marketplace. Support seven distinct user roles with role-based routing, conditional UI rendering, and polished UX. Follow React best practices: component reusability, code-splitting, performance optimization, and accessibility.

---

## Technical Stack

- **React 18+** with Hooks (useState, useEffect, useContext, useMemo, useCallback)
- **React Router v6+** for client-side routing (code should be compatible with v7 "future" flags where practical)
- **Context API or Redux** for global state (auth, cart, notifications)
- **Material-UI or Tailwind CSS** for UI components
- **React Hook Form or Formik** for forms with Yup/Zod validation
- **Axios** for API calls
- **React.lazy() and Suspense** for code-splitting
- **Vite or Create React App** for build tooling

---

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── common/       # Button, Input, Modal, Loader
│   ├── products/     # ProductCard, ProductList, ProductFilter
│   ├── cart/         # CartItem, CartSummary, CheckoutForm
│   └── orders/       # OrderCard, OrderStatus, OrderTracker
├── pages/            # Full page components
│   ├── auth/         # Login, Signup, ForgotPassword
│   ├── customer/     # CustomerDashboard, ProductCatalog, Cart
│   ├── farmer/       # FarmerDashboard, InventoryManagement
│   ├── business/     # BusinessDashboard, BulkOrderForm
│   ├── restaurant/   # RestaurantDashboard, RecurringOrders
│   ├── delivery/     # LargeScaleDashboard, SmallScaleDashboard
│   └── admin/        # AdminDashboard, UserManagement
├── contexts/         # AuthContext, CartContext, NotificationContext
├── hooks/            # useAuth, useCart, useFetch, useDebounce
├── services/         # API client functions (authService, productService)
├── routes/           # AppRoutes, PrivateRoute, RoleBasedRoute
└── App.jsx
```

---

## Authentication & Authorization

### 1. AuthContext (contexts/AuthContext.jsx)

Create global authentication context managing user state:

```jsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const login = async (email, password) => {
    const { user, token } = await authService.login(email, password);
    setUser(user);
    setToken(token);
    localStorage.setItem('token', token);
    return user;
  };

  const hasRole = (roles) => roles.includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, hasRole, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 2. Login & Signup Forms

**Login (pages/auth/Login.jsx)**:
- Email and password fields with validation
- Role-specific redirect after login (customer → CustomerDashboard, farmer → FarmerDashboard, etc.)
- "Remember me" and "Forgot password" options
- Loading state during authentication

**Signup (pages/auth/Signup.jsx)**:
- Role selection dropdown (Customer, Farmer, Business, Restaurant, Delivery)
- Role-specific fields:
  - **Farmer**: Farm name, location, certifications
  - **Business**: Company name, GST number
  - **Restaurant**: Restaurant name, FSSAI license
  - **Delivery**: Vehicle type, service area
- Multi-step form for complex registrations
- Real-time field validation

### 3. Protected Routes (routes/PrivateRoute.jsx)

```jsx
const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
```

### 4. Role-Based Routing

```jsx
<Routes>
  {/* Public routes */}
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />
  <Route path="/" element={<Navigate to="/shop" replace />} />

  {/* Customer-facing */}
  <Route path="/shop/*" element={<ProductCatalog />} />
  <Route path="/cart" element={<CartPage />} />
  <Route path="/orders" element={
    <PrivateRoute allowedRoles={['customer','business','restaurant']}>
      <OrderHistory />
    </PrivateRoute>
  } />

  {/* Role dashboards */}
  <Route path="/customer/*" element={
    <PrivateRoute allowedRoles={['customer']}>
      <CustomerDashboard />
    </PrivateRoute>
  } />
  <Route path="/farmer/*" element={
    <PrivateRoute allowedRoles={['farmer']}>
      <FarmerDashboard />
    </PrivateRoute>
  } />
  <Route path="/business/*" element={
    <PrivateRoute allowedRoles={['business']}>
      <BusinessDashboard />
    </PrivateRoute>
  } />
  <Route path="/restaurant/*" element={
    <PrivateRoute allowedRoles={['restaurant']}>
      <RestaurantDashboard />
    </PrivateRoute>
  } />
  <Route path="/delivery-large/*" element={
    <PrivateRoute allowedRoles={['delivery_large']}>
      <LargeScaleDashboard />
    </PrivateRoute>
  } />
  <Route path="/delivery-small/*" element={
    <PrivateRoute allowedRoles={['delivery_small']}>
      <SmallScaleDashboard />
    </PrivateRoute>
  } />
  <Route path="/admin/*" element={
    <PrivateRoute allowedRoles={['admin']}>
      <AdminDashboard />
    </PrivateRoute>
  } />
</Routes>
```

### Canonical Routes
- Public: `/`, `/login`, `/signup`
- Storefront: `/shop`, `/cart`, `/orders`
- Dashboards: `/customer`, `/farmer`, `/business`, `/restaurant`, `/delivery-large`, `/delivery-small`, `/admin`
- 404/Unauthorized: `/404`, `/unauthorized`

---

## Role-Specific Dashboards

### 1. Farmer Dashboard (pages/farmer/FarmerDashboard.jsx)

**Features**:
- Overview cards: Total products, pending orders, monthly earnings
- **Inventory table**: List products with edit/delete actions
- **Add Product button**: Opens form with fields:
  - Name, description, category, images (drag-drop upload)
  - Pricing (base price, wholesale price, discount %)
  - Quantity, unit (kg, liter, piece)
  - Perishable, shelf life, storage requirements
  - Harvest date, batch number, certifications
- **Order queue**: Incoming orders with accept/reject buttons
- **Earnings chart**: Revenue graph by period

### 2. Customer Storefront (pages/customer/ProductCatalog.jsx)

**Layout**:
- **Left sidebar**: Filters
  - Price range slider
  - Categories (checkboxes)
  - Location dropdown
  - Certification filters (Organic, Fair-trade)
- **Main area**: Product grid
  - ProductCard components (image, name, price, farmer, rating, "Add to Cart")
  - Quick view modal
  - Wishlist heart icon
- **Top bar**: Search input, sort dropdown (price, newest, rating)
- Pagination or infinite scroll

**ProductCard Component**:
```jsx
const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  
  return (
    <Card>
      <CardMedia image={product.image} />
      <CardContent>
        <Typography variant="h6">{product.name}</Typography>
        <Rating value={product.rating} readOnly />
        <Typography variant="h5">₹{product.price}</Typography>
        <Button onClick={() => addToCart(product)}>Add to Cart</Button>
      </CardContent>
    </Card>
  );
};
```

**Cart & Checkout (pages/customer/Cart.jsx, Checkout.jsx)**:
- Cart: Items list with quantity selectors, remove button, summary (subtotal, delivery, total)
- Checkout: Multi-step (address → time slot → payment → review)
- Progress indicator, form validation at each step

**Order Tracking (pages/customer/OrderHistory.jsx)**:
- List orders with status badges
- Filter by status
- "View Details" modal with delivery timeline
- "Reorder" and "Write Review" buttons

### 3. Business Portal (pages/business/BulkOrderForm.jsx)

**Bulk Order Features**:
- **CSV upload**: Parse and validate order file
- **Manual entry**: Autocomplete product search, add items to order
- Order builder table with quantities and prices
- Delivery location dropdown (multiple warehouses)
- Payment terms selection (prepaid, net-7/15/30)
- Order summary and submit

**Supplier Management**:
- List farmers with ratings
- Request quote button
- Contract management (active contracts, renewals)

**Analytics**: Spending charts, order volume trends, top suppliers

### 4. Restaurant Portal (pages/restaurant/RestaurantDashboard.jsx)

**Recurring Orders (pages/restaurant/RecurringOrders.jsx)**:
- Create weekly/monthly order templates
- Select products and quantities per day
- Set early-morning delivery preference
- Pause/resume orders
- Calendar view of scheduled deliveries

**Menu-Based Ordering**: Link menu dishes to ingredients, auto-calculate quantities

### 5. Delivery Dashboards

**Large-Scale (pages/delivery/LargeScaleDashboard.jsx)**:
- Available long-haul jobs table (origin, destination, distance, payment)
- Accept job button (validates capacity)
- Active shipments with status updates
- Route map with current location
- Fleet management (vehicles, capacity, documents)

**Small-Scale (pages/delivery/SmallScaleDashboard.jsx)**:
- Today's deliveries list
- Route map with optimized path
- Mark as delivered with photo proof
- Collect COD payment
- Report issues

### 6. Admin Panel (pages/admin/AdminDashboard.jsx)

**Overview**: Metrics cards (users, orders, revenue), sales charts, activity feed

**User Management (pages/admin/UserManagement.jsx)**:
- Tabbed by role
- User table with search/filter
- Actions: View, Suspend, Delete
- KYC verifications (approve/reject)

**Product Moderation**: Pending products approval, flagged items review

**Order Overview**: All orders table, export CSV, dispute resolution

**Analytics**: User growth, sales metrics, product performance, reports generation

---

## Reusable Components

### Core Components (components/common/)

- **Button**: Variants (primary, secondary), sizes, loading state
- **Input**: Label, error display, validation integration
- **Modal**: Generic modal with title, body, close button
- **Loader**: Skeleton screens or spinners
- **ErrorBoundary**: Catch component errors

### Product Components (components/products/)

- **ProductCard**: Reusable across all buyer roles
- **ProductList**: Grid/list layout
- **ProductFilter**: Filter sidebar
- **ProductSearch**: Search with autocomplete

### Order Components (components/orders/)

- **OrderCard**: Order summary display
- **OrderStatus**: Status badge with colors
- **OrderTracker**: Timeline visualization

---

## State Management

### CartContext (contexts/CartContext.jsx)

```jsx
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);

  const addToCart = (product, quantity = 1) => {
    // Add or update item
  };

  const removeFromCart = (productId) => {
    // Remove item
  };

  const updateQuantity = (productId, quantity) => {
    // Update quantity
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, total, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
```

### NotificationContext

Manage toast notifications for success/error messages.

---

## Conditional Rendering by Role

**RBAC Principles**: Users only see features they're authorized to use.

**Implementation**:
```jsx
const { user, hasRole } = useAuth();

// Show "Add Product" only to farmers
{hasRole(['farmer']) && (
  <Button onClick={openAddProductModal}>Add Product</Button>
)}

// Show admin menu only to admins
{hasRole(['admin']) && (
  <MenuItem onClick={() => navigate('/admin/users')}>User Management</MenuItem>
)}

// Hide wholesale prices from customers
{hasRole(['business', 'restaurant']) && (
  <Typography>Wholesale: ₹{product.wholesalePrice}</Typography>
)}
```

**Conditional Navigation**:
```jsx
const Sidebar = () => {
  const { user } = useAuth();
  
  const menuItems = {
    customer: [{ label: 'Browse', path: '/customer/catalog' }, { label: 'Orders', path: '/customer/orders' }],
    farmer: [{ label: 'Inventory', path: '/farmer/inventory' }, { label: 'Orders', path: '/farmer/orders' }],
    admin: [{ label: 'Users', path: '/admin/users' }, { label: 'Products', path: '/admin/products' }],
    // ... other roles
  };
  
  return (
    <nav>
      {menuItems[user.role].map(item => (
        <NavLink to={item.path}>{item.label}</NavLink>
      ))}
    </nav>
  );
};
```

---

## Performance Optimization

### Code-Splitting
```jsx
const FarmerDashboard = lazy(() => import('./pages/farmer/FarmerDashboard'));

<Suspense fallback={<Loader />}>
  <Routes>
    <Route path="/farmer/*" element={<FarmerDashboard />} />
  </Routes>
</Suspense>
```

### Memoization
```jsx
const ProductList = ({ products, onAddToCart }) => {
  const sortedProducts = useMemo(() => 
    products.sort((a, b) => a.price - b.price), 
    [products]
  );
  
  const handleAddToCart = useCallback((product) => {
    onAddToCart(product);
  }, [onAddToCart]);
  
  return sortedProducts.map(product => 
    <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
  );
};
```

### Lazy Load Images
```jsx
<img src={product.image} alt={product.name} loading="lazy" />
```

### Virtual Scrolling
Use `react-window` for long product lists.

---

## Form Handling with React Hook Form

```jsx
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

const schema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().min(8).required()
});

const LoginForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  });

  const onSubmit = async (data) => {
    await login(data.email, data.password);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('email')} error={errors.email} />
      <Input {...register('password')} type="password" error={errors.password} />
      <Button type="submit">Login</Button>
    </form>
  );
};
```

---

## Accessibility & Responsiveness

- **ARIA labels** on interactive elements
- **Keyboard navigation** support (Tab, Enter, Escape)
- **Focus management** in modals
- **Color contrast** ratios meet WCAG standards
- **Responsive breakpoints**: Mobile (< 768px), Tablet (768-1024px), Desktop (> 1024px)
- **Mobile-first CSS**: Use min-width media queries
- **Touch-friendly**: Buttons ≥ 44x44px

---

## Key UX Details

1. **Loading states**: Show skeletons/spinners during data fetch
2. **Empty states**: Friendly messages when no data (empty cart, no orders)
3. **Error handling**: User-friendly error messages, retry buttons
4. **Success feedback**: Toast notifications for actions (added to cart, order placed)
5. **Confirmation dialogs**: For destructive actions (delete product, cancel order)
6. **Real-time updates**: WebSocket notifications for order status changes
7. **Search**: Debounced search input (300ms delay)
8. **Filters**: URL query params for shareable filtered views
9. **Image previews**: Zoom on hover, lightbox on click
10. **Form auto-save**: Preserve unsaved form data in localStorage

---

## Implementation Checklist

### Authentication ✓
- [x] Login/Signup forms for all roles
- [x] JWT token management
- [x] Protected routes with role checking
- [x] Redirect to role-specific dashboard

### Farmer ✓
- [x] Inventory management table
- [x] Add/edit product forms
- [x] Order queue with accept/reject
- [x] Earnings dashboard

### Customer ✓
- [x] Product catalog with filters
- [x] ProductCard component
- [x] Shopping cart
- [x] Checkout flow (multi-step)
- [x] Order tracking

### Business ✓
- [x] Bulk order form with CSV upload
- [x] Supplier management
- [x] Purchase analytics

### Restaurant ✓
- [x] Recurring orders setup
- [x] Menu-based ordering
- [x] Delivery schedule calendar

### Delivery ✓
- [x] Large-scale: Jobs list, fleet management
- [x] Small-scale: Route map, delivery actions

### Admin ✓
- [x] User management with KYC
- [x] Product moderation
- [x] Order overview
- [x] Analytics dashboard

### Shared ✓
- [x] Reusable components (Button, Input, Modal, ProductCard)
- [x] Cart and Notification contexts
- [x] Conditional rendering by role
- [x] Responsive design
- [x] Form validation
- [x] Code-splitting

---

## Conclusion

## Maps & Location

- Use a lightweight map library for delivery views: `react-leaflet` with OpenStreetMap tiles by default; optionally support Google Maps if keys are provided
- Show origin/destination markers and polyline routes for deliveries (both large and small scale)
- Use browser geolocation for “deliveries near me” and to improve last-mile routing

## Environment & Config

- API base URL via environment: `VITE_API_BASE_URL` (e.g., `http://localhost:5000/api`)
- Token storage: Prefer httpOnly cookies set by backend. If using localStorage, keep access tokens short-lived and refresh on demand
- Feature flags: keep routing compatible with React Router v7 future flags where practical
This React frontend implements a complete multi-role marketplace with role-based access control (RBAC), ensuring users only access features authorized for their role. The modular component architecture promotes reusability, while code-splitting and performance optimizations ensure a fast user experience. Each role has a tailored interface optimized for their specific workflows—from farmers managing inventory to customers browsing products to admins overseeing the platform.
