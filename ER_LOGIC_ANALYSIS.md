# FarmKart ER Logic & Connection Analysis

**Date**: October 25, 2025  
**Status**: Analysis Complete

---

## 📊 Current Implementation Status

### ✅ Implemented Models (12/15)

| Model | ERD Defined | Implemented | Status |
|-------|-------------|-------------|--------|
| User | ✅ | ✅ | Complete |
| FarmerProfile | ✅ | ✅ | Complete |
| BusinessProfile | ✅ | ✅ | Complete |
| RestaurantProfile | ✅ | ✅ | Complete |
| DeliveryProfile | ✅ | ✅ | Complete |
| Product | ✅ | ✅ | Complete |
| Category | ✅ | ✅ | Complete |
| InventoryLot | ✅ | ✅ | Complete |
| Location | ✅ | ✅ | Complete |
| Order | ✅ | ✅ | Complete |
| Review | ✅ | ✅ | Complete |
| RecurringOrder | ❌ | ✅ | **Added (not in original ERD)** |

### ❌ Missing Models (4/15)

| Model | Purpose | Priority | Impact |
|-------|---------|----------|--------|
| **PriceAgreement** | B2B pricing contracts | HIGH | B2B tiered pricing not working |
| **Shipment** | Long-haul transportation | MEDIUM | No shipment tracking |
| **DeliveryTask** | Last-mile delivery | MEDIUM | No delivery optimization |
| **Payment** | Payment transactions | HIGH | No payment tracking |

---

## 🔍 ER Connection Analysis

### ✅ Correct Relationships

#### 1. User → Profiles (One-to-One)
```javascript
// User.model.js
// No direct reference (correctly decoupled)

// FarmerProfile.model.js
userId: { type: ObjectId, ref: 'User', unique: true } ✅
```
**Status**: ✅ **CORRECT** - Properly implemented with unique constraint

#### 2. Product → Category (Many-to-One)
```javascript
// Product.model.js
categoryId: { type: ObjectId, ref: 'Category', required: true } ✅
```
**Status**: ✅ **CORRECT** - Indexed properly

#### 3. Product → User (Many-to-One as Owner)
```javascript
// Product.model.js
ownerId: { type: ObjectId, ref: 'User', required: true } ✅
```
**Status**: ✅ **CORRECT** - Farmer ownership tracked

#### 4. InventoryLot → Product (Many-to-One)
```javascript
// InventoryLot.model.js
productId: { type: ObjectId, ref: 'Product', required: true } ✅
```
**Status**: ✅ **CORRECT** - Multiple lots per product

#### 5. InventoryLot → Location (Many-to-One)
```javascript
// InventoryLot.model.js
locationId: { type: ObjectId, ref: 'Location', required: true } ✅
```
**Status**: ✅ **CORRECT** - Location tracking implemented

#### 6. Order → User (Many-to-One for Buyer & Seller)
```javascript
// Order.model.js
buyerId: { type: ObjectId, ref: 'User', required: true } ✅
sellerId: { type: ObjectId, ref: 'User', required: true } ✅
```
**Status**: ✅ **CORRECT** - Both sides tracked

#### 7. Review → User & Product (Many-to-One)
```javascript
// Review.model.js
userId: { type: ObjectId, ref: 'User', required: true } ✅
productId: { type: ObjectId, ref: 'Product', required: true } ✅
orderId: { type: ObjectId, ref: 'Order' } ✅
```
**Status**: ✅ **CORRECT** - Includes order reference for verification

---

### ⚠️ Missing Relationships

#### 1. Order → Payment (One-to-Many)
**Expected**:
```javascript
// Payment.model.js (MISSING)
orderId: { type: ObjectId, ref: 'Order', required: true }
amount: Number
status: String
method: String
```
**Impact**: ❌ No payment tracking, settlement, or refund capability

#### 2. Order → Shipment (Many-to-One)
**Expected**:
```javascript
// Order.model.js
shipmentId: { type: ObjectId, ref: 'Shipment' } // MISSING

// Shipment.model.js (MISSING)
orderIds: [{ type: ObjectId, ref: 'Order' }]
carrierId: { type: ObjectId, ref: 'User' }
```
**Impact**: ❌ No bulk shipment grouping for B2B

#### 3. Order → DeliveryTask (Many-to-One)
**Expected**:
```javascript
// DeliveryTask.model.js (MISSING)
stops: [{
  orderId: ObjectId,
  address: Object,
  status: String
}]
carrierId: { type: ObjectId, ref: 'User' }
```
**Impact**: ❌ No last-mile route optimization

#### 4. Product → PriceAgreement (One-to-Many)
**Expected**:
```javascript
// PriceAgreement.model.js (MISSING)
productId: { type: ObjectId, ref: 'Product' }
sellerId: { type: ObjectId, ref: 'User' }
buyerId: { type: ObjectId, ref: 'User' }
tiers: [{ minQuantity: Number, price: Number }]
validFrom: Date
validUntil: Date
```
**Impact**: ❌ No B2B tiered pricing

