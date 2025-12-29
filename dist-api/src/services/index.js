"use strict";
// ============================================================================
// TuChonga Services Export
// ============================================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryService = exports.serviceService = exports.productService = exports.businessServicePrisma = exports.favoriteServicePrisma = exports.quickRatingServicePrisma = exports.commentServicePrisma = exports.reviewServicePrisma = exports.categoryServicePrisma = exports.serviceServicePrisma = exports.productServicePrisma = exports.mobileUserService = exports.prisma = void 0;
// Prisma Client
var prismaService_1 = require("./prismaService");
Object.defineProperty(exports, "prisma", { enumerable: true, get: function () { return prismaService_1.prisma; } });
// Admin Services
__exportStar(require("./adminService"), exports);
// ============================================================================
// Prisma-based Services (for API - replacing Firebase)
// ============================================================================
var mobileUserService_1 = require("./mobileUserService");
Object.defineProperty(exports, "mobileUserService", { enumerable: true, get: function () { return mobileUserService_1.mobileUserService; } });
var productServicePrisma_1 = require("./productServicePrisma");
Object.defineProperty(exports, "productServicePrisma", { enumerable: true, get: function () { return productServicePrisma_1.productServicePrisma; } });
var serviceServicePrisma_1 = require("./serviceServicePrisma");
Object.defineProperty(exports, "serviceServicePrisma", { enumerable: true, get: function () { return serviceServicePrisma_1.serviceServicePrisma; } });
var categoryServicePrisma_1 = require("./categoryServicePrisma");
Object.defineProperty(exports, "categoryServicePrisma", { enumerable: true, get: function () { return categoryServicePrisma_1.categoryServicePrisma; } });
var reviewServicePrisma_1 = require("./reviewServicePrisma");
Object.defineProperty(exports, "reviewServicePrisma", { enumerable: true, get: function () { return reviewServicePrisma_1.reviewServicePrisma; } });
var commentServicePrisma_1 = require("./commentServicePrisma");
Object.defineProperty(exports, "commentServicePrisma", { enumerable: true, get: function () { return commentServicePrisma_1.commentServicePrisma; } });
var quickRatingServicePrisma_1 = require("./quickRatingServicePrisma");
Object.defineProperty(exports, "quickRatingServicePrisma", { enumerable: true, get: function () { return quickRatingServicePrisma_1.quickRatingServicePrisma; } });
var favoriteServicePrisma_1 = require("./favoriteServicePrisma");
Object.defineProperty(exports, "favoriteServicePrisma", { enumerable: true, get: function () { return favoriteServicePrisma_1.favoriteServicePrisma; } });
var businessServicePrisma_1 = require("./businessServicePrisma");
Object.defineProperty(exports, "businessServicePrisma", { enumerable: true, get: function () { return businessServicePrisma_1.businessServicePrisma; } });
// ============================================================================
// Legacy Services (still using Firebase - to be deprecated)
// ============================================================================
var productService_1 = require("./productService");
Object.defineProperty(exports, "productService", { enumerable: true, get: function () { return productService_1.productService; } });
var serviceService_1 = require("./serviceService");
Object.defineProperty(exports, "serviceService", { enumerable: true, get: function () { return serviceService_1.serviceService; } });
var categoryService_1 = require("./categoryService");
Object.defineProperty(exports, "categoryService", { enumerable: true, get: function () { return categoryService_1.categoryService; } });
