# FarmKart - Prompt Instructions Implementation Plan

## 📊 Project Overview

**FarmKart** is a comprehensive MERN-stack agricultural marketplace platform connecting:
- 🌾 **Farmers** (Producers) → **Customers** (B2C) 
- 🌾 **Farmers** → **Businesses/Restaurants** (B2B)
- 🚚 **Two-tier Delivery System** (Long-haul + Last-mile)
- 👨‍💼 **Admin** (Platform Management)

### Core Vision
Eliminate agricultural middlemen by enabling direct farm-to-consumer/business connections, increasing farmer income while providing fresher products at competitive prices.

---

## 📋 Prompt Files Analysis

### 1. SYSTEM_OVERVIEW_PROMPT.md
**Purpose**: High-level system design and architecture
**Key Requirements**:
- 7 distinct user roles with specific capabilities
- Dual commerce modes (B2C + B2B)
- Two-tier logistics (farm→hub→customer)
- RBAC security implementation
- JWT authentication
- MERN stack with modular architecture
- Recurring orders with scheduling
- Performance optimization & scalability

### 2. BACKEND_API_PROMPT.md
**Purpose**: Complete Express.js/MongoDB backend implementation
**Key Requirements**:
- User model with Mongoose discriminators (7 roles)
- JWT authentication with RBAC middleware
- Request validation with express-validator
- RecurringOrder model for scheduled purchases
- Complete REST API endpoints
- Security best practices (bcrypt, helmet, rate limiting)
- Background job scheduler for recurring orders
- Proper error handling patterns

### 3. REACT_FRONTEND_PROMPT.md
**Purpose**: Detailed React frontend implementation
**Key Requirements**:
- Role-based routing with protected routes
- 7 role-specific dashboards
- AuthContext, CartContext, NotificationContext
- Form handling with React Hook Form + Yup
- Code-splitting with React.lazy
- Conditional rendering by role (RBAC in UI)
- Performance optimization (memoization, lazy loading)
- Accessibility features (ARIA, keyboard navigation)

---

## ✅ Current Implementation Status

### Backend (80% Complete)
✅ **Implemented**:
- 11 Mongoose models (User, Products, Orders, Inventory, etc.)
- 8 REST API route files
- JWT token generation
- Password hashing with bcryptjs
- Basic error handling
- Database seeding with sample data
- CORS enabled

❌ **Missing per BACKEND_API_PROMPT**:
- Authentication middleware (`middleware/auth.middleware.js`)
- RBAC middleware (`middleware/role.middleware.js`)
- Request validation middleware (express-validator)
- Error handling middleware (centralized)
- RecurringOrder model for scheduled orders
- Recurring order routes (`/api/recurring-orders`)
- Background scheduler for recurring orders (node-cron/Bull)
- Delivery scale-filtered routes (`/api/delivery-large`, `/api/delivery-small`)
- Helmet for security headers
- Rate limiting middleware
- API documentation (Swagger/OpenAPI)

### Frontend (70% Complete)
✅ **Implemented**:
- AuthContext with JWT management
- CartContext with localStorage persistence
- NotificationContext with Material-UI
- API service layer (`services/api.js`)
- Role-based routing in App.jsx
- 7 role-specific dashboards
- Common reusable components (Button, Input, Modal, Loader)
- ProductCard component
- Code-splitting with React.lazy

❌ **Missing per REACT_FRONTEND_PROMPT**:
- Protected route component (`PrivateRoute`)
- Product catalog with filters sidebar
- Multi-step checkout flow
- Form validation with React Hook Form + Yup
- Business bulk order form with CSV upload
- Restaurant recurring orders interface
- Admin user management with KYC
- Delivery dashboards split (large-scale vs small-scale)
- Real-time notifications (WebSocket)
- Maps integration for delivery tracking
- Virtual scrolling for long lists

---

## 🎯 Implementation Priorities (Following Prompt Instructions)

### Phase 1: Critical Backend Middleware (BACKEND_API_PROMPT)
**Priority: HIGH**

1. **Authentication Middleware** ✨
   - Create `backend/middleware/auth.middleware.js`
   - Implement `authenticate()` function
   - Verify JWT tokens
   - Attach user to `req.user`

