"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const favoriteServicePrisma_1 = require("../../src/services/favoriteServicePrisma");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ============================================================================
// Protected Routes
// ============================================================================
// Get user's favorites
router.get('/', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { itemType, page, limit } = req.query;
        const result = await favoriteServicePrisma_1.favoriteServicePrisma.getUserFavorites(userId, {
            itemType: itemType,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
        res.json({
            success: true,
            data: result.favorites,
            meta: result.meta,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Check if item is favorited
router.get('/check/:itemId', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const isFavorited = await favoriteServicePrisma_1.favoriteServicePrisma.isFavorited(userId, req.params.itemId);
        res.json({
            success: true,
            data: { isFavorited },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Add to favorites
router.post('/', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { itemId, itemType } = req.body;
        if (!itemId || !itemType) {
            return res.status(400).json({
                success: false,
                error: 'itemId and itemType are required',
            });
        }
        const favorite = await favoriteServicePrisma_1.favoriteServicePrisma.addFavorite({
            userId,
            itemId,
            itemType,
        });
        res.status(201).json({
            success: true,
            message: 'Added to favorites',
            data: favorite,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Toggle favorite
router.post('/toggle', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { itemId, itemType } = req.body;
        if (!itemId || !itemType) {
            return res.status(400).json({
                success: false,
                error: 'itemId and itemType are required',
            });
        }
        const result = await favoriteServicePrisma_1.favoriteServicePrisma.toggleFavorite({
            userId,
            itemId,
            itemType,
        });
        res.json({
            success: true,
            message: result.action === 'added' ? 'Added to favorites' : 'Removed from favorites',
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Remove from favorites
router.delete('/:itemId', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        await favoriteServicePrisma_1.favoriteServicePrisma.removeFavorite(userId, req.params.itemId);
        res.json({ success: true, message: 'Removed from favorites' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get favorite count
router.get('/count', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { itemType } = req.query;
        const count = await favoriteServicePrisma_1.favoriteServicePrisma.getFavoriteCount(userId, itemType);
        res.json({
            success: true,
            data: { count },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================================================
// Admin Routes
// ============================================================================
// Get most favorited products
router.get('/top/products', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const { limit } = req.query;
        const result = await favoriteServicePrisma_1.favoriteServicePrisma.getMostFavoritedProducts(limit ? parseInt(limit) : 10);
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get most favorited services
router.get('/top/services', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const { limit } = req.query;
        const result = await favoriteServicePrisma_1.favoriteServicePrisma.getMostFavoritedServices(limit ? parseInt(limit) : 10);
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get favorite count for an item
router.get('/item/:itemId/count', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const count = await favoriteServicePrisma_1.favoriteServicePrisma.getItemFavoriteCount(req.params.itemId);
        res.json({ success: true, data: { count } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
