# FarmKart — Agricultural Supply Chain Marketplace

> A full-stack B2B/B2C marketplace connecting farmers directly to buyers, restaurants, businesses, and communities — with integrated delivery logistics, real-time notifications, and atomic transaction guarantees.

**Live Demo**: [https://msd-project-farmkart.netlify.app](https://msd-project-farmkart.netlify.app)  
**Backend API**: Deployed on Render (Node.js)  
**Database**: MongoDB Atlas

---

## What This Application Does

FarmKart eliminates the middleman in agricultural supply chains. Farmers list produce directly on the platform. Multiple buyer types — individual customers, restaurants, businesses, and community buying groups — can purchase through B2C or B2B negotiation flows. A two-tier delivery network (long-haul and last-mile) handles logistics end-to-end.

### Core Problem Solved
Traditional agricultural supply chains have 3-5 layers of distributors between the farmer and the end buyer, inflating prices by 40-60%. FarmKart creates a direct, transparent marketplace where:
- **Farmers** get fair prices and see real demand.
- **Buyers** pay less with negotiated B2B pricing or community bulk discounts.
- **Delivery partners** get optimized route assignments.

---

## Key Features

### Multi-Role User System
Nine distinct user roles, each with a purpose-built dashboard:

| Role | What they do |
|---|---|
| **Farmer** | List products, manage inventory lots, respond to B2B price negotiations, confirm orders |
| **Customer** | Browse products, add to cart, place B2C orders, track delivery |
| **Business / Travel Agency** | Place B2B orders at negotiated prices, set up recurring purchase schedules |
| **Restaurant** | Ingredient sourcing with bulk pricing, recurring orders for consistent supply |
| **Community** | Group buying — members contribute to a pool, one bulk order is placed for everyone |
| **Delivery (Large-scale)** | Long-haul shipment management between hubs/warehouses |
| **Delivery (Small-scale)** | Last-mile delivery with GPS tracking and proof-of-delivery |
| **Admin** | Platform management, analytics, commission oversight, user administration |

---

### B2B Negotiation Engine
Businesses can initiate price negotiations with farmers for specific products:
1. Business submits a price request with quantity and offered price.
2. Farmer counter-offers or accepts.
3. Buyer accepts the counter — deal is finalized.
4. Order is created at the agreed price with a locked `PriceAgreement` document.
5. For recurring B2B relationships, tier-based pricing agreements are applied automatically.

### Community Bulk Purchasing
Communities can pool individual contributions to reach bulk-order thresholds:
1. Community admin creates a pool for a product.
2. Members contribute quantities and amounts.
3. Admin submits one bulk order to the farmer at wholesale pricing.
4. Delivery is coordinated to a single community pickup point.
5. All members receive real-time notifications at each stage.

### Recurring Orders
Businesses and restaurants can create order templates that auto-execute on a schedule (daily/weekly/monthly):
- Templates define product, quantity, max acceptable price, and delivery address.
- A background scheduler checks every 15 minutes for due orders.
- Orders are created automatically with fresh inventory reservation.
- Double-processing is prevented by an `isProcessing` flag set atomically before each run.

### Two-Tier Delivery Network
**Long-haul (Shipments)**: Large-scale delivery partners transport goods between farms, warehouses, and distribution hubs. Tracked by checkpoint GPS coordinates.

**Last-mile (Tasks)**: Small-scale partners handle hub-to-customer delivery. Real-time GPS updates, photo proof-of-delivery, COD collection support.

---

## Technical Highlights (For Developers)

### Atomic Delivery Assignment — Solving the Race Condition
**Problem**: Multiple delivery partners could simultaneously accept the same delivery task, causing duplicate assignments and logistical chaos (TOCTOU race condition).

**Solution**: MongoDB's atomic `findOneAndUpdate` with a compound filter:
```js
Order.findOneAndUpdate(
  {
    _id: orderId,
    'delivery.requestStatus': 'requested',
    $or: [
      { 'delivery.requestedPartnerId': partnerId },
      { 'delivery.requestedPartnerId': null }   // broadcast task
    ],
    'delivery._assignmentLock': { $exists: false }  // not yet claimed
  },
  {
    $set: {
      'delivery._assignmentLock': new Date(),      // atomic lock
      'delivery.requestedPartnerId': partnerId,    // claim the task
      'delivery.requestStatus': 'accepted'
    }
  }
)
```
If `findOneAndUpdate` returns `null`, another partner claimed it first → API returns `409 Conflict`. The frontend handles this gracefully: closes the dialog, refreshes the task list, shows "Another partner accepted this task."

---

### Inventory Race Condition Prevention
**Problem**: Two buyers could simultaneously order the last unit of a product.

**Solution**: Every lot reservation uses an atomic operation. The `InventoryManager` service:
1. Acquires a per-product advisory lock.
2. Calls `InventoryLot.reserveAvailableLot()` (atomic `findOneAndUpdate` checking `status === 'available'`).
3. On failure of any item in a multi-item order, rolls back all successful reservations (compensating transaction).

---

### JWT Security with Role Escalation Detection
**Problem**: A user could tamper with their JWT payload to claim elevated roles.

**Solution**: Every authenticated request runs `validateJWTRoles()` which fetches the user's actual roles from MongoDB and compares them to the roles in the JWT. Any mismatch is:
- Logged with IP address, endpoint, and role delta.
- Rejected with `401 Compromised Token` for critical mismatches.

The refresh token is stored as a SHA-256 hash in the database (never the raw token). On each refresh, the submitted token is hashed and compared — stolen tokens that were already used will fail this check.

---

### httpOnly Cookie Authentication (No localStorage)
Access tokens never touch JavaScript. The server sets:
- `farmkart_token` (httpOnly, 15 min) — access token
- `farmkart_refresh` (httpOnly, 7 days, path=/api/auth/refresh) — refresh token

The browser sends cookies automatically. The frontend has zero token management code. Silent refresh: when a request returns 401, the API client automatically calls `/auth/refresh` once, then retries the original request — completely transparent to the user.

---

### Cart Price Manipulation Prevention
Clients cannot submit a price — the server always fetches the current product price from the database. Even if a user intercepts and modifies the network request to send `price: 0.01`, the server ignores it and uses the DB price. B2B orders use agreed prices from locked `PriceAgreement` documents.

---

### Order State Machine
Order status transitions are validated by a state machine utility. Invalid transitions (`delivered → pending`) are rejected with a descriptive error. Every transition is appended to an immutable `statusHistory[]` audit trail with timestamp, user ID, and reason.

---

### Real-time Notifications via Socket.IO
When a significant event occurs (order confirmed, delivery accepted, price negotiation update), the backend:
1. Creates a `Notification` document in MongoDB.
2. Emits `notification:new` to the user's Socket.IO room.

The frontend listens via the `useRealtimeNotifications` hook and triggers dashboard refreshes instantly — no polling.

---

### Soft Delete Architecture
User, Product, Order, and Community records are never hard-deleted. A Mongoose plugin adds `isDeleted` + `deletedAt` fields and patches all query middleware to automatically exclude deleted records. This preserves data integrity and provides a full audit trail.

---

## System Architecture

```
┌─────────────────────────────────────────────┐
│              React Frontend (Vite)          │
│  Auth Context → Role-based Dashboard Pages  │
│  Socket.IO Client for real-time updates     │
└────────────────────┬────────────────────────┘
                     │ HTTPS + httpOnly Cookies
                     │ WebSocket (Socket.IO)
┌────────────────────▼────────────────────────┐
│            Node.js / Express API            │
│  Middleware Pipeline: Security → Auth → RBAC│
│  20 Route Modules covering all resources    │
│  Background Schedulers (node-cron)          │
└────────────────────┬────────────────────────┘
                     │ Mongoose ODM
┌────────────────────▼────────────────────────┐
│              MongoDB Atlas                  │
│  27 Collections with compound indexes       │
│  Atomic operations for concurrency control  │
└─────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express.js | 4 | HTTP framework |
| MongoDB + Mongoose | 8 | Database + ODM |
| Socket.IO | Latest | Real-time events |
| JWT (jsonwebtoken) | 9 | Authentication tokens |
| bcryptjs | 2 | Password hashing |
| node-cron | 3 | Scheduled jobs |
| Helmet | 8 | Security headers |
| express-rate-limit | 7 | DDoS/brute-force protection |
| Nodemailer | 6 | Email (OTP, password reset) |
| Multer | 2 | File uploads |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| Vite | Latest | Build tool + dev server |
| React Router DOM | 6 | Client-side routing |
| Material UI (MUI) | 5 | Component library |
| Recharts | Latest | Analytics charts |
| Socket.IO Client | Latest | WebSocket connection |

---

## Project Structure

```
MSD-Project/
├── Backend/
│   ├── server.js               ← Entry point
│   ├── models/                 ← 27 Mongoose schemas
│   ├── routes/                 ← 20 Express routers
│   ├── controllers/            ← Complex business logic
│   ├── services/               ← Background services + managers
│   ├── middleware/             ← Auth, validation, security
│   ├── utils/                  ← Atomic locking, state machine, security
│   └── scripts/                ← DB maintenance scripts
│
└── FrontEnd/
    └── src/
        ├── App.jsx             ← Route definitions
        ├── contexts/           ← Auth, Cart, Notification state
        ├── hooks/              ← useRealtimeNotifications
        ├── layouts/            ← DashboardLayout (navbar shell)
        ├── Components/         ← ProtectedRoute, Navbar, UI components
        ├── pages/
        │   ├── dashboards/     ← 7 role-specific dashboards
        │   ├── customer/       ← ProductCatalog, Cart
        │   └── orders/         ← OrderHistory
        ├── services/           ← api.js (all HTTP calls), socket.js
        └── utils/              ← roleRouting.js
```

---

## Security Features

| Feature | Implementation |
|---|---|
| Authentication | httpOnly JWT cookies (XSS-proof) |
| Role escalation detection | JWT claims re-validated against DB every request |
| Password storage | bcrypt (salt rounds = 10) |
| Input sanitization | xss-clean + express-mongo-sanitize on all inputs |
| Rate limiting | 50 req/15 min auth, 300 req/15 min API |
| CORS | Strict whitelist (Netlify + localhost only) |
| Security headers | Helmet.js (CSP, HSTS, X-Frame-Options) |
| SQL/NoSQL injection | `$`-prefix stripping on all request inputs |
| Delivery race condition | Atomic MongoDB `findOneAndUpdate` with lock field |
| Inventory race condition | Atomic lot reservation with compensating rollback |
| Payment idempotency | 24h idempotency key cache prevents double-charges |
| Token revocation | Refresh token stored as hash; null-ed on logout |
| Soft delete | Records never hard-deleted; full audit trail |

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (Atlas or local replica set for transactions)

### Backend Setup
```bash
cd Backend
npm install
cp .env.example .env
# Fill in MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET, SMTP settings
npm run dev
```

### Frontend Setup
```bash
cd FrontEnd
npm install
# Create .env with VITE_API_BASE_URL=http://localhost:5000/api
npm run dev
```

### Seed Database
```bash
cd Backend
npm run seed:local    # Seeds users, products, inventory
```

---

## API Overview

All endpoints are prefixed with `/api/`.

| Resource | Base Path | Key Operations |
|---|---|---|
| Auth | `/auth` | register, login, logout, refresh, verify-email, forgot/reset-password |
| Users | `/users` | CRUD, profile management |
| Products | `/products` | CRUD, search, catalog |
| Orders | `/orders` | create, status update, delivery request/response |
| Inventory | `/inventory` | lot management, stock tracking |
| Payments | `/payments` | create, success/fail, refund |
| Marketplace | `/marketplace-requests` | B2B negotiation flow |
| Price Agreements | `/price-agreements` | B2B contract management |
| Recurring Orders | `/recurring-orders` | CRUD, pause/resume |
| Delivery | `/delivery/shipments`, `/delivery/tasks` | long-haul and last-mile |
| Commissions | `/commissions` | collection, payouts |
| Communities | `/communities` | group management, pools, bulk orders |
| Notifications | `/notifications` | list, mark read |
| Analytics | `/analytics` | revenue, sales periods |

---

## Database Schema (Key Relationships)

```
User ─────────────┐
  ├─ FarmerProfile │
  ├─ BusinessProfile│
  └─ DeliveryProfile│
                   │
Product (ownerId → User.farmer)
  └─ InventoryLot (productId → Product)

Order (buyerId → User, sellerId → User)
  ├─ orderItems[].productId → Product
  ├─ delivery.requestedPartnerId → User.delivery
  └─ statusHistory[] (audit trail)

Commission (orderId → Order, sellerId → User)

Payment (orderId → Order)

MarketplaceRequest (buyerId → User, farmerId → User, productId → Product)

Community (members[] → User)
  └─ CommunityPool (contributions[] → User)
       └─ → MarketplaceRequest → Order

RecurringOrder (buyerId → User)
  └─ (scheduler creates) → Order

DeliveryTask (orderId → Order, deliveryPartnerId → User)
Shipment (orders[] → Order, deliveryPartnerId → User)
```

---

## Performance Considerations

- **Lazy loading**: Each dashboard is code-split into its own bundle. Initial page load only delivers the landing page.
- **Compound DB indexes**: Key query patterns (buyer's orders, seller's orders, delivery partner's tasks) are indexed.
- **Background jobs**: Recurring order creation and inventory cleanup run asynchronously — no impact on request latency.
- **Socket.IO rooms**: Notifications are pushed per-user to individual rooms, not broadcast to all.
- **Response compression**: Gzip enabled via `compression` middleware.
- **Pagination**: All list endpoints default to 20 items per page.

---

## Documentation

- **[BACKEND.md](./BACKEND.md)** — Full backend documentation: every layer, every file, every function.
- **[FRONTEND.md](./FRONTEND.md)** — Full frontend documentation: architecture, components, data flow, auth patterns.
