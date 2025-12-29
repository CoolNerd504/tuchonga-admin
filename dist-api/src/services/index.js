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
export { mobileUserService } from './mobileUserService';
export { productServicePrisma } from './productServicePrisma';
export { serviceServicePrisma } from './serviceServicePrisma';
export { categoryServicePrisma } from './categoryServicePrisma';
export { reviewServicePrisma } from './reviewServicePrisma';
export { commentServicePrisma } from './commentServicePrisma';
export { quickRatingServicePrisma } from './quickRatingServicePrisma';
export { favoriteServicePrisma } from './favoriteServicePrisma';
export { businessServicePrisma } from './businessServicePrisma';
// ============================================================================
// Legacy Services (still using Firebase - to be deprecated)
// ============================================================================
export { productService } from './productService';
export { serviceService } from './serviceService';
export { categoryService } from './categoryService';
