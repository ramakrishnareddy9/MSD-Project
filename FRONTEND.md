# FarmKart Frontend Documentation

## Tech Stack
- **Framework**: React 18 with Vite
- **Routing**: React Router DOM v6
- **UI Library**: Material UI (MUI) v5
- **Charts**: Recharts
- **Real-time**: Socket.IO client
- **HTTP**: Native `fetch` API (no Axios)
- **Styling**: MUI + global CSS (`index.css`)

---

## Architecture Overview

```
src/
  main.jsx           ← React entry: wraps app in providers
  App.jsx            ← Route tree: all page routes defined here
  theme.js           ← MUI custom theme (colors, typography, component overrides)
  index.css          ← Global CSS resets and utility classes

  contexts/          ← React Context providers (global shared state)
  hooks/             ← Custom React hooks (reusable stateful logic)
  layouts/           ← Page shell components (navbar + outlet)
  Components/        ← Reusable UI components
  pages/             ← Full page components (one per route)
  services/          ← API calls and Socket.IO connection
  utils/             ← Pure helper functions (role routing)
```

Data flow: `User action → Page component → services/api.js (fetch) → Backend API → Response → React state update → Re-render`

---

## `main.jsx` — Application Bootstrap

Wraps the entire app in the required provider tree:

```jsx
<BrowserRouter>        ← enables React Router
  <ThemeProvider>      ← applies MUI custom theme
    <AuthProvider>     ← global auth state (user, login, logout)
      <CartProvider>   ← global cart state
        <NotificationProvider>  ← notification bell state
          <App />      ← route definitions
```

**Why this order matters**: `AuthProvider` must be inside `BrowserRouter` (uses `useNavigate`). `CartProvider` needs auth context (cart is user-specific).

---

## `App.jsx` — Route Tree

Defines all application routes using React Router v6.

**Key patterns**:
- **Lazy loading**: All dashboard pages use `React.lazy()` + `Suspense` so each dashboard bundle is loaded only when first visited. Reduces initial bundle size significantly.
- **`ProtectedRoute` wrapper**: Every role-specific route is wrapped — redirects to `/login` if not authenticated, `/unauthorized` if wrong role.
- **`DashboardLayout` wrapper**: All logged-in pages share a layout route that renders the persistent navbar.
- **Legacy route compatibility**: `/dashboard/customer` etc. are kept alongside `/customer` so old bookmarks still work.

**Route breakdown**:

| Path | Component | Access |
|---|---|---|
| `/` | `LandingPage` | Public |
| `/shop` | `ProductCatalog` | Public |
| `/cart` | `CartPage` | Public |
| `/login`, `/signup` | `AuthPage` | Public |
| `/reset-password` | `ResetPassword` | Public |
| `/orders` | `OrderHistory` | customer, business, restaurant |
| `/customer` | `CustomerDashboard` | customer |
| `/farmer` | `FarmerDashboard` | farmer |
| `/business` | `BusinessDashboard` | business, travel_agency |
| `/restaurant` | `RestaurantDashboard` | restaurant |
| `/delivery-large` | `LargeScaleDashboard` | delivery_large, delivery |
| `/delivery-small` | `SmallScaleDashboard` | delivery_small, delivery |
| `/admin` | `AdminDashboard` | admin |
| `/dashboard/community` | `CommunityDashboard` | community, customer |
| `/unauthorized` | `Unauthorized` | Public |

---

## `theme.js` — MUI Theme Configuration

Exports a custom MUI theme object passed to `ThemeProvider`.

- **Color palette**: Custom primary (green tones for agriculture), secondary, error, warning colors.
- **Typography**: Sets `Inter` as the default font family for all MUI components.
- **Component overrides**: Customizes default props for `MuiButton` (disableElevation), `MuiTextField` (outlined variant), `MuiCard` (rounded corners).

---

## Contexts (`contexts/`)

### `AuthContext.jsx`
**Purpose**: Provides global authentication state to the entire app. No token is stored in `localStorage` — the httpOnly cookie handles auth silently.

**State**: `user` (object|null), `isLoading` (boolean)

**Functions**:

**`checkSession()`** — Called once on mount. Calls `GET /api/auth/me`. If the httpOnly access cookie is valid, the server returns the user profile. If 401, user stays null. This is how the app restores a session after page refresh without any localStorage.

