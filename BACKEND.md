# FarmKart Backend Documentation

## Tech Stack
- **Runtime**: Node.js 18+, ES Modules (`"type": "module"`)
- **Framework**: Express.js 4
- **Database**: MongoDB via Mongoose 8
- **Auth**: JWT (httpOnly cookies) + bcryptjs
- **Real-time**: Socket.IO
- **Scheduler**: node-cron
- **Security**: Helmet, express-rate-limit, cors, xss-clean, express-mongo-sanitize

---

## Architecture Overview

```
server.js          ← Entry point: middleware pipeline, route mounting, schedulers
  ├── middleware/  ← Runs on every request (auth, validation, rate-limit, logging)
  ├── routes/      ← HTTP endpoint definitions; call controllers/services directly
  ├── controllers/ ← Complex business logic (auth, cart, community, analytics)
  ├── services/    ← Long-running background logic (inventory, orders, sockets)
  ├── models/      ← Mongoose schemas = database shape + hooks + methods
  └── utils/       ← Pure helper functions (stateless, reusable)
```

Request flow: `Client → Rate Limiter → Helmet → CORS → Body Parser → Sanitize → Auth Middleware → Route Handler → Controller/Service → Model → MongoDB`

---

## `server.js` — Application Entry Point

The single file that wires everything together.

| What it does | How |
|---|---|
| Creates Express app + HTTP server | `express()` + `createServer(app)` |
| Attaches security middleware | Helmet, CORS, cookieParser, compression |
| Configures rate limiting | 300 req/15 min (prod) on all routes; 50 req/15 min on `/api/auth` |
| Parses request bodies | `express.json` + `express.urlencoded` (10 MB limit, saves `rawBody`) |
| Sanitizes all input | `sanitizeInput` + `preventSQLInjection` after body parsing |
| Connects to MongoDB | `mongoose.connect(MONGODB_URI)` |
| Mounts 20 route modules | Each under `/api/<resource>` prefix |
| Starts background schedulers | `startRecurringOrderScheduler()` + `startInventoryCleanupScheduler()` |
| Initializes Socket.IO | `initializeSocketServer(server, allowedOrigins)` |

**Key design**: The HTTP server wraps the Express app so Socket.IO can share the same port.

---

## Layer 1 — Models (`models/`)

Every file defines a Mongoose schema = one MongoDB collection.

### `User.model.js`
**Purpose**: The central identity document for every person in the system.

- **`addressSchema`** (sub-document) — Stores multiple addresses per user. Fields: `type` (billing/shipping/farm/etc.), `line1`, `city`, `state`, `postalCode`, `country`, GeoJSON `coordinates` for geospatial queries.
- **`userSchema`** — Main schema fields:
  - `email`, `phone` — unique indexes enforced at DB level
  - `passwordHash` — bcrypt hash, never stored as plain text
  - `roles[]` — array of strings: `customer|farmer|business|travel_agency|restaurant|delivery|delivery_large|delivery_small|admin`
  - `status` — `active|suspended|pending_verification`
  - `refreshTokenHash` — SHA-256 hash of the current refresh token (enables revocation)
  - `emailOtpHash` + `emailOtpExpires` — OTP-based email verification with 10-min TTL
  - `loyaltyPoints` — reward points balance
- **`pre('validate')` hook** — Converts flat `address/city` registration fields into the structured `addressSchema` format using `buildCanonicalAddress()`.
- **`pre('save')` hook** — Automatically bcrypt-hashes `passwordHash` whenever it is modified (salt rounds = 10).
- **`comparePassword(candidate)`** — Instance method; calls `bcrypt.compare()` and returns boolean.
- **`toJSON()`** — Strips `passwordHash` and `refreshTokenHash` from any API response automatically.
- **Plugin**: `softDeletePlugin` — adds `deletedAt`, `isDeleted` fields and query middleware so deleted users are never returned.

---

### `Order.model.js`
**Purpose**: The core transactional document linking buyer → seller → items → delivery.

