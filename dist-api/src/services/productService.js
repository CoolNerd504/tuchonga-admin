"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productService = void 0;
const prismaService_1 = require("./prismaService");
exports.productService = {
    // Get all products
    async getAll(options) {
        const where = {};
        if (!options?.includeInactive) {
            where.isActive = true;
        }
        if (options?.businessId) {
            where.businessId = options.businessId;
        }
        if (options?.categoryId) {
            where.categories = {
                some: {
                    categoryId: options.categoryId,
                },
            };
        }
        return prismaService_1.prisma.product.findMany({
            where,
            include: {
                categories: {
                    include: {
                        category: true,
                    },
                },
                business: true,
                _count: {
                    select: {
                        reviews: true,
                        comments: true,
                        favorites: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: options?.limit,
            skip: options?.offset,
        });
    },
    // Get product by ID
    async getById(id) {
        return prismaService_1.prisma.product.findUnique({
            where: { id },
            include: {
                categories: {
                    include: {
                        category: true,
                    },
                },
                business: true,
                reviews: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                displayName: true,
                                profileImage: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
                comments: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                displayName: true,
                                profileImage: true,
                            },
                        },
                        reactions: true,
                    },
                    where: {
                        isDeleted: false,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
                _count: {
                    select: {
                        reviews: true,
                        comments: true,
                        favorites: true,
                        quickRatings: true,
                    },
                },
            },
        });
    },
    // Create product
    async create(data) {
        const { categoryIds, ...productData } = data;
        return prismaService_1.prisma.product.create({
            data: {
                ...productData,
                additionalImages: data.additionalImages || [],
                categories: categoryIds
                    ? {
                        create: categoryIds.map((categoryId) => ({
                            categoryId,
                        })),
                    }
                    : undefined,
            },
            include: {
                categories: {
                    include: {
                        category: true,
                    },
                },
                business: true,
            },
        });
    },
    // Update product
    async update(id, data) {
        const { categoryIds, ...productData } = data;
        // If categoryIds are provided, update categories
        if (categoryIds !== undefined) {
            // Delete existing categories
            await prismaService_1.prisma.productCategory.deleteMany({
                where: { productId: id },
            });
            // Create new categories
            if (categoryIds.length > 0) {
                await prismaService_1.prisma.productCategory.createMany({
                    data: categoryIds.map((categoryId) => ({
                        productId: id,
                        categoryId,
                    })),
                });
            }
        }
        return prismaService_1.prisma.product.update({
            where: { id },
            data: productData,
            include: {
                categories: {
                    include: {
                        category: true,
                    },
                },
                business: true,
            },
        });
    },
    // Delete product
    async delete(id) {
        return prismaService_1.prisma.product.delete({
            where: { id },
        });
    },
    // Increment view count
    async incrementViews(id) {
        return prismaService_1.prisma.product.update({
            where: { id },
            data: {
                totalViews: {
                    increment: 1,
                },
            },
        });
    },
    // Get product statistics
    async getStats(id) {
        const product = await prismaService_1.prisma.product.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        reviews: true,
                        comments: true,
                        favorites: true,
                        quickRatings: true,
                    },
                },
            },
        });
        if (!product)
            return null;
        return {
            totalViews: product.totalViews,
            totalReviews: product._count.reviews,
            totalComments: product._count.comments,
            totalFavorites: product._count.favorites,
            totalQuickRatings: product._count.quickRatings,
            positiveReviews: product.positiveReviews,
            neutralReviews: product.neutralReviews,
            negativeReviews: product.negativeReviews,
        };
    },
};
