"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceServicePrisma = void 0;
const prismaService_1 = require("./prismaService");
exports.serviceServicePrisma = {
    // ============================================================================
    // CRUD Operations
    // ============================================================================
    async createService(data) {
        const { categoryIds, ...serviceData } = data;
        const service = await prismaService_1.prisma.service.create({
            data: {
                ...serviceData,
                additionalImages: serviceData.additionalImages || [],
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
        return this.formatService(service);
    },
    async getServiceById(id) {
        const service = await prismaService_1.prisma.service.findUnique({
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
        if (!service)
            return null;
        return this.formatService(service);
    },
    async getAllServices(filters = {}) {
        const { search, categories, businessId, isActive = true, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = filters;
        const where = {
            isActive,
        };
        if (businessId) {
            where.businessId = businessId;
        }
        if (search) {
            where.OR = [
                { serviceName: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { serviceOwner: { contains: search, mode: 'insensitive' } },
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
        const [services, total] = await Promise.all([
            prismaService_1.prisma.service.findMany({
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
            prismaService_1.prisma.service.count({ where }),
        ]);
        return {
            services: services.map(this.formatService),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
    async updateService(id, data) {
        const { categoryIds, ...updateData } = data;
        // If categories are being updated, delete existing and create new
        if (categoryIds !== undefined) {
            await prismaService_1.prisma.serviceCategory.deleteMany({
                where: { serviceId: id },
            });
            if (categoryIds.length > 0) {
                await prismaService_1.prisma.serviceCategory.createMany({
                    data: categoryIds.map((categoryId) => ({
                        serviceId: id,
                        categoryId,
                    })),
                });
            }
        }
        const service = await prismaService_1.prisma.service.update({
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
        return this.formatService(service);
    },
    async deleteService(id) {
        // Soft delete
        return prismaService_1.prisma.service.update({
            where: { id },
            data: { isActive: false },
        });
    },
    async hardDeleteService(id) {
        return prismaService_1.prisma.service.delete({
            where: { id },
        });
    },
    // ============================================================================
    // Analytics
    // ============================================================================
    async incrementViews(id) {
        return prismaService_1.prisma.service.update({
            where: { id },
            data: {
                totalViews: { increment: 1 },
            },
        });
    },
    async updateRatingStats(id) {
        const ratings = await prismaService_1.prisma.quickRating.groupBy({
            by: ['rating'],
            where: { serviceId: id },
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
        return prismaService_1.prisma.service.update({
            where: { id },
            data: {
                ...ratingCounts,
                quickRatingTotal: total,
                quickRatingAvg: avg,
            },
        });
    },
    async updateReviewStats(id) {
        const reviews = await prismaService_1.prisma.review.groupBy({
            by: ['sentiment'],
            where: { serviceId: id },
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
        return prismaService_1.prisma.service.update({
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
    async searchServices(query, limit = 20) {
        return prismaService_1.prisma.service.findMany({
            where: {
                isActive: true,
                OR: [
                    { serviceName: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { serviceOwner: { contains: query, mode: 'insensitive' } },
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
    // Counts
    // ============================================================================
    async getServiceCount(filters) {
        const where = {};
        if (filters?.businessId) {
            where.businessId = filters.businessId;
        }
        if (filters?.isActive !== undefined) {
            where.isActive = filters.isActive;
        }
        return prismaService_1.prisma.service.count({ where });
    },
    // ============================================================================
    // Helpers
    // ============================================================================
    formatService(service) {
        return {
            id: service.id,
            serviceName: service.serviceName,
            description: service.description,
            mainImage: service.mainImage,
            additionalImages: service.additionalImages,
            isActive: service.isActive,
            businessId: service.businessId,
            business: service.business,
            serviceOwner: service.serviceOwner,
            categories: service.categories?.map((sc) => sc.category) || [],
            totalViews: service.totalViews,
            totalReviews: service.totalReviews,
            positiveReviews: service.positiveReviews,
            neutralReviews: service.neutralReviews,
            negativeReviews: service.negativeReviews,
            quickRatingAvg: service.quickRatingAvg,
            quickRatingTotal: service.quickRatingTotal,
            quickRating1: service.quickRating1,
            quickRating2: service.quickRating2,
            quickRating3: service.quickRating3,
            quickRating4: service.quickRating4,
            quickRating5: service.quickRating5,
            createdAt: service.createdAt,
            updatedAt: service.updatedAt,
            lastUpdate: service.lastUpdate,
            _count: service._count,
        };
    },
};