- **`delivery` sub-document** — `requestedVehicleId`, `requestedPartnerId`, `requestStatus` (none/requested/accepted/rejected), `_assignmentLock` (timestamp used by atomic locking to prevent race conditions), `actualDelivery` date.
- **`statusHistory[]`** — Append-only audit log of every status change with timestamp + updatedBy.
- **`orderItems[]`** — References productId, stores `unitPrice` at time of purchase (snapshot pricing).
- **Indexes**: Compound index on `buyerId + status`, `sellerId + status`, and `delivery.requestedPartnerId` for efficient dashboard queries.

---

### `InventoryLot.model.js`
**Purpose**: Tracks physical stock in lots (batches). Each lot = one harvest/shipment of a product.

- **`reserveAvailableLot()`** — Static method; uses `findOneAndUpdate` atomically to reserve stock, preventing oversell race conditions.
- **`status`** — `available|reserved|sold|expired|recalled`
- **`reservedBy[]`** — Array of `{orderId, quantity}` reservations so one lot can be partially reserved across multiple orders.
- TTL index on `expiryDate` for automatic cleanup of expired lots.

---

### `Commission.model.js`
**Purpose**: Tracks platform commission earned on every order.

- Links `orderId → sellerId`, stores `commissionRate`, `commissionAmount`, `sellerPayout`.
- `status`: `pending → collected → paid_out`
- `adjustments[]` — Admin can add manual debit/credit adjustments with reason audit trail.
- `settlementCycleId` — Groups commissions into payment settlement batches.

---

### `MarketplaceRequest.model.js`
**Purpose**: The negotiation document for B2B/community bulk purchases.

- Tracks back-and-forth price offers between buyer and farmer.
- `lastOfferedBy`: `buyer|farmer` — drives the UI to show whose turn it is.
- `buyerAccepted` + `farmerAccepted` booleans — both must be true to finalize.
- `delivery` sub-document mirrors Order delivery for pre-negotiated logistics.

---

### `RecurringOrder.model.js`
**Purpose**: Scheduled order templates that auto-generate Orders on a cron schedule.

- `frequency`: `daily|weekly|monthly`
- `nextDueAt` — computed after each run using `recordSuccess()` method.
- `isProcessing` flag — prevents two scheduler workers from processing the same template simultaneously (double-processing guard).
- `items[]` — template of product/quantity/maxPrice rules.
- **`recordSuccess(orderId)`** — Instance method; clears `isProcessing`, advances `nextDueAt`, increments `executionCount`.
- **`recordFailure(error)`** — Instance method; logs failure, clears `isProcessing`, increments `failureCount`.

---

### `Payment.model.js`
**Purpose**: Payment transaction records with idempotency support.

- `idempotencyKey` — unique index prevents duplicate payment processing on network retries.
- `status`: `pending → success|failed`
- `refunds[]` — append-only refund log per payment.
- `gatewayResponse` — raw gateway payload stored for dispute resolution.

---

### `PriceAgreement.model.js`
**Purpose**: Negotiated B2B pricing contracts between buyer and seller for a product.

- `tiers[]` — quantity-based pricing tiers: `{minQuantity, maxQuantity, price}`. Order creation automatically selects the applicable tier.
- `validFrom` + `validUntil` — date-range validity enforced in queries.
- `status`: `draft|pending|active|expired|cancelled`

---

### `Community.model.js`
**Purpose**: A group of buyers who pool orders for bulk discounts.

- `members[]` — references User documents.
- `status`: `active|inactive|disbanded`
- `inviteCode` — unique short string for invite-link joining.
- `joinRequests[]` — pending member approval workflow.

---

### `CommunityPool.model.js`
**Purpose**: A specific pooled purchase within a Community.

- `contributions[]` — `{member, quantity, amount}` per contributor.
- `status`: `open|ready|ordered|delivered`
- `assignedVehicle` + `assignedDeliveryPartner` — set when delivery is arranged.

---

### `DeliveryTask.model.js`
**Purpose**: Last-mile delivery task assigned to a small-scale delivery partner.

- `status`: `assigned|accepted|picked_up|in_transit|out_for_delivery|delivered|failed|cancelled`
- `tracking` — current GPS coordinates + route breadcrumb array.
- `proof` — photo URL + signature + receiver name for delivery confirmation.
- `payment.method`: `prepaid|cod|online`

