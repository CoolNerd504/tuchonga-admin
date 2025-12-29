"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.favoriteServicePrisma = void 0;
const prismaService_1 = require("./prismaService");
exports.favoriteServicePrisma = {
    // ============================================================================
    // CRUD Operations
    // ============================================================================
    async addFavorite(data) {
        const { userId, itemId, itemType } = data;
        // Check if already favorited
        const existing = await prismaService_1.prisma.favorite.findUnique({
            where: {
                userId_itemId: {
                    userId,
                    itemId,
                },
            },
        });
        if (existing) {
            return existing; // Already favorited
        }
        const productId = itemType === 'PRODUCT' ? itemId : null;
        const serviceId = itemType === 'SERVICE' ? itemId : null;
        return prismaService_1.prisma.favorite.create({
            data: {
                userId,
                itemId,
                itemType,
                productId,
                serviceId,
            },
            include: {
                product: {
                    select: {
                        id: true,
                        productName: true,
                        mainImage: true,
                        productOwner: true,
                    },
                },
                service: {
                    select: {
                        id: true,
                        serviceName: true,
                        mainImage: true,
                        serviceOwner: true,
                    },
                },
            },
        });
    },
    async removeFavorite(userId, itemId) {
        const favorite = await prismaService_1.prisma.favorite.findUnique({
            where: {
                userId_itemId: {
                    userId,
                    itemId,
                },
            },
        });
        if (!favorite) {
            throw new Error('Favorite not found');
        }
        await prismaService_1.prisma.favorite.delete({
            where: { id: favorite.id },
        });
        return { success: true };
    },
    async isFavorited(userId, itemId) {
        const favorite = await prismaService_1.prisma.favorite.findUnique({
            where: {
                userId_itemId: {
                    userId,
                    itemId,
                },
            },
        });
        return !!favorite;
    },
    async toggleFavorite(data) {
        const isFavorited = await this.isFavorited(data.userId, data.itemId);
        if (isFavorited) {
            await this.removeFavorite(data.userId, data.itemId);
            return { action: 'removed', isFavorited: false };
        }
        await this.addFavorite(data);
        return { action: 'added', isFavorited: true };
    },
    // ============================================================================
    // Queries
    // ============================================================================
    async getUserFavorites(userId, filters = {}) {
        const { itemType, page = 1, limit = 20 } = filters;
        const where = { userId };
        if (itemType)
            where.itemType = itemType;
        const [favorites, total] = await Promise.all([
            prismaService_1.prisma.favorite.findMany({
                where,
                include: {
                    product: {
                        select: {
                            id: true,
                            productName: true,
                            description: true,
                            mainImage: true,
                            productOwner: true,
                            quickRatingAvg: true,
                            totalReviews: true,
                            categories: {
                                include: {
                                    category: true,
                                },
                            },
                        },
                    },
                    service: {
                        select: {
                            id: true,
                            serviceName: true,
                            description: true,
                            mainImage: true,
                            serviceOwner: true,
                            quickRatingAvg: true,
                            totalReviews: true,
                            categories: {
                                include: {
                                    category: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prismaService_1.prisma.favorite.count({ where }),
        ]);
        // Format favorites to include item details
        const formattedFavorites = favorites.map((f) => ({
            id: f.id,
            itemId: f.itemId,
            itemType: f.itemType,
            createdAt: f.createdAt,
            item: f.itemType === 'PRODUCT' ? f.product : f.service,
        }));
        return {
            favorites: formattedFavorites,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
    async getUserFavoriteProducts(userId, filters = {}) {
        return this.getUserFavorites(userId, { ...filters, itemType: 'PRODUCT' });
    },
    async getUserFavoriteServices(userId, filters = {}) {
        return this.getUserFavorites(userId, { ...filters, itemType: 'SERVICE' });
    },
    async getFavoriteCount(userId, itemType) {
        const where = { userId };
        if (itemType)
            where.itemType = itemType;
        return prismaService_1.prisma.favorite.count({ where });
    },
    // ============================================================================
    // Admin Functions
    // ============================================================================
    async getItemFavoriteCount(itemId) {
        return prismaService_1.prisma.favorite.count({
            where: { itemId },
        });
    },
    async getItemFavoritedByUsers(itemId, limit = 10) {
        return prismaService_1.prisma.favorite.findMany({
            where: { itemId },
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
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    },
    async getMostFavoritedProducts(limit = 10) {
        const favorites = await prismaService_1.prisma.favorite.groupBy({
            by: ['itemId'],
            where: { itemType: 'PRODUCT' },
            _count: true,
            orderBy: {
                _count: {
                    itemId: 'desc',
                },
            },
            take: limit,
        });
        const productIds = favorites.map((f) => f.itemId);
        const products = await prismaService_1.prisma.product.findMany({
            where: { id: { in: productIds } },
            include: {
                categories: {
                    include: {
                        category: true,
                    },
                },
            },
        });
        return favorites.map((f) => ({
            product: products.find((p) => p.id === f.itemId),
            favoriteCount: f._count,
        }));
    },
    async getMostFavoritedServices(limit = 10) {
        const favorites = await prismaService_1.prisma.favorite.groupBy({
            by: ['itemId'],
            where: { itemType: 'SERVICE' },
            _count: true,
            orderBy: {
                _count: {
                    itemId: 'desc',
                },
            },
            take: limit,
        });
        const serviceIds = favorites.map((f) => f.itemId);
        const services = await prismaService_1.prisma.service.findMany({
            where: { id: { in: serviceIds } },
            include: {
                categories: {
                    include: {
                        category: true,
                    },
                },
            },
        });
        return favorites.map((f) => ({
            service: services.find((s) => s.id === f.itemId),
            favoriteCount: f._count,
        }));
    },
};
