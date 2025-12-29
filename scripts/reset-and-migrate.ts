#!/usr/bin/env tsx
/**
 * Reset Database and Create Fresh Migrations
 * WARNING: This will DROP ALL DATA in the database!
 * Use only for development or when you want to start fresh.
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check for DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set!');
  console.error('Please set DATABASE_URL before running this script.');
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
const preview = dbUrl.substring(0, 50) + '...';
console.log(`🔍 DATABASE_URL: ${preview}`);
console.log('');

// Confirm destructive action
console.log('⚠️  WARNING: This will DROP ALL DATA in your database!');
console.log('   This action cannot be undone.');
console.log('');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
console.log('');

// Wait 5 seconds before continuing
setTimeout(() => {
  runReset();
}, 5000);

function runReset() {
  try {
    console.log('🔄 Step 1: Resetting database (dropping all data)...');
    execSync('npx prisma migrate reset --force --skip-seed', {
      stdio: 'inherit',
      env: { ...process.env },
    });
    console.log('✅ Database reset complete');
    console.log('');

    console.log('🔄 Step 2: Creating fresh migration...');
    execSync('npx prisma migrate dev --name init_fresh', {
      stdio: 'inherit',
      env: { ...process.env },
    });
    console.log('✅ Fresh migration created');
    console.log('');

    console.log('🔄 Step 3: Generating Prisma Client...');
    execSync('npx prisma generate', {
      stdio: 'inherit',
      env: { ...process.env },
    });
    console.log('✅ Prisma Client generated');
    console.log('');

    console.log('✅ All done! Database is reset with fresh migrations.');
    console.log('');
    console.log('Next steps:');
    console.log('   1. Test connection: npm run db:test');
    console.log('   2. Start your app: npm run dev:api');
  } catch (error: any) {
    console.error('❌ Error during reset/migration:');
    console.error(error.message);
    process.exit(1);
  }
}
