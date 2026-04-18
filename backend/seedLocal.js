import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import User from './models/User.model.js';
import Product from './models/Product.model.js';
import Category from './models/Category.model.js';
import Community from './models/Community.model.js';

dotenv.config();

const MONGO_URI = 'mongodb://127.0.0.1:27017/farmkart';

async function seedLocal() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to local MongoDB');

    // Clean DB
    await User.deleteMany();
    await Product.deleteMany();
    await Category.deleteMany();
    await Community.deleteMany();
    console.log('Cleared existing data');

    // Create Admin User
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@farmkart.in',
      phone: '9000000000',
      passwordHash: 'password123',
      roles: ['admin', 'customer']
    });
    await adminUser.save();

    // Create Farmer User
    const farmerUser = new User({
      name: 'Ramu Farmer',
      email: 'ramu@farmkart.in',
      phone: '9000000001',
      passwordHash: 'password123',
      roles: ['farmer', 'customer']
    });
    await farmerUser.save();

    // Create Customer User
    const customerUser = new User({
      name: 'Ramakrishna Reddy',
      email: 'customer@farmkart.in',
      phone: '9000000002',
      passwordHash: 'password123',
      roles: ['customer']
    });
    await customerUser.save();

    console.log('Users created');

    // Create Categories
    const vegetableCategory = new Category({
      name: 'Vegetables',
      slug: 'vegetables',
      description: 'Fresh organic veggies',
      isActive: true,
      displayOrder: 1
    });
    await vegetableCategory.save();

    const fruitCategory = new Category({
      name: 'Fruits',
      slug: 'fruits',
      description: 'Fresh organic fruits',
      isActive: true,
      displayOrder: 2
    });
    await fruitCategory.save();

    console.log('Categories created');

    // Create Products
    const tomatoes = new Product({
      name: 'Organic Tomatoes',
      description: 'Fresh red tomatoes',
      categoryId: vegetableCategory._id,
      ownerId: farmerUser._id,
      basePrice: 40,
      unit: 'kg',
      images: ['https://example.com/tomato.jpg']
    });
    await tomatoes.save();

    const mangoes = new Product({
      name: 'Banganapalli Mangoes',
      description: 'Sweet local mangoes',
      categoryId: fruitCategory._id,
      ownerId: farmerUser._id,
      basePrice: 150,
      unit: 'kg',
      images: ['https://example.com/mango.jpg']
    });
    await mangoes.save();

    console.log('Products created');

    // Create Community
    const bangaloreCommunity = new Community({
      name: 'HSR Layout Organic Shoppers',
      description: 'Community for HSR Layout residents buying organic produce',
      admin: customerUser._id,
      members: [{ user: customerUser._id }],
      discount: 15
    });
    await bangaloreCommunity.save();

    console.log('Communities created');

    console.log('Seeding Complete! Press Ctrl+C to exit.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error: ', error);
    process.exit(1);
  }
}

seedLocal();