2. **RBAC Middleware** ✨
   - Create `backend/middleware/role.middleware.js`
   - Implement `authorize(...roles)` function
   - Check user roles against allowed roles
   - Return 403 Forbidden if unauthorized

3. **Validation Middleware** ✨
   - Install and configure express-validator
   - Create validation schemas for all routes
   - Implement validation chains

4. **Enhanced Error Handler** ✨
   - Centralized error handling
   - Mongoose validation errors
   - JWT errors
   - Duplicate key errors

### Phase 2: Recurring Orders Feature (SYSTEM_OVERVIEW_PROMPT + BACKEND_API_PROMPT)
**Priority: HIGH**

5. **RecurringOrder Model** ✨
   ```javascript
   {
     buyerId, type, itemsTemplate, deliveryAddressId,
     schedule: { frequency, nextRunAt, endDate, customCron },
     status: ['active','paused','cancelled'],
     lastRun: { ranAt, orderId, success, error }
   }
   ```

6. **Recurring Order Routes**
   - GET `/api/recurring-orders` - List schedules
   - POST `/api/recurring-orders` - Create schedule
   - PUT `/api/recurring-orders/:id` - Update schedule
   - PATCH `/api/recurring-orders/:id/pause` - Pause
   - PATCH `/api/recurring-orders/:id/resume` - Resume
   - DELETE `/api/recurring-orders/:id` - Cancel

7. **Background Scheduler** ✨
   - Install node-cron or Bull
   - Create scheduler service
   - Poll due schedules
   - Generate Orders atomically
   - Advance nextRunAt on success

### Phase 3: Security Enhancements (BACKEND_API_PROMPT)
**Priority: MEDIUM**

8. **Security Packages**
   - Install helmet, express-rate-limit
   - Configure security headers
   - Rate limiting per IP/user
   - Input sanitization

9. **Route Protection**
   - Apply `authenticate` to all protected routes
   - Apply `authorize` with specific roles
   - Validate all request inputs

### Phase 4: Frontend Critical Features (REACT_FRONTEND_PROMPT)
**Priority: HIGH**

10. **Protected Routes Component**
    ```jsx
    const PrivateRoute = ({ children, allowedRoles = [] }) => {
      // Check auth and roles
    }
    ```

11. **Product Catalog with Filters**
    - Left sidebar with filters (price, category, location)
    - Product grid with ProductCard
    - Search with debounce
    - Pagination or infinite scroll

12. **Multi-Step Checkout**
    - Step 1: Delivery Address
    - Step 2: Time Slot
    - Step 3: Payment Method
    - Step 4: Review & Confirm
    - Progress indicator

13. **Form Validation**
    - Install react-hook-form + yup
    - Create validation schemas
    - Apply to all forms

### Phase 5: Role-Specific Features (REACT_FRONTEND_PROMPT)
**Priority: MEDIUM**

14. **Business Dashboard**
    - CSV upload for bulk orders
    - Order builder table
    - Supplier management
    - Purchase analytics

15. **Restaurant Dashboard**
    - Recurring orders interface
    - Calendar view
    - Menu-based ordering
    - Pause/resume controls

16. **Admin Dashboard**
    - User management table
    - KYC approval workflow
    - Product moderation
    - Analytics charts

17. **Delivery Dashboards**
    - Split into Large-Scale and Small-Scale
    - Route maps
    - Job acceptance
    - Status updates

### Phase 6: Performance & UX (REACT_FRONTEND_PROMPT)
**Priority: LOW**

18. **Performance Optimizations**
    - useMemo for expensive calculations
    - useCallback for event handlers
    - React.memo for components
    - Virtual scrolling with react-window

19. **Accessibility**
    - ARIA labels on all interactive elements
    - Keyboard navigation
    - Focus management in modals
    - Color contrast compliance

20. **Real-time Features**
    - WebSocket for order status updates
    - Live delivery tracking
    - In-app notifications

---

## 🔧 Specific Instructions from Prompts

### BACKEND_API_PROMPT Instructions

#### Authentication Middleware (Page 1, Line 342-355)
```javascript
export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({error: 'No token provided'});
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId).select('-passwordHash');
    if (!req.user) return res.status(401).json({error: 'User not found'});
    next();
  } catch (error) {
    res.status(401).json({error: 'Invalid token'});
  }
};
```

