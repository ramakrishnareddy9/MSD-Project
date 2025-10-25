# FarmKart System Overview Prompt

## System Vision

Create **FarmKart**, a comprehensive MERN-stack web application that serves as a unified marketplace connecting farmers directly with end consumers, businesses, and restaurants to streamline the agricultural supply chain. FarmKart eliminates traditional middlemen by enabling farmers to sell their produce directly to various buyer types, thereby increasing farmer income while providing buyers with fresher products at competitive prices.

The platform operates in **dual commerce modes**:

1. **B2C (Business-to-Consumer)**: Individual consumers browse an online storefront, filter products by category/price/location, and purchase produce through a straightforward self-service purchase flow similar to traditional e-commerce platforms.

2. **B2B (Business-to-Business)**: Companies and restaurants place larger, bulk orders with volume-based pricing, often with negotiable terms, payment schedules (net-7, net-15, net-30), and recurring delivery options optimized for wholesale business needs.

---

## Core User Roles and Capabilities

The system must support **seven distinct user roles**, each with unique perspectives, dashboards, and capabilities. Canonical role keys used across frontend and backend are: `customer`, `farmer`, `business`, `restaurant`, `delivery_large`, `delivery_small`, and `admin`.

### 1. **Farmer (Producer/Seller)**
**Perspective**: Primary supplier managing farm inventory and sales.

**Capabilities**:
- Register farm details (location, size, certifications like organic/fair-trade)
- List products (raw produce: vegetables, fruits, grains; processed goods: packaged items)
- Set pricing for both retail (B2C) and wholesale (B2B) tiers
- Manage inventory across multiple locations (farm, warehouse)
- Track harvest dates, batch numbers, and expiry information
- View incoming orders from all buyer types
- Accept/reject orders based on availability
- Request transportation for products
- View earnings and payout schedules
- Upload product images and descriptions
- Manage certifications and quality grades

### 2. **Customer (Individual Consumer)**
**Perspective**: End consumer shopping for personal/household use.

**Capabilities**:
- Browse product catalog with filters (category, price, location, organic/conventional)
- Search products by name, tags, or farmer
- View detailed product information (nutritional info, origin, farmer profile)
- Add items to shopping cart
- Apply discount codes and loyalty points
- Checkout with multiple payment options
- Schedule delivery time slots
- Track order status in real-time
- Rate and review products after purchase
- Save favorite products and farmers
- Manage delivery addresses
- View order history and reorder quickly
- Receive notifications on order updates and promotions

### 3. **Business/Company Buyer (B2B Wholesale)**
**Perspective**: Wholesaler, retailer, or manufacturer purchasing in bulk.

**Capabilities**:
- Browse products with bulk pricing visibility
- Place large-volume orders (by weight/quantity)
- Upload CSV order lists for quick bulk ordering
- Negotiate pricing with farmers for recurring contracts
- Set up scheduled/recurring orders (weekly, monthly)
- Manage multiple delivery locations (warehouses, stores)
- Access net payment terms (pay after delivery: net-7/15/30)
- Track credit limits and outstanding payments
- View purchase history and analytics
- Request quotes from multiple farmers
- Manage business profile (GST number, business license)
- Assign sub-users/employees with limited permissions

### 4. **Restaurant Partner (B2B Food Service)**
**Perspective**: Restaurant, café, or catering service needing fresh ingredients.

**Capabilities**:
- Browse products optimized for food service needs
- Place orders with early-morning delivery preferences
- Set up recurring menu-based orders (daily fresh vegetables for menu items)
- Schedule deliveries to match operating hours
- Access restaurant-specific pricing
- Manage FSSAI license and food safety certifications
- Quick reorder from previous orders
- Track daily/weekly ingredient costs
- Receive notifications for seasonal availability
- Coordinate with multiple farmers for diverse ingredients
- Manage kitchen delivery instructions

### 5. **Delivery Partner - Large-Scale (Long-Haul Logistics)** (`delivery_large`)
**Perspective**: Transportation company handling inter-city/regional shipments.

**Capabilities**:
- View available long-distance route requests (farm → city hub)
- Accept shipment jobs matching vehicle capacity
- Manage fleet of large vehicles (trucks, refrigerated containers)
- Track cold-chain compliance for perishables
- Update shipment status (picked up, in transit, delivered to hub)
- Manage vehicle documents and insurance
- View earnings per shipment
- Plan multi-stop routes for efficiency
- Handle bulk consolidation (multiple farmers → one hub)
- Report issues (delays, spoilage, accidents)
- Maintain service area coverage (states/regions)

