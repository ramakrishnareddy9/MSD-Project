import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Testing MongoDB Connection...\n');
console.log('Connection String:', process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@'));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('\n✅ SUCCESS! MongoDB connected successfully!');
    console.log('Database:', mongoose.connection.name);
    console.log('Host:', mongoose.connection.host);
    process.exit(0);
  })
  .catch((err) => {
    console.log('\n❌ CONNECTION FAILED!');
    console.log('\nError Message:', err.message);
    console.log('\nPossible Solutions:');
    console.log('1. Whitelist your IP address in MongoDB Atlas Network Access');
    console.log('2. Check if username/password are correct');
    console.log('3. Verify the database cluster is running');
    console.log('4. Check if you have network connectivity');
    process.exit(1);
  });
