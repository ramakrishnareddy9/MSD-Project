import crypto from 'crypto';

/**
 * Generate a secure JWT secret for production use
 * Run this script: node generate-jwt-secret.js
 */

console.log('\n🔐 Generating secure JWT secret...\n');

const secret = crypto.randomBytes(64).toString('hex');

console.log('✅ Your JWT Secret (copy this to Render environment variables):\n');
console.log('─'.repeat(80));
console.log(secret);
console.log('─'.repeat(80));

console.log('\n📋 Add this to Render Dashboard → Environment Variables:');
console.log('   Variable: JWT_SECRET');
console.log('   Value: (paste the secret above)');

console.log('\n⚠️  IMPORTANT:');
console.log('   - Never commit this secret to git');
console.log('   - Keep it secure and private');
console.log('   - Use different secrets for dev/staging/production');
console.log('   - Store it only in Render environment variables\n');
