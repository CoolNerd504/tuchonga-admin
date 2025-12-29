"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessServicePrisma = void 0;
const prismaService_1 = require("./prismaService");
exports.businessServicePrisma = {
    // ============================================================================
    // CRUD Operations
    // ============================================================================
    async createBusiness(data) {
        // Check if email already exists
        if (data.businessEmail) {
            const existing = await prismaService_1.prisma.business.findUnique({
                where: { businessEmail: data.businessEmail },
            });
            if (existing) {
                throw new Error('Business with this email already exists');
            }
        }
        return prismaService_1.prisma.business.create({
            data,
            include: {
                _count: {
                    select: {
                        products: true,
                        services: true,
                    },
                },
            },
        });
    },
    async getBusinessById(id) {
        return prismaService_1.prisma.business.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        products: true,
                        services: true,
                    },
                },
            },
        });
    },
    async getBusinessByEmail(email) {
        return prismaService_1.prisma.business.findUnique({
            where: { businessEmail: email },
            include: {
                _count: {
                    select: {
                        products: true,
                        services: true,
                    },
                },
            },
        });
    },
    async getAllBusinesses(filters = {}) {
        const { search, isVerified, status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = filters;
        const where = {};
        if (isVerified !== undefined)
            where.isVerified = isVerified;
        if (status !== undefined)
            where.status = status;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { businessEmail: { contains: search, mode: 'insensitive' } },
                { location: { contains: search, mode: 'insensitive' } },
                { pocFirstname: { contains: search, mode: 'insensitive' } },
                { pocLastname: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [businesses, total] = await Promise.all([
            prismaService_1.prisma.business.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            products: true,
                            services: true,
                        },
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prismaService_1.prisma.business.count({ where }),
        ]);
        return {
            businesses,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
    async updateBusiness(id, data) {
        // Check if new email conflicts with existing
        if (data.businessEmail) {
            const existing = await prismaService_1.prisma.business.findFirst({
                where: {
                    businessEmail: data.businessEmail,
                    NOT: { id },
                },
            });
            if (existing) {
                throw new Error('Business with this email already exists');
            }
        }
        return prismaService_1.prisma.business.update({
            where: { id },
            data,
            include: {
                _count: {
                    select: {
                        products: true,
                        services: true,
                    },
                },
            },
        });
    },
    async deleteBusiness(id) {
        // Check if business has products or services
        const business = await prismaService_1.prisma.business.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        products: true,
                        services: true,
                    },
                },
            },
        });
        if (!business) {
            throw new Error('Business not found');
        }
        if (business._count.products > 0 || business._count.services > 0) {
            // Soft delete by setting status to false
            return prismaService_1.prisma.business.update({
                where: { id },
                data: { status: false },
            });
        }
        // Hard delete if no products/services
        await prismaService_1.prisma.business.delete({
            where: { id },
        });
        return { success: true };
    },
    // ============================================================================
    // Verification
    // ============================================================================
    async verifyBusiness(id) {
        return prismaService_1.prisma.business.update({
            where: { id },
            data: { isVerified: true },
        });
    },
    async unverifyBusiness(id) {
        return prismaService_1.prisma.business.update({
            where: { id },
            data: { isVerified: false },
        });
    },
    // ============================================================================
    // Products & Services
    // ============================================================================
    async getBusinessProducts(businessId, filters) {
        const { page = 1, limit = 20 } = filters || {};
        const [products, total] = await Promise.all([
            prismaService_1.prisma.product.findMany({
                where: { businessId, isActive: true },
                include: {
                    categories: {
                        include: {
                            category: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prismaService_1.prisma.product.count({ where: { businessId, isActive: true } }),
        ]);
        return {
            products,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
    async getBusinessServices(businessId, filters) {
        const { page = 1, limit = 20 } = filters || {};
        const [services, total] = await Promise.all([
            prismaService_1.prisma.service.findMany({
                where: { businessId, isActive: true },
                include: {
                    categories: {
                        include: {
                            category: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prismaService_1.prisma.service.count({ where: { businessId, isActive: true } }),
        ]);
        return {
            services,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
    // ============================================================================
    // Statistics
    // ============================================================================
    async getBusinessStats() {
        const [total, verified, active] = await Promise.all([
            prismaService_1.prisma.business.count(),
            prismaService_1.prisma.business.count({ where: { isVerified: true } }),
            prismaService_1.prisma.business.count({ where: { status: true } }),
        ]);
        return {
            total,
            verified,
            unverified: total - verified,
            active,
            inactive: total - active,
        };
    },
    async getBusinessAnalytics(businessId) {
        const business = await prismaService_1.prisma.business.findUnique({
            where: { id: businessId },
            include: {
                products: {
                    select: {
                        totalViews: true,
                        totalReviews: true,
                        quickRatingAvg: true,
                    },
                },
                services: {
                    select: {
                        totalViews: true,
                        totalReviews: true,
                        quickRatingAvg: true,
                    },
                },
            },
        });
        if (!business) {
            throw new Error('Business not found');
        }
        const productStats = {
            count: business.products.length,
            totalViews: business.products.reduce((sum, p) => sum + p.totalViews, 0),
            totalReviews: business.products.reduce((sum, p) => sum + p.totalReviews, 0),
            avgRating: business.products.length > 0
                ? business.products.reduce((sum, p) => sum + (p.quickRatingAvg || 0), 0) /
                    business.products.length
                : 0,
        };
        const serviceStats = {
            count: business.services.length,
            totalViews: business.services.reduce((sum, s) => sum + s.totalViews, 0),
            totalReviews: business.services.reduce((sum, s) => sum + s.totalReviews, 0),
            avgRating: business.services.length > 0
                ? business.services.reduce((sum, s) => sum + (s.quickRatingAvg || 0), 0) /
                    business.services.length
                : 0,
        };
        return {
            business: {
                id: business.id,
                name: business.name,
                isVerified: business.isVerified,
                status: business.status,
            },
            products: productStats,
            services: serviceStats,
            totals: {
                items: productStats.count + serviceStats.count,
                views: productStats.totalViews + serviceStats.totalViews,
                reviews: productStats.totalReviews + serviceStats.totalReviews,
            },
        };
    },
};