---

### `Shipment.model.js`
**Purpose**: Long-haul transport linking a hub/warehouse origin to a destination, carrying multiple orders.

- `orders[]` — array of order references with individual status.
- `tracking.checkpoints[]` — location breadcrumbs for the shipment journey.

---

### `Vehicle.model.js`
**Purpose**: A vehicle registered by a delivery partner.

- `status`: `Available|On Delivery|Maintenance`
- `_activeClaimLock` — timestamp set atomically during delivery acceptance to prevent double-booking.
- `owner` — references User (delivery partner).

---

### `Notification.model.js`
- `userId`, `title`, `message`, `type`, `isRead`, `relatedId` (polymorphic reference to order/community/etc.).

### `Product.model.js`
- `ownerId` (farmer), `name`, `basePrice`, `unit`, `status` (active/inactive), `stockQuantity` (cached, authoritative is InventoryLot).

### `Category.model.js`, `Review.model.js`, `Cart.model.js`, `Wishlist.model.js`, `Location.model.js`
- Standard CRUD schemas with appropriate indexes and references.

### Profile Models (`FarmerProfile`, `BusinessProfile`, `DeliveryProfile`, `RestaurantProfile`, `TravelAgencyProfile`)
- Extended profile data per role; linked to User via `userId` foreign key.

---

## Layer 2 — Middleware (`middleware/`)

Every file exports Express middleware functions that run before route handlers.

### `auth.middleware.js`

**`extractAccessToken(req)`** — Reads JWT from two places in priority order:
1. `req.cookies['farmkart_token']` (httpOnly cookie set by server — browser clients)
2. `Authorization: Bearer <token>` header (Postman / external API clients)

**`authenticate(req, res, next)`** — Main auth guard used on all protected routes:
1. Extracts token via `extractAccessToken`.
2. Verifies with `jwt.verify()` — throws `TokenExpiredError` or `JsonWebTokenError`.
3. Checks `decoded.type === 'access'` to prevent refresh tokens being used as access tokens.
4. Loads full user from DB (excluding `passwordHash`).
5. **Critical security step**: calls `validateJWTRoles()` to compare roles in the JWT payload against live DB roles — detects tampered tokens where an attacker manually elevated their role claims.
6. Attaches `req.user` and calls `next()`.

**`optionalAuth(req, res, next)`** — Same flow but silently skips if no token — used for public pages that show extra data when logged in.

---

### `role.middleware.js`

**`authorize(...allowedRoles)`** — Factory function returning middleware. Checks `req.user.roles` contains at least one of the allowed roles. Returns `403 Forbidden` if not.

Usage in routes: `router.patch('/...', authenticate, authorize('admin', 'farmer'), handler)`

---

### `validation.middleware.js`

Contains `validateOrder` and `validateObjectId` using `express-validator`.

**`validateOrder`** — Validates order creation body: required fields, numeric prices, array of items with `productId` and `quantity`.

**`validateObjectId(paramName)`** — Validates that a route param is a valid MongoDB ObjectId before hitting the database.

---

### `rbac.middleware.js`

Fine-grained Role-Based Access Control beyond simple role checks. Defines permission maps per resource and action (`read/write/delete`). Used for sensitive admin-level operations.

---

### `sanitize.middleware.js`

**`sanitizeInput(req, res, next)`** — Recursively walks `req.body`, `req.query`, `req.params` and strips XSS patterns using `xss-clean`.

**`preventSQLInjection(req, res, next)`** — Uses `express-mongo-sanitize` to remove `$` and `.` prefixes from input keys that could be used for NoSQL injection.

**`setSecurityHeaders(req, res, next)`** — Adds extra HTTP headers (`X-Content-Type-Options`, `X-Frame-Options`, referrer policy).

---

### `error.middleware.js`

**`notFoundHandler(req, res)`** — Catches all unmatched routes and returns `404`.

**`errorHandler(err, req, res, next)`** — Global error handler; maps error types:
- `ValidationError` (Mongoose) → `400`
- `CastError` (invalid ObjectId) → `400`
- `11000 duplicate key` → `409 Conflict`
- Everything else → `500`

