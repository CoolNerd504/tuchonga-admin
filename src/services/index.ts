// ============================================================================
// TuChonga Services Export
// ============================================================================

// Prisma Client
export { prisma } from './prismaService';

// Admin Services
export * from './adminService';

// ============================================================================
// Prisma-based Services (for API - replacing Firebase)
// ============================================================================
export * from './mobileUserService';
export * from './productServicePrisma';
export * from './serviceServicePrisma';
export * from './categoryServicePrisma';
export * from './reviewServicePrisma';
export * from './commentServicePrisma';
export * from './quickRatingServicePrisma';
export * from './favoriteServicePrisma';
export * from './businessServicePrisma';

// ============================================================================
// Legacy Services (still using Firebase - to be deprecated)
// ============================================================================
export * from './productService';
export * from './serviceService';
export * from './categoryService';

