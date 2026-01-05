#!/usr/bin/env node

/**
 * Validate FIREBASE_SERVICE_ACCOUNT_KEY environment variable
 * Run: node scripts/validate-firebase-env.js
 * 
 * This script validates the structure WITHOUT exposing your actual key values
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🔍 Validating FIREBASE_SERVICE_ACCOUNT_KEY structure...\n');

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  console.log('❌ FIREBASE_SERVICE_ACCOUNT_KEY is not set in .env file');
  console.log('\n📝 Expected format:');
  console.log('FIREBASE_SERVICE_ACCOUNT_KEY=\'{"type":"service_account","project_id":"...",...}\'');
  console.log('\nSee FIREBASE_ENV_STRUCTURE.md for detailed format guide');
  process.exit(1);
}

console.log('✅ FIREBASE_SERVICE_ACCOUNT_KEY is set');
console.log(`   Length: ${serviceAccountKey.length} characters\n`);

// Check if wrapped in quotes
if (!serviceAccountKey.startsWith('{')) {
  console.log('⚠️  Warning: Key might be wrapped in quotes');
  console.log('   If using single quotes, they should be removed by dotenv');
}

// Try to parse JSON
try {
  const parsed = JSON.parse(serviceAccountKey);
  
  console.log('✅ JSON is valid\n');
  console.log('📋 Service Account Structure:');
  console.log(`   Type: ${parsed.type || '❌ MISSING'} ${parsed.type === 'service_account' ? '✅' : '❌'}`);
  console.log(`   Project ID: ${parsed.project_id ? '✅ Present (' + parsed.project_id.length + ' chars)' : '❌ MISSING'}`);
  console.log(`   Client Email: ${parsed.client_email ? '✅ Present' : '❌ MISSING'}`);
  console.log(`   Private Key ID: ${parsed.private_key_id ? '✅ Present' : '❌ MISSING'}`);
  console.log(`   Private Key: ${parsed.private_key ? '✅ Present (' + parsed.private_key.length + ' chars)' : '❌ MISSING'}`);
  
  // Validate required fields
  const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
  const missingFields = requiredFields.filter(field => !parsed[field]);
  
  if (missingFields.length > 0) {
    console.log(`\n❌ Missing required fields: ${missingFields.join(', ')}`);
    process.exit(1);
  }
  
  // Check private key format
  if (parsed.private_key) {
    if (!parsed.private_key.includes('BEGIN PRIVATE KEY')) {
      console.log('\n⚠️  Warning: Private key format may be incorrect');
      console.log('   Should contain: "-----BEGIN PRIVATE KEY-----"');
    }
    
    // Check if private key has newlines (should have \n, not actual newlines)
    // Check the raw string in .env (before parsing)
    const rawKey = serviceAccountKey;
    const privateKeyMatch = rawKey.match(/"private_key"\s*:\s*"([^"]*)"/);
    
    if (privateKeyMatch) {
      const privateKeyInEnv = privateKeyMatch[1];
      // Check if it has single backslash \n (wrong) vs double backslash \\n (correct)
      if (privateKeyInEnv.includes('\\n') && !privateKeyInEnv.includes('\\\\n')) {
        // Has \n but not \\n - this is wrong for .env
        console.log('\n❌ ERROR: Private key has single backslash \\n instead of double backslash \\\\n');
        console.log('   In .env file, you need: \\\\n (TWO backslashes)');
        console.log('   Current format will break JSON parsing');
        console.log('\n   Fix: Replace all \\n with \\\\n in the private_key field');
        process.exit(1);
      } else if (privateKeyInEnv.includes('\\\\n')) {
        console.log('   Private key format: ✅ Correct (has \\\\n)');
      } else if (privateKeyInEnv.includes('\n')) {
        console.log('\n⚠️  Warning: Private key has actual newlines');
        console.log('   Should use: "\\\\n" (double backslash-n) for line breaks in .env');
      }
    }
  }
  
  // Check type
  if (parsed.type !== 'service_account') {
    console.log(`\n⚠️  Warning: Type is "${parsed.type}", expected "service_account"`);
  }
  
  console.log('\n✅ All required fields are present');
  console.log('✅ Structure looks correct!');
  console.log('\n💡 Next steps:');
  console.log('   1. Restart your server: npm run dev:api');
  console.log('   2. Check logs for: "✅ Firebase Admin SDK initialized successfully"');
  console.log('   3. If still not working, check FIREBASE_TROUBLESHOOTING.md');
  
} catch (error) {
  console.log('❌ JSON parsing failed:', error.message);
  console.log('\n📝 Common issues:');
  console.log('   1. Missing quotes around JSON string');
  console.log('   2. Invalid JSON format');
  console.log('   3. Escaped quotes not properly formatted');
  console.log('   4. Actual line breaks instead of \\n');
  console.log('\n📋 Correct format:');
  console.log('FIREBASE_SERVICE_ACCOUNT_KEY=\'{"type":"service_account","project_id":"...",...}\'');
  console.log('\n   Note: Use single quotes around the entire JSON string');
  console.log('   See FIREBASE_ENV_STRUCTURE.md for detailed format guide');
  process.exit(1);
}
