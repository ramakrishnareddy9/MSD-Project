# FarmKart Express/MongoDB Backend API Prompt

## Overview

Build a comprehensive **RESTful API** using **Express.js** and **MongoDB** (with Mongoose) for the FarmKart agricultural marketplace. Implement **JWT-based authentication**, **role-based access control (RBAC)** for seven user roles, and support both B2C and B2B transactions with proper data models, validation, and security.

---

## Technical Stack

- **Node.js 18+**, **Express.js 4+**, **MongoDB 6+**, **Mongoose 8+**
- **JWT (jsonwebtoken)** for authentication
- **bcryptjs** for password hashing
- **express-validator** for request validation
- **helmet**, **cors** for security
- **dotenv** for environment configuration

### Project Structure

```
backend/
├── src/
│   ├── config/          # Database, JWT config
│   ├── models/          # Mongoose schemas
│   ├── controllers/     # Business logic
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth, RBAC, validation, error handling
│   ├── services/        # Reusable services (email, payment)
│   └── utils/           # Helpers, validators
├── tests/
├── .env.example
└── server.js
```

---

## 1. User Model with Role-Based Discriminators

### Base User Schema

Use **Mongoose discriminators** for role-specific fields while maintaining a single `users` collection.

**Common fields** (all roles):
```javascript
{
  name, email, phone, passwordHash,
  profileImage, status, kycStatus,
  addresses: [{ type, line1, city, state, postalCode, coordinates }],
  loyaltyPoints, emailVerified, phoneVerified,
  lastLogin, refreshToken
}
```

**Indexes**:
- `email` (unique index for fast login lookup)
- `phone` (unique)
- `status` (filter active users)
- `addresses.coordinates` (2dsphere for geospatial queries)

**Methods**:
- `comparePassword(candidatePassword)` - Verify password with bcrypt
- `generateAuthToken()` - Create JWT with userId, role, email
- `toJSON()` - Remove sensitive fields (passwordHash, refreshToken)

**Pre-save hook**: Hash password with bcrypt (salt rounds ≥ 12)

### Role Discriminators

**Farmer** (`farmer`):
```javascript
{
  farmName, farmType, farmSize: {value, unit},
  certifications: ['organic', 'fair_trade', ...],
  bankAccount: {accountNumber, ifscCode, bankName}, // select: false
  payoutSchedule, experienceYears, specialization,
  rating: {average, count}
}
```

**Business** (`business`):
```javascript
{
  companyName, companyType, gstNumber (unique),
  panNumber, businessLicense,
  paymentTerms: ['prepaid', 'net_7', 'net_15', 'net_30'],
  creditLimit, purchaseVolume: {monthly, yearly}
}
```

**Restaurant** (`restaurant`):
```javascript
{
  restaurantName, cuisineType, fssaiLicense (unique),
  seatingCapacity, operatingHours: {open, close, daysOpen},
  deliveryWindowPreference, preferredDeliveryTime,
  paymentTerms
}
```

**DeliveryPartner** (`delivery`):
```javascript
{
  companyName, scale: ['large', 'small'],
  vehicleTypes: ['truck', 'van', 'bike', ...],
  coldChainCapable, serviceAreas: [{type, name, coverage}],
  capacity: {maxWeight, maxVolume},
  insurance: {provider, policyNumber, coverage, expiryDate},
  rating: {average, count}, completedDeliveries
}
```

**Customer** (`customer`):
```javascript
{
  preferences: {categories, organicOnly},
  wishlist: [ProductId]
}
```

**Admin** (`admin`):
```javascript
{
  permissions: ['users', 'products', 'orders', 'analytics', 'all'],
  department
}
```

---

## 2. Product Model

**Schema fields**:
```javascript
{
  farmerId (ref User, indexed),
  categoryId (ref Category, indexed),
  name, description, slug (unique),
  unit: ['kg', 'liter', 'piece', ...],
  pricing: {
    basePrice, wholesalePrice, currency, discount
  },
  images: [{url, alt, isPrimary}],
  type: ['raw', 'processed', 'value_added'],
  isPerishable, shelfLife: {value, unit},
  storageRequirements: ['ambient', 'refrigerated', 'frozen'],
  tags (array, indexed),
  status: ['active', 'out_of_stock', 'discontinued', 'pending_approval'],
  minOrderQuantity, maxOrderQuantity,
  averageRating, totalReviews, totalSold, views
}
```

