import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB Atlas connection with password
const MONGODB_URI = 'mongodb+srv://ramakrishnareddyd9_db_user:9014923870@msd.ivea6xc.mongodb.net/farmkart?retryWrites=true&w=majority';

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

console.log('✅ MongoDB Atlas connection updated in .env file');
console.log('📝 Connection string:', MONGODB_URI);