#### RBAC Middleware (Page 1, Line 360-370)
```javascript
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({error: 'Unauthorized'});
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({error: 'Forbidden: Insufficient permissions'});
    }
    next();
  };
};
```

#### Usage Example (Page 1, Line 373-376)
```javascript
router.post('/products', authenticate, authorize('farmer', 'admin'), createProduct);
router.get('/admin/analytics', authenticate, authorize('admin'), getAnalytics);
```

### REACT_FRONTEND_PROMPT Instructions

#### Protected Route (Page 1, Line 96-109)
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

#### Conditional Rendering (Page 1, Line 366-383)
```jsx
// Show features only to authorized roles
{hasRole(['farmer']) && (
  <Button onClick={openAddProductModal}>Add Product</Button>
)}

// Hide wholesale prices from customers
{hasRole(['business', 'restaurant']) && (
  <Typography>Wholesale: ₹{product.wholesalePrice}</Typography>
)}
```

### SYSTEM_OVERVIEW_PROMPT Instructions

#### Recurring Orders (Line 354-359)
- Model recurring orders with schedule metadata
- Support frequencies: weekly, biweekly, monthly, custom cron
- Background worker scans due schedules
- Generate Orders atomically with inventory reservation
- Buyers can pause/resume/cancel schedules
- Audit each schedule run for observability

---

## 📦 Required Dependencies

### Backend (Need to Install)
```json
{
  "helmet": "^7.0.0",
  "express-rate-limit": "^7.0.0",
  "express-validator": "^7.0.0",
  "node-cron": "^3.0.0",
  "swagger-jsdoc": "^6.0.0",
  "swagger-ui-express": "^5.0.0"
}
```

### Frontend (Need to Install)
```json
{
  "react-hook-form": "^7.50.0",
  "yup": "^1.3.0",
  "@hookform/resolvers": "^3.3.0",
  "react-window": "^1.8.10",
  "react-leaflet": "^4.2.0",
  "leaflet": "^1.9.0"
}
```

---

## 🚀 Next Immediate Actions

### Step 1: Create Backend Middleware (15 mins)
- Create `backend/middleware/auth.middleware.js`
- Create `backend/middleware/role.middleware.js`
- Create `backend/middleware/validation.middleware.js`
- Update `server.js` to use new middleware

### Step 2: Protect All Routes (10 mins)
- Add `authenticate` middleware to protected routes
- Add `authorize` with role checks
- Test authentication flow

### Step 3: Create RecurringOrder Model (20 mins)
- Create `backend/models/RecurringOrder.model.js`
- Implement schema per BACKEND_API_PROMPT
- Create routes for CRUD operations

### Step 4: Implement Background Scheduler (30 mins)
- Install node-cron
- Create scheduler service
- Poll recurring orders and generate real orders
- Handle inventory reservation

### Step 5: Frontend Protected Routes (15 mins)
- Create `PrivateRoute` component
- Update App.jsx routes
- Test role-based access

### Step 6: Product Filters (30 mins)
- Create filter sidebar
- Implement filter logic
- Connect to backend API with query params

---

## 📊 Success Metrics

Following prompt instructions will achieve:
- ✅ **Security**: Full RBAC implementation
- ✅ **Features**: Recurring orders for B2B clients
- ✅ **UX**: Role-specific dashboards with proper access control
- ✅ **Performance**: Code-splitting, lazy loading, memoization
- ✅ **Scalability**: Background jobs, proper indexing
- ✅ **Maintainability**: Modular architecture, reusable components

---

## 📚 Reference Documents

- `prompts/SYSTEM_OVERVIEW_PROMPT.md` - System architecture & roles
- `prompts/BACKEND_API_PROMPT.md` - Backend implementation details
- `prompts/REACT_FRONTEND_PROMPT.md` - Frontend implementation guide
- `prompts/PROMPTS_GUIDE.md` - How to use the prompts

---

**Status**: Ready to implement missing features per prompt instructions
**Estimated Time**: 6-8 hours for all high-priority items
**Next Step**: Create authentication and RBAC middleware
