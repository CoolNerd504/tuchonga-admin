"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reviewServicePrisma_1 = require("../../src/services/reviewServicePrisma");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ============================================================================
// Public Routes
// ============================================================================
// Get all reviews (with filters)
router.get('/', async (req, res) => {
    try {
        const { userId, productId, serviceId, sentiment, page, limit, sortBy, sortOrder } = req.query;
        const result = await reviewServicePrisma_1.reviewServicePrisma.getAllReviews({
            userId: userId,
            productId: productId,
            serviceId: serviceId,
            sentiment: sentiment,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            sortBy: sortBy,
            sortOrder: sortOrder,
        });
        res.json({
            success: true,
            data: result.reviews,
            meta: result.meta,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get review by ID
router.get('/:id', async (req, res) => {
    try {
        const review = await reviewServicePrisma_1.reviewServicePrisma.getReviewById(req.params.id);
        if (!review) {
            return res.status(404).json({ success: false, error: 'Review not found' });
        }
        res.json({ success: true, data: review });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get reviews for a product
router.get('/product/:productId', async (req, res) => {
    try {
        const { page, limit, sortBy, sortOrder } = req.query;
        const result = await reviewServicePrisma_1.reviewServicePrisma.getProductReviews(req.params.productId, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            sortBy: sortBy,
            sortOrder: sortOrder,
        });
        res.json({
            success: true,
            data: result.reviews,
            meta: result.meta,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get reviews for a service
router.get('/service/:serviceId', async (req, res) => {
    try {
        const { page, limit, sortBy, sortOrder } = req.query;
        const result = await reviewServicePrisma_1.reviewServicePrisma.getServiceReviews(req.params.serviceId, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            sortBy: sortBy,
            sortOrder: sortOrder,
        });
        res.json({
            success: true,
            data: result.reviews,
            meta: result.meta,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get review stats for an item
router.get('/stats/:itemType/:itemId', async (req, res) => {
    try {
        const { itemType, itemId } = req.params;
        const stats = await reviewServicePrisma_1.reviewServicePrisma.getReviewStats(itemType === 'product' ? itemId : undefined, itemType === 'service' ? itemId : undefined);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================================================
// Protected Routes
// ============================================================================
// Create or update review
router.post('/', auth_1.verifyToken, async (req, res) => {
    try {
        const { productId, serviceId, sentiment, text } = req.body;
        const userId = req.user.userId;
        if (!productId && !serviceId) {
            return res.status(400).json({
                success: false,
                error: 'Either productId or serviceId is required',
            });
        }
        if (!sentiment) {
            return res.status(400).json({
                success: false,
                error: 'Sentiment is required',
            });
        }
        const review = await reviewServicePrisma_1.reviewServicePrisma.createOrUpdateReview({
            userId,
            productId,
            serviceId,
            sentiment,
            text,
        });
        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            data: review,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Update review
router.put('/:id', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { sentiment, text } = req.body;
        const review = await reviewServicePrisma_1.reviewServicePrisma.updateReview(req.params.id, userId, {
            sentiment,
            text,
        });
        res.json({
            success: true,
            message: 'Review updated successfully',
            data: review,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Delete review
router.delete('/:id', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
        await reviewServicePrisma_1.reviewServicePrisma.deleteReview(req.params.id, userId, isAdmin);
        res.json({ success: true, message: 'Review deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get user's reviews
router.get('/user/me', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { page, limit } = req.query;
        const result = await reviewServicePrisma_1.reviewServicePrisma.getUserReviews(userId, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
        res.json({
            success: true,
            data: result.reviews,
            meta: result.meta,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Check if user has reviewed an item
router.get('/check/:itemType/:itemId', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { itemType, itemId } = req.params;
        const review = await reviewServicePrisma_1.reviewServicePrisma.getUserReviewForItem(userId, itemType === 'product' ? itemId : undefined, itemType === 'service' ? itemId : undefined);
        res.json({
            success: true,
            data: {
                hasReviewed: !!review,
                review,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
