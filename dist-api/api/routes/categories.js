"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const categoryServicePrisma_1 = require("../../src/services/categoryServicePrisma");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ============================================================================
// Public Routes
// ============================================================================
// Get all categories
router.get('/', async (req, res) => {
    try {
        const { type, search, page, limit } = req.query;
        const result = await categoryServicePrisma_1.categoryServicePrisma.getAllCategories({
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
        const result = await categoryServicePrisma_1.categoryServicePrisma.getProductCategories();
        res.json({ success: true, data: result.categories });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get service categories
router.get('/services', async (req, res) => {
    try {
        const result = await categoryServicePrisma_1.categoryServicePrisma.getServiceCategories();
        res.json({ success: true, data: result.categories });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get category by ID
router.get('/:id', async (req, res) => {
    try {
        const category = await categoryServicePrisma_1.categoryServicePrisma.getCategoryById(req.params.id);
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
router.post('/', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const { name, description, type } = req.body;
        if (!name || !type) {
            return res.status(400).json({
                success: false,
                error: 'Name and type are required',
            });
        }
        const category = await categoryServicePrisma_1.categoryServicePrisma.createCategory({
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
router.put('/:id', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const category = await categoryServicePrisma_1.categoryServicePrisma.updateCategory(req.params.id, req.body);
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
router.delete('/:id', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        await categoryServicePrisma_1.categoryServicePrisma.deleteCategory(req.params.id);
        res.json({ success: true, message: 'Category deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get category stats
router.get('/stats/overview', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const stats = await categoryServicePrisma_1.categoryServicePrisma.getCategoryStats();
        res.json({ success: true, data: stats });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Bulk create categories
router.post('/bulk', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const { categories } = req.body;
        if (!Array.isArray(categories)) {
            return res.status(400).json({
                success: false,
                error: 'Categories array is required',
            });
        }
        const result = await categoryServicePrisma_1.categoryServicePrisma.bulkCreateCategories(categories);
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
exports.default = router;