---

## 🐛 Issues & Inconsistencies

### Issue #1: Address Schema Inconsistency
**Problem**: User addresses don't have `_id` by default
```javascript
// User.model.js
const addressSchema = new mongoose.Schema({...}, { _id: false }); ❌
```

**Impact**: 
- RecurringOrder used to reference `deliveryAddressId` (now fixed with snapshot)
- Cannot directly reference specific addresses

**Solution**: ✅ Already fixed - RecurringOrder now stores address snapshot

---

### Issue #2: Order Items Missing Snapshot Data
**Problem**: Order items reference products but don't store full snapshot
```javascript
// Order.model.js - orderItemSchema
productId: { type: ObjectId, ref: 'Product' }
productName: String, // Only name snapshot ⚠️
// Missing: productImage, farmerId, etc.
```

**Impact**: If product is deleted/modified, order history loses context

**Recommendation**:
```javascript
// IMPROVED orderItemSchema
const orderItemSchema = new mongoose.Schema({
  productId: ObjectId,
  productName: String,
  productImage: String, // ADD
  farmerId: ObjectId, // ADD (for farmer payout tracking)
  categoryId: ObjectId, // ADD (for analytics)
  quantity: Number,
  unit: String,
  unitPrice: Number,
  totalPrice: Number,
  lotId: ObjectId
});
```

---

### Issue #3: No Cascade Delete Logic
**Problem**: Deleting entities doesn't clean up related data
```javascript
// Example: Deleting a User doesn't delete their:
// - FarmerProfile
// - Products
// - Reviews
// - Orders (should mark as archived)
```

**Recommendation**: Add pre-remove hooks or use soft deletes
```javascript
// User.model.js
userSchema.pre('remove', async function(next) {
  await FarmerProfile.deleteOne({ userId: this._id });
  await Product.updateMany({ ownerId: this._id }, { status: 'discontinued' });
  // etc.
  next();
});
```

---

### Issue #4: Category Self-Referencing Not Indexed
**Problem**: Category has `parentId` but no index
```javascript
// Category.model.js
parentId: { type: ObjectId, ref: 'Category' } // No index ⚠️
```

**Recommendation**:
```javascript
categorySchema.index({ parentId: 1 }); // ADD
```

---

### Issue #5: No Composite Unique Constraints
**Problem**: Can create duplicate reviews for same order+user
```javascript
// Review.model.js - Missing unique constraint
// User can review same product multiple times from different orders
```

**Recommendation**:
```javascript
reviewSchema.index({ userId: 1, orderId: 1 }, { unique: true });
// One review per user per order
```

---

## 🔧 Recommended Modifications

### Priority 1: Critical Business Logic

#### 1. Add Payment Model
```javascript
// models/Payment.model.js
const paymentSchema = new mongoose.Schema({
  orderId: { type: ObjectId, ref: 'Order', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  method: { 
    type: String, 
    enum: ['card', 'upi', 'netbanking', 'cod', 'credit'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'success', 'failed', 'refunded'],
    default: 'pending'
  },
  gateway: String, // razorpay, stripe, etc.
  transactionId: String,
  paidAt: Date,
  refundedAt: Date,
  metadata: Object
}, { timestamps: true });

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
```

#### 2. Add PriceAgreement Model
```javascript
// models/PriceAgreement.model.js
const priceAgreementSchema = new mongoose.Schema({
  sellerId: { type: ObjectId, ref: 'User', required: true },
  buyerId: { type: ObjectId, ref: 'User', required: true },
  productId: { type: ObjectId, ref: 'Product', required: true },
  tiers: [{
    minQuantity: Number,
    maxQuantity: Number,
    price: Number
  }],
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  status: {
    type: String,
    enum: ['draft', 'active', 'expired', 'cancelled'],
    default: 'draft'
  },
  terms: String
}, { timestamps: true });

priceAgreementSchema.index({ sellerId: 1, buyerId: 1, productId: 1 });
priceAgreementSchema.index({ validFrom: 1, validUntil: 1 });
```

---

### Priority 2: Enhance Existing Models

#### 1. Improve Order Item Schema
```javascript
// Add to orderItemSchema in Order.model.js
productImage: String, // Snapshot of product image
farmerId: { type: ObjectId, ref: 'User' }, // For payout tracking
farmerName: String, // Snapshot
categoryId: { type: ObjectId, ref: 'Category' }, // For analytics
discountApplied: { type: Number, default: 0 },
taxRate: { type: Number, default: 0 }
```

#### 2. Add Product Availability Status
```javascript
// Product.model.js - Add virtual
productSchema.virtual('availableStock').get(async function() {
  const lots = await InventoryLot.find({ productId: this._id });
  return lots.reduce((sum, lot) => sum + lot.availableQuantity, 0);
});
```

#### 3. Add Order Status History
```javascript
// Order.model.js - Add field
statusHistory: [{
  status: String,
  timestamp: Date,
  updatedBy: { type: ObjectId, ref: 'User' },
  notes: String
}]
```

---

