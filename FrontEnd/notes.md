# FarmKart Platform Documentation

## Overview
FarmKart is a comprehensive marketplace platform that connects farmers directly with end-users and businesses, serving both B2C (Business-to-Consumer) and B2B (Business-to-Business) segments. The platform enables direct farm-to-fork supply chains, helping farmers reach wider markets and earn better prices while providing fresh produce to consumers and businesses.

**📊 [View Entity-Relationship Diagram and Database Design →](./ERD.md)**

---

## Key Entities and Roles

### 1. **Farmers** (Producers/Sellers)
- Primary producers who grow and harvest agricultural products
- List products on the platform with inventory and pricing
- Sell raw or processed products
- Can serve both B2C (individual consumers) and B2B (bulk buyers) markets
- Manage their own inventory and pricing using platform tools
- Capture more value by controlling their pricing

### 2. **Customers** (End Consumers)
- Individual buyers placing retail orders
- Place smaller, on-demand orders via B2C interface
- Browse and buy produce for personal use
- Orders are typically smaller and delivered on-demand

### 3. **Businesses/Companies** (Bulk Buyers)
- Wholesale buyers, manufacturers, or processors
- Source large quantities of produce from farmers
- May also list value-added products on the platform
- Focus on supply consistency and cost-efficiency
- Place large, scheduled orders

### 4. **Restaurant Partners** (B2B Clients)
- Recurring B2B clients
- Order fresh produce frequently for daily menu needs
- Require early-morning bulk deliveries
- Focus on consistent supply and quality

### 5. **Delivery Services**

#### Large-Scale Delivery
- Handles long-distance transportation (village to city hubs)
- Uses trucks and cold-chain logistics
- Manages inter-city and rural-to-urban freight
- Ensures produce freshness during long-haul transport

#### Small-Scale Delivery
- Manages intra-city or last-mile distribution
- Uses vans or bikes from local dark stores to customers
- Handles local deliveries from hubs to final destinations
- Agile and flexible for quick deliveries

### 6. **Admin** (Platform Manager)
- Supervises entire system
- User verification and account management
- Quality control and compliance
- Authorizes business accounts
- Configures delivery tiers
- Oversees all transaction data and platform operations

---

## B2B vs B2C Dynamics

### B2C (Business-to-Consumer) Model
- **Target**: Individual consumers
- **Order Size**: Smaller, personal use quantities
- **Frequency**: More frequent, on-demand
- **Focus**: Convenience and variety
- **Delivery**: Last-mile delivery to homes
- **Pricing**: Listed prices plus delivery fees

### B2B (Business-to-Business) Model
- **Target**: Businesses (restaurants, retailers, corporate kitchens)
- **Order Size**: Large, bulk quantities
- **Frequency**: Scheduled, recurring orders
- **Focus**: Supply consistency and cost-efficiency
- **Delivery**: Scheduled bulk deliveries (often early morning)
- **Pricing**: Negotiated bulk prices (often lower per unit)

### Key Differences
| Aspect | B2B | B2C |
|--------|-----|-----|
| Order Size | Large, bulk | Small, personal |
| Frequency | Scheduled, recurring | On-demand, frequent |
| Customer Type | Businesses, restaurants | Individual consumers |
| Procurement Focus | Consistency, cost-efficiency | Convenience, variety |
| Delivery Schedule | Planned, early morning | On-demand, flexible |

### Benefits of Dual Model
- Farmers can tap both local retail and wholesale markets
- Expanded market reach for producers
- Flexible selling options (e.g., surplus to consumers, bulk to companies)
- Maximized revenue opportunities

---

## Logistics and Distribution

### Multi-Tier Supply Chain

#### 1. **Farm to Hub** (Long-Haul)
- Large-scale delivery partners manage this segment
- Refrigerated trucks or containers for perishables
- Inter-city and rural-to-urban freight
- Cold-chain logistics to maintain freshness
- Transport from farms to city distribution centers

#### 2. **Hub to Customer** (Last-Mile)
- Small-scale couriers handle local delivery
- City fulfillment centers (FCs) and dark stores
- Local vans/bikes for final delivery
- Flexible, agile service for quick delivery
- Serves both businesses and individual customers

### Distribution Network Structure
```
Farms → Refrigerated Trucks (Long-Haul) → City Hubs/FCs → 
Dark Stores → Local Vans/Bikes → Restaurants/Households
```

### Key Features
- **Hub-and-Spoke Network**: Central fulfillment centers with smaller local dark stores
- **Cold Chain**: Refrigerated transport to keep produce fresh
- **Dual Delivery**: Separate handling for B2B bulk and B2C on-demand
- **Efficient Flow**: Multi-tier approach ensures fresh farm goods reach anywhere

---

## Inventory and Pricing Management

### Inventory Management

#### Farmer Controls
- List all produce and track stock levels in real-time
- Update quantities for raw goods (fruits, vegetables, grains)
- Manage processed items (jams, packaged products)
- Platform aggregates listings into searchable catalog