**`login(email, password)`** — Calls `authAPI.login()`. On success, stores user object in React state. The server sets the httpOnly cookie — no token handling needed in the frontend.

**`register(userData)`** — Calls `authAPI.register()`. On success, user is automatically logged in (server sets cookies).

**`logout()`** — Calls `authAPI.logout()` (server clears cookies), then sets `user = null` in state. Even if the API call fails, state is cleared (graceful degradation).

**`updateUser(patch)`** — Merges partial update into current user state. Used after profile edits.

**Exported via `useAuth()` hook**: `{user, login, register, logout, updateUser, isLoading, isAuthenticated}`

---

### `CartContext.jsx`
**Purpose**: Manages cart item count for the navbar badge. Does not store full cart items — those are fetched from the backend on the cart page.

**State**: `cartCount` (number)

**`refreshCartCount()`** — Calls `cartAPI.getCart()` and sets count from response. Called after adding/removing items.

---

### `NotificationContext.jsx`
**Purpose**: Manages the unread notification count for the notification bell in the navbar.

**State**: `unreadCount` (number)

**`refreshUnreadCount()`** — Calls `notificationAPI.getAll({unread: true})` and sets count.

---

## Hooks (`hooks/`)

### `useRealtimeNotifications.js`
**Purpose**: Connects to Socket.IO and listens for real-time notification events.

**`useRealtimeNotifications({enabled, onNotification})`**:
1. Uses `useRef` to store the callback without causing re-subscriptions on every render.
2. When `enabled` becomes true, calls `connectSocket()` to establish the WebSocket connection.
3. Registers listener for `notification:new` event.
4. Cleanup: removes listener when component unmounts or `enabled` changes to false.
5. When a notification arrives, calls `onNotification(payload)` — dashboard components use this to call `refreshAll()`.

**Why `useRef` for the callback**: Prevents the Socket.IO listener from being re-registered on every render whenever the callback function reference changes.

---

## Layouts (`layouts/`)

### `DashboardLayout.jsx`
**Purpose**: Provides the persistent shell (navbar + content area) for all logged-in pages.

Renders `<Navbar />` at the top, then `<Outlet />` (React Router) for the current dashboard. All dashboard routes are children of this layout route in `App.jsx`.

---

## Components (`Components/`)

### `ProtectedRoute.jsx`
**Purpose**: Route guard component that enforces authentication and role-based access control.

**Logic flow**:
1. If `isLoading` → show `<Loader />` (session check in progress).
2. If no `user` → redirect to `/login` (with current location saved in state for post-login redirect).
3. If `allowedRoles` is provided and user has none of them → redirect to `/unauthorized`.
4. Otherwise → render `children`.

**`hasAnyAllowedRole(user, allowedRoles)`** from `utils/roleRouting.js` checks all roles in `user.roles[]` array against the allowed list.

---

### `LandingPage.jsx`
Public marketing page. Shows hero section, feature highlights, role-based CTA buttons, product categories preview. Uses MUI Grid and animation utilities.

### `Navbar.jsx`
Persistent top navigation. Shows brand logo, nav links, cart badge (from `CartContext`), notification bell (from `NotificationContext`), profile dropdown. Responsive: collapses to hamburger menu on mobile.

### `ProfileDropdown.jsx`
User menu in the navbar. Shows user name, role badge, links to dashboard and profile settings, logout button.

### `LoginForm.jsx`
Reusable login form component used within `AuthPage`. Validates email/password, calls `useAuth().login()`, handles error display.

### `LoadingSpinner.jsx`
Simple centered spinner animation. Used as the `Suspense` fallback.

### Component sub-directories:

**`Components/common/`**:
- `Loader.jsx` — Full-screen or inline spinner with optional message. Used as Suspense fallback.
- `Toast.jsx` + `ToastProvider` — Global toast/snackbar notification system. Components call `toast.success()` / `toast.error()` without prop drilling.

**`Components/cart/`** — Cart item card, quantity stepper, remove button.

**`Components/orders/`** — Order card, status chip with color coding, timeline component.

**`Components/products/`** — Product card with image, price, add-to-cart button. Product grid layout.

---

## Pages (`pages/`)

