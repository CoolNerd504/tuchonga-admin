import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Railway should auto-provide DATABASE_URL when PostgreSQL is connected
// But if it doesn't, check for alternative variable names
if (!process.env.DATABASE_URL) {
  const possibleDbUrls = [
    process.env.DATABASE_PUBLIC_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRIVATE_URL,
    process.env.POSTGRES_PUBLIC_URL,
    process.env.PGDATABASE_URL,
    process.env.RAILWAY_DATABASE_URL,
  ].filter(Boolean);

  if (possibleDbUrls.length > 0) {
    process.env.DATABASE_URL = possibleDbUrls[0];
    const varName = Object.keys(process.env).find(key => process.env[key] === possibleDbUrls[0]);
    console.log(`[PrismaService] Using ${varName} as DATABASE_URL`);
  } else {
    // Debug: Log all environment variables that might be database-related
    console.error('[PrismaService] DATABASE_URL not found. Available env vars:');
    const dbRelatedVars = Object.keys(process.env).filter(key => 
      key.includes('DATABASE') || key.includes('POSTGRES') || key.includes('DB')
    );
    if (dbRelatedVars.length > 0) {
      dbRelatedVars.forEach(key => {
        const value = process.env[key];
        const preview = value ? `${value.substring(0, 30)}...` : 'undefined';
        console.error(`  - ${key}: ${preview}`);
      });
    } else {
      console.error('  No database-related environment variables found!');
    }
  }
}

// Verify DATABASE_URL is set before creating PrismaClient
if (!process.env.DATABASE_URL) {
  console.error('[PrismaService] ❌ DATABASE_URL is required but not set!');
  console.error('[PrismaService] Prisma Client cannot be created without DATABASE_URL.');
  throw new Error('DATABASE_URL environment variable is required. Please set it in Railway environment variables.');
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