#### Platform Features
- Real-time inventory tracking
- Stock level notifications
- Automated catalog updates
- Searchable product database for buyers

### Pricing Strategy

#### Farmer Pricing Control
- Farmers set their own prices for each product
- Base prices on:
  - Market conditions
  - Production costs
  - Competition
  - Demand trends
  - Seasonal factors

#### Platform Support
- Market data and demand trends
- Competitor pricing insights
- Price recommendations
- Transparent pricing display

#### Pricing Models
- **B2C**: Listed prices + delivery fees
- **B2B**: Negotiated bulk prices (often slightly lower per unit)
- **Dynamic**: Farmers can adjust prices based on real-time data

### Benefits
- **Transparency**: All prices visible to buyers, builds trust
- **Fair Pricing**: Farmers can charge appropriate market rates
- **Value Capture**: Producers retain more profit
- **Market Intelligence**: Data-driven pricing decisions

---

## Relationships and Interactions

### Farmer ↔ Customer (B2C)
- Direct retail sales
- Farmers list products → Customers browse and purchase
- Small orders, frequent transactions
- Last-mile delivery to homes

### Farmer ↔ Business/Restaurant (B2B)
- Bulk wholesale transactions
- Recurring, scheduled orders
- Volume discounts possible
- Direct or hub-based delivery

### Farmer ↔ Delivery Services
- Large-scale: Farm to city hub transport
- Small-scale: May pick up from local collection points
- Coordinated logistics for freshness

### Business ↔ Platform
- Businesses may also list processed products
- Value-added goods sold to consumers or other businesses
- Dual role as both buyers and sellers

### Admin ↔ All Users
- Oversees and manages all relationships
- User verification and authorization
- Transaction monitoring
- Quality control enforcement
- Platform optimization

---

## Platform Benefits

### For Farmers
- **Direct Market Access**: Reach consumers without intermediaries
- **Better Prices**: Capture more value from sales
- **Market Flexibility**: Serve both B2C and B2B segments
- **Data Insights**: Market intelligence for better decisions
- **Inventory Control**: Manage stock and pricing independently

### For Customers
- **Fresh Produce**: Direct from farms
- **Transparency**: Clear pricing and product information
- **Convenience**: On-demand delivery
- **Variety**: Wide selection from multiple farmers
- **Trust**: Direct connection with producers

### For Businesses/Restaurants
- **Consistent Supply**: Reliable bulk orders
- **Cost Efficiency**: Bulk pricing advantages
- **Quality**: Fresh, traceable produce
- **Scheduled Delivery**: Predictable supply chain
- **Direct Sourcing**: Eliminate middlemen

### For the Platform
- **End-to-End Control**: Full supply chain visibility
- **Dual Revenue**: B2C and B2B commission streams
- **Network Effects**: More users attract more users
- **Data Value**: Transaction and market insights
- **Scalability**: Multi-tier model supports growth

---

## Technology Stack Considerations (MERN)

### MongoDB Schema Entities
- Users (Farmers, Customers, Businesses, Restaurants, Delivery, Admin)
- Products (inventory, pricing, categories)
- Orders (B2C and B2B)
- Deliveries (routes, status, tracking)
- Transactions (payments, commissions)
- Reviews and Ratings
- Inventory Logs
- Pricing History

### Express.js API Routes
- User authentication and authorization
- Product listing and search
- Order management (B2C/B2B workflows)
- Inventory updates
- Delivery tracking
- Payment processing
- Admin dashboard

### React Frontend Components
- Farmer dashboard (inventory, pricing, orders)
- Customer marketplace (browse, cart, checkout)
- Business portal (bulk ordering, recurring orders)
- Restaurant ordering interface
- Delivery partner app
- Admin control panel

### Node.js Services
- Real-time inventory updates
- Price calculation engine
- Order routing and fulfillment
- Delivery optimization
- Notification service
- Analytics and reporting

---

## References and Inspirations

This platform model draws on practices from modern agri-e-commerce and grocery logistics platforms, including:
- **GrubMarket**: Connects farmers directly with consumers and businesses via B2C/B2B models
- **BigBasket**: Hub-and-spoke distribution with dark stores, BB Daily B2B service
- Similar platforms using inventory tools, multi-tier logistics, and dual market approaches

---

## Next Steps for Development

1. **Database Design**: Create detailed MongoDB schemas for all entities
2. **API Design**: Define RESTful endpoints for all operations
3. **UI/UX Design**: Wireframes for each user role interface
4. **Authentication**: Implement role-based access control
5. **Inventory System**: Build real-time stock management
6. **Order Flow**: Separate B2C and B2B order processing
7. **Delivery Integration**: Multi-tier logistics coordination
8. **Payment Gateway**: Secure transaction processing
9. **Analytics Dashboard**: For farmers and admin
10. **Testing**: Comprehensive testing for all user flows

---

*Last Updated: October 25, 2025*