**Indexes**:
- Text search: `{name: 'text', description: 'text', tags: 'text'}`
- `{farmerId: 1, status: 1}`, `{categoryId: 1, status: 1}`
- `{status: 1, averageRating: -1}`, `{'pricing.basePrice': 1}`

**Virtual**: `finalPrice` = basePrice × (1 - discount/100)

**Pre-save hook**: Generate `slug` from name + product ID

---

## 3. Order Model (B2C + B2B)

**Schema fields**:
```javascript
{
  orderNumber (unique, auto-generated: ORD/BOD + timestamp),
  type: ['b2c', 'b2b'],
  buyerId (ref User, indexed),
  items: [{
    productId, productName, productImage,
    quantity, unit, unitPrice, totalPrice,
    farmerId
  }],
  pricing: {
    subtotal, deliveryFee, tax, discount, total, currency
  },
  status: [
    'pending', 'confirmed', 'processing', 'ready_for_pickup',
    'picked_up', 'in_transit', 'out_for_delivery',
    'delivered', 'cancelled', 'refunded'
  ],
  statusHistory: [{status, timestamp, note, updatedBy}],
  deliveryAddress: {recipientName, line1, city, coordinates, instructions},
  deliverySchedule: {preferredDate, preferredTimeSlot, actualDeliveryDate},
  payment: {
    method: ['cod', 'card', 'upi', 'net_banking', 'wallet', 'credit'],
    status: ['pending', 'completed', 'failed', 'refunded'],
    transactionId, paidAt,
    paymentTerms, dueDate // B2B
  },
  b2bDetails: {
    isBulkOrder, purchaseOrderNumber, invoiceNumber, contractId
  },
  notes: {customer, farmer, internal},
  loyaltyPointsEarned, couponCode
}
```

**Indexes**:
- `{orderNumber: 1}`, `{buyerId: 1, status: 1, createdAt: -1}`
- `{'items.farmerId': 1, status: 1}`, `{type: 1, status: 1}`

**Pre-save hooks**:
- Generate unique `orderNumber`
- Add status changes to `statusHistory`

---

### 3A. Recurring Order Model (Schedules)

Use a separate collection to define recurring purchase schedules that generate concrete Orders on schedule. This avoids overloading the Order schema and simplifies auditing.

**Schema fields**:
```javascript
{
  buyerId (ref User, indexed),
  type: ['b2c','b2b'],
  itemsTemplate: [{
    productId, quantity, unit, maxPrice // optional price caps
  }],
  deliveryAddressId (ref User.addresses),
  deliveryPreferences: { preferredTimeSlot, notes },
  pricingPreferences: { applyCoupons: Boolean, useLoyalty: Boolean },
  schedule: {
    frequency: ['weekly','biweekly','monthly','custom'],
    customCron, // for advanced schedules
    nextRunAt, endDate, timezone
  },
  status: ['active','paused','cancelled'],
  lastRun: { ranAt, orderId, success, error },
  createdBy, updatedBy
}
```

**Behavior**:
- A background worker polls due schedules (`nextRunAt <= now`) and creates Orders atomically with inventory reservation
- On success, advances `nextRunAt` according to `frequency`; on failure, records error and retries with backoff
- Buyers and admins can pause/resume/cancel schedules

## 4. Inventory Model

**Schema fields**:
```javascript
{
  productId (ref Product, indexed),
  farmerId (ref User),
  locationId (ref Location),
  quantity, reservedQuantity, unit,
  harvestDate, expiryDate, batchNumber (indexed),
  qualityGrade: ['A', 'B', 'C'],
  storageCondition, notes
}
```

**Virtual**: `availableQuantity` = quantity - reservedQuantity

**Methods**:
- `reserve(qty)` - Reserve stock for order
- `release(qty)` - Release reserved stock (order cancelled)
- `deduct(qty)` - Deduct after order fulfilled

---

## 5. Delivery Model

**Schema fields**:
```javascript
{
  orderId (ref Order, indexed),
  deliveryPartnerId (ref User, indexed),
  type: ['large', 'small'], // aligns with role keys delivery_large and delivery_small
  origin: {locationType, locationId, address, coordinates},
  destination: {locationType, address, coordinates},
  distance, estimatedTime,
  status: [
    'pending_assignment', 'assigned', 'accepted',
    'picked_up', 'in_transit', 'delivered', 'failed'
  ],
  tracking: {
    currentLocation: {coordinates, updatedAt},
    checkpoints: [{location, timestamp, note}]
  },
  vehicle: {type, registration, driver},
  pricing: {baseFee, distanceFee, total},
  proofOfDelivery: {signature, photos, timestamp},
  rating: {score, comment, ratedBy}
}
```

