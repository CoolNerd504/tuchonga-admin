"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productServicePrisma = void 0;
const prismaService_1 = require("./prismaService");
exports.productServicePrisma = {
    // ============================================================================
    // CRUD Operations
    // ============================================================================
    async createProduct(data) {
        const { categoryIds, ...productData } = data;
        const product = await prismaService_1.prisma.product.create({
            data: {
                ...productData,
                additionalImages: productData.additionalImages || [],
                categories: categoryIds
                    ? {
                        create: categoryIds.map((categoryId) => ({
                            category: { connect: { id: categoryId } },
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
        return this.formatProduct(product);
    },
    async getProductById(id) {
        const product = await prismaService_1.prisma.product.findUnique({
            where: { id },
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
        });
        if (!product)
            return null;
        return this.formatProduct(product);
    },
    async getAllProducts(filters = {}) {
        const { search, categories, businessId, isActive = true, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = filters;
        const where = {
            isActive,
        };
        if (businessId) {
            where.businessId = businessId;
        }
        if (search) {
            where.OR = [
                { productName: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { productOwner: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (categories && categories.length > 0) {
            where.categories = {
                some: {
                    category: {
                        name: { in: categories },
                    },
                },
            };
        }
        const [products, total] = await Promise.all([
            prismaService_1.prisma.product.findMany({
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
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prismaService_1.prisma.product.count({ where }),
        ]);
        return {
            products: products.map(this.formatProduct),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
    async updateProduct(id, data) {
        const { categoryIds, ...updateData } = data;
        // If categories are being updated, delete existing and create new
        if (categoryIds !== undefined) {
            await prismaService_1.prisma.productCategory.deleteMany({
                where: { productId: id },
            });
            if (categoryIds.length > 0) {
                await prismaService_1.prisma.productCategory.createMany({
                    data: categoryIds.map((categoryId) => ({
                        productId: id,
                        categoryId,
                    })),
                });
            }
        }
        const product = await prismaService_1.prisma.product.update({
            where: { id },
            data: {
                ...updateData,
                lastUpdate: new Date(),
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
        return this.formatProduct(product);
    },
    async deleteProduct(id) {
        // Soft delete
        return prismaService_1.prisma.product.update({
            where: { id },
            data: { isActive: false },
        });
    },
    async hardDeleteProduct(id) {
        return prismaService_1.prisma.product.delete({
            where: { id },
        });
    },
    // ============================================================================
    // Analytics
    // ============================================================================
    async incrementViews(id) {
        return prismaService_1.prisma.product.update({
            where: { id },
            data: {
                totalViews: { increment: 1 },
            },
        });
    },
    async updateRatingStats(id) {
        // Calculate quick rating statistics
        const ratings = await prismaService_1.prisma.quickRating.groupBy({
            by: ['rating'],
            where: { productId: id },
            _count: true,
        });
        const ratingCounts = {
            quickRating1: 0,
            quickRating2: 0,
            quickRating3: 0,
            quickRating4: 0,
            quickRating5: 0,
        };
        let total = 0;
        let sum = 0;
        ratings.forEach((r) => {
            const key = `quickRating${r.rating}`;
            ratingCounts[key] = r._count;
            total += r._count;
            sum += r.rating * r._count;
        });
        const avg = total > 0 ? sum / total : null;
        return prismaService_1.prisma.product.update({
            where: { id },
            data: {
                ...ratingCounts,
                quickRatingTotal: total,
                quickRatingAvg: avg,
            },
        });
    },
    async updateReviewStats(id) {
        // Calculate review statistics
        const reviews = await prismaService_1.prisma.review.groupBy({
            by: ['sentiment'],
            where: { productId: id },
            _count: true,
        });
        let positive = 0;
        let neutral = 0;
        let negative = 0;
        reviews.forEach((r) => {
            if (r.sentiment === 'WOULD_RECOMMEND' || r.sentiment === 'ITS_GOOD') {
                positive += r._count;
            }
            else if (r.sentiment === 'DONT_MIND_IT') {
                neutral += r._count;
            }
            else {
                negative += r._count;
            }
        });
        const total = positive + neutral + negative;
        return prismaService_1.prisma.product.update({
            where: { id },
            data: {
                totalReviews: total,
                positiveReviews: positive,
                neutralReviews: neutral,
                negativeReviews: negative,
            },
        });
    },
    // ============================================================================
    // Search
    // ============================================================================
    async searchProducts(query, limit = 20) {
        return prismaService_1.prisma.product.findMany({
            where: {
                isActive: true,
                OR: [
                    { productName: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { productOwner: { contains: query, mode: 'insensitive' } },
                ],
            },
            include: {
                categories: {
                    include: {
                        category: true,
                    },
                },
            },
            orderBy: [{ quickRatingAvg: 'desc' }, { totalViews: 'desc' }],
            take: limit,
        });
    },
    // ============================================================================
    // Business Products
    // ============================================================================
    async getProductsByBusiness(businessId, filters = {}) {
        return this.getAllProducts({
            ...filters,
            businessId,
        });
    },
    // ============================================================================
    // Category Products
    // ============================================================================
    async getProductsByCategory(categoryName, filters = {}) {
        return this.getAllProducts({
            ...filters,
            categories: [categoryName],
        });
    },
    // ============================================================================
    // Counts
    // ============================================================================
    async getProductCount(filters) {
        const where = {};
        if (filters?.businessId) {
            where.businessId = filters.businessId;
        }
        if (filters?.isActive !== undefined) {
            where.isActive = filters.isActive;
        }
        return prismaService_1.prisma.product.count({ where });
    },
    // ============================================================================
    // Helpers
    // ============================================================================
    formatProduct(product) {
        return {
            id: product.id,
            productName: product.productName,
            description: product.description,
            mainImage: product.mainImage,
            additionalImages: product.additionalImages,
            isActive: product.isActive,
            businessId: product.businessId,
            business: product.business,
            productOwner: product.productOwner,
            categories: product.categories?.map((pc) => pc.category) || [],
            totalViews: product.totalViews,
            totalReviews: product.totalReviews,
            positiveReviews: product.positiveReviews,
            neutralReviews: product.neutralReviews,
            negativeReviews: product.negativeReviews,
            quickRatingAvg: product.quickRatingAvg,
            quickRatingTotal: product.quickRatingTotal,
            quickRating1: product.quickRating1,
            quickRating2: product.quickRating2,
            quickRating3: product.quickRating3,
            quickRating4: product.quickRating4,
            quickRating5: product.quickRating5,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
            lastUpdate: product.lastUpdate,
            _count: product._count,
        };
    },
};
