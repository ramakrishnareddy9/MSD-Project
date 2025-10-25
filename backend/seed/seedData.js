import mongoose from 'mongoose';
import dotenv from 'dotenv';
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

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Clear existing data
    await User.deleteMany({});
    await FarmerProfile.deleteMany({});
    await BusinessProfile.deleteMany({});
    await RestaurantProfile.deleteMany({});
    await DeliveryProfile.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Location.deleteMany({});
    await InventoryLot.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create Users
    const users = [];
    
    // Customer
    const customer = new User({
      name: 'John Customer',
      email: 'customer@farmkart.com',
      phone: '+919876543210',
      passwordHash: 'customer123',
      roles: ['customer']
    });
    await customer.save();
    users.push(customer);

    // Farmer
    const farmer = new User({
      name: 'Ramesh Patel',
      email: 'farmer@farmkart.com',
      phone: '+919876543211',
      passwordHash: 'farmer123',
      roles: ['farmer'],
      addresses: [{
        type: 'farm',
        line1: 'Village Khetpura',
        city: 'Deesa',
        state: 'Gujarat',
        postalCode: '385535',
        coordinates: { type: 'Point', coordinates: [72.5, 24.5] }
      }]
    });
    await farmer.save();
    users.push(farmer);

    const farmerProfile = new FarmerProfile({
      userId: farmer._id,
      farmName: 'Green Fields Farm',
      farmType: 'organic',
      farmSize: 25,
      certifications: ['organic', 'global_gap'],
      experience: 15
    });
    await farmerProfile.save();

    // Business
    const business = new User({
      name: 'Fresh Mart Pvt Ltd',
      email: 'business@farmkart.com',
      phone: '+919876543212',
      passwordHash: 'business123',
      roles: ['business']
    });
    await business.save();
    users.push(business);

    const businessProfile = new BusinessProfile({
      userId: business._id,
      companyName: 'Fresh Mart Pvt Ltd',
      companyType: 'wholesaler',
      gstNumber: 'GST123456789',
      paymentTerms: 'net_15'
    });
    await businessProfile.save();

    // Restaurant
    const restaurant = new User({
      name: 'Green Cuisine Restaurant',
      email: 'restaurant@farmkart.com',
      phone: '+919876543213',
      passwordHash: 'restaurant123',
      roles: ['restaurant']
    });
    await restaurant.save();
    users.push(restaurant);

    const restaurantProfile = new RestaurantProfile({
      userId: restaurant._id,
      restaurantName: 'Green Cuisine Restaurant',
      cuisineType: ['Indian', 'Continental'],
      fssaiLicense: 'FSSAI123456',
      deliveryWindowPreference: 'early_morning'
    });
    await restaurantProfile.save();

    // Delivery
    const delivery = new User({
      name: 'Fast Logistics',
      email: 'delivery@farmkart.com',
      phone: '+919876543214',
      passwordHash: 'delivery123',
      roles: ['delivery']
    });
    await delivery.save();
    users.push(delivery);

    const deliveryProfile = new DeliveryProfile({
      userId: delivery._id,
      companyName: 'Fast Logistics',
      scale: 'large',
      vehicleTypes: ['truck', 'refrigerated_truck'],
      coldChainCapable: true
    });
    await deliveryProfile.save();

    // Admin
    const admin = new User({
      name: 'Admin User',
      email: 'admin@farmkart.com',
      phone: '+919876543215',
      passwordHash: 'admin123',
      roles: ['admin']
    });
    await admin.save();
    users.push(admin);

    console.log('👥 Created users');

    // Create Categories
    const categories = [
      { name: 'Grains', slug: 'grains', description: 'Rice, Wheat, and other grains' },
      { name: 'Vegetables', slug: 'vegetables', description: 'Fresh farm vegetables' },
      { name: 'Fruits', slug: 'fruits', description: 'Seasonal and tropical fruits' },
      { name: 'Dairy', slug: 'dairy', description: 'Milk, cheese, and dairy products' },
      { name: 'Organic', slug: 'organic', description: 'Certified organic produce' }
    ];

    const createdCategories = await Category.insertMany(categories);
    console.log('📦 Created categories');

    // Create Locations
    const farmLocation = new Location({
      type: 'farm',
      name: 'Green Fields Farm - Main',
      ownerId: farmer._id,
      address: {
        line1: 'Village Khetpura',
        city: 'Deesa',
        state: 'Gujarat',
        postalCode: '385535'
      },
      coordinates: { type: 'Point', coordinates: [72.5, 24.5] },
      capacity: { maxWeight: 5000, coldStorage: true }
    });
    await farmLocation.save();

    const hubLocation = new Location({
      type: 'hub',
      name: 'Ahmedabad Central Hub',
      address: {
        line1: 'APMC Market',
        city: 'Ahmedabad',
        state: 'Gujarat',
        postalCode: '380001'
      },
      coordinates: { type: 'Point', coordinates: [72.58, 23.02] },
      capacity: { maxWeight: 50000, coldStorage: true }
    });
    await hubLocation.save();

    console.log('📍 Created locations');

    // Create Products
    const products = [
      {
        ownerId: farmer._id,
        categoryId: createdCategories[0]._id,
        name: 'Organic Wheat',
        description: 'Premium organic wheat from local farms',
        unit: 'kg',
        basePrice: 50,
        images: ['https://images.unsplash.com/photo-1534670007418-fbb7f6cf32c3?w=800'],
        isPerishable: false,
        tags: ['organic', 'grain'],
        status: 'active',
        discount: 10
      },
      {
        ownerId: farmer._id,
        categoryId: createdCategories[0]._id,
        name: 'Basmati Rice',
        description: 'Aromatic basmati rice, aged to perfection',
        unit: 'kg',
        basePrice: 60,
        images: ['https://images.unsplash.com/photo-1604908175330-c6471e2b99f6?w=800'],
        isPerishable: false,
        tags: ['rice', 'premium'],
        status: 'active'
      },
      {
        ownerId: farmer._id,
        categoryId: createdCategories[1]._id,
        name: 'Fresh Tomatoes',
        description: 'Juicy, vine-ripened tomatoes',
        unit: 'kg',
        basePrice: 35,
        images: ['https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800'],
        isPerishable: true,
        shelfLife: 7,
        storageRequirements: 'refrigerated',
        tags: ['fresh', 'vegetable'],
        status: 'active',
        discount: 15
      },
      {
        ownerId: farmer._id,
        categoryId: createdCategories[1]._id,
        name: 'Organic Carrots',
        description: 'Sweet, crunchy organic carrots',
        unit: 'kg',
        basePrice: 45,
        images: ['https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800'],
        isPerishable: true,
        shelfLife: 14,
        storageRequirements: 'refrigerated',
        tags: ['organic', 'vegetable'],
        status: 'active'
      },
      {
        ownerId: farmer._id,
        categoryId: createdCategories[3]._id,
        name: 'Farm Fresh Milk',
        description: 'Pure, fresh milk from grass-fed cows',
        unit: 'liter',
        basePrice: 65,
        images: ['https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800'],
        isPerishable: true,
        shelfLife: 3,
        storageRequirements: 'refrigerated',
        tags: ['dairy', 'fresh'],
        status: 'active',
        discount: 5
      },
      {
        ownerId: farmer._id,
        categoryId: createdCategories[2]._id,
        name: 'Seasonal Mangoes',
        description: 'Sweet, juicy seasonal mangoes',
        unit: 'kg',
        basePrice: 150,
        images: ['https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=800'],
        isPerishable: true,
        shelfLife: 7,
        storageRequirements: 'ambient',
        tags: ['fruit', 'seasonal'],
        status: 'out_of_stock'
      },
      {
        ownerId: farmer._id,
        categoryId: createdCategories[1]._id,
        name: 'Fresh Spinach',
        description: 'Fresh organic spinach leaves',
        unit: 'kg',
        basePrice: 30,
        images: ['https://images.unsplash.com/photo-1542444459-db63c3d15501?w=800'],
        isPerishable: true,
        shelfLife: 5,
        storageRequirements: 'refrigerated',
        tags: ['organic', 'leafy', 'vegetable'],
        status: 'active',
        discount: 20
      },
      {
        ownerId: farmer._id,
        categoryId: createdCategories[4]._id,
        name: 'Pure Honey',
        description: 'Pure natural honey from local beekeepers',
        unit: 'kg',
        basePrice: 280,
        images: ['https://images.unsplash.com/photo-1517263904808-5dc91e3e7044?w=800'],
        isPerishable: false,
        tags: ['organic', 'honey', 'natural'],
        status: 'active'
      }
    ];

    const createdProducts = await Product.insertMany(products);
    console.log('🌾 Created products');

    // Create Inventory Lots
    const inventoryLots = createdProducts.map(product => ({
      productId: product._id,
      locationId: farmLocation._id,
      quantity: Math.floor(Math.random() * 500) + 100,
      reservedQuantity: 0,
      harvestDate: new Date(),
      qualityGrade: 'A'
    }));

    await InventoryLot.insertMany(inventoryLots);
    console.log('📊 Created inventory lots');

    console.log('\n✅ Seed data created successfully!');
    console.log('\n📧 Login Credentials:');
    console.log('Customer: customer@farmkart.com / customer123');
    console.log('Farmer: farmer@farmkart.com / farmer123');
    console.log('Business: business@farmkart.com / business123');
    console.log('Restaurant: restaurant@farmkart.com / restaurant123');
    console.log('Delivery: delivery@farmkart.com / delivery123');
    console.log('Admin: admin@farmkart.com / admin123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
