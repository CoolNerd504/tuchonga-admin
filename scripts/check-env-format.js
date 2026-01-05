#!/usr/bin/env node
/**
 * Check FIREBASE_SERVICE_ACCOUNT_KEY format in .env file
 * This script reads the .env file and validates the format
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🔍 Checking FIREBASE_SERVICE_ACCOUNT_KEY format...\n');

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  console.log('❌ FIREBASE_SERVICE_ACCOUNT_KEY is not set in .env file\n');
  console.log('📝 To add it:');
  console.log('   1. Get your Firebase service account key from Firebase Console');
  console.log('   2. In the private_key field, replace all \\n with \\\\n (single → double backslash)');
  console.log('   3. Add to .env: FIREBASE_SERVICE_ACCOUNT_KEY=\'{"type":"service_account",...}\'');
  process.exit(1);
}

console.log('✅ FIREBASE_SERVICE_ACCOUNT_KEY is set');
console.log(`   Length: ${serviceAccountKey.length} characters\n`);

// Check if it's wrapped in quotes
const rawEnvContent = readFileSync(join(__dirname, '..', '.env'), 'utf8');
const envLine = rawEnvContent.split('\n').find(line => line.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='));

if (!envLine) {
  console.log('⚠️  Warning: Could not find FIREBASE_SERVICE_ACCOUNT_KEY line in .env');
} else {
  // Check quote format
  if (envLine.includes("FIREBASE_SERVICE_ACCOUNT_KEY='")) {
    console.log('✅ Using single quotes (correct)');
  } else if (envLine.includes('FIREBASE_SERVICE_ACCOUNT_KEY="')) {
    console.log('⚠️  Using double quotes (may cause issues with special characters)');
    console.log('   Recommendation: Use single quotes instead');
  } else {
    console.log('❌ Missing quotes around JSON value');
    console.log('   Should be: FIREBASE_SERVICE_ACCOUNT_KEY=\'{"type":"service_account",...}\'');
  }
}

// Try to parse JSON
let parsed;
try {
  parsed = JSON.parse(serviceAccountKey);
  console.log('✅ JSON is valid\n');
} catch (error) {
  console.log('❌ JSON parsing failed:', error.message);
  console.log('\n📝 Common issues:');
  console.log('   1. Missing quotes around JSON string');
  console.log('   2. Invalid JSON format');
  console.log('   3. Escaped quotes not properly formatted');
  console.log('   4. Single backslash \\n instead of double backslash \\\\n in private_key');
  process.exit(1);
}

// Check required fields
console.log('📋 Service Account Details:');
console.log(`   Type: ${parsed.type || '❌ MISSING'}`);
console.log(`   Project ID: ${parsed.project_id || '❌ MISSING'}`);
console.log(`   Client Email: ${parsed.client_email || '❌ MISSING'}`);
console.log(`   Private Key ID: ${parsed.private_key_id ? '✅ Present' : '❌ MISSING'}`);
console.log(`   Private Key: ${parsed.private_key ? '✅ Present (' + parsed.private_key.length + ' chars)' : '❌ MISSING'}`);

const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
const missingFields = requiredFields.filter(field => !parsed[field]);

if (missingFields.length > 0) {
  console.log(`\n❌ Missing required fields: ${missingFields.join(', ')}`);
  process.exit(1);
}

// Check private key format
if (parsed.private_key) {
  console.log('\n🔐 Private Key Format Check:');
  
  // Check if it has BEGIN/END markers
  if (!parsed.private_key.includes('BEGIN PRIVATE KEY')) {
    console.log('❌ Private key format may be incorrect');
    console.log('   Should contain: "-----BEGIN PRIVATE KEY-----"');
  } else {
    console.log('✅ Contains BEGIN/END markers');
  }
  
  // Check the raw .env file for backslash format
  if (envLine) {
    // Extract the private_key value from the raw line
    const privateKeyMatch = envLine.match(/"private_key"\s*:\s*"([^"]*)"/);
    
    if (privateKeyMatch) {
      const privateKeyInEnv = privateKeyMatch[1];
      
      // Check for single backslash (wrong)
      if (privateKeyInEnv.includes('\\n') && !privateKeyInEnv.includes('\\\\n')) {
        console.log('\n❌ ERROR: Private key has single backslash \\n instead of double backslash \\\\n');
        console.log('   In .env file, you need: \\\\n (TWO backslashes)');
        console.log('   Current format will break JSON parsing!');
        console.log('\n   Fix: Replace all \\n with \\\\n in the private_key field');
        console.log('   Example:');
        console.log('     Before: "private_key":"...\\n..."');
        console.log('     After:  "private_key":"...\\\\n..."');
        process.exit(1);
      } else if (privateKeyInEnv.includes('\\\\n')) {
        console.log('✅ Private key format: Correct (has \\\\n - double backslash)');
      } else if (privateKeyInEnv.includes('\n')) {
        console.log('\n⚠️  Warning: Private key has actual newlines');
        console.log('   Should use: "\\\\n" (double backslash-n) for line breaks in .env');
      } else {
        console.log('⚠️  Warning: Private key may not have proper line breaks');
        console.log('   Should contain: "\\\\n" (double backslash-n)');
      }
    } else {
      console.log('⚠️  Could not extract private_key from .env for format check');
    }
  }
}

console.log('\n✅ All required fields are present');
console.log('✅ Structure looks correct!');
console.log('\n💡 Next steps:');
console.log('   1. If this is for local: Restart your server: npm run dev:api');
console.log('   2. If this is for Railway: Add this to Railway Variables');
console.log('   3. Check logs for: "✅ Firebase Admin SDK initialized successfully"');
console.log('   4. Test with: curl http://localhost:3001/api/auth/firebase-status');

