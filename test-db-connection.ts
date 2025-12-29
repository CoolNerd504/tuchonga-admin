import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'NOT SET');
    
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ Database query successful!');
    console.log('PostgreSQL version:', result);
    
    await prisma.$disconnect();
    console.log('✅ Connection closed successfully');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    
    if (error.code === 'P1001') {
      console.error('\n💡 Troubleshooting:');
      console.error('1. Check your DATABASE_URL in .env file');
      console.error('2. For Railway: Make sure you copied the full connection string');
      console.error('3. For local: Make sure PostgreSQL is running');
      console.error('4. Verify the database server is accessible');
    }
    
    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();