---

### `logger.middleware.js`

**`requestLogger`** — Logs `METHOD /path` with timing for development debugging.

**`errorLogger`** — Logs stack traces on errors.

---

### `rateLimit.middleware.js`

Configures `express-rate-limit` instances. Auth endpoints get a stricter 50 req/15 min limit. General API gets 300 req/15 min. Localhost is skipped in development.

---

### `upload.middleware.js`

Configures Multer for file uploads. Uses Cloudinary-backed storage via `multer-storage-cloudinary` (recommended) and validates MIME types (images only) and size limits. Legacy local `/uploads/` storage is deprecated to avoid data loss on ephemeral cloud hosts.

---

### `authOtpRateLimit.middleware.js`

Extra rate limiting specifically for OTP verification endpoints to prevent brute-force OTP guessing.

---

## Layer 3 — Routes (`routes/`)

Each file defines one Express Router and mounts all endpoints for a resource.

### `auth.routes.js` → controller: `auth.controller.js`

| Endpoint | What happens |
|---|---|
| `POST /api/auth/register` | Creates User, hashes password, issues JWT access + refresh cookies, sends OTP email |
| `POST /api/auth/login` | Verifies credentials, checks status, issues JWT cookies |
| `POST /api/auth/refresh` | Reads refresh cookie, verifies against `refreshTokenHash` in DB, issues new access token |
| `POST /api/auth/logout` | Clears both cookies, nullifies `refreshTokenHash` in DB |
| `GET /api/auth/me` | Returns current user (used by frontend on page load to restore session) |
| `POST /api/auth/verify-email` | Validates OTP hash against stored hash, marks `emailVerified: true` |
| `POST /api/auth/forgot-password` | Generates reset token hash, stores in DB, sends reset email |
| `POST /api/auth/reset-password` | Validates reset token, updates `passwordHash` |

---

### `order.routes.js`

Most complex route file. All routes require `authenticate`.

| Endpoint | What happens |
|---|---|
| `GET /api/orders` | Role-filtered: buyers see own orders, sellers see received orders, delivery partners see their assigned orders + broadcasted unassigned delivery requests |
| `POST /api/orders` | Creates order atomically: validates items, checks product belongs to one seller, applies B2B pricing tier or marketplace agreed price, reserves inventory via `InventoryManager`, creates `Commission` record |
| `PATCH /api/orders/:id/status` | Validates state transition via `orderStateMachine`, applies side-effects (release vehicle on delivery/cancel), appends to `statusHistory` |
| `PATCH /api/orders/:id/request-delivery` | Buyer requests a delivery partner. `vehicleId` optional — if omitted, broadcasts to all delivery partners |
| `PATCH /api/orders/:id/delivery-response` | **Atomic assignment**: delivery partner accepts/rejects. Uses `safeAtomicDeliveryAcceptance()` — only one partner can win the race |

---

### `delivery.routes.js`

Handles two delivery sub-systems:

**Shipments** (long-haul): `GET/POST /api/delivery/shipments`, tracking update, mark delivered.

**Tasks** (last-mile): `GET/POST /api/delivery/tasks`, `PATCH /tasks/:id/accept`, `PATCH /tasks/:id/start`, `PATCH /tasks/:id/complete` (with proof), `PATCH /tasks/:id/location` (GPS update).

---

### `payment.routes.js`

| Endpoint | Purpose |
|---|---|
| `POST /api/payments` | Creates payment with idempotency key check |
| `PATCH /api/payments/:id/success` | Marks payment successful; triggers commission `status → collected` |
| `PATCH /api/payments/:id/failed` | Records failure reason |
| `POST /api/payments/:id/refund` | Appends to `refunds[]` array |
| `GET /api/payments/stats/overview` | Admin: revenue aggregation by date range |

---

### `commission.routes.js`

Admin-only routes for commission management: list, filter by seller/status, mark collected, process payouts, add manual adjustments.

---

### `marketplaceRequest.routes.js`

