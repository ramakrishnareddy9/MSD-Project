import mongoose from 'mongoose';
import dotenv from 'dotenv';

import User from '../models/User.model.js';
import Product from '../models/Product.model.js';
import Category from '../models/Category.model.js';
import Cart from '../models/Cart.model.js';
import Wishlist from '../models/Wishlist.model.js';
import Order from '../models/Order.model.js';
import InventoryLot from '../models/InventoryLot.model.js';
import Location from '../models/Location.model.js';
import Vehicle from '../models/Vehicle.model.js';
import Payment from '../models/Payment.model.js';
import Community from '../models/Community.model.js';
import CommunityPool from '../models/CommunityPool.model.js';
import FarmerProfile from '../models/FarmerProfile.model.js';
import BusinessProfile from '../models/BusinessProfile.model.js';
import RestaurantProfile from '../models/RestaurantProfile.model.js';
import TravelAgencyProfile from '../models/TravelAgencyProfile.model.js';
import DeliveryProfile from '../models/DeliveryProfile.model.js';

dotenv.config();

const LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/farmkart';

const usersSeed = {
  farmers: [
    { name: 'Ramesh Patel', email: 'farmer1@farmkart.local', phone: '9000000001' },
    { name: 'Meera Sharma', email: 'farmer2@farmkart.local', phone: '9000000002' },
    { name: 'Suresh Kumar', email: 'farmer3@farmkart.local', phone: '9000000003' },
    { name: 'Priya Devi', email: 'farmer4@farmkart.local', phone: '9000000004' },
    { name: 'Gopal Singh', email: 'farmer5@farmkart.local', phone: '9000000005' }
  ],
  businesses: [
    { name: 'Fresh Wholesale Pvt Ltd', email: 'business1@farmkart.local', phone: '9000000011' },
    { name: 'Harvest Retail Hub', email: 'business2@farmkart.local', phone: '9000000012' },
    { name: 'Agro Processing Works', email: 'business3@farmkart.local', phone: '9000000013' }
  ],
  restaurants: [
    { name: 'Green Spoon Restaurant', email: 'restaurant1@farmkart.local', phone: '9000000021' },
    { name: 'Farm Table Kitchen', email: 'restaurant2@farmkart.local', phone: '9000000022' }
  ],
  deliveryPartners: [
    { name: 'Swift Logistics', email: 'delivery@farmkart.com', phone: '9000000041', password: 'delivery123', role: 'delivery', scale: 'large' },
    { name: 'Swift Logistics Large', email: 'delivery.large@farmkart.local', phone: '9000000042', password: 'password123', role: 'delivery_large', scale: 'large' },
    { name: 'Swift Logistics Small', email: 'delivery.small@farmkart.local', phone: '9000000043', password: 'password123', role: 'delivery_small', scale: 'small' }
  ],
  travelAgency: [
    { name: 'SkyRoute Travel Agency', email: 'travelagency@farmkart.local', phone: '9000000031' }
  ],
  customers: [
    { name: 'Aarav Nair', email: 'customer1@farmkart.local', phone: '9000000101' },
    { name: 'Ananya Iyer', email: 'customer2@farmkart.local', phone: '9000000102' },
    { name: 'Vikram Rao', email: 'customer3@farmkart.local', phone: '9000000103' },
    { name: 'Neha Gupta', email: 'customer4@farmkart.local', phone: '9000000104' },
    { name: 'Rohit Verma', email: 'customer5@farmkart.local', phone: '9000000105' },
    { name: 'Kiran Reddy', email: 'customer6@farmkart.local', phone: '9000000106' },
    { name: 'Sneha Menon', email: 'customer7@farmkart.local', phone: '9000000107' },
    { name: 'Arjun Das', email: 'customer8@farmkart.local', phone: '9000000108' },
    { name: 'Pooja Shah', email: 'customer9@farmkart.local', phone: '9000000109' },
    { name: 'Nikhil Jain', email: 'customer10@farmkart.local', phone: '9000000110' }
  ]
};

const defaultAddress = (type, city) => ({
  type,
  line1: `${city} Main Road`,
  city,
  state: 'Maharashtra',
  postalCode: '400001',
  country: 'India'
});