### 6. **Delivery Partner - Small-Scale (Last-Mile Delivery)** (`delivery_small`)
**Perspective**: Local courier handling intra-city/neighborhood deliveries.

**Capabilities**:
- View available local delivery tasks (hub → customer/restaurant)
- Accept delivery assignments within service radius
- Manage smaller vehicles (vans, bikes, cars)
- Access GPS navigation for customer addresses
- Update real-time delivery status (out for delivery, delivered)
- Collect cash-on-delivery payments
- Handle customer interactions at doorstep
- Manage daily delivery slots and availability
- View earnings per delivery
- Rate customers (for problematic deliveries)
- Report delivery issues (wrong address, customer unavailable)
- Optimize route for multiple deliveries in same area

### 7. **Admin (Platform Manager)**
**Perspective**: Platform operator overseeing entire marketplace operations.

**Capabilities**:
- User management: Approve/suspend/verify all user types
- KYC verification: Review farmer certifications, business licenses
- Product moderation: Approve new products, flag inappropriate listings
- Order oversight: Monitor order fulfillment, resolve disputes
- Analytics dashboard: View sales, user growth, revenue metrics
- Content management: Update categories, banners, promotional content
- Pricing controls: Set platform commission rates by role/product
- Payment management: Process farmer payouts, handle refunds
- Support tickets: Handle customer complaints and queries
- System configuration: Manage delivery zones, tax rates, payment gateways
- Report generation: Sales reports, inventory reports, user activity
- Compliance monitoring: Ensure adherence to food safety regulations
- Marketing tools: Create promotions, discount campaigns, loyalty programs

---

## Key Features and Functional Scope

### Authentication & Authorization
- **Multi-role registration/login**: Users select role during signup
- **Role-based access control (RBAC)**: Each role sees only permitted features
- **JWT-based authentication**: Secure token management
- **Email/phone verification**: OTP-based account activation
- **Password recovery**: Email-based reset flow
- **Social login**: Optional Google/Facebook OAuth
- **Session management**: Auto-logout, remember-me functionality

### Product Catalog Management
- **Product types**: Fresh produce, grains, dairy, processed/packaged foods, organic items
- **Rich product details**: Images, descriptions, nutritional info, origin, harvest date
- **Category hierarchy**: Main categories (Vegetables, Fruits, Grains) → Subcategories
- **Pricing tiers**: Retail price (B2C), wholesale price (B2B), volume discounts
- **Inventory tracking**: Real-time stock levels by location and batch
- **Quality grades**: A/B/C grade classification
- **Search & filtering**: Full-text search, filters by price/location/type/certification
- **Product tagging**: Organic, pesticide-free, local, seasonal tags

### Shopping & Ordering (B2C)
- **Shopping cart**: Add/remove items, update quantities, save for later
- **Checkout flow**: Guest checkout or logged-in, address selection, payment method
- **Payment integration**: Credit/debit cards, UPI, wallets, net banking, COD
- **Discount system**: Coupon codes, loyalty points, first-order discounts
- **Order summary**: Itemized bill with delivery fee, taxes, savings
- **Delivery scheduling**: Select delivery date/time slot
- **Order confirmation**: Email/SMS notifications with order details
- **Order tracking**: Real-time status updates (confirmed → processing → shipped → delivered)

### Bulk Ordering (B2B)
- **Volume-based pricing**: Automatic discounts for bulk quantities
- **Quick ordering**: CSV upload for large order lists
- **Recurring orders**: Set up weekly/monthly automatic purchases (support pause/resume, end date, and auto-generation of upcoming orders)
- **Quote requests**: Request custom pricing from farmers
- **Payment terms**: Net-7, net-15, net-30 options for credit accounts
- **Credit management**: Track credit limits and outstanding invoices
- **Contract management**: Long-term supply agreements with farmers
- **Multi-location delivery**: Ship to multiple warehouses/stores

### Inventory & Logistics
- **Multi-location inventory**: Track stock at farms, hubs, dark stores, warehouses
- **Lot management**: Batch tracking with harvest/expiry dates
- **Reserved inventory**: Lock stock when order is placed
- **Expiry alerts**: Notifications for products nearing expiry
- **Quality control**: Inspection reports before shipment
- **Route optimization**: Efficient delivery path planning
- **Cold-chain tracking**: Temperature monitoring for perishables
- **Shipment consolidation**: Combine multiple orders for efficiency
- **Two-tier delivery**: Long-haul (farm → hub) + last-mile (hub → customer)