### `AuthPage.jsx`
Unified login + signup page with tab switching. Handles both Login and Signup flows:
- Calls `useAuth().login()` or `useAuth().register()`.
- On success, uses `getDashboardPath(user)` to redirect to the correct role-specific dashboard.
- Displays server validation errors inline.
- Signup form includes role selection — different roles show different extra fields (e.g., farmer shows farm address, business shows GST number).

### `ResetPassword.jsx`
Reads `token` from URL query params. Shows new password form. Calls `authAPI.resetPassword(token, password, confirmPassword)`.

### `Unauthorized.jsx`
Simple "You don't have permission" page with a back button.

---

### `pages/dashboards/CustomerDashboard.jsx`
**Largest dashboard** (~109KB). Full-featured customer experience.

**State**: orders list, cart summary, wishlist, product search, filters, pagination, profile form, notification list.

**Key functions**:
- `fetchOrders()` — Calls `orderAPI.getAll({buyerId})`, maps raw API response to display format.
- `fetchProducts()` — Calls `productAPI.getAll()` with search/filter params.
- `addToCart(productId, qty)` — Calls `cartAPI.addItem()`, then `refreshCartCount()`.
- `placeOrder(cartItems)` — Calls `orderAPI.create()` with items and delivery address.
- `handleCancelOrder(orderId)` — Calls `orderAPI.updateStatus(orderId, 'cancelled')`.
- `useRealtimeNotifications()` — Triggers `refreshAll()` on order/delivery events.

---

### `pages/dashboards/FarmerDashboard.jsx`
**Purpose**: Farmer's workspace for product and order management.

**Key functions**:
- `fetchMyProducts()` — Products owned by the farmer.
- `fetchOrders()` — Orders where `sellerId === farmer._id`.
- `createProduct(formData)` — Calls `productAPI.create()`.
- `updateInventory(productId, lotData)` — Calls `inventoryAPI.create()` to add a new lot.
- `handleOrderStatusUpdate(orderId, status)` — Confirms or processes orders.
- `fetchMarketplaceRequests()` — B2B buyer requests for farmer's products.
- `respondToRequest(requestId, action, price)` — Counter-offer or accept via `marketplaceRequestAPI.respond()`.

---

### `pages/dashboards/DeliveryDashboard.jsx`
**Purpose**: Delivery partner workspace. Handles both pre-assigned and broadcasted (pool) delivery tasks.

**Key functions**:
- `fetchOrders()` — Gets orders where `delivery.requestedPartnerId === user._id` OR `delivery.requestedPartnerId === null` (broadcast pool).
- `pendingRequests` (computed) — `filter(o => o.requestStatus === 'requested')`.
- `activeDeliveries` (computed) — Accepted but not yet delivered.
- `handleOpenAssignDialog(order)` — Pre-selects vehicle if the order already requested a specific vehicle.
- `handleAcceptRequest()` — Calls `orderAPI.respondDeliveryRequest(id, 'accepted', vehicleId)`. On `409 Conflict` (race condition lost): shows "Another partner accepted" toast, closes dialog, and refreshes the list. On success: shows confirmation toast.
- `handleRejectRequest(orderId)` — Calls `orderAPI.respondDeliveryRequest(id, 'rejected')`.
- `handleDeliveryStatusUpdate(orderId, nextStatus)` — Advances delivery status.

---

### `pages/dashboards/AdminDashboard.jsx`
**Purpose**: Platform administration panel.

**Sections**:
- **Users**: List all users, filter by role/status, suspend/activate accounts.
- **Orders**: Overview with status breakdown chart (Recharts), recent orders table.
- **Analytics**: Revenue by period (line chart), top products (bar chart), commission collection rates.
- **Commissions**: Table with mark-collected and payout buttons.
- **Inventory**: Low-stock alerts, lot management.

**Key functions**:
- `fetchAnalytics()` — Calls `analyticsAPI.getOverview()` + `getSalesByPeriod()`.
- `fetchCommissions()` — `commissionAPI.getAll()`.
- `handleMarkCollected(id)` — `commissionAPI.markCollected(id)`.
- `handleSuspendUser(userId)` — `userAPI.update(userId, {status: 'suspended'})`.

---

### `pages/dashboards/BusinessDashboard.jsx`
**Purpose**: For business buyers (restaurants, travel agencies, businesses).

