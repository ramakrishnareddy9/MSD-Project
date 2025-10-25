import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

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

const DATA_FILE = process.env.SEED_DATA_FILE || path.resolve(process.cwd(), 'seed', 'local_db.json');

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

async function seedFromJson() {
  try {
    console.log(`📄 Loading JSON data from: ${DATA_FILE}`);

    const data = await readJson(DATA_FILE);

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Clear existing data (order matters for FKs and uniques)
    await Promise.all([
      InventoryLot.deleteMany({}),
      Product.deleteMany({}),
      Location.deleteMany({}),
      Category.deleteMany({}),
      FarmerProfile.deleteMany({}),
      BusinessProfile.deleteMany({}),
      RestaurantProfile.deleteMany({}),
      DeliveryProfile.deleteMany({}),
      User.deleteMany({})
    ]);
    console.log('🗑️  Cleared existing data');

    // 1) Categories
    const categoryDocs = await Category.insertMany(data.categories || []);
    const categoryBySlug = new Map(categoryDocs.map(c => [c.slug, c]));
    console.log(`📦 Created ${categoryDocs.length} categories`);

    // 2) Users
    const userDocs = [];
    const userByEmail = new Map();

    for (const u of data.users || []) {
      const user = new User({
        name: u.name,
        email: u.email,
        phone: u.phone,
        passwordHash: u.password, // will be hashed by pre-save hook
        roles: u.roles || ['customer'],
        addresses: (u.addresses || []).map(a => ({
          type: a.type,
          line1: a.line1,
          line2: a.line2,
          city: a.city,
          state: a.state,
          postalCode: a.postalCode,
          country: a.country || 'India',
          coordinates: a.coordinates
        }))
      });
      await user.save();
      userDocs.push(user);
      userByEmail.set(user.email, user);
    }
    console.log(`👥 Created ${userDocs.length} users`);

    // 3) Profiles
    // Farmers
    for (const f of (data.profiles?.farmers || [])) {
      const user = userByEmail.get(f.email);
      if (!user) continue;
      await new FarmerProfile({
        userId: user._id,
        farmName: f.farmName,
        farmType: f.farmType,
        farmSize: f.farmSize,
        certifications: f.certifications || [],
        experience: f.experienceYears,
        specialization: f.specialization || []
      }).save();
    }

    // Businesses
    for (const b of (data.profiles?.businesses || [])) {
      const user = userByEmail.get(b.email);
      if (!user) continue;
      await new BusinessProfile({
        userId: user._id,
        companyName: b.companyName,
        companyType: b.companyType,
        gstNumber: b.gstNumber,
        panNumber: b.panNumber,
        businessLicense: b.businessLicense,
        paymentTerms: b.paymentTerms || 'prepaid',
        creditLimit: b.creditLimit || 0
      }).save();
    }

    // Restaurants
    for (const r of (data.profiles?.restaurants || [])) {
      const user = userByEmail.get(r.email);
      if (!user) continue;
      await new RestaurantProfile({
        userId: user._id,
        restaurantName: r.restaurantName,
        cuisineType: r.cuisineType || [],
        fssaiLicense: r.fssaiLicense,
        deliveryWindowPreference: r.deliveryWindowPreference || 'early_morning',
        paymentTerms: r.paymentTerms || 'prepaid'
      }).save();
    }

    // Deliveries
    for (const d of (data.profiles?.deliveries || [])) {
      const user = userByEmail.get(d.email);
      if (!user) continue;
      await new DeliveryProfile({
        userId: user._id,
        companyName: d.companyName,
        scale: d.scale || 'small',
        vehicleTypes: d.vehicleTypes || [],
        coldChainCapable: !!d.coldChainCapable,
        capacity: d.capacity
      }).save();
    }
    console.log('🧩 Created role profiles');

    // 4) Locations
    const locationDocs = [];
    const locationByName = new Map();

    for (const loc of data.locations || []) {
      const owner = loc.ownerEmail ? userByEmail.get(loc.ownerEmail) : null;
      const doc = new Location({
        type: loc.type,
        name: loc.name,
        ownerId: owner?._id,
        address: loc.address,
        coordinates: loc.coordinates,
        capacity: loc.capacity,
        operatingHours: loc.operatingHours,
        status: loc.status || 'active'
      });
      await doc.save();
      locationDocs.push(doc);
      locationByName.set(doc.name, doc);
    }
    console.log(`📍 Created ${locationDocs.length} locations`);

    // 5) Products
    const productDocs = [];
    const productByName = new Map();

    for (const p of data.products || []) {
      const owner = userByEmail.get(p.ownerEmail);
      const category = categoryBySlug.get(p.categorySlug);
      if (!owner || !category) continue;

      const prod = new Product({
        ownerId: owner._id,
        categoryId: category._id,
        name: p.name,
        description: p.description,
        unit: p.unit,
        basePrice: p.basePrice,
        currency: p.currency || 'INR',
        images: p.images || [],
        isPerishable: !!p.isPerishable,
        shelfLife: p.shelfLife,
        storageRequirements: p.storageRequirements,
        tags: p.tags || [],
        status: p.status || 'active',
        minOrderQuantity: p.minOrderQuantity || 1,
        maxOrderQuantity: p.maxOrderQuantity,
        discount: p.discount || 0
      });

      await prod.save();
      productDocs.push(prod);
      productByName.set(prod.name, prod);
    }
    console.log(`🌾 Created ${productDocs.length} products`);

    // 6) Inventory
    const invDocs = [];
    for (const i of data.inventory || []) {
      const product = productByName.get(i.productName);
      const location = locationByName.get(i.locationName);
      if (!product || !location) continue;

      const lot = new InventoryLot({
        productId: product._id,
        locationId: location._id,
        quantity: i.quantity,
        reservedQuantity: i.reservedQuantity || 0,
        harvestDate: i.harvestDate ? new Date(i.harvestDate) : new Date(),
        expiryDate: i.expiryDate ? new Date(i.expiryDate) : undefined,
        batchNumber: i.batchNumber,
        qualityGrade: i.qualityGrade || 'A',
        storageCondition: i.storageCondition
      });
      await lot.save();
      invDocs.push(lot);
    }
    console.log(`📊 Created ${invDocs.length} inventory lots`);

    console.log('\n✅ Seed data created successfully from JSON!');
    console.log('\n📧 Login Credentials:');
    for (const u of data.users || []) {
      if (u.roles?.includes('admin') || u.roles?.includes('customer') || u.roles?.includes('farmer') || u.roles?.includes('business') || u.roles?.includes('restaurant') || u.roles?.includes('delivery')) {
        console.log(`${u.roles.join('/')} → ${u.email} / ${u.password}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding database from JSON:', err);
    process.exit(1);
  }
}

// Run
seedFromJson();