### Priority 3: Optional Enhancements

#### 1. Add Shipment Model (for B2B)
```javascript
const shipmentSchema = new mongoose.Schema({
  shipmentNumber: { type: String, unique: true },
  carrierId: { type: ObjectId, ref: 'User' },
  orderIds: [{ type: ObjectId, ref: 'Order' }],
  originLocationId: { type: ObjectId, ref: 'Location' },
  destinationLocationId: { type: ObjectId, ref: 'Location' },
  status: { 
    type: String, 
    enum: ['scheduled', 'in_transit', 'arrived', 'delivered', 'cancelled']
  },
  vehicleType: String,
  departureTime: Date,
  estimatedArrival: Date,
  actualArrival: Date,
  trackingUpdates: [{
    location: Object,
    timestamp: Date,
    status: String
  }]
}, { timestamps: true });
```

#### 2. Add DeliveryTask Model (for last-mile)
```javascript
const deliveryTaskSchema = new mongoose.Schema({
  taskNumber: { type: String, unique: true },
  carrierId: { type: ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed']
  },
  stops: [{
    orderId: { type: ObjectId, ref: 'Order' },
    address: Object,
    sequence: Number,
    status: String,
    arrivalTime: Date,
    deliveredAt: Date,
    signature: String,
    notes: String
  }],
  routeOptimized: Boolean,
  totalDistance: Number,
  startTime: Date,
  endTime: Date
}, { timestamps: true });
```

---

## 📈 Data Integrity Recommendations

### 1. Add Validation Hooks
```javascript
// InventoryLot.model.js
inventoryLotSchema.pre('save', function(next) {
  if (this.reservedQuantity > this.quantity) {
    return next(new Error('Reserved quantity cannot exceed total quantity'));
  }
  next();
});
```

### 2. Add Transaction Support for Critical Operations
```javascript
// Order creation with inventory reservation
const session = await mongoose.startSession();
session.startTransaction();
try {
  const order = await Order.create([orderData], { session });
  await InventoryLot.updateOne(
    { _id: lotId },
    { $inc: { reservedQuantity: quantity } },
    { session }
  );
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### 3. Add Soft Delete for Critical Entities
```javascript
// Add to User, Product, Order
deletedAt: { type: Date, default: null }
isDeleted: { type: Boolean, default: false }

// Add pre-find hooks
schema.pre(/^find/, function() {
  this.where({ isDeleted: { $ne: true } });
});
```

---

## 🎯 Summary of Modifications Needed

### Critical (Implement ASAP)
1. ✅ **Payment Model** - Track all transactions
2. ✅ **PriceAgreement Model** - Enable B2B tiered pricing
3. ✅ **Improve Order Items** - Add snapshots for farmer, category, image
4. ✅ **Add unique constraints** - Prevent duplicate reviews
5. ✅ **Add cascade logic** - Handle entity deletions properly

### Important (Implement Soon)
6. ⚠️ **Shipment Model** - B2B bulk transportation
7. ⚠️ **DeliveryTask Model** - Last-mile optimization
8. ⚠️ **Order status history** - Audit trail
9. ⚠️ **Product availability virtual** - Real-time stock check
10. ⚠️ **Add more indexes** - Category parentId, composite indexes

### Nice to Have (Future)
11. 💡 **Soft delete** - Data recovery capability
12. 💡 **Notification Model** - Push notifications, emails
13. 💡 **AuditLog Model** - Track all critical changes
14. 💡 **PromotionCampaign Model** - Marketing campaigns
15. 💡 **Wishlist Model** - Customer wishlists

---

## ✅ What's Working Well

1. ✅ **User-Profile separation** - Clean multi-role design
2. ✅ **Product-Category relationship** - Properly indexed
3. ✅ **Inventory management** - Good lot tracking with reservations
4. ✅ **RecurringOrder** - Smart addition with address snapshots
5. ✅ **Review system** - Linked to orders for verification
6. ✅ **Order type distinction** - B2C and B2B properly separated
7. ✅ **Indexes** - Most critical queries are indexed

---

## 📋 Action Items

### Immediate
- [ ] Create Payment.model.js
- [ ] Create PriceAgreement.model.js
- [ ] Enhance Order item schema with snapshots
- [ ] Add unique constraint to Review (userId + orderId)
- [ ] Add parentId index to Category

### Short Term
- [ ] Create Shipment.model.js
- [ ] Create DeliveryTask.model.js
- [ ] Add status history to Order
- [ ] Implement cascade delete hooks
- [ ] Add validation hooks for inventory

### Long Term
- [ ] Implement soft delete
- [ ] Add audit logging
- [ ] Performance optimization with denormalization where needed
- [ ] Add data migration scripts

---

**Conclusion**: The ER design is **solid and well-structured**, but **4 critical models are missing** (Payment, PriceAgreement, Shipment, DeliveryTask). The relationships that are implemented are correct, but need enhancements for data integrity and business logic completeness.

**Overall Grade**: B+ (Good foundation, needs completion)

---

**Last Updated**: October 25, 2025
