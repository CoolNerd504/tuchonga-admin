import { prisma } from './prismaService.js';
export const serviceService = {
    // Get all services
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
        return prisma.service.findMany({
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
    // Get service by ID
    async getById(id) {
        return prisma.service.findUnique({
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
    // Create service
    async create(data) {
        const { categoryIds, ...serviceData } = data;
        return prisma.service.create({
            data: {
                ...serviceData,
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
    // Update service
    async update(id, data) {
        const { categoryIds, ...serviceData } = data;
        // If categoryIds are provided, update categories
        if (categoryIds !== undefined) {
            // Delete existing categories
            await prisma.serviceCategory.deleteMany({
                where: { serviceId: id },
            });
            // Create new categories
            if (categoryIds.length > 0) {
                await prisma.serviceCategory.createMany({
                    data: categoryIds.map((categoryId) => ({
                        serviceId: id,
                        categoryId,
                    })),
                });
            }
        }
        return prisma.service.update({
            where: { id },
            data: serviceData,
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
    // Delete service
    async delete(id) {
        return prisma.service.delete({
            where: { id },
        });
    },
    // Increment view count
    async incrementViews(id) {
        return prisma.service.update({
            where: { id },
            data: {
                totalViews: {
                    increment: 1,
                },
            },
        });
    },
    // Get service statistics
    async getStats(id) {
        const service = await prisma.service.findUnique({
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
        if (!service)
            return null;
        return {
            totalViews: service.totalViews,
            totalReviews: service._count.reviews,
            totalComments: service._count.comments,
            totalFavorites: service._count.favorites,
            totalQuickRatings: service._count.quickRatings,
            positiveReviews: service.positiveReviews,
            neutralReviews: service.neutralReviews,
            negativeReviews: service.negativeReviews,
        };
    },
};