Handles B2B price negotiation flow:
- `POST` — Buyer creates request.
- `PATCH /:id/respond` — Farmer counter-offers.
- `PATCH /:id/buyer-respond` — Buyer accepts/counter.
- `GET /open-for-farmer` — Shows open requests matching farmer's products.

---

### `community.routes.js` → controller: `community.controller.js`

Full community lifecycle: create, join (with invite code), leave, transfer ownership, announcements, pool management, bulk ordering, chat messages.

---

### `recurringOrder.routes.js`

CRUD for order templates + `pause`, `resume`, `cancel` operations.

---

### Other routes
`product.routes.js`, `inventory.routes.js`, `location.routes.js`, `review.routes.js`, `category.routes.js`, `user.routes.js`, `cart.routes.js`, `wishlist.routes.js`, `notification.routes.js`, `vehicle.routes.js`, `analytics.routes.js` — standard CRUD with role-based access.

---

## Layer 4 — Controllers (`controllers/`)

### `auth.controller.js`
Houses the full authentication lifecycle.

**`register(req, res)`** — Creates user, builds canonical address, generates 6-digit OTP, hashes OTP with SHA-256, stores hash+expiry, sends OTP email via Nodemailer, issues two JWT cookies:
  - `farmkart_token` (access, 15 min, httpOnly)
  - `farmkart_refresh` (refresh, 7 days, httpOnly, path=/api/auth/refresh)

**`login(req, res)`** — Calls `user.comparePassword()`, checks `status !== suspended`, generates new token pair, updates `refreshTokenHash` in DB.

