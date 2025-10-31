import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  try {
    console.log('🔌 Testing MongoDB Atlas connection...');
    console.log('Connection string:', process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Atlas connected successfully!');
    
    // Test a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📊 Available collections:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // Count documents in each collection
    console.log('\n📈 Document counts:');
    for (const col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`  - ${col.name}: ${count} documents`);
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};

testConnection();