**Key sections**:
- **Browse & Order**: Product catalog with B2B pricing display.
- **Marketplace**: Create and negotiate price requests with farmers.
- **Recurring Orders**: Create/pause/resume scheduled purchase templates.
- **Order History**: B2B order tracking.
- **Price Agreements**: View active negotiated contracts.

**Key functions**:
- `createMarketplaceRequest(data)` — `marketplaceRequestAPI.create()`.
- `respondToFarmerOffer(requestId, price)` — `marketplaceRequestAPI.buyerRespond()`.
- `createRecurringOrder(template)` — `recurringOrderAPI.create()`.
- `pauseRecurringOrder(id)` — `recurringOrderAPI.pause(id)`.

---

### `pages/dashboards/RestaurantDashboard.jsx`
Similar to BusinessDashboard but themed for restaurants. Includes ingredient-focused product browsing and meal planning views.

---

### `pages/dashboards/CommunityDashboard.jsx`
**Purpose**: Community group management and bulk purchasing.

**Key functions**:
- `fetchCommunities()` — `communityAPI.getMy()`.
- `createCommunity(data)` — `communityAPI.create()`.
- `joinCommunity(inviteCode)` — `communityAPI.join()`.
- `contributeToPool(poolId, qty, amount)` — `communityAPI.contributeToPool()`.
- `orderPool(communityId, poolId, farmerId, vehicleId)` — Triggers bulk order.
- `sendChatMessage(communityId, message)` — `communityAPI.sendChatMessage()`.

---

### `pages/customer/ProductCatalog.jsx`
Public product browsing page. Search bar, category filter, sort by price. Calls `productAPI.getAll()`. Shows `<ProductCard>` grid. Works without login.

### `pages/customer/Cart.jsx`
Calls `CartContext` to display items. Quantity update and remove call cart API. Checkout button calls `orderAPI.create()` with cart contents.

### `pages/orders/OrderHistory.jsx`
Paginated list of the current user's orders. Shows status badge and links to order details.

### `pages/delivery/LargeScaleDashboard.jsx`, `SmallScaleDashboard.jsx`
Delivery partner views split by scale type. Large-scale focuses on shipment management. Small-scale focuses on last-mile delivery tasks with GPS tracking.

---

## Services (`services/`)

### `api.js`
The single HTTP client for all backend calls. Uses native `fetch`.

**`apiCall(endpoint, options, _isRetry)`** — Core function:
1. Builds request with `credentials: 'include'` (sends httpOnly cookie automatically).
2. On `401` response: calls `attemptSilentRefresh()` once, then retries the original request. This handles expired access tokens transparently.
3. On other errors: parses the JSON error body, creates an `Error` with `.status` and `.details` properties for structured error handling.

**`attemptSilentRefresh()`** — Calls `POST /api/auth/refresh`. Uses a shared promise (`refreshPromise`) to deduplicate simultaneous refresh attempts if multiple requests fail at the same time. Sets `isRefreshing` flag to prevent refresh loops.

**Exported API modules** (one per backend resource):
- `authAPI` — login, register, logout, getCurrentUser, forgotPassword, resetPassword, refresh
- `orderAPI` — getAll, getById, create, updateStatus, requestDelivery, respondDeliveryRequest
- `productAPI` — getAll, getById, create, update, delete, search
- `inventoryAPI` — getAll, getById, create, update, delete, getByProduct
- `cartAPI` — getCart, addItem, updateQuantity, removeItem, clear
- `paymentAPI` — create, markSuccess, markFailed, processRefund, getStats
- `deliveryAPI.shipments` — getAll, getById, create, updateTracking, markDelivered
- `deliveryAPI.tasks` — getAll, getById, create, accept, start, complete, updateLocation
- `commissionAPI` — getAll, getById, markCollected, processPayout, addAdjustment
- `communityAPI` — create, getAll, getMy, join, leave, getPools, orderPool, contributeToPool, getChat, sendChatMessage
- `marketplaceRequestAPI` — create, getMyRequests, getOpenForFarmer, respond, buyerRespond
- `recurringOrderAPI` — getAll, create, update, pause, resume, cancel
- `notificationAPI` — getAll, markRead, markAllRead
- `vehicleAPI` — getAll, create, update, delete
- `priceAgreementAPI` — getAll, create, approve, reject, cancel
- `userAPI` — getAll, getById, update, delete
- `locationAPI` — getAll, create, update, delete
- `reviewAPI` — create, getByProduct, getByUser
- `categoryAPI` — getAll, create, update, delete

