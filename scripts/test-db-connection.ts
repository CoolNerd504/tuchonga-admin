#!/usr/bin/env tsx
/**
 * Test Database Connection Script
 * Verifies that DATABASE_URL is set and Prisma can connect to the database
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check for DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set!');
  console.error('');
  console.error('Please set DATABASE_URL in your environment:');
  console.error('  - Local: Add to .env file');
  console.error('  - Railway: Add as environment variable or connect PostgreSQL service');
  console.error('');
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
const preview = dbUrl.substring(0, 50) + '...';
console.log(`🔍 Testing database connection...`);
console.log(`   DATABASE_URL: ${preview}`);
console.log('');

// Test connection
async function testConnection() {
  const prisma = new PrismaClient({
    log: ['error'],
  });

  try {
    console.log('⏳ Connecting to database...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Successfully connected to database!');
    
    // Test a simple query
    console.log('⏳ Testing query...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query test successful!');
    
    // Check if migrations have been applied
    console.log('⏳ Checking migrations...');
    const migrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name 
      FROM _prisma_migrations 
      ORDER BY finished_at DESC 
      LIMIT 5
    `;
    
    if (migrations.length > 0) {
      console.log('✅ Migrations found:');
      migrations.forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.migration_name}`);
      });
    } else {
      console.log('⚠️  No migrations found. Run: npm run prisma:migrate');
    }
    
    console.log('');
    console.log('✅ Database connection test PASSED!');
    console.log('   Your DATABASE_URL is correctly configured.');
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Database connection test FAILED!');
    console.error('');
    console.error('Error details:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    console.error('');
    console.error('Possible issues:');
    console.error('   1. DATABASE_URL is incorrect');
    console.error('   2. Database server is not accessible');
    console.error('   3. Database credentials are wrong');
    console.error('   4. Database does not exist');
    console.error('   5. Network/firewall blocking connection');
    console.error('');
    
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

testConnection();