### Dashboards (Role-Specific)
- **Farmer Dashboard**: Inventory management, order queue, earnings summary, product performance
- **Customer Dashboard**: Order history, saved addresses, wishlist, loyalty points
- **Business Dashboard**: Purchase analytics, supplier list, contract management, invoice tracking
- **Restaurant Dashboard**: Daily orders, ingredient costs, recurring order setup, delivery schedule
- **Delivery Dashboard**: Available jobs, route map, earnings tracker, delivery history
- **Admin Dashboard**: User statistics, sales analytics, system health, pending approvals

### Communication & Notifications
- **In-app notifications**: Order updates, payment confirmations, delivery alerts
- **Email notifications**: Order receipts, shipment tracking, promotions
- **SMS alerts**: OTP, delivery updates, critical alerts
- **Push notifications**: Mobile app notifications (if applicable)
- **Chat/messaging**: Direct communication between buyers and farmers (optional)

### Reviews & Ratings
- **Product reviews**: Customers rate products after purchase (verified purchase badge)
- **Farmer ratings**: Overall farmer reputation score
- **Delivery ratings**: Rate delivery experience and courier
- **Review moderation**: Admin approval for flagged reviews
- **Helpful votes**: Users vote on helpful reviews

### Reports & Analytics
- **Sales reports**: Revenue by product/category/time period
- **Inventory reports**: Stock levels, turnover rates, wastage
- **User analytics**: Registration trends, active users, retention
- **Order analytics**: Order volumes, average order value, completion rates
- **Delivery performance**: On-time delivery percentage, courier ratings
- **Financial reports**: Revenue, commissions, payouts, refunds

---

## Logistics Flow Architecture

### Two-Tier Delivery System

**Tier 1: Long-Haul (Farm to City)**
- Large-scale delivery partners transport bulk shipments from rural farms to urban distribution hubs
- Uses refrigerated trucks for cold-chain compliance
- Covers 100-1000+ km distances
- Consolidates produce from multiple farmers
- Delivers to central fulfillment centers or dark stores in cities

**Tier 2: Last-Mile (Hub to Customer)**
- Small-scale delivery partners handle local deliveries from hubs to end customers
- Uses vans, bikes, or cars for quick neighborhood delivery
- Covers 0-50 km radius
- Delivers individual orders to homes/restaurants/businesses
- Flexible time slots (morning, afternoon, evening, next-day)

### Example Flow
1. **Farmer** lists 100 kg tomatoes in inventory
2. **Customer** orders 2 kg, **Restaurant** orders 10 kg, **Business** orders 50 kg
3. Orders are consolidated at farm location
4. **Large-scale delivery** picks up 62 kg and transports to city hub (500 km)
5. At hub, orders are sorted by destination
6. **Small-scale delivery** partners deliver:
   - 2 kg to customer's home (5 km from hub)
   - 10 kg to restaurant (8 km from hub)
   - 50 kg to business warehouse (15 km from hub)

---

## Technical Architecture & Best Practices

### MERN Stack Rationale
Use the **MERN stack** (MongoDB, Express.js, React.js, Node.js) for a full-stack JavaScript solution that provides:
- **Unified language**: JavaScript across frontend, backend, and database queries
- **JSON-based data flow**: Seamless data exchange between all layers
- **Scalability**: Non-blocking I/O in Node.js handles concurrent requests efficiently
- **Rich ecosystem**: Vast npm packages for every feature
- **Modern tooling**: Hot reload, developer experience, testing frameworks
- **Community support**: Large developer community, extensive documentation

### Modular Architecture
Design the application with **separation of concerns** and **modularity**:

**Backend Modules**:
- `auth`: User authentication, JWT generation/validation, password hashing
- `users`: User management, profile CRUD, role management
- `products`: Product catalog, CRUD operations, search/filter logic
- `categories`: Category hierarchy management
- `orders`: Order creation, status updates, order history
- `inventory`: Stock tracking, lot management, reservations
- `payments`: Payment gateway integration, transaction logging
- `notifications`: Email/SMS/push notification services
- `delivery`: Route management, shipment tracking
- `reviews`: Rating and review system
- `analytics`: Data aggregation, report generation
- `admin`: Platform management, moderation tools

**Frontend Modules**:
- `components`: Reusable UI components (buttons, cards, forms)
- `pages`: Full page views for each route
- `contexts`: Global state management (AuthContext, CartContext)
- `services`: API client functions for backend communication
- `hooks`: Custom React hooks for common logic
- `utils`: Helper functions, validators, formatters
- `routes`: Route configuration and protection

### Security Best Practices

