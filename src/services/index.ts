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
export type { CreateUserData, UpdateUserData, UserFilters } from './mobileUserService';

export { productServicePrisma } from './productServicePrisma';
export type {
  ProductFilters,
  CreateProductData as CreateProductDataPrisma,
  UpdateProductData as UpdateProductDataPrisma,
} from './productServicePrisma';

export { serviceServicePrisma } from './serviceServicePrisma';
export type {
  ServiceFilters,
  CreateServiceData as CreateServiceDataPrisma,
  UpdateServiceData as UpdateServiceDataPrisma,
} from './serviceServicePrisma';

export { categoryServicePrisma } from './categoryServicePrisma';
export type {
  CategoryFilters,
  CreateCategoryData as CreateCategoryDataPrisma,
  UpdateCategoryData as UpdateCategoryDataPrisma,
} from './categoryServicePrisma';

export { reviewServicePrisma } from './reviewServicePrisma';
export type { ReviewFilters, CreateReviewData, UpdateReviewData } from './reviewServicePrisma';

export { commentServicePrisma } from './commentServicePrisma';
export type { CommentFilters, CreateCommentData, UpdateCommentData } from './commentServicePrisma';

export { quickRatingServicePrisma } from './quickRatingServicePrisma';
export type { CreateQuickRatingData } from './quickRatingServicePrisma';

export { favoriteServicePrisma } from './favoriteServicePrisma';
export type { FavoriteFilters, CreateFavoriteData } from './favoriteServicePrisma';

export { businessServicePrisma } from './businessServicePrisma';
export type { BusinessFilters, CreateBusinessData, UpdateBusinessData } from './businessServicePrisma';

// ============================================================================
// Legacy Services (still using Firebase - to be deprecated)
// ============================================================================
export { productService } from './productService';
export type { CreateProductData, UpdateProductData } from './productService';

export { serviceService } from './serviceService';
export type { CreateServiceData, UpdateServiceData } from './serviceService';

export { categoryService } from './categoryService';
export type { CreateCategoryData, UpdateCategoryData } from './categoryService';

