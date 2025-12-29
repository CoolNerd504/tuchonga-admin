/**
 * Database Reset Script
 * 
 * This script will:
 * 1. Drop all tables in the database
 * 2. Run fresh migrations
 * 3. Reset the database to a clean state
 * 
 * WARNING: This will delete ALL data in the database!
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('🔄 Starting database reset...\n');

  try {
    // Step 1: Drop all tables using Prisma migrate reset
    console.log('📦 Step 1: Resetting database (dropping all tables)...');
    try {
      execSync('npx prisma migrate reset --force --skip-seed', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      });
      console.log('✅ Database reset complete\n');
    } catch (error: any) {
      console.error('❌ Error during reset:', error.message);
      throw error;
    }

    // Step 2: Run migrations fresh
    console.log('📦 Step 2: Running fresh migrations...');
    try {
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      });
      console.log('✅ Migrations applied successfully\n');
    } catch (error: any) {
      console.error('❌ Error during migration:', error.message);
      throw error;
    }

    // Step 3: Generate Prisma Client
    console.log('📦 Step 3: Generating Prisma Client...');
    try {
      execSync('npx prisma generate', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      });
      console.log('✅ Prisma Client generated successfully\n');
    } catch (error: any) {
      console.error('❌ Error generating client:', error.message);
      throw error;
    }

    console.log('🎉 Database reset complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start your API server: npm run dev:api');
    console.log('   2. Visit http://localhost:5173/setup to create your first super admin');
    console.log('   3. Sign in and start using the application\n');

  } catch (error) {
    console.error('\n❌ Database reset failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetDatabase();

