import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB Atlas connection - get from environment variable or command line argument
// Usage: node update-env.js "mongodb+srv://user:pass@cluster.mongodb.net/dbname"
const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI || 'mongodb://localhost:27017/farmkart';

// Read existing .env or create new one
const envPath = path.join(__dirname, '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
}

// Parse existing env
const envLines = envContent.split('\n');
const envVars = {};

envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
    }
});

// Update MongoDB URI
envVars['MONGODB_URI'] = MONGODB_URI;

// Ensure other required vars exist
if (!envVars['JWT_SECRET']) {
    envVars['JWT_SECRET'] = 'farmkart-jwt-secret-2024';
}
if (!envVars['PORT']) {
    envVars['PORT'] = '5000';
}
if (!envVars['NODE_ENV']) {
    envVars['NODE_ENV'] = 'development';
}

// Write back to .env
const newEnvContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

fs.writeFileSync(envPath, newEnvContent);

console.log('✅ MongoDB connection updated in .env file');
if (!process.argv[2] && !process.env.MONGODB_URI) {
  console.log('⚠️  Warning: Using default local MongoDB URI. Provide connection string as argument or set MONGODB_URI env variable.');
}
