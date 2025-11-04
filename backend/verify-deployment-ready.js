import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Verify that the backend is ready for Render deployment
 * Run this script: node verify-deployment-ready.js
 */

console.log('\n🔍 Verifying FarmKart Backend Deployment Readiness...\n');

let allChecks = true;

// Check 1: package.json exists and has required fields
console.log('📦 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  
  const checks = [
    { field: 'name', value: packageJson.name, expected: 'farmkart-backend' },
    { field: 'main', value: packageJson.main, expected: 'server.js' },
    { field: 'type', value: packageJson.type, expected: 'module' },
    { field: 'scripts.start', value: packageJson.scripts?.start, expected: 'node server.js' },
    { field: 'engines.node', value: packageJson.engines?.node, expected: '>=18.x' }
  ];
  
  checks.forEach(check => {
    if (check.value === check.expected) {
      console.log(`   ✅ ${check.field}: ${check.value}`);
    } else {
      console.log(`   ❌ ${check.field}: Expected "${check.expected}", got "${check.value}"`);
      allChecks = false;
    }
  });
} catch (error) {
  console.log(`   ❌ Error reading package.json: ${error.message}`);
  allChecks = false;
}

// Check 2: server.js exists
console.log('\n🚀 Checking server.js...');
if (fs.existsSync(path.join(__dirname, 'server.js'))) {
  console.log('   ✅ server.js exists');
  
  const serverContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  
  // Check for critical configurations
  const criticalChecks = [
    { name: 'PORT configuration', pattern: /process\.env\.PORT/i },
    { name: 'MongoDB connection', pattern: /mongoose\.connect/i },
    { name: 'CORS configuration', pattern: /cors/i },
    { name: 'Health check endpoint', pattern: /\/api\/health/i },
    { name: 'Error handling', pattern: /errorHandler/i },
    { name: 'Security middleware', pattern: /helmet/i }
  ];
  
  criticalChecks.forEach(check => {
    if (check.pattern.test(serverContent)) {
      console.log(`   ✅ ${check.name} found`);
    } else {
      console.log(`   ❌ ${check.name} missing`);
      allChecks = false;
    }
  });
} else {
  console.log('   ❌ server.js not found');
  allChecks = false;
}

// Check 3: Required directories exist
console.log('\n📁 Checking directory structure...');
const requiredDirs = ['models', 'routes', 'middleware', 'services'];
requiredDirs.forEach(dir => {
  if (fs.existsSync(path.join(__dirname, dir))) {
    console.log(`   ✅ ${dir}/ exists`);
  } else {
    console.log(`   ❌ ${dir}/ missing`);
    allChecks = false;
  }
});

// Check 4: Critical route files exist
console.log('\n🛣️  Checking route files...');
const requiredRoutes = [
  'auth.routes.js',
  'user.routes.js',
  'product.routes.js',
  'order.routes.js',
  'category.routes.js'
];
requiredRoutes.forEach(route => {
  if (fs.existsSync(path.join(__dirname, 'routes', route))) {
    console.log(`   ✅ routes/${route} exists`);
  } else {
    console.log(`   ❌ routes/${route} missing`);
    allChecks = false;
  }
});

// Check 5: Critical middleware files exist
console.log('\n🛡️  Checking middleware files...');
const requiredMiddleware = [
  'auth.middleware.js',
  'error.middleware.js',
  'sanitize.middleware.js'
];
requiredMiddleware.forEach(middleware => {
  if (fs.existsSync(path.join(__dirname, 'middleware', middleware))) {
    console.log(`   ✅ middleware/${middleware} exists`);
  } else {
    console.log(`   ❌ middleware/${middleware} missing`);
    allChecks = false;
  }
});

// Check 6: Deployment documentation exists
console.log('\n📚 Checking deployment documentation...');
const deploymentDocs = [
  'DEPLOYMENT_CHECKLIST.md',
  'RENDER_QUICK_START.md',
  'render.yaml'
];
deploymentDocs.forEach(doc => {
  if (fs.existsSync(path.join(__dirname, doc))) {
    console.log(`   ✅ ${doc} exists`);
  } else {
    console.log(`   ⚠️  ${doc} missing (optional but recommended)`);
  }
});

// Check 7: .gitignore properly configured
console.log('\n🔒 Checking .gitignore...');
const gitignorePath = path.join(__dirname, '..', '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  if (gitignoreContent.includes('.env') && gitignoreContent.includes('node_modules')) {
    console.log('   ✅ .gitignore properly configured');
  } else {
    console.log('   ⚠️  .gitignore may need updates');
  }
} else {
  console.log('   ⚠️  .gitignore not found');
}

// Check 8: Dependencies check
console.log('\n📦 Checking critical dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const criticalDeps = [
    'express',
    'mongoose',
    'cors',
    'dotenv',
    'jsonwebtoken',
    'bcryptjs',
    'helmet'
  ];
  
  criticalDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`   ✅ ${dep}: ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`   ❌ ${dep} missing from dependencies`);
      allChecks = false;
    }
  });
} catch (error) {
  console.log(`   ❌ Error checking dependencies: ${error.message}`);
}

// Final summary
console.log('\n' + '═'.repeat(80));
if (allChecks) {
  console.log('✅ ALL CHECKS PASSED! Your backend is ready for Render deployment.');
  console.log('\n📋 Next Steps:');
  console.log('   1. Generate JWT secret: node generate-jwt-secret.js');
  console.log('   2. Push code to GitHub/GitLab/Bitbucket');
  console.log('   3. Follow RENDER_QUICK_START.md for deployment');
  console.log('   4. Set environment variables in Render Dashboard');
  console.log('   5. Deploy and test!');
} else {
  console.log('⚠️  SOME CHECKS FAILED. Please review the issues above before deploying.');
  console.log('\n📋 Recommended Actions:');
  console.log('   1. Fix any missing files or configurations');
  console.log('   2. Run this script again to verify');
  console.log('   3. Consult DEPLOYMENT_CHECKLIST.md for guidance');
}
console.log('═'.repeat(80) + '\n');

// Environment variables reminder
console.log('🔑 Required Environment Variables for Render:');
console.log('   - NODE_ENV=production');
console.log('   - PORT=10000');
console.log('   - MONGODB_URI=<your-mongodb-connection-string>');
console.log('   - JWT_SECRET=<generate-using-crypto>');
console.log('   - JWT_EXPIRE=7d');
console.log('   - ALLOWED_ORIGINS=<your-frontend-url>');
console.log('   - ENABLE_SCHEDULER=true');
console.log('\n💡 Tip: Use generate-jwt-secret.js to create a secure JWT_SECRET\n');

process.exit(allChecks ? 0 : 1);
