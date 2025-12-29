import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Function to ensure DATABASE_URL is set (called before PrismaClient creation)
function ensureDatabaseUrl(): boolean {
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
      return true;
    }
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
    return false;
  }
  return true;
}

// Initialize PrismaClient lazily - only when first accessed
function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  // Ensure DATABASE_URL is set before creating PrismaClient
  if (!ensureDatabaseUrl() || !process.env.DATABASE_URL) {
    const error = new Error(
      'DATABASE_URL environment variable is required but not set.\n' +
      'Please ensure PostgreSQL database is connected to your Railway service, ' +
      'or manually set DATABASE_URL in Railway environment variables.'
    );
    console.error('[PrismaService]', error.message);
    throw error;
  }

  console.log('[PrismaService] Initializing Prisma Client...');
  globalForPrisma.prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // In development, the global is already set above, no need to reassign
  // This prevents multiple instances during hot reload

  return globalForPrisma.prisma;
}

// Create a proxy that lazily initializes PrismaClient on first property access
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getPrismaClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
}) as PrismaClient;