**Indexes**: `{orderId: 1}`, `{deliveryPartnerId: 1, status: 1}`

---

## 6. Payment & Review Models

**Payment** (optional separate collection):
```javascript
{
  orderId, userId, amount, method, status,
  gatewayTransactionId, gatewayResponse,
  refundAmount, refundedAt
}
```

**Review**:
```javascript
{
  userId, productId, orderId,
  rating (1-5), title, comment, images,
  verifiedPurchase, helpfulCount, status,
  response: {text, respondedBy, respondedAt} // Farmer reply
}
```

**Post-save hook**: Update product `averageRating` and `totalReviews`

---

## Authentication & Authorization

### JWT Authentication Flow

**1. Registration** (`POST /api/auth/register`):
- Validate input (email format, password strength)
- Check if email/phone already exists
- Create user with hashed password
- Generate JWT token
- Return user data + token

**2. Login** (`POST /api/auth/login`):
- Find user by email
- Verify password with `comparePassword()`
- Check user status (active, not suspended)
- Generate JWT with payload: `{userId, role, email}`
- Update `lastLogin`
- Return user data + token

**3. Token Verification Middleware** (`middleware/auth.middleware.js`):
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

### Role-Based Access Control (RBAC)

**Role Middleware** (`middleware/role.middleware.js`):
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

**Usage in routes**:
```javascript
router.post('/products', authenticate, authorize('farmer', 'admin'), createProduct);
router.get('/admin/analytics', authenticate, authorize('admin'), getAnalytics);
```

---

## API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /logout` - Logout (invalidate refresh token)
- `POST /refresh-token` - Refresh access token
- `POST /forgot-password` - Send password reset email
- `POST /reset-password` - Reset password with token
- `GET /me` - Get current user (requires auth)

### User Routes (`/api/users`)
- `GET /` - Get all users (admin only)
- `GET /:id` - Get user by ID
- `PUT /:id` - Update user (self or admin)
- `DELETE /:id` - Delete user (admin only)
- `GET /:id/orders` - Get user's orders
- `POST /:id/verify-kyc` - Submit KYC documents
- `PATCH /:id/status` - Update user status (admin)

### Product Routes (`/api/products`)
- `GET /` - Get all products (public, with filters: category, price, location, tags, search)
- `GET /:id` - Get product by ID
- `POST /` - Create product (farmer, admin)
- `PUT /:id` - Update product (owner or admin)
- `DELETE /:id` - Delete product (owner or admin)
- `GET /search` - Search products (text search)
- `GET /farmer/:farmerId` - Get farmer's products

### Order Routes (`/api/orders`)
- `GET /` - Get orders (filtered by role: buyer sees own, farmer sees received, admin sees all)
- `GET /:id` - Get order by ID (buyer, seller, or admin)
- `POST /` - Create order (authenticated users)
- `PATCH /:id/status` - Update order status (farmer, delivery partner, admin)
- `POST /:id/cancel` - Cancel order (buyer, within time limit)
- `GET /buyer/:userId` - Get buyer's orders
- `GET /farmer/:farmerId` - Get farmer's received orders

### Recurring Order Routes (`/api/recurring-orders`)
- `GET /` - List recurring order schedules for current user (admin can list all)
- `GET /:id` - Get a recurring schedule by ID
- `POST /` - Create recurring schedule (buyer roles)
- `PUT /:id` - Update recurring schedule
- `PATCH /:id/pause` - Pause a schedule
- `PATCH /:id/resume` - Resume a schedule
- `DELETE /:id` - Cancel and remove schedule

### Delivery Routes (`/api/deliveries`)
- `GET /` - Get deliveries (filtered by partner or admin)
- `GET /:id` - Get delivery by ID
- `POST /` - Create delivery assignment (admin or system)
- `PATCH /:id/accept` - Accept delivery (delivery partner)
- `PATCH /:id/status` - Update delivery status
- `POST /:id/location` - Update current location (tracking)
- `POST /:id/complete` - Mark as delivered (with proof)

### Convenience Delivery Routes (scale-filtered)
- `/api/delivery-large` — Same as `/api/deliveries` but implicitly filtered with `{ type: 'large' }`
- `/api/delivery-small` — Same as `/api/deliveries` but implicitly filtered with `{ type: 'small' }`

