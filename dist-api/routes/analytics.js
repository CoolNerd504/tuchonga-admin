import express from 'express';
import { prisma } from '../../src/services/prismaService';
import { verifyToken, verifyAdmin } from '../middleware/auth';
const router = express.Router();
// All analytics routes require admin auth
router.use(verifyToken, verifyAdmin);
// Get dashboard overview
router.get('/overview', async (req, res) => {
    try {
        const [totalUsers, activeUsers, totalProducts, activeProducts, totalServices, activeServices, totalBusinesses, verifiedBusinesses, totalReviews, totalComments, totalFavorites,] = await Promise.all([
            prisma.user.count({ where: { role: 'user' } }),
            prisma.user.count({ where: { role: 'user', isActive: true } }),
            prisma.product.count(),
            prisma.product.count({ where: { isActive: true } }),
            prisma.service.count(),
            prisma.service.count({ where: { isActive: true } }),
            prisma.business.count(),
            prisma.business.count({ where: { isVerified: true } }),
            prisma.review.count(),
            prisma.comment.count({ where: { isDeleted: false } }),
            prisma.favorite.count(),
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
            prisma.user.count({ where: { role: 'user' } }),
            prisma.user.count({
                where: {
                    role: 'user',
                    createdAt: { gte: startDate },
                },
            }),
            prisma.user.count({
                where: {
                    role: 'user',
                    hasCompletedProfile: true,
                },
            }),
            prisma.user.groupBy({
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
            prisma.product.count(),
            prisma.product.count({ where: { isActive: true } }),
            prisma.product.findMany({
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
            prisma.product.findMany({
                where: { isActive: true },
                orderBy: { totalViews: 'desc' },
                take: 5,
                select: {
                    id: true,
                    productName: true,
                    totalViews: true,
                },
            }),
            prisma.product.findMany({
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
            prisma.service.count(),
            prisma.service.count({ where: { isActive: true } }),
            prisma.service.findMany({
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
            prisma.service.findMany({
                where: { isActive: true },
                orderBy: { totalViews: 'desc' },
                take: 5,
                select: {
                    id: true,
                    serviceName: true,
                    totalViews: true,
                },
            }),
            prisma.service.findMany({
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
// Get review analytics
router.get('/reviews', async (req, res) => {
    try {
        const [totalReviews, productReviews, serviceReviews, sentimentDistribution, recentReviews,] = await Promise.all([
            prisma.review.count(),
            prisma.review.count({ where: { productId: { not: null } } }),
            prisma.review.count({ where: { serviceId: { not: null } } }),
            prisma.review.groupBy({
                by: ['sentiment'],
                _count: true,
            }),
            prisma.review.findMany({
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
            prisma.comment.count({ where: { isDeleted: false } }),
            prisma.comment.count({ where: { itemType: 'PRODUCT', isDeleted: false } }),
            prisma.comment.count({ where: { itemType: 'SERVICE', isDeleted: false } }),
            prisma.comment.count({ where: { isReported: true, isDeleted: false } }),
            prisma.comment.groupBy({
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
        const users = await prisma.user.findMany({
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
            const users = await prisma.user.findMany({
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
            const reviews = await prisma.review.findMany({
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
            const comments = await prisma.comment.findMany({
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
export default router;
