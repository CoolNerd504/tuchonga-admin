import express from 'express';
import { categoryServicePrisma } from '../src/services/categoryServicePrisma';
import { verifyToken, verifyAdmin } from '../middleware/auth';
const router = express.Router();
// ============================================================================
// Public Routes
// ============================================================================
// Get all categories
router.get('/', async (req, res) => {
    try {
        const { type, search, page, limit } = req.query;
        const result = await categoryServicePrisma.getAllCategories({
            type: type,
            search: search,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 100,
        });
        res.json({
            success: true,
            data: result.categories,
            meta: result.meta,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get product categories
router.get('/products', async (req, res) => {
    try {
        const result = await categoryServicePrisma.getProductCategories();
        res.json({ success: true, data: result.categories });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get service categories
router.get('/services', async (req, res) => {
    try {
        const result = await categoryServicePrisma.getServiceCategories();
        res.json({ success: true, data: result.categories });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get category by ID
router.get('/:id', async (req, res) => {
    try {
        const category = await categoryServicePrisma.getCategoryById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
        res.json({ success: true, data: category });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================================================
// Admin Routes
// ============================================================================
// Create category
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { name, description, type } = req.body;
        if (!name || !type) {
            return res.status(400).json({
                success: false,
                error: 'Name and type are required',
            });
        }
        const category = await categoryServicePrisma.createCategory({
            name,
            description,
            type,
        });
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Update category
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const category = await categoryServicePrisma.updateCategory(req.params.id, req.body);
        res.json({
            success: true,
            message: 'Category updated successfully',
            data: category,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Delete category
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await categoryServicePrisma.deleteCategory(req.params.id);
        res.json({ success: true, message: 'Category deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get category stats
router.get('/stats/overview', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const stats = await categoryServicePrisma.getCategoryStats();
        res.json({ success: true, data: stats });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Bulk create categories
router.post('/bulk', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { categories } = req.body;
        if (!Array.isArray(categories)) {
            return res.status(400).json({
                success: false,
                error: 'Categories array is required',
            });
        }
        const result = await categoryServicePrisma.bulkCreateCategories(categories);
        res.status(201).json({
            success: true,
            message: `Created ${result.created.length} categories`,
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
export default router;