### Review Routes (`/api/reviews`)
- `GET /product/:productId` - Get product reviews
- `POST /` - Create review (verified buyers only)
- `PUT /:id` - Update review (owner)
- `DELETE /:id` - Delete review (owner or admin)
- `POST /:id/helpful` - Mark review as helpful

### Admin Routes (`/api/admin`)
- `GET /analytics/sales` - Sales analytics (aggregate orders)
- `GET /analytics/users` - User statistics
- `GET /analytics/products` - Product performance
- `GET /pending-approvals` - Products/KYC awaiting approval
- `POST /approve-product/:id` - Approve product
- `POST /approve-kyc/:userId` - Approve KYC
- `POST /bulk-actions` - Bulk operations

---

## Validation & Error Handling

### Request Validation

Use **express-validator** for input validation:
```javascript
import { body, validationResult } from 'express-validator';

export const validateRegister = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({min: 8}).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('name').trim().isLength({min: 2, max: 100}),
  body('phone').matches(/^[+]?[\d\s-()]+$/),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({errors: errors.array()});
    }
    next();
  }
];
```

### Error Handling Middleware

```javascript
export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate entry',
      field: Object.keys(err.keyPattern)[0]
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({error: 'Invalid token'});
  }
  
  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
};
```

---

## Security Best Practices

1. **Password Security**:
   - Hash with bcrypt (≥12 salt rounds)
   - Never store plain passwords
   - Implement password strength requirements

2. **JWT Security**:
   - Use strong secret (min 256 bits)
   - Short expiry (7 days for access token, 30 days for refresh)
   - Store tokens securely (httpOnly cookies preferred)

3. **Input Validation**:
   - Validate all user inputs
   - Sanitize data to prevent XSS
   - Use Mongoose schema validation

4. **HTTP Security**:
   - Use `helmet` for security headers
   - Enable CORS with whitelist
   - Rate limiting (express-rate-limit)
   - HTTPS in production

5. **Database Security**:
   - Use indexes for performance
   - Avoid exposing sensitive data (use `select: false`)
   - Implement field-level encryption for payment data

6. **RBAC Enforcement**:
   - Check roles on every protected route
   - Verify ownership (users can only modify their own data)
   - Admin-only routes properly restricted

---

## Performance Optimization

1. **Database Indexing**: Index frequently queried fields (email, status, categoryId, etc.)
2. **Pagination**: Implement for all list endpoints (default 20 items/page)
3. **Lean Queries**: Use `.lean()` for read-only operations
4. **Population**: Limit populated fields with `select`
5. **Caching**: Implement Redis for frequently accessed data
6. **Aggregation**: Use MongoDB aggregation pipeline for analytics

---

## Scheduling & Background Jobs

- Use a scheduler/queue for non-request work:
  - `node-cron` for simple time-based schedules, or a persistent job queue like `Bull`/`BullMQ` or `Agenda` for reliability
- Primary jobs:
  - Generate Orders from due RecurringOrder schedules
  - Inventory housekeeping (release expired reservations, expiry alerts)
  - Notification fan-out (email/SMS/in-app)
- Store job metadata for observability (attempts, last error, next run)
- Use separate worker process; avoid running heavy jobs in the API server process

---

## API Documentation

Use **Swagger/OpenAPI** for API documentation:
- Install `swagger-ui-express` and `swagger-jsdoc`
- Document all endpoints with request/response schemas
- Include authentication requirements
- Provide example requests

---

## Testing

1. **Unit Tests**: Test models, controllers, utilities
2. **Integration Tests**: Test API endpoints with supertest
3. **Coverage**: Aim for ≥80% code coverage
4. **Test Database**: Use separate test database

---

## Environment Configuration

**Required `.env` variables**:
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/farmkart
JWT_SECRET=your_super_secret_key_min_256_bits
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=another_secret
REFRESH_TOKEN_EXPIRES_IN=30d
BCRYPT_ROUNDS=12
```

---

## Summary

This backend implements a complete RESTful API with:
- ✅ User model with 7 role discriminators
- ✅ JWT authentication with RBAC
- ✅ Product, Order, Inventory, Delivery models
- ✅ Comprehensive validation and error handling
- ✅ Security best practices (bcrypt, JWT, input sanitization)
- ✅ Performance optimization (indexing, pagination)
- ✅ Modular architecture (MVC pattern)
- ✅ Role-specific API endpoints with proper authorization
