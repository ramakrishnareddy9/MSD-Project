import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.model.js';
import FarmerProfile from '../models/FarmerProfile.model.js';
import BusinessProfile from '../models/BusinessProfile.model.js';
import RestaurantProfile from '../models/RestaurantProfile.model.js';
import DeliveryProfile from '../models/DeliveryProfile.model.js';
import Category from '../models/Category.model.js';
import Product from '../models/Product.model.js';
import Location from '../models/Location.model.js';
import InventoryLot from '../models/InventoryLot.model.js';

dotenv.config();

// Demo accounts credentials (for easy testing)
const DEMO_ACCOUNTS = {
  admin: { email: 'admin@farmkart.com', password: 'Admin@123' },
  customer: { email: 'customer@farmkart.com', password: 'Customer@123' },
  farmer: { email: 'farmer@farmkart.com', password: 'Farmer@123' },
  business: { email: 'business@farmkart.com', password: 'Business@123' },
  restaurant: { email: 'restaurant@farmkart.com', password: 'Restaurant@123' },
  delivery_large: { email: 'delivery.large@farmkart.com', password: 'Delivery@123' },
  delivery_small: { email: 'delivery.small@farmkart.com', password: 'Delivery@123' }
};

const seedDatabase = async () => {
  try {
    // Connect to MongoDB Atlas
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Atlas connected successfully');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await FarmerProfile.deleteMany({});
    await BusinessProfile.deleteMany({});
    await RestaurantProfile.deleteMany({});
    await DeliveryProfile.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Location.deleteMany({});
    await InventoryLot.deleteMany({});
    console.log('✅ Existing data cleared');

    // Create Users with proper password hashing
    console.log('👥 Creating demo users...');
    const users = {};

    // 1. Admin User
    const adminPassword = await bcrypt.hash(DEMO_ACCOUNTS.admin.password, 10);
    users.admin = new User({
      name: 'Admin User',
      email: DEMO_ACCOUNTS.admin.email,
      phone: '+919876543200',
      passwordHash: adminPassword,
      roles: ['admin'],
      status: 'active',
      emailVerified: true,
      addresses: [{
        type: 'office',
        line1: 'FarmKart HQ',
        line2: 'Tech Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        coordinates: { type: 'Point', coordinates: [72.8777, 19.0760] }
      }]
    });
    await users.admin.save();
    console.log(`✅ Admin created: ${DEMO_ACCOUNTS.admin.email} / ${DEMO_ACCOUNTS.admin.password}`);

    // 2. Customer User
    const customerPassword = await bcrypt.hash(DEMO_ACCOUNTS.customer.password, 10);
    users.customer = new User({
      name: 'John Customer',
      email: DEMO_ACCOUNTS.customer.email,
      phone: '+919876543210',
      passwordHash: customerPassword,
      roles: ['customer'],
      status: 'active',
      emailVerified: true,
      addresses: [{
        type: 'home',
        line1: '123 Main Street',
        line2: 'Apartment 4B',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400050',
        coordinates: { type: 'Point', coordinates: [72.8297, 19.0596] }
      }],
      loyaltyPoints: 100
    });
    await users.customer.save();
    console.log(`✅ Customer created: ${DEMO_ACCOUNTS.customer.email} / ${DEMO_ACCOUNTS.customer.password}`);

    // 3. Farmer User
    const farmerPassword = await bcrypt.hash(DEMO_ACCOUNTS.farmer.password, 10);
    users.farmer = new User({
      name: 'Ramesh Patel',
      email: DEMO_ACCOUNTS.farmer.email,
      phone: '+919876543211',
      passwordHash: farmerPassword,
      roles: ['farmer'],
      status: 'active',
      emailVerified: true,
      addresses: [{
        type: 'farm',
        line1: 'Green Valley Farm',
        line2: 'Village Khetpura',
        city: 'Nashik',
        state: 'Maharashtra',
        postalCode: '422001',
        coordinates: { type: 'Point', coordinates: [73.7898, 20.0063] }
      }]
    });
    await users.farmer.save();

    const farmerProfile = new FarmerProfile({
      userId: users.farmer._id,
      farmName: 'Green Valley Organic Farm',
      farmType: 'organic',
      farmSize: 25,
      certifications: ['organic', 'global_gap', 'fair_trade'],
      experience: 15,
      description: 'Specializing in organic vegetables and fruits using sustainable farming practices.'
    });
    await farmerProfile.save();
    console.log(`✅ Farmer created: ${DEMO_ACCOUNTS.farmer.email} / ${DEMO_ACCOUNTS.farmer.password}`);

    // 4. Business User
    const businessPassword = await bcrypt.hash(DEMO_ACCOUNTS.business.password, 10);
    users.business = new User({
      name: 'Fresh Mart Pvt Ltd',
      email: DEMO_ACCOUNTS.business.email,
      phone: '+919876543212',
      passwordHash: businessPassword,
      roles: ['business'],
      status: 'active',
      emailVerified: true,
      addresses: [{
        type: 'warehouse',
        line1: 'Industrial Area',
        line2: 'Warehouse Complex B',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
        coordinates: { type: 'Point', coordinates: [73.8567, 18.5204] }
      }]
    });
    await users.business.save();

    const businessProfile = new BusinessProfile({
      userId: users.business._id,
      companyName: 'Fresh Mart Pvt Ltd',
      companyType: 'wholesaler',
      gstNumber: 'GST27AABCF1234M1Z',
      businessLicense: 'BL2024001234',
      paymentTerms: 'net_15',
      creditLimit: 500000
    });
    await businessProfile.save();
    console.log(`✅ Business created: ${DEMO_ACCOUNTS.business.email} / ${DEMO_ACCOUNTS.business.password}`);

    // 5. Restaurant User
    const restaurantPassword = await bcrypt.hash(DEMO_ACCOUNTS.restaurant.password, 10);
    users.restaurant = new User({
      name: 'Green Cuisine Restaurant',
      email: DEMO_ACCOUNTS.restaurant.email,
      phone: '+919876543213',
      passwordHash: restaurantPassword,
      roles: ['restaurant'],
      status: 'active',
      emailVerified: true,
      addresses: [{
        type: 'restaurant',
        line1: 'Bandra West',
        line2: 'Hill Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400050',
        coordinates: { type: 'Point', coordinates: [72.8347, 19.0596] }
      }]
    });
    await users.restaurant.save();

    const restaurantProfile = new RestaurantProfile({
      userId: users.restaurant._id,
      restaurantName: 'Green Cuisine Restaurant',
      cuisineType: ['indian', 'continental'],
      fssaiLicense: 'FSSAI12345678901',
      seatingCapacity: 50,
      dailyRequirements: {
        vegetables: 50,
        fruits: 20,
        dairy: 30
      }
    });
    await restaurantProfile.save();
    console.log(`✅ Restaurant created: ${DEMO_ACCOUNTS.restaurant.email} / ${DEMO_ACCOUNTS.restaurant.password}`);

    // 6. Large-Scale Delivery Partner
    const deliveryLargePassword = await bcrypt.hash(DEMO_ACCOUNTS.delivery_large.password, 10);
    users.delivery_large = new User({
      name: 'Swift Logistics',
      email: DEMO_ACCOUNTS.delivery_large.email,
      phone: '+919876543214',
      passwordHash: deliveryLargePassword,
      roles: ['delivery_large'],
      status: 'active',
      emailVerified: true,
      addresses: [{
        type: 'office',
        line1: 'Transport Hub',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400060',
        coordinates: { type: 'Point', coordinates: [72.8777, 19.1136] }
      }]
    });
    await users.delivery_large.save();

    const deliveryLargeProfile = new DeliveryProfile({
      userId: users.delivery_large._id,
      companyName: 'Swift Logistics',
      scale: 'large',
      vehicleTypes: ['truck', 'refrigerated_truck'],
      coldChainCapable: true,
      serviceAreas: [{
        type: 'state',
        coverage: ['Maharashtra', 'Gujarat', 'Rajasthan'],
        coordinates: {
          type: 'Polygon',
          coordinates: [[
            [72.0, 19.0], [73.0, 19.0], [73.0, 20.0], [72.0, 20.0], [72.0, 19.0]
          ]]
        }
      }],
      capacity: {
        maxWeight: 5000,
        maxVolume: 100
      },
      completedDeliveries: 50,
      rating: 4.5
    });
    await deliveryLargeProfile.save();
    console.log(`✅ Large Delivery created: ${DEMO_ACCOUNTS.delivery_large.email} / ${DEMO_ACCOUNTS.delivery_large.password}`);

    // 7. Small-Scale Delivery Partner
    const deliverySmallPassword = await bcrypt.hash(DEMO_ACCOUNTS.delivery_small.password, 10);
    users.delivery_small = new User({
      name: 'Quick Delivery Services',
      email: DEMO_ACCOUNTS.delivery_small.email,
      phone: '+919876543215',
      passwordHash: deliverySmallPassword,
      roles: ['delivery_small'],
      status: 'active',
      emailVerified: true,
      addresses: [{
        type: 'office',
        line1: 'Local Delivery Hub',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400050',
        coordinates: { type: 'Point', coordinates: [72.8297, 19.0596] }
      }]
    });
    await users.delivery_small.save();

    const deliverySmallProfile = new DeliveryProfile({
      userId: users.delivery_small._id,
      companyName: 'Quick Delivery Services',
      scale: 'small',
      vehicleTypes: ['bike', 'van'],
      coldChainCapable: false,
      serviceAreas: [{
        type: 'city',
        coverage: ['Mumbai', 'Thane', 'Navi Mumbai'],
        coordinates: {
          type: 'Polygon',
          coordinates: [[
            [72.8, 19.0], [72.9, 19.0], [72.9, 19.2], [72.8, 19.2], [72.8, 19.0]
          ]]
        }
      }],
      capacity: {
        maxWeight: 100,
        maxVolume: 5
      },
      completedDeliveries: 200,
      rating: 4.3
    });
    await deliverySmallProfile.save();
    console.log(`✅ Small Delivery created: ${DEMO_ACCOUNTS.delivery_small.email} / ${DEMO_ACCOUNTS.delivery_small.password}`);

    // Create Categories
    console.log('📂 Creating categories...');
    const categories = {};

    categories.vegetables = new Category({
      name: 'Vegetables',
      slug: 'vegetables',
      description: 'Fresh farm vegetables',
      icon: '🥬',
      parent: null
    });
    await categories.vegetables.save();

    categories.fruits = new Category({
      name: 'Fruits',
      slug: 'fruits',
      description: 'Fresh seasonal fruits',
      icon: '🍎',
      parent: null
    });
    await categories.fruits.save();

    categories.grains = new Category({
      name: 'Grains & Pulses',
      slug: 'grains-pulses',
      description: 'Quality grains and pulses',
      icon: '🌾',
      parent: null
    });
    await categories.grains.save();

    categories.dairy = new Category({
      name: 'Dairy Products',
      slug: 'dairy',
      description: 'Fresh dairy products',
      icon: '🥛',
      parent: null
    });
    await categories.dairy.save();

    // Create Locations
    console.log('📍 Creating locations...');
    const locations = {};

    locations.farmLocation = new Location({
      name: 'Green Valley Farm Storage',
      type: 'farm',
      address: {
        line1: 'Green Valley Farm',
        city: 'Nashik',
        state: 'Maharashtra',
        postalCode: '422001'
      },
      coordinates: { 
        type: 'Point', 
        coordinates: [73.7898, 20.0063] 
      },
      ownerId: users.farmer._id,
      capacity: {
        maxWeight: 10000,
        maxVolume: 200,
        coldStorage: true
      },
      operatingHours: {
        open: '06:00',
        close: '18:00'
      },
      status: 'active'
    });
    await locations.farmLocation.save();

    locations.hubLocation = new Location({
      name: 'Mumbai Distribution Hub',
      type: 'hub',
      address: {
        line1: 'Industrial Complex',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400060'
      },
      coordinates: { 
        type: 'Point', 
        coordinates: [72.8777, 19.1136] 
      },
      ownerId: users.admin._id,
      capacity: {
        maxWeight: 50000,
        maxVolume: 1000,
        coldStorage: true
      },
      operatingHours: {
        open: '00:00',
        close: '23:59'
      },
      status: 'active'
    });
    await locations.hubLocation.save();

    // Create Products
    console.log('📦 Creating products...');
    const products = [];

    // Vegetables
    const tomatoes = new Product({
      name: 'Organic Tomatoes',
      description: 'Fresh organic tomatoes grown without pesticides',
      categoryId: categories.vegetables._id,
      ownerId: users.farmer._id,
      images: ['https://images.unsplash.com/photo-1546470427-0d4db154cfe8'],
      unit: 'kg',
      basePrice: 40,
      isPerishable: true,
      shelfLife: 7,
      storageRequirements: 'refrigerated',
      tags: ['organic', 'fresh', 'local'],
      status: 'active',
      minOrderQuantity: 1,
      maxOrderQuantity: 100,
      discount: 10
    });
    await tomatoes.save();
    products.push(tomatoes);

    const potatoes = new Product({
      name: 'Fresh Potatoes',
      description: 'Quality potatoes perfect for all cooking needs',
      categoryId: categories.vegetables._id,
      ownerId: users.farmer._id,
      images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655'],
      unit: 'kg',
      basePrice: 30,
      isPerishable: false,
      shelfLife: 30,
      storageRequirements: 'ambient',
      tags: ['fresh', 'staple'],
      status: 'active',
      minOrderQuantity: 1,
      maxOrderQuantity: 200
    });
    await potatoes.save();
    products.push(potatoes);

    const onions = new Product({
      name: 'Red Onions',
      description: 'Premium quality red onions',
      categoryId: categories.vegetables._id,
      ownerId: users.farmer._id,
      images: ['https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb'],
      unit: 'kg',
      basePrice: 35,
      isPerishable: false,
      shelfLife: 21,
      storageRequirements: 'ambient',
      tags: ['fresh', 'staple'],
      status: 'active',
      minOrderQuantity: 1,
      maxOrderQuantity: 150
    });
    await onions.save();
    products.push(onions);

    // Fruits
    const apples = new Product({
      name: 'Kashmir Apples',
      description: 'Sweet and crispy apples from Kashmir',
      categoryId: categories.fruits._id,
      ownerId: users.farmer._id,
      images: ['https://images.unsplash.com/photo-1568702846914-96b305d2aaeb'],
      unit: 'kg',
      basePrice: 120,
      isPerishable: true,
      shelfLife: 14,
      storageRequirements: 'refrigerated',
      tags: ['fresh', 'premium', 'seasonal'],
      status: 'active',
      minOrderQuantity: 1,
      maxOrderQuantity: 50,
      discount: 5
    });
    await apples.save();
    products.push(apples);

    const bananas = new Product({
      name: 'Organic Bananas',
      description: 'Naturally ripened organic bananas',
      categoryId: categories.fruits._id,
      ownerId: users.farmer._id,
      images: ['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e'],
      unit: 'dozen',
      basePrice: 60,
      isPerishable: true,
      shelfLife: 5,
      storageRequirements: 'ambient',
      tags: ['organic', 'fresh'],
      status: 'active',
      minOrderQuantity: 1,
      maxOrderQuantity: 30
    });
    await bananas.save();
    products.push(bananas);

    // Grains
    const rice = new Product({
      name: 'Basmati Rice',
      description: 'Premium long grain basmati rice',
      categoryId: categories.grains._id,
      ownerId: users.farmer._id,
      images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c'],
      unit: 'kg',
      basePrice: 150,
      isPerishable: false,
      shelfLife: 365,
      storageRequirements: 'ambient',
      tags: ['premium', 'staple'],
      status: 'active',
      minOrderQuantity: 5,
      maxOrderQuantity: 500
    });
    await rice.save();
    products.push(rice);

    // Create Inventory Lots
    console.log('📊 Creating inventory...');
    for (const product of products) {
      const inventoryLot = new InventoryLot({
        productId: product._id,
        locationId: locations.farmLocation._id,
        batchNumber: `LOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        quantity: 500,
        reservedQuantity: 0,
        harvestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        qualityGrade: 'A',
        storageCondition: product.storageRequirements || 'ambient'
      });
      await inventoryLot.save();
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📋 DEMO ACCOUNTS FOR TESTING:\n');
    console.log('Role            | Email                        | Password');
    console.log('-'.repeat(60));
    console.log('Admin           | admin@farmkart.com           | Admin@123');
    console.log('Customer        | customer@farmkart.com        | Customer@123');
    console.log('Farmer          | farmer@farmkart.com          | Farmer@123');
    console.log('Business        | business@farmkart.com        | Business@123');
    console.log('Restaurant      | restaurant@farmkart.com      | Restaurant@123');
    console.log('Large Delivery  | delivery.large@farmkart.com  | Delivery@123');
    console.log('Small Delivery  | delivery.small@farmkart.com  | Delivery@123');
    console.log('\n' + '='.repeat(60));

    console.log('\n📊 Data Summary:');
    console.log(`- Users created: ${Object.keys(users).length}`);
    console.log(`- Categories created: ${Object.keys(categories).length}`);
    console.log(`- Products created: ${products.length}`);
    console.log(`- Locations created: ${Object.keys(locations).length}`);
    console.log(`- Inventory lots created: ${products.length}`);

    mongoose.connection.close();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed function
seedDatabase();
