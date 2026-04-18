import mongoose from 'mongoose';
import Category from '../models/Category.model.js';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';
import Community from '../models/Community.model.js';
import CommunityPool from '../models/CommunityPool.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmkart');
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️ Clearing existing collections...');
    await Promise.all([
      Category.deleteMany({}),
      Product.deleteMany({}),
      User.deleteMany({ roles: { $in: ['farmer'] } }), // Only delete farmers, not all users
      Community.deleteMany({}),
      CommunityPool.deleteMany({}),
    ]);
    console.log('✅ Collections cleared');

    // Create Categories
    console.log('📦 Creating categories...');
    const categories = await Category.insertMany([
      { name: 'Grains', slug: 'grains', description: 'Wheat, rice, pulses' },
      { name: 'Vegetables', slug: 'vegetables', description: 'Fresh seasonal vegetables' },
      { name: 'Fruits', slug: 'fruits', description: 'Fresh fruits' },
      { name: 'Dairy', slug: 'dairy', description: 'Milk, cheese, yogurt' },
      { name: 'Organic', slug: 'organic', description: 'Organic products' }
    ]);
    console.log(`✅ Created ${categories.length} categories`);

    // Create Farmers (as Users with farmer role)
    console.log('👨‍🌾 Creating farmers...');
    const farmers = await User.insertMany([
      {
        name: 'Ramesh Patel',
        email: 'ramesh.patel@farm.com',
        phone: '9876543210',
        passwordHash: 'password123',
        roles: ['farmer'],
        addresses: [
          {
            type: 'farm',
            line1: 'Farm Plot 123',
            city: 'Pune',
            state: 'Maharashtra',
            postalCode: '411001',
            country: 'India'
          }
        ]
      },
      {
        name: 'Meera Sharma',
        email: 'meera.sharma@farm.com',
        phone: '9876543211',
        passwordHash: 'password123',
        roles: ['farmer'],
        addresses: [
          {
            type: 'farm',
            line1: 'Farm Plot 456',
            city: 'Nashik',
            state: 'Maharashtra',
            postalCode: '422001',
            country: 'India'
          }
        ]
      },
      {
        name: 'Suresh Kumar',
        email: 'suresh.kumar@farm.com',
        phone: '9876543212',
        passwordHash: 'password123',
        roles: ['farmer'],
        addresses: [
          {
            type: 'farm',
            line1: 'Farm Plot 789',
            city: 'Aurangabad',
            state: 'Maharashtra',
            postalCode: '431001',
            country: 'India'
          }
        ]
      },
      {
        name: 'Priya Devi',
        email: 'priya.devi@farm.com',
        phone: '9876543213',
        passwordHash: 'password123',
        roles: ['farmer'],
        addresses: [
          {
            type: 'farm',
            line1: 'Farm Plot 321',
            city: 'Solapur',
            state: 'Maharashtra',
            postalCode: '413001',
            country: 'India'
          }
        ]
      },
      {
        name: 'Gopal Singh',
        email: 'gopal.singh@farm.com',
        phone: '9876543214',
        passwordHash: 'password123',
        roles: ['farmer'],
        addresses: [
          {
            type: 'farm',
            line1: 'Farm Plot 654',
            city: 'Kolhapur',
            state: 'Maharashtra',
            postalCode: '416001',
            country: 'India'
          }
        ]
      },
      {
        name: 'Rajesh Patel',
        email: 'rajesh.patel@farm.com',
        phone: '9876543215',
        passwordHash: 'password123',
        roles: ['farmer'],
        addresses: [
          {
            type: 'farm',
            line1: 'Farm Plot 987',
            city: 'Pune',
            state: 'Maharashtra',
            postalCode: '411005',
            country: 'India'
          }
        ]
      },
      {
        name: 'Lakshmi Devi',
        email: 'lakshmi.devi@farm.com',
        phone: '9876543216',
        passwordHash: 'password123',
        roles: ['farmer'],
        addresses: [
          {
            type: 'farm',
            line1: 'Farm Plot 147',
            city: 'Satara',
            state: 'Maharashtra',
            postalCode: '415001',
            country: 'India'
          }
        ]
      },
      {
        name: 'Ravi Kumar',
        email: 'ravi.kumar@farm.com',
        phone: '9876543217',
        passwordHash: 'password123',
        roles: ['farmer'],
        addresses: [
          {
            type: 'farm',
            line1: 'Farm Plot 258',
            city: 'Sangli',
            state: 'Maharashtra',
            postalCode: '416414',
            country: 'India'
          }
        ]
      }
    ]);
    console.log(`✅ Created ${farmers.length} farmers`);

    // Create Products
    console.log('🌾 Creating products...');
    const products = await Product.insertMany([
      {
        name: 'Organic Wheat',
        description: 'Premium organic wheat from local farms',
        basePrice: 50,
        unit: 'kg',
        categoryId: categories[0]._id,
        ownerId: farmers[0]._id,
        images: ['https://images.unsplash.com/photo-1534670007418-fbb7f6cf32c3?w=800&h=600&fit=crop&q=80'],
        status: 'active',
        minOrderQuantity: 50,
        isPerishable: false
      },
      {
        name: 'Basmati Rice',
        description: 'Aromatic basmati rice, aged to perfection',
        basePrice: 60,
        unit: 'kg',
        categoryId: categories[0]._id,
        ownerId: farmers[1]._id,
        images: ['https://images.unsplash.com/photo-1604908175330-c6471e2b99f6?w=800&h=600&fit=crop&q=80'],
        status: 'active',
        minOrderQuantity: 50,
        isPerishable: false
      },
      {
        name: 'Fresh Tomatoes',
        description: 'Juicy, vine-ripened tomatoes',
        basePrice: 35,
        unit: 'kg',
        categoryId: categories[1]._id,
        ownerId: farmers[2]._id,
        images: ['https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800&h=600&fit=crop&q=80'],
        status: 'active',
        minOrderQuantity: 30,
        isPerishable: true,
        storageRequirements: 'ambient'
      },
      {
        name: 'Organic Carrots',
        description: 'Sweet, crunchy organic carrots',
        basePrice: 45,
        unit: 'kg',
        categoryId: categories[1]._id,
        ownerId: farmers[3]._id,
        images: ['https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&h=600&fit=crop&q=80'],
        status: 'active',
        minOrderQuantity: 30,
        isPerishable: true,
        storageRequirements: 'ambient'
      },
      {
        name: 'Farm Fresh Milk',
        description: 'Pure, fresh milk from grass-fed cows',
        basePrice: 65,
        unit: 'liter',
        categoryId: categories[3]._id,
        ownerId: farmers[4]._id,
        images: ['https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&h=600&fit=crop&q=80'],
        status: 'active',
        minOrderQuantity: 40,
        isPerishable: true,
        storageRequirements: 'refrigerated'
      },
      {
        name: 'Seasonal Mangoes',
        description: 'Sweet, juicy seasonal mangoes',
        basePrice: 150,
        unit: 'kg',
        categoryId: categories[2]._id,
        ownerId: farmers[5]._id,
        images: ['https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=800&h=600&fit=crop&q=80'],
        status: 'active',
        minOrderQuantity: 50,
        isPerishable: true,
        storageRequirements: 'ambient'
      },
      {
        name: 'Fresh Spinach',
        description: 'Fresh organic spinach leaves',
        basePrice: 30,
        unit: 'kg',
        categoryId: categories[1]._id,
        ownerId: farmers[6]._id,
        images: ['https://images.unsplash.com/photo-1542444459-db63c3d15501?w=800&h=600&fit=crop&q=80'],
        status: 'active',
        minOrderQuantity: 25,
        isPerishable: true,
        storageRequirements: 'refrigerated'
      },
      {
        name: 'Honey (Pure)',
        description: 'Pure natural honey from local beekeepers',
        basePrice: 280,
        unit: 'gram',
        categoryId: categories[4]._id,
        ownerId: farmers[7]._id,
        images: ['https://images.unsplash.com/photo-1517263904808-5dc91e3e7044?w=800&h=600&fit=crop&q=80'],
        status: 'active',
        minOrderQuantity: 20,
        isPerishable: false
      }
    ]);
    console.log(`✅ Created ${products.length} products`);

    // Create Communities
    console.log('🏘️ Creating communities...');
    const communities = await Community.insertMany([
      {
        name: 'Green Valley Community',
        description: 'A community dedicated to sustainable farming practices and local produce. Members enjoy bulk discounts and direct farmer access.',
        admin: farmers[0]._id,
        members: [
          { user: farmers[0]._id },
          { user: farmers[1]._id }
        ],
        discount: 15
      },
      {
        name: 'Organic Food Lovers',
        description: 'Premium community focused on organic and pesticide-free products. We connect health-conscious consumers with certified organic farmers.',
        admin: farmers[1]._id,
        members: [
          { user: farmers[1]._id },
          { user: farmers[2]._id }
        ],
        discount: 12
      },
      {
        name: 'Farmers Direct',
        description: 'Direct connection program between local farmers and community members. Zero middlemen, maximum freshness, and fair pricing.',
        admin: farmers[2]._id,
        members: [
          { user: farmers[2]._id },
          { user: farmers[3]._id }
        ],
        discount: 18
      }
    ]);
    console.log(`✅ Created ${communities.length} communities`);

    console.log('\n✨ Database seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Farmers: ${farmers.length}`);
    console.log(`   - Products: ${products.length}`);
    console.log(`   - Communities: ${communities.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run seeding
seedDatabase();
