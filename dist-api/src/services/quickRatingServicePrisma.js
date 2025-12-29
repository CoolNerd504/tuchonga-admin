import { prisma } from './prismaService.js';
import { productServicePrisma } from './productServicePrisma.js';
import { serviceServicePrisma } from './serviceServicePrisma.js';
const DAILY_UPDATE_LIMIT_HOURS = 24;
export const quickRatingServicePrisma = {
    // ============================================================================
    // CRUD Operations
    // ============================================================================
    async createOrUpdateRating(data) {
        const { userId, itemId, itemType, rating } = data;
        // Validate rating
        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }
        // Check for existing rating
        const existing = await prisma.quickRating.findUnique({
            where: {
                userId_itemId: {
                    userId,
                    itemId,
                },
            },
        });
        const productId = itemType === 'PRODUCT' ? itemId : null;
        const serviceId = itemType === 'SERVICE' ? itemId : null;
        let result;
        if (existing) {
            // Check if update is allowed (24-hour limit)
            const hoursSinceUpdate = (Date.now() - existing.lastUpdated.getTime()) / (1000 * 60 * 60);
            if (hoursSinceUpdate < DAILY_UPDATE_LIMIT_HOURS) {
                throw new Error(`You can only update your rating once every ${DAILY_UPDATE_LIMIT_HOURS} hours. ` +
                    `Time remaining: ${Math.ceil(DAILY_UPDATE_LIMIT_HOURS - hoursSinceUpdate)} hours`);
            }
            result = await prisma.quickRating.update({
                where: { id: existing.id },
                data: {
                    rating,
                    lastUpdated: new Date(),
                },
            });
        }
        else {
            result = await prisma.quickRating.create({
                data: {
                    userId,
                    itemId,
                    itemType,
                    productId,
                    serviceId,
                    rating,
                },
            });
        }
        // Update product/service rating stats
        if (productId) {
            await productServicePrisma.updateRatingStats(productId);
        }
        else if (serviceId) {
            await serviceServicePrisma.updateRatingStats(serviceId);
        }
        return {
            ...result,
            canUpdateIn: DAILY_UPDATE_LIMIT_HOURS,
        };
    },
    async getRatingById(id) {
        return prisma.quickRating.findUnique({
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
            },
        });
    },
    async getUserRatingForItem(userId, itemId) {
        const rating = await prisma.quickRating.findUnique({
            where: {
                userId_itemId: {
                    userId,
                    itemId,
                },
            },
        });
        if (!rating)
            return null;
        // Calculate if update is allowed
        const hoursSinceUpdate = (Date.now() - rating.lastUpdated.getTime()) / (1000 * 60 * 60);
        const canUpdate = hoursSinceUpdate >= DAILY_UPDATE_LIMIT_HOURS;
        const hoursUntilUpdate = canUpdate
            ? 0
            : Math.ceil(DAILY_UPDATE_LIMIT_HOURS - hoursSinceUpdate);
        return {
            ...rating,
            canUpdate,
            hoursUntilUpdate,
        };
    },
    async deleteRating(id, userId, isAdmin = false) {
        const rating = await prisma.quickRating.findUnique({
            where: { id },
        });
        if (!rating) {
            throw new Error('Rating not found');
        }
        if (!isAdmin && rating.userId !== userId) {
            throw new Error('Not authorized to delete this rating');
        }
        await prisma.quickRating.delete({
            where: { id },
        });
        // Update product/service rating stats
        if (rating.productId) {
            await productServicePrisma.updateRatingStats(rating.productId);
        }
        else if (rating.serviceId) {
            await serviceServicePrisma.updateRatingStats(rating.serviceId);
        }
        return { success: true };
    },
    // ============================================================================
    // Statistics
    // ============================================================================
    async getItemRatingStats(itemId, itemType) {
        const where = { itemId };
        if (itemType)
            where.itemType = itemType;
        const ratings = await prisma.quickRating.groupBy({
            by: ['rating'],
            where,
            _count: true,
        });
        const distribution = {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
        };
        let total = 0;
        let sum = 0;
        ratings.forEach((r) => {
            distribution[r.rating] = r._count;
            total += r._count;
            sum += r.rating * r._count;
        });
        const average = total > 0 ? sum / total : 0;
        return {
            total,
            average: Math.round(average * 100) / 100,
            distribution,
        };
    },
    async getProductRatingStats(productId) {
        return this.getItemRatingStats(productId, 'PRODUCT');
    },
    async getServiceRatingStats(serviceId) {
        return this.getItemRatingStats(serviceId, 'SERVICE');
    },
    // ============================================================================
    // User Ratings
    // ============================================================================
    async getUserRatings(userId, options = {}) {
        const { itemType, page = 1, limit = 20 } = options;
        const where = { userId };
        if (itemType)
            where.itemType = itemType;
        const [ratings, total] = await Promise.all([
            prisma.quickRating.findMany({
                where,
                include: {
                    product: {
                        select: {
                            id: true,
                            productName: true,
                            mainImage: true,
                        },
                    },
                    service: {
                        select: {
                            id: true,
                            serviceName: true,
                            mainImage: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.quickRating.count({ where }),
        ]);
        return {
            ratings,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
    // ============================================================================
    // Admin Functions
    // ============================================================================
    async getAllRatings(options = {}) {
        const { itemId, itemType, userId, page = 1, limit = 20 } = options;
        const where = {};
        if (itemId)
            where.itemId = itemId;
        if (itemType)
            where.itemType = itemType;
        if (userId)
            where.userId = userId;
        const [ratings, total] = await Promise.all([
            prisma.quickRating.findMany({
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
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.quickRating.count({ where }),
        ]);
        return {
            ratings,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
};