**Role-Based Access Control (RBAC)**:
- Define permissions for each role in the database
- Check user role on every API request (middleware)
- Frontend conditionally renders UI based on role
- Users only access features authorized for their role
- Example: Only farmers can create products, only admins can delete users

**Authentication Security**:
- Hash passwords with bcrypt (salt rounds ≥ 10)
- Use HTTPS for all communications
- Implement JWT with short expiry (1-7 days)
- Store tokens securely (prefer httpOnly cookies for access/refresh tokens; alternatively use secure localStorage with short-lived access tokens)
- Validate all user inputs on both client and server
- Implement rate limiting to prevent brute-force attacks
- Use CSRF tokens for state-changing operations

**Data Protection**:
- Sanitize all user inputs to prevent XSS and SQL injection
- Use Mongoose schema validation
- Implement field-level encryption for sensitive data (payment info)
- Never expose sensitive data in API responses (remove password hashes)
- Log security events (failed logins, permission violations)

### Scalability Considerations

**Database**:
- Index frequently queried fields (user email, product category, order status)
- Implement geospatial indexes for location-based queries
- Use aggregation pipelines for complex reports
- Consider sharding for horizontal scaling as data grows
- Implement caching layer (Redis) for frequently accessed data

**API**:
- Implement pagination for large datasets (default 20 items per page)
- Use query parameters for filtering, sorting, searching
- Compress responses with gzip
- Implement API rate limiting per user/IP
- Implement background jobs for scheduled tasks (e.g., recurring orders) using a scheduler like node-cron or a job queue like Bull/Agenda
- Use CDN for static assets (product images)

**Frontend**:
- Code-splitting by route to reduce initial bundle size
- Lazy load images and non-critical components
- Implement virtual scrolling for long lists
- Optimize images (compress, use WebP format, responsive sizes)
- Implement service workers for offline functionality (PWA)

### Error Handling
- Use try-catch blocks in all async operations
- Return consistent error response format: `{ success: false, message: "error description" }`
- Log errors on backend for debugging
- Show user-friendly error messages on frontend
- Implement global error boundaries in React

### Testing Strategy
- Unit tests for utility functions and business logic
- Integration tests for API endpoints
- Component tests for React components
- End-to-end tests for critical user flows
- Test coverage target: ≥ 80%

### Recurring Orders & Scheduling (Cross-Cutting)
- Model recurring orders either within Orders (flags + schedule fields) or as a separate `RecurringOrder` entity that generates concrete Orders on schedule
- Support frequencies: weekly, biweekly, monthly; optionally, custom cron expressions
- Store schedule metadata on the buyer: `{ isRecurring, frequency, nextRunAt, endDate, paused }`
- A background worker scans due schedules and creates orders atomically with inventory reservation
- Admins and buyers can pause/resume/cancel schedules; audit each schedule run for observability

---

## Success Metrics

The platform should track and optimize for:
- **User adoption**: Number of registered users per role
- **Transaction volume**: Total orders processed, GMV (gross merchandise value)
- **Farmer empowerment**: Average farmer earnings, number of direct connections
- **Supply chain efficiency**: Average delivery time, product freshness metrics
- **Customer satisfaction**: NPS score, repeat purchase rate, review ratings
- **Platform sustainability**: Revenue from commissions, operational costs

---

## Implementation Priority

### Phase 1: MVP (Minimum Viable Product)
- User registration/login for Farmer, Customer, Admin roles
- Basic product catalog with add/edit/delete
- Simple B2C shopping flow (cart, checkout, payment)
- Order tracking with basic statuses
- Admin dashboard for user/product management

### Phase 2: B2B & Delivery
- Business and Restaurant roles with bulk ordering
- Volume pricing and payment terms
- Delivery partner roles (large and small scale)
- Route management and shipment tracking
- Multi-location inventory

### Phase 3: Advanced Features
- Review and rating system
- Loyalty and rewards program
- Advanced analytics and reporting
- Recurring orders and subscriptions
- Mobile app (React Native or PWA)

---

## Conclusion

FarmKart represents a comprehensive solution to modernize agricultural commerce by directly connecting producers with all types of consumers. By supporting both B2C and B2B models, implementing robust logistics through a two-tier delivery system, and providing role-specific interfaces for seven distinct user types, the platform addresses the complete agricultural value chain. Built on the MERN stack with modular architecture and RBAC security, FarmKart is designed to scale efficiently while maintaining security and performance as the marketplace grows.

The system should reduce agricultural waste, increase farmer income, provide fresher products to consumers, and streamline supply chains for businesses and restaurants—ultimately creating a more efficient and transparent agricultural marketplace.
