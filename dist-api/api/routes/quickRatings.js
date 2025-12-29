"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const quickRatingServicePrisma_1 = require("../../src/services/quickRatingServicePrisma");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ============================================================================
// Public Routes
// ============================================================================
// Get rating stats for a product
router.get('/product/:productId', async (req, res) => {
    try {
        const stats = await quickRatingServicePrisma_1.quickRatingServicePrisma.getProductRatingStats(req.params.productId);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get rating stats for a service
router.get('/service/:serviceId', async (req, res) => {
    try {
        const stats = await quickRatingServicePrisma_1.quickRatingServicePrisma.getServiceRatingStats(req.params.serviceId);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================================================
// Protected Routes
// ============================================================================
// Submit or update quick rating
router.post('/', auth_1.verifyToken, async (req, res) => {
    try {
        const { itemId, itemType, rating } = req.body;
        const userId = req.user.userId;
        if (!itemId || !itemType || rating === undefined) {
            return res.status(400).json({
                success: false,
                error: 'itemId, itemType, and rating are required',
            });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                error: 'Rating must be between 1 and 5',
            });
        }
        const result = await quickRatingServicePrisma_1.quickRatingServicePrisma.createOrUpdateRating({
            userId,
            itemId,
            itemType,
            rating,
        });
        res.status(201).json({
            success: true,
            message: 'Rating submitted successfully',
            data: result,
        });
    }
    catch (error) {
        // Handle 24-hour limit error
        if (error.message.includes('once every')) {
            return res.status(429).json({
                success: false,
                error: error.message,
                code: 'RATE_LIMIT_EXCEEDED',
            });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get user's rating for an item
router.get('/user/:itemId', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const rating = await quickRatingServicePrisma_1.quickRatingServicePrisma.getUserRatingForItem(userId, req.params.itemId);
        res.json({
            success: true,
            data: {
                hasRated: !!rating,
                rating,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get user's all ratings
router.get('/user/me/all', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { itemType, page, limit } = req.query;
        const result = await quickRatingServicePrisma_1.quickRatingServicePrisma.getUserRatings(userId, {
            itemType: itemType,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
        res.json({
            success: true,
            data: result.ratings,
            meta: result.meta,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Delete rating
router.delete('/:id', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
        await quickRatingServicePrisma_1.quickRatingServicePrisma.deleteRating(req.params.id, userId, isAdmin);
        res.json({ success: true, message: 'Rating deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================================================
// Admin Routes
// ============================================================================
// Get all ratings (admin)
router.get('/', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const { itemId, itemType, userId, page, limit } = req.query;
        const result = await quickRatingServicePrisma_1.quickRatingServicePrisma.getAllRatings({
            itemId: itemId,
            itemType: itemType,
            userId: userId,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
        res.json({
            success: true,
            data: result.ratings,
            meta: result.meta,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
