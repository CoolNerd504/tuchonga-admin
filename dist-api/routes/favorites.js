import express from 'express';
import { favoriteServicePrisma } from '../../src/services/favoriteServicePrisma';
import { verifyToken, verifyAdmin } from '../middleware/auth';
const router = express.Router();
// ============================================================================
// Protected Routes
// ============================================================================
// Get user's favorites
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { itemType, page, limit } = req.query;
        const result = await favoriteServicePrisma.getUserFavorites(userId, {
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
router.get('/check/:itemId', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const isFavorited = await favoriteServicePrisma.isFavorited(userId, req.params.itemId);
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
router.post('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { itemId, itemType } = req.body;
        if (!itemId || !itemType) {
            return res.status(400).json({
                success: false,
                error: 'itemId and itemType are required',
            });
        }
        const favorite = await favoriteServicePrisma.addFavorite({
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
router.post('/toggle', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { itemId, itemType } = req.body;
        if (!itemId || !itemType) {
            return res.status(400).json({
                success: false,
                error: 'itemId and itemType are required',
            });
        }
        const result = await favoriteServicePrisma.toggleFavorite({
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
router.delete('/:itemId', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        await favoriteServicePrisma.removeFavorite(userId, req.params.itemId);
        res.json({ success: true, message: 'Removed from favorites' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get favorite count
router.get('/count', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { itemType } = req.query;
        const count = await favoriteServicePrisma.getFavoriteCount(userId, itemType);
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
router.get('/top/products', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { limit } = req.query;
        const result = await favoriteServicePrisma.getMostFavoritedProducts(limit ? parseInt(limit) : 10);
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get most favorited services
router.get('/top/services', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { limit } = req.query;
        const result = await favoriteServicePrisma.getMostFavoritedServices(limit ? parseInt(limit) : 10);
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get favorite count for an item
router.get('/item/:itemId/count', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const count = await favoriteServicePrisma.getItemFavoriteCount(req.params.itemId);
        res.json({ success: true, data: { count } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
export default router;