**`refresh(req, res)`** — Reads `farmkart_refresh` cookie, hashes it, compares to `refreshTokenHash` stored in DB (single-use enforcement — if stolen and already used, the hash won't match). Issues new access token.

**`logout(req, res)`** — Clears both cookies with `res.clearCookie()`, sets `refreshTokenHash = null` in DB to invalidate any stolen tokens.

**`verifyEmail(req, res)`** — Hashes submitted OTP, compares to `emailOtpHash`, checks `emailOtpExpires > now`, sets `emailVerified = true` and `status = active`.

---

### `cart.controller.js`
**Purpose**: Manages the shopping cart with server-side price validation.

**`addToCart(req, res)`** — Fetches product price from DB (never trusts client-submitted price), checks `stockQuantity > 0`, upserts cart item. This prevents cart price manipulation attacks.

**`updateQuantity(req, res)`** — Re-validates stock before increasing quantity.

**`getCart(req, res)`** — Populates product details, recalculates totals server-side.

---

### `community.controller.js`
Largest controller (~1000 lines). Handles the complete community feature set including join workflows, pool contributions, bulk ordering with marketplace request creation, delivery assignment for community orders, and real-time chat.

**`orderPool(req, res)`** — Creates a `MarketplaceRequest` linking the community pool to a farmer's product. If `vehicleId` is provided, also sets delivery partner. Notifies farmer and optionally delivery partner.

---

### `analytics.controller.js`
Admin dashboard analytics using MongoDB aggregation pipelines.

**`getOverview(req, res)`** — Aggregates: total orders, total revenue, active users, low-stock products.

**`getSalesByPeriod(req, res)`** — Groups orders by day/week/month using `$dateToString` aggregation.

---

### `vehicle.controller.js`
CRUD for vehicles. On create, verifies the owner has a delivery role. On update, checks ownership.

### `product.controller.js`
CRUD for products. Farmer can only modify their own. Admin can modify any. Soft-delete on removal.

### `notification.controller.js`
`getAll` (paginated, filterable by type/read-status), `markRead`, `markAllRead`, `delete`.

### `wishlist.controller.js`
Toggle product in/out of wishlist. Prevents duplicates.

---

## Layer 5 — Services (`services/`)

Background processes and complex orchestration logic.

### `order.service.js`
**`createOrder(orderData, options)`** — The authoritative order creation function used by both the direct order route and the recurring order scheduler.

Key steps:
1. Validates all items belong to one seller.
2. Looks up B2B price agreements or marketplace agreed prices.
3. Calls `InventoryManager.reserveForOrder()` for atomic multi-item reservation.
4. Creates `Commission` record atomically in the same MongoDB session.
5. Supports optional MongoDB session for transaction participation.

---

### `inventory.manager.js`
**Purpose**: The single source of truth for inventory reservation. Prevents race conditions in high-concurrency scenarios.

**`reserveForOrder({orderItems, orderId, buyerId, session})`**:
1. Acquires a per-product advisory lock using MongoDB's `findOneAndUpdate`.
2. Iterates each item, calls `InventoryLot.reserveAvailableLot()` atomically.
3. On any failure, rolls back all successful reservations (compensating transaction).
4. Updates `product.stockQuantity` cache after successful reservation.

**`releaseReservation({orderId})`** — Called on order cancellation; frees all lot reservations for the order.

**`confirmReservation({orderId})`** — Called on delivery; marks lots as `sold`.

---

### `recurringOrderScheduler.js`
**Purpose**: Cron job that runs every 15 minutes and creates orders from due recurring templates.

**`processRecurringOrder(recurringOrder)`**:
1. Atomically sets `isProcessing = true` to prevent double-processing.
2. Fetches buyer profile, validates delivery address.
3. Builds order items and calls `InventoryManager.reserveForOrder()`.
4. Saves the Order document.
5. Creates Commission record.
6. Calls `recurringOrder.recordSuccess()` to advance the schedule.
7. On any error: rolls back via `session.abortTransaction()`, clears `isProcessing` flag, calls `recurringOrder.recordFailure()`.

---

### `inventoryCleanupScheduler.js`
**Purpose**: Runs daily; releases stale inventory reservations where the associated order was never paid.

Calls `InventoryManager.releaseReservation()` for orders that have been in `pending_payment` status for more than 24 hours.

---

### `socket.service.js`
**`initializeSocketServer(httpServer, allowedOrigins)`** — Creates Socket.IO server with matching CORS policy. Stores socket instance globally. Provides `emitNotification(userId, payload)` function used by route handlers to push real-time events.

---

## Layer 6 — Utilities (`utils/`)

Pure, stateless helper functions with no side effects.

### `deliveryAtomicLocking.util.js`
Solves the delivery assignment race condition (TOCTOU bug).

**`atomicAssignDelivery(orderId, partnerId, vehicleId)`** — Uses `Order.findOneAndUpdate()` with compound filter:
- `delivery.requestStatus === 'requested'`
- `delivery.requestedPartnerId === partnerId` OR `delivery.requestedPartnerId === null` (broadcast)
- `delivery._assignmentLock` does not exist

If MongoDB returns `null`, another partner already claimed it → return `ALREADY_ACCEPTED`. Otherwise, stamps the lock and updates `requestedPartnerId` to the winning partner.

**`atomicClaimVehicle(vehicleId, partnerId)`** — `Vehicle.findOneAndUpdate()` filters on `status === 'Available'` and `_activeClaimLock` not existing. Sets `status = 'On Delivery'` atomically.

**`safeAtomicDeliveryAcceptance(orderId, partnerId, vehicleId)`** — Orchestrates both: assigns order first, then claims vehicle. If vehicle claim fails, rolls back the order assignment. Returns `409`-compatible error objects on any conflict.

**`releaseStaleLock(orderId)`** — Cleanup function for locks that were set but never cleared (e.g. server crash). Called by a maintenance job.

---

### `orderStateMachine.util.js`
Enforces legal order status transitions.

**`validateTransition(currentStatus, newStatus)`** — Returns `{valid, reason, allowedTransitions}`. Prevents invalid jumps like `delivered → pending`.

Transition map:
```
pending_payment → confirmed | cancelled
confirmed → processing | cancelled
processing → shipped | cancelled
shipped → delivered | cancelled
delivered → (terminal)
cancelled → (terminal)
```

**`getAllowedTransitions(status)`** — Returns array of valid next statuses for UI dropdowns.

**`createTransitionAuditLog(orderId, from, to, userId, reason)`** — Creates structured audit log entry.

---

### `roleEscalation.util.js`
Security utility that validates JWT claims against live database state.

**`validateJWTRoles(userId, tokenRoles)`** — Fetches user from DB, compares `user.roles` to `tokenRoles`. Detects:
- Roles in JWT not in DB (escalation attempt) → `CRITICAL` severity
- Roles missing from JWT that are in DB (downgrade, acceptable) → `LOW` severity

**`logEscalationAttempt(userId, details, severity)`** — Structured security log with IP, endpoint, and role delta.

---

### `priceCalculation.util.js`
Pure price math functions: delivery fee calculation, commission rate lookup by seller type, tax calculation, discount application. All used server-side to prevent price manipulation.

---

### `idempotency.util.js`
**`checkIdempotency(key)`** — Checks if a request with this key was already processed.
**`recordIdempotency(key, response)`** — Stores the response for 24 hours so duplicate requests return the cached result.

Used for payment creation to prevent double-charges on network retries.

---

### `notification.util.js`
**`notifyUser(userId, payload)`** — Creates a `Notification` document in DB then emits `notification:new` via Socket.IO to the user's room.

**`notifyUsers(userIds, payload)`** — Batch version; fires `notifyUser` for each ID.

---

### `softDelete.plugin.js`
Mongoose plugin added to User, Product, Order, Community models.

Adds `isDeleted: Boolean` and `deletedAt: Date` fields. Patches `find`, `findOne`, `countDocuments` to automatically append `{isDeleted: {$ne: true}}` — deleted records are invisible to normal queries. Provides `doc.softDelete()` instance method.

---

### `sanitize.util.js`
String sanitization helpers: strip HTML tags, truncate to max length, normalize whitespace. Used in route handlers before saving user-supplied text.

### `address.util.js`
**`buildCanonicalAddress(input)`** — Maps registration form data into the structured `addressSchema` format with correct `type` based on user role.

### `verification.util.js`
**`assertTransactionVerification(session)`** — Checks that a MongoDB session is in an active transaction state. Throws if called outside a transaction context.

### `regex.util.js`
Shared regex patterns: phone number, postal code, email validation patterns used across validators.

---

## Security Architecture Summary

| Threat | Mitigation |
|---|---|
| XSS | `xss-clean` strips HTML on all inputs, `helmet` sets CSP headers |
| NoSQL Injection | `express-mongo-sanitize` removes `$` operators from input |
| JWT Tampering / Role Escalation | `validateJWTRoles()` re-validates claims against DB on every request |
| Token Theft | httpOnly cookies (JS cannot read), Refresh token stored as hash only |
| CSRF | `SameSite=Strict` cookies + CORS whitelist |
| Brute Force Login | `authLimiter`: 50 req / 15 min per IP |
| Password Storage | bcrypt with salt rounds = 10 |
| Delivery Race Condition | Atomic `findOneAndUpdate` with lock field |
| Inventory Oversell | `reserveAvailableLot()` atomic operation per lot |
| Payment Duplicates | Idempotency key with 24h cache |
| Cart Price Manipulation | Server always fetches price from DB; client price ignored |

---

## Background Jobs

| Job | Schedule | Purpose |
|---|---|---|
| `startRecurringOrderScheduler` | Every 15 minutes | Creates orders from due recurring templates |
| `startInventoryCleanupScheduler` | Daily | Releases stale reservations for unpaid orders |

---

## Database Scripts (`scripts/`)

| Script | npm command | Purpose |
|---|---|---|
| `dbIntegrityCheck.js` | `npm run db:check-relations` | Finds orphaned documents (orders with missing buyers) |
| `repairProductOwners.js` | `npm run db:repair-product-owners` | Fixes products with invalid `ownerId` references |
| `syncInventoryForActiveProducts.js` | `npm run db:sync-inventory` | Rebuilds `stockQuantity` cache from live lot data |

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Signs access tokens |
| `JWT_REFRESH_SECRET` | Signs refresh tokens |
| `PORT` | Server port (default 5000) |
| `NODE_ENV` | `development|production` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins for production |
| `ENABLE_SCHEDULER` | Set to `false` to disable cron jobs |
| `DISABLE_MONGO_TRANSACTIONS` | Set to `true` if using standalone MongoDB (no replica set) |
| `SMTP_*` | Email credentials for OTP and password reset emails |
