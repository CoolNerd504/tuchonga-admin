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
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