---

### `socket.js`
**Purpose**: Manages the Socket.IO client instance. Single instance shared across the app (singleton pattern).

**`getSocket()`** — Returns the singleton socket. Creates it with `autoConnect: false` on first call so the connection isn't established until explicitly needed.

**`connectSocket()`** — Calls `socket.connect()` if not already connected. Returns the socket.

**`disconnectSocket()`** — Disconnects the socket. Used on logout.

**`SOCKET_EVENTS`** — Constants object: `{NOTIFICATION_NEW: 'notification:new'}`. Centralizes event name strings to prevent typos.

---

## Utils (`utils/`)

### `roleRouting.js`
**Purpose**: Maps user roles to dashboard paths. Single source of truth for routing logic.

**`DASHBOARD_PATH_BY_ROLE`** — Dictionary: `{customer: '/customer', farmer: '/farmer', ...}`.

**`getUserRoles(user)`** — Safely extracts roles array from user object regardless of shape.

**`getPrimaryRole(user)`** — Returns the first role in the roles array. Used to determine which dashboard to redirect to after login.

**`getDashboardPath(user)`** — Combines `getPrimaryRole` + `DASHBOARD_PATH_BY_ROLE` lookup.

**`hasAnyAllowedRole(user, allowedRoles[])`** — Returns true if user has at least one role from the allowed list. Used by `ProtectedRoute`.

---

## Authentication Flow (End-to-End)

```
1. User submits login form
2. AuthContext.login() → authAPI.login() → POST /api/auth/login
3. Server: verifies password, sets httpOnly cookies:
   - farmkart_token (15 min)
   - farmkart_refresh (7 days, path=/api/auth/refresh only)
4. AuthContext stores user object in React state
5. App.jsx route renders role-appropriate dashboard

On page refresh:
1. AuthProvider mounts, calls checkSession()
2. GET /api/auth/me — browser sends cookie automatically
3. Server validates cookie, returns user
4. State restored — no localStorage needed

On token expiry:
1. Any API call returns 401
2. apiCall() calls attemptSilentRefresh()
3. POST /api/auth/refresh — browser sends refresh cookie
4. Server issues new access cookie
5. Original request is retried transparently

On logout:
1. POST /api/auth/logout — server clears both cookies and nullifies refreshTokenHash in DB
2. AuthContext sets user = null
3. App routes redirect to /login
```

---

## State Management Pattern

No Redux or Zustand. State is managed at the appropriate level:

| Data | Location | Why |
|---|---|---|
| Authenticated user | `AuthContext` | Needed everywhere |
| Cart count | `CartContext` | Needed in navbar badge |
| Notification count | `NotificationContext` | Needed in navbar bell |
| Dashboard data | Local component state | Only needed by one dashboard |
| Form state | Local component state | Temporary, not shared |

---

## Real-time Notification Flow

```
1. Dashboard mounts → useRealtimeNotifications({enabled: true, onNotification})
2. connectSocket() establishes WebSocket to backend
3. Socket.on('notification:new', handler) registered
4. User performs action (farmer confirms order)
5. Backend: notifyUsers([buyerId], payload)
6. socket.service.js emits to user's room
7. Browser receives 'notification:new' event
8. onNotification(payload) called
9. Dashboard calls refreshAll() → re-fetches orders, updates UI
```

---

## Performance Optimizations

| Technique | Where | Effect |
|---|---|---|
| `React.lazy()` + `Suspense` | App.jsx | Dashboard bundles loaded on demand |
| `useMemo()` | All dashboards | Computed lists (pendingOrders, stats) not recalculated on unrelated re-renders |
| `useCallback()` | All dashboards | Fetch functions not recreated on every render |
| `useRef` for socket callback | `useRealtimeNotifications` | Prevents socket re-subscription on every render |
| Pagination | All list APIs | `limit=20` default, page param |
| Debounced search | ProductCatalog | Prevents API call on every keystroke |
