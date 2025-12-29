"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewServicePrisma = void 0;
const prismaService_1 = require("./prismaService");
const productServicePrisma_1 = require("./productServicePrisma");
const serviceServicePrisma_1 = require("./serviceServicePrisma");
exports.reviewServicePrisma = {
    // ============================================================================
    // CRUD Operations
    // ============================================================================
    async createOrUpdateReview(data) {
        const { userId, productId, serviceId, sentiment, text } = data;
        if (!productId && !serviceId) {
            throw new Error('Either productId or serviceId is required');
        }
        // Check for existing review
        const existingReview = await prismaService_1.prisma.review.findFirst({
            where: {
                userId,
                ...(productId ? { productId } : { serviceId }),
            },
        });
        let review;
        if (existingReview) {
            // Update existing review and track history
            const sentimentHistory = existingReview.sentimentHistory || [];
            sentimentHistory.push({
                sentiment: existingReview.sentiment,
                timestamp: existingReview.updatedAt,
            });
            review = await prismaService_1.prisma.review.update({
                where: { id: existingReview.id },
                data: {
                    sentiment,
                    text,
                    sentimentHistory,
                },
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
            });
        }
        else {
            // Create new review
            review = await prismaService_1.prisma.review.create({
                data: {
                    userId,
                    productId,
                    serviceId,
                    sentiment,
                    text,
                },
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
            });
            // Update user analytics
            await this.updateUserReviewAnalytics(userId, productId ? 'product' : 'service');
        }
        // Update product/service stats
        if (productId) {
            await productServicePrisma_1.productServicePrisma.updateReviewStats(productId);
        }
        else if (serviceId) {
            await serviceServicePrisma_1.serviceServicePrisma.updateReviewStats(serviceId);
        }
        return review;
    },
    async getReviewById(id) {
        return prismaService_1.prisma.review.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        displayName: true,
                        profileImage: true,
                    },
                },
                product: {
                    select: {
                        id: true,
                        productName: true,
                    },
                },
                service: {
                    select: {
                        id: true,
                        serviceName: true,
                    },
                },
            },
        });
    },
    async getAllReviews(filters = {}) {
        const { userId, productId, serviceId, sentiment, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = filters;
        const where = {};
        if (userId)
            where.userId = userId;
        if (productId)
            where.productId = productId;
        if (serviceId)
            where.serviceId = serviceId;
        if (sentiment)
            where.sentiment = sentiment;
        const [reviews, total] = await Promise.all([
            prismaService_1.prisma.review.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            displayName: true,
                            profileImage: true,
                        },
                    },
                    product: {
                        select: {
                            id: true,
                            productName: true,
                        },
                    },
                    service: {
                        select: {
                            id: true,
                            serviceName: true,
                        },
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prismaService_1.prisma.review.count({ where }),
        ]);
        return {
            reviews,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
    async getProductReviews(productId, filters = {}) {
        return this.getAllReviews({ ...filters, productId });
    },
    async getServiceReviews(serviceId, filters = {}) {
        return this.getAllReviews({ ...filters, serviceId });
    },
    async getUserReviews(userId, filters = {}) {
        return this.getAllReviews({ ...filters, userId });
    },
    async updateReview(id, userId, data) {
        const review = await prismaService_1.prisma.review.findUnique({
            where: { id },
        });
        if (!review) {
            throw new Error('Review not found');
        }
        if (review.userId !== userId) {
            throw new Error('Not authorized to update this review');
        }
        // Track sentiment history if changing
        const updateData = { ...data };
        if (data.sentiment && data.sentiment !== review.sentiment) {
            const sentimentHistory = review.sentimentHistory || [];
            sentimentHistory.push({
                sentiment: review.sentiment,
                timestamp: review.updatedAt,
            });
            updateData.sentimentHistory = sentimentHistory;
        }
        const updatedReview = await prismaService_1.prisma.review.update({
            where: { id },
            data: updateData,
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
        });
        // Update product/service stats
        if (review.productId) {
            await productServicePrisma_1.productServicePrisma.updateReviewStats(review.productId);
        }
        else if (review.serviceId) {
            await serviceServicePrisma_1.serviceServicePrisma.updateReviewStats(review.serviceId);
        }
        return updatedReview;
    },
    async deleteReview(id, userId, isAdmin = false) {
        const review = await prismaService_1.prisma.review.findUnique({
            where: { id },
        });
        if (!review) {
            throw new Error('Review not found');
        }
        if (!isAdmin && review.userId !== userId) {
            throw new Error('Not authorized to delete this review');
        }
        await prismaService_1.prisma.review.delete({
            where: { id },
        });
        // Update product/service stats
        if (review.productId) {
            await productServicePrisma_1.productServicePrisma.updateReviewStats(review.productId);
        }
        else if (review.serviceId) {
            await serviceServicePrisma_1.serviceServicePrisma.updateReviewStats(review.serviceId);
        }
        return { success: true };
    },
    // ============================================================================
    // Statistics
    // ============================================================================
    async getReviewStats(productId, serviceId) {
        const where = {};
        if (productId)
            where.productId = productId;
        if (serviceId)
            where.serviceId = serviceId;
        const stats = await prismaService_1.prisma.review.groupBy({
            by: ['sentiment'],
            where,
            _count: true,
        });
        const distribution = {
            WOULD_RECOMMEND: 0,
            ITS_GOOD: 0,
            DONT_MIND_IT: 0,
            ITS_BAD: 0,
        };
        let total = 0;
        stats.forEach((s) => {
            distribution[s.sentiment] = s._count;
            total += s._count;
        });
        return {
            total,
            distribution,
            positive: distribution.WOULD_RECOMMEND + distribution.ITS_GOOD,
            neutral: distribution.DONT_MIND_IT,
            negative: distribution.ITS_BAD,
        };
    },
    // ============================================================================
    // User Analytics
    // ============================================================================
    async updateUserReviewAnalytics(userId, itemType) {
        const incrementField = itemType === 'product' ? { productReviews: { increment: 1 } } : { serviceReviews: { increment: 1 } };
        await prismaService_1.prisma.userAnalytics.upsert({
            where: { userId },
            update: {
                totalReviews: { increment: 1 },
                ...incrementField,
                lastReviewAt: new Date(),
            },
            create: {
                userId,
                totalReviews: 1,
                productReviews: itemType === 'product' ? 1 : 0,
                serviceReviews: itemType === 'service' ? 1 : 0,
                lastReviewAt: new Date(),
            },
        });
    },
    // ============================================================================
    // Check User Review
    // ============================================================================
    async getUserReviewForItem(userId, productId, serviceId) {
        return prismaService_1.prisma.review.findFirst({
            where: {
                userId,
                ...(productId ? { productId } : { serviceId }),
            },
        });
    },
    async hasUserReviewed(userId, productId, serviceId) {
        const review = await this.getUserReviewForItem(userId, productId, serviceId);
        return !!review;
    },
};
