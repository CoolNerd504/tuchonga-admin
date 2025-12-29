import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Railway provides both DATABASE_URL (internal) and DATABASE_PUBLIC_URL (external)
// Use DATABASE_PUBLIC_URL as fallback if DATABASE_URL is not set
if (!process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}

// Verify DATABASE_URL is available before creating PrismaClient
if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
  console.error('Prisma Client requires DATABASE_URL to connect to the database.');
  console.error('Please set DATABASE_URL or DATABASE_PUBLIC_URL in Railway environment variables.');
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