const createUsers = async (seedUsers, role, addressType, cityPrefix) => {
  const docs = [];
  for (let i = 0; i < seedUsers.length; i += 1) {
    const u = seedUsers[i];
    const city = `${cityPrefix} ${i + 1}`;
    const user = await new User({
      name: u.name,
      email: u.email,
      phone: u.phone,
      passwordHash: 'password123',
      roles: [role],
      emailVerified: true,
      addresses: [defaultAddress(addressType, city)]
    }).save();

    docs.push(user);
  }
  return docs;
};

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || LOCAL_MONGO_URI;

    console.log('🌱 Starting local database seeding...');
    await mongoose.connect(mongoUri);
    console.log(`✅ Connected to MongoDB: ${mongoUri}`);

    console.log('🗑️ Clearing existing role/profile/community collections...');
    await Promise.all([
      CommunityPool.deleteMany({}),
      Community.deleteMany({}),
      Product.deleteMany({}),
      Cart.deleteMany({}),
      Wishlist.deleteMany({}),
      Order.deleteMany({}),
      InventoryLot.deleteMany({}),
      Location.deleteMany({}),
      Vehicle.deleteMany({}),
      Payment.deleteMany({}),
      FarmerProfile.deleteMany({}),
      BusinessProfile.deleteMany({}),
      RestaurantProfile.deleteMany({}),
      TravelAgencyProfile.deleteMany({}),
      DeliveryProfile.deleteMany({}),
      User.deleteMany({
        roles: {
          $in: ['farmer', 'business', 'travel_agency', 'restaurant', 'delivery', 'delivery_large', 'delivery_small', 'customer']
        }
      })
    ]);

    const farmers = await createUsers(usersSeed.farmers, 'farmer', 'farm', 'Farm City');
    const businesses = await createUsers(usersSeed.businesses, 'business', 'warehouse', 'Business City');
    const restaurants = await createUsers(usersSeed.restaurants, 'restaurant', 'restaurant', 'Restaurant City');
    const deliveryPartners = await Promise.all(usersSeed.deliveryPartners.map((partner, idx) => new User({
      name: partner.name,
      email: partner.email,
      phone: partner.phone,
      passwordHash: partner.password,
      roles: [partner.role],
      emailVerified: true,
      addresses: [defaultAddress('office', `Delivery City ${idx + 1}`)]
    }).save()));
    const travelAgencies = await createUsers(usersSeed.travelAgency, 'travel_agency', 'office', 'Travel City');
    const customers = await createUsers(usersSeed.customers, 'customer', 'home', 'Customer City');

    await Promise.all(
      farmers.map((farmer, idx) =>
        new FarmerProfile({
          userId: farmer._id,
          farmName: `Farm ${idx + 1}`,
          farmType: idx % 2 === 0 ? 'organic' : 'mixed',
          farmSize: 10 + idx,
          certifications: idx % 2 === 0 ? ['organic'] : [],
          experience: 3 + idx
        }).save()
      )
    );

    await Promise.all(
      businesses.map((business, idx) =>
        new BusinessProfile({
          userId: business._id,
          companyName: business.name,
          companyType: ['wholesaler', 'processor', 'manufacturer'][idx % 3],
          paymentTerms: 'net_15',
          creditLimit: 50000 + idx * 10000
        }).save()
      )
    );

    await Promise.all(
      travelAgencies.map((agency, idx) =>
        new TravelAgencyProfile({
          userId: agency._id,
          agencyName: agency.name,
          registrationNumber: `TA-2026-${idx + 1}`,
          serviceAreas: ['Maharashtra', 'Karnataka'],
          specialties: ['group_travel', 'farm_tourism'],
          paymentTerms: 'net_15'
        }).save()
      )
    );

    await Promise.all(
      restaurants.map((restaurant, idx) =>
        new RestaurantProfile({
          userId: restaurant._id,
          restaurantName: restaurant.name,
          cuisineType: idx === 0 ? ['Indian'] : ['Continental'],
          deliveryWindowPreference: 'early_morning',
          seatingCapacity: 40 + idx * 10
        }).save()
      )
    );

    await Promise.all(
      deliveryPartners.map((partner, idx) => new DeliveryProfile({
        userId: partner._id,
        companyName: partner.name,
        scale: usersSeed.deliveryPartners[idx].scale,
        vehicleTypes: usersSeed.deliveryPartners[idx].scale === 'large'
          ? ['truck', 'van', 'refrigerated_truck']
          : ['bike', 'van'],
        coldChainCapable: usersSeed.deliveryPartners[idx].scale === 'large',
        serviceAreas: [{
          type: 'city',
          coverage: idx === 0 ? ['Mumbai', 'Pune'] : ['Hyderabad', 'Bengaluru'],
          coordinates: {
            type: 'Polygon',
            coordinates: [[
              [72.0 + idx, 18.0 + idx * 0.1],
              [72.5 + idx, 18.0 + idx * 0.1],
              [72.5 + idx, 18.5 + idx * 0.1],
              [72.0 + idx, 18.5 + idx * 0.1],
              [72.0 + idx, 18.0 + idx * 0.1]
            ]]
          }
        }],
        capacity: usersSeed.deliveryPartners[idx].scale === 'large'
          ? { maxWeight: 10000, maxVolume: 200 }
          : { maxWeight: 800, maxVolume: 20 }
      }).save())
    );

    // Core commerce data for customer dashboard flows
    const categoryDefs = [
      { name: 'Vegetables', slug: 'vegetables', description: 'Fresh vegetables', displayOrder: 1 },
      { name: 'Fruits', slug: 'fruits', description: 'Seasonal fruits', displayOrder: 2 },
      { name: 'Grains', slug: 'grains', description: 'Staple grains', displayOrder: 3 },
      { name: 'Dairy', slug: 'dairy', description: 'Milk and dairy products', displayOrder: 4 }
    ];

    const categories = [];
    for (const categoryDef of categoryDefs) {
      const category = await Category.findOneAndUpdate(
        { slug: categoryDef.slug },
        {
          $set: {
            name: categoryDef.name,
            description: categoryDef.description,
            displayOrder: categoryDef.displayOrder,
            isActive: true
          },
          $setOnInsert: { slug: categoryDef.slug }
        },
        { upsert: true, new: true }
      );
      categories.push(category);
    }

    const farmerLocations = await Promise.all(
      farmers.map((farmer, idx) => Location.create({
        type: 'farm',
        name: `${farmer.name} Farm`,
        ownerId: farmer._id,
        address: {
          line1: `Farm Plot ${idx + 1}`,
          city: `Farm City ${idx + 1}`,
          state: 'Maharashtra',
          postalCode: `4000${idx + 1}`,
          country: 'India'
        },
        coordinates: {
          type: 'Point',
          coordinates: [72.8 + idx * 0.08, 18.5 + idx * 0.05]
        },
        status: 'active'
      }))
    );

    const productDefs = [
      { name: 'Fresh Tomatoes', unit: 'kg', basePrice: 32, stockQuantity: 200, categorySlug: 'vegetables' },
      { name: 'Organic Potatoes', unit: 'kg', basePrice: 28, stockQuantity: 240, categorySlug: 'vegetables' },
      { name: 'Bananas', unit: 'dozen', basePrice: 55, stockQuantity: 150, categorySlug: 'fruits' },
      { name: 'Apples', unit: 'kg', basePrice: 120, stockQuantity: 140, categorySlug: 'fruits' },
      { name: 'Wheat', unit: 'kg', basePrice: 42, stockQuantity: 320, categorySlug: 'grains' },
      { name: 'Milk', unit: 'liter', basePrice: 62, stockQuantity: 180, categorySlug: 'dairy' }
    ];

    const products = await Promise.all(
      productDefs.map((def, idx) => {
        const owner = farmers[idx % farmers.length];
        const category = categories.find((c) => c.slug === def.categorySlug) || categories[0];
        return Product.create({
          ownerId: owner._id,
          categoryId: category._id,
          name: def.name,
          description: `${def.name} sourced directly from local farms`,
          unit: def.unit,
          basePrice: def.basePrice,
          stockQuantity: def.stockQuantity,
          minOrderQuantity: 1,
          status: 'active',
          images: ['https://images.unsplash.com/photo-1488459716781-6f03ee1b563b?w=800&h=600&fit=crop&q=80']
        });
      })
    );

    await Promise.all(
      products.map((product, idx) => InventoryLot.create({
        productId: product._id,
        locationId: farmerLocations[idx % farmerLocations.length]._id,
        quantity: Number(product.stockQuantity || 100),
        reservedQuantity: 0,
        qualityGrade: 'A'
      }))
    );

    const sampleOrders = [
      {
        buyerId: customers[0]._id,
        sellerId: products[0].ownerId,
        product: products[0],
        status: 'delivered',
        quantity: 8,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        buyerId: customers[0]._id,
        sellerId: products[2].ownerId,
        product: products[2],
        status: 'pending',
        quantity: 5,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        buyerId: customers[1]._id,
        sellerId: products[4].ownerId,
        product: products[4],
        status: 'processing',
        quantity: 12,
        createdAt: new Date()
      }
    ];

    await Promise.all(sampleOrders.map((orderSeed) => {
      const unitPrice = Number(orderSeed.product.basePrice || 0);
      const subtotal = unitPrice * orderSeed.quantity;
      const tax = subtotal * 0.05;
      const total = subtotal + tax;
      return Order.create({
        type: 'b2c',
        buyerId: orderSeed.buyerId,
        sellerId: orderSeed.sellerId,
        status: orderSeed.status,
        orderItems: [{
          productId: orderSeed.product._id,
          productName: orderSeed.product.name,
          farmerId: orderSeed.product.ownerId,
          categoryId: orderSeed.product.categoryId,
          quantity: orderSeed.quantity,
          unit: orderSeed.product.unit,
          unitPrice,
          totalPrice: subtotal,
          discountApplied: 0
        }],
        subtotal,
        deliveryFee: 0,
        tax,
        total,
        paymentTerms: 'prepaid',
        deliveryAddress: {
          line1: 'Customer Address',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        statusHistory: [{ status: orderSeed.status, timestamp: orderSeed.createdAt, updatedBy: orderSeed.buyerId }],
        createdAt: orderSeed.createdAt,
        updatedAt: new Date()
      });
    }));

    const allMembers = [
      ...farmers,
      ...businesses,
      ...deliveryPartners,
      ...travelAgencies,
      ...restaurants,
      ...customers
    ];

    const communities = [
      {
        name: 'Green Valley Producers Group',
        description: 'Farmers, buyers, restaurants and customers doing grouped procurement.',
        admin: farmers[0]._id,
        discount: 12,
        members: allMembers.slice(0, 8).map((member) => ({ user: member._id }))
      },
      {
        name: 'Urban Fresh Buying Circle',
        description: 'Community-driven bulk orders for city households and restaurants.',
        admin: businesses[0]._id,
        discount: 10,
        members: allMembers.slice(8, 15).map((member) => ({ user: member._id }))
      },
      {
        name: 'Farm to Fork Alliance',
        description: 'Farm-to-customer network coordinated with restaurant and travel partners.',
        admin: restaurants[0]._id,
        discount: 15,
        members: allMembers.slice(15).map((member) => ({ user: member._id }))
      }
    ];

    const createdCommunities = await Community.insertMany(communities);

    console.log('✅ Seed completed successfully');
    console.log(`   Farmers: ${farmers.length}`);
    console.log(`   Businesses: ${businesses.length}`);
    console.log(`   Restaurants: ${restaurants.length}`);
    console.log(`   Delivery Partners: ${deliveryPartners.length}`);
    console.log(`   Travel Agencies: ${travelAgencies.length}`);
    console.log(`   Customers: ${customers.length}`);
    console.log(`   Categories: ${categories.length}`);
    console.log(`   Products: ${products.length}`);
    console.log(`   Sample Orders: ${sampleOrders.length}`);
    console.log(`   Communities: ${createdCommunities.length}`);
    console.log('   Default password for most users: password123');
    console.log('   Legacy delivery login: delivery@farmkart.com / delivery123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
