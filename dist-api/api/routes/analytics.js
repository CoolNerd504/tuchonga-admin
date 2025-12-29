"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prismaService_1 = require("../../src/services/prismaService");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const buildRecentMonths = (monthsBack) => {
    const now = new Date();
    const labels = [];
    for (let i = monthsBack - 1; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(d.toLocaleString('default', { month: 'short' }));
    }
    return labels;
};
const aggregateMonthlyAdds = (items, labels) => {
    const counts = labels.map(() => 0);
    items.forEach((item) => {
        const monthLabel = item.createdAt.toLocaleString('default', { month: 'short' });
        const idx = labels.indexOf(monthLabel);
        if (idx !== -1) {
            counts[idx] += 1;
        }
    });
    return counts;
};
// All analytics routes require admin auth
router.use(auth_1.verifyToken, auth_1.verifyAdmin);
// Get dashboard overview
router.get('/overview', async (req, res) => {
    try {
        const [totalUsers, activeUsers, totalProducts, activeProducts, totalServices, activeServices, totalBusinesses, verifiedBusinesses, totalReviews, totalComments, totalFavorites,] = await Promise.all([
            prismaService_1.prisma.user.count({ where: { role: 'user' } }),
            prismaService_1.prisma.user.count({ where: { role: 'user', isActive: true } }),
            prismaService_1.prisma.product.count(),
            prismaService_1.prisma.product.count({ where: { isActive: true } }),
            prismaService_1.prisma.service.count(),
            prismaService_1.prisma.service.count({ where: { isActive: true } }),
            prismaService_1.prisma.business.count(),
            prismaService_1.prisma.business.count({ where: { isVerified: true } }),
            prismaService_1.prisma.review.count(),
            prismaService_1.prisma.comment.count({ where: { isDeleted: false } }),
            prismaService_1.prisma.favorite.count(),
        ]);
        res.json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    active: activeUsers,
                },
                products: {
                    total: totalProducts,
                    active: activeProducts,
                },
                services: {
                    total: totalServices,
                    active: activeServices,
                },
                businesses: {
                    total: totalBusinesses,
                    verified: verifiedBusinesses,
                },
                engagement: {
                    reviews: totalReviews,
                    comments: totalComments,
                    favorites: totalFavorites,
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get user analytics
router.get('/users', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        // Calculate date range
        const days = parseInt(period) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const [totalUsers, newUsers, completedProfiles, usersByRole,] = await Promise.all([
            prismaService_1.prisma.user.count({ where: { role: 'user' } }),
            prismaService_1.prisma.user.count({
                where: {
                    role: 'user',
                    createdAt: { gte: startDate },
                },
            }),
            prismaService_1.prisma.user.count({
                where: {
                    role: 'user',
                    hasCompletedProfile: true,
                },
            }),
            prismaService_1.prisma.user.groupBy({
                by: ['role'],
                _count: true,
            }),
        ]);
        res.json({
            success: true,
            data: {
                total: totalUsers,
                newUsers,
                completedProfiles,
                byRole: usersByRole.map((r) => ({
                    role: r.role,
                    count: r._count,
                })),
                period: `${days} days`,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get product analytics
router.get('/products', async (req, res) => {
    try {
        const [totalProducts, activeProducts, topRated, mostViewed, mostReviewed,] = await Promise.all([
            prismaService_1.prisma.product.count(),
            prismaService_1.prisma.product.count({ where: { isActive: true } }),
            prismaService_1.prisma.product.findMany({
                where: { isActive: true, quickRatingAvg: { not: null } },
                orderBy: { quickRatingAvg: 'desc' },
                take: 5,
                select: {
                    id: true,
                    productName: true,
                    quickRatingAvg: true,
                    quickRatingTotal: true,
                },
            }),
            prismaService_1.prisma.product.findMany({
                where: { isActive: true },
                orderBy: { totalViews: 'desc' },
                take: 5,
                select: {
                    id: true,
                    productName: true,
                    totalViews: true,
                },
            }),
            prismaService_1.prisma.product.findMany({
                where: { isActive: true },
                orderBy: { totalReviews: 'desc' },
                take: 5,
                select: {
                    id: true,
                    productName: true,
                    totalReviews: true,
                },
            }),
        ]);
        res.json({
            success: true,
            data: {
                total: totalProducts,
                active: activeProducts,
                inactive: totalProducts - activeProducts,
                topRated,
                mostViewed,
                mostReviewed,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get service analytics
router.get('/services', async (req, res) => {
    try {
        const [totalServices, activeServices, topRated, mostViewed, mostReviewed,] = await Promise.all([
            prismaService_1.prisma.service.count(),
            prismaService_1.prisma.service.count({ where: { isActive: true } }),
            prismaService_1.prisma.service.findMany({
                where: { isActive: true, quickRatingAvg: { not: null } },
                orderBy: { quickRatingAvg: 'desc' },
                take: 5,
                select: {
                    id: true,
                    serviceName: true,
                    quickRatingAvg: true,
                    quickRatingTotal: true,
                },
            }),
            prismaService_1.prisma.service.findMany({
                where: { isActive: true },
                orderBy: { totalViews: 'desc' },
                take: 5,
                select: {
                    id: true,
                    serviceName: true,
                    totalViews: true,
                },
            }),
            prismaService_1.prisma.service.findMany({
                where: { isActive: true },
                orderBy: { totalReviews: 'desc' },
                take: 5,
                select: {
                    id: true,
                    serviceName: true,
                    totalReviews: true,
                },
            }),
        ]);
        res.json({
            success: true,
            data: {
                total: totalServices,
                active: activeServices,
                inactive: totalServices - activeServices,
                topRated,
                mostViewed,
                mostReviewed,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Product trends and engagement (no new data required)
router.get('/products/trends', async (req, res) => {
    try {
        const products = await prismaService_1.prisma.product.findMany({
            select: {
                id: true,
                productName: true,
                createdAt: true,
                totalViews: true,
                isActive: true,
            },
        });
        const labels = buildRecentMonths(6);
        const monthlyAdds = aggregateMonthlyAdds(products, labels);
        const totalViews = products.reduce((sum, p) => sum + (p.totalViews || 0), 0);
        const zeroViews = products.filter((p) => !p.totalViews || p.totalViews === 0).length;
        const avgViews = products.length ? Math.round(totalViews / products.length) : 0;
        const topViewed = [...products]
            .sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0))
            .slice(0, 5)
            .map((p) => ({
            id: p.id,
            name: p.productName,
            views: p.totalViews || 0,
        }));
        res.json({
            success: true,
            data: {
                summary: {
                    total: products.length,
                    active: products.filter((p) => p.isActive).length,
                    inactive: products.filter((p) => !p.isActive).length,
                    totalViews,
                    avgViews,
                    zeroViews,
                },
                monthlyAdds: {
                    labels,
                    values: monthlyAdds,
                },
                topViewed,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Service trends and engagement (no new data required)
router.get('/services/trends', async (req, res) => {
    try {
        const services = await prismaService_1.prisma.service.findMany({
            select: {
                id: true,
                serviceName: true,
                createdAt: true,
                totalViews: true,
                isActive: true,
            },
        });
        const labels = buildRecentMonths(6);
        const monthlyAdds = aggregateMonthlyAdds(services, labels);
        const totalViews = services.reduce((sum, s) => sum + (s.totalViews || 0), 0);
        const zeroViews = services.filter((s) => !s.totalViews || s.totalViews === 0).length;
        const avgViews = services.length ? Math.round(totalViews / services.length) : 0;
        const topViewed = [...services]
            .sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0))
            .slice(0, 5)
            .map((s) => ({
            id: s.id,
            name: s.serviceName,
            views: s.totalViews || 0,
        }));
        res.json({
            success: true,
            data: {
                summary: {
                    total: services.length,
                    active: services.filter((s) => s.isActive).length,
                    inactive: services.filter((s) => !s.isActive).length,
                    totalViews,
                    avgViews,
                    zeroViews,
                },
                monthlyAdds: {
                    labels,
                    values: monthlyAdds,
                },
                topViewed,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get review analytics
router.get('/reviews', async (req, res) => {
    try {
        const [totalReviews, productReviews, serviceReviews, sentimentDistribution, recentReviews,] = await Promise.all([
            prismaService_1.prisma.review.count(),
            prismaService_1.prisma.review.count({ where: { productId: { not: null } } }),
            prismaService_1.prisma.review.count({ where: { serviceId: { not: null } } }),
            prismaService_1.prisma.review.groupBy({
                by: ['sentiment'],
                _count: true,
            }),
            prismaService_1.prisma.review.findMany({
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            displayName: true,
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
            }),
        ]);
        res.json({
            success: true,
            data: {
                total: totalReviews,
                byType: {
                    products: productReviews,
                    services: serviceReviews,
                },
                sentimentDistribution: sentimentDistribution.map((s) => ({
                    sentiment: s.sentiment,
                    count: s._count,
                })),
                recentReviews,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get comment analytics
router.get('/comments', async (req, res) => {
    try {
        const [totalComments, productComments, serviceComments, reportedComments, topCommenters,] = await Promise.all([
            prismaService_1.prisma.comment.count({ where: { isDeleted: false } }),
            prismaService_1.prisma.comment.count({ where: { itemType: 'PRODUCT', isDeleted: false } }),
            prismaService_1.prisma.comment.count({ where: { itemType: 'SERVICE', isDeleted: false } }),
            prismaService_1.prisma.comment.count({ where: { isReported: true, isDeleted: false } }),
            prismaService_1.prisma.comment.groupBy({
                by: ['userId'],
                where: { isDeleted: false },
                _count: true,
                orderBy: {
                    _count: {
                        userId: 'desc',
                    },
                },
                take: 5,
            }),
        ]);
        // Get user details for top commenters
        const userIds = topCommenters.map((c) => c.userId);
        const users = await prismaService_1.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                fullName: true,
                displayName: true,
            },
        });
        const topCommentersWithUsers = topCommenters.map((c) => ({
            user: users.find((u) => u.id === c.userId),
            commentCount: c._count,
        }));
        res.json({
            success: true,
            data: {
                total: totalComments,
                byType: {
                    products: productComments,
                    services: serviceComments,
                },
                reported: reportedComments,
                topCommenters: topCommentersWithUsers,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get trends (for charts)
router.get('/trends', async (req, res) => {
    try {
        const { period = '30d', metric = 'users' } = req.query;
        const days = parseInt(period) || 30;
        // Generate date labels
        const dates = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            dates.push(date);
        }
        // Get data based on metric
        let data = [];
        if (metric === 'users') {
            const users = await prismaService_1.prisma.user.findMany({
                where: {
                    role: 'user',
                    createdAt: { gte: dates[0] },
                },
                select: { createdAt: true },
            });
            data = dates.map((date) => {
                const nextDate = new Date(date);
                nextDate.setDate(nextDate.getDate() + 1);
                const count = users.filter((u) => u.createdAt >= date && u.createdAt < nextDate).length;
                return { date, count };
            });
        }
        else if (metric === 'reviews') {
            const reviews = await prismaService_1.prisma.review.findMany({
                where: { createdAt: { gte: dates[0] } },
                select: { createdAt: true },
            });
            data = dates.map((date) => {
                const nextDate = new Date(date);
                nextDate.setDate(nextDate.getDate() + 1);
                const count = reviews.filter((r) => r.createdAt >= date && r.createdAt < nextDate).length;
                return { date, count };
            });
        }
        else if (metric === 'comments') {
            const comments = await prismaService_1.prisma.comment.findMany({
                where: { createdAt: { gte: dates[0] }, isDeleted: false },
                select: { createdAt: true },
            });
            data = dates.map((date) => {
                const nextDate = new Date(date);
                nextDate.setDate(nextDate.getDate() + 1);
                const count = comments.filter((c) => c.createdAt >= date && c.createdAt < nextDate).length;
                return { date, count };
            });
        }
        res.json({
            success: true,
            data: {
                metric,
                period: `${days} days`,
                labels: data.map((d) => d.date.toISOString().split('T')[0]),
                values: data.map((d) => d.count),
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
