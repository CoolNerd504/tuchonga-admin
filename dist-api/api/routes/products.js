"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const productServicePrisma_1 = require("../../src/services/productServicePrisma");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ============================================================================
// Public Routes
// ============================================================================
// Get all products (with filters)
router.get('/', async (req, res) => {
    try {
        const { search, categories, businessId, isActive, page, limit, sortBy, sortOrder, } = req.query;
        const result = await productServicePrisma_1.productServicePrisma.getAllProducts({
            search: search,
            categories: categories ? categories.split(',') : undefined,
            businessId: businessId,
            isActive: isActive === 'false' ? false : true,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            sortBy: sortBy,
            sortOrder: sortOrder,
        });
        res.json({
            success: true,
            data: result.products,
            meta: result.meta,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const product = await productServicePrisma_1.productServicePrisma.getProductById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.json({ success: true, data: product });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Track product view
router.post('/:id/view', async (req, res) => {
    try {
        await productServicePrisma_1.productServicePrisma.incrementViews(req.params.id);
        res.json({ success: true, message: 'View tracked' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Search products
router.get('/search/:query', async (req, res) => {
    try {
        const { limit } = req.query;
        const products = await productServicePrisma_1.productServicePrisma.searchProducts(req.params.query, limit ? parseInt(limit) : 20);
        res.json({ success: true, data: products });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================================================
// Protected Routes (Business/Admin)
// ============================================================================
// Create product
router.post('/', auth_1.verifyToken, auth_1.verifyBusinessOrAdmin, async (req, res) => {
    try {
        const { productName, description, mainImage, additionalImages, businessId, productOwner, categoryIds, } = req.body;
        if (!productName) {
            return res.status(400).json({ success: false, error: 'Product name is required' });
        }
        const product = await productServicePrisma_1.productServicePrisma.createProduct({
            productName,
            description,
            mainImage,
            additionalImages,
            businessId,
            productOwner,
            categoryIds,
        });
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Update product
router.put('/:id', auth_1.verifyToken, auth_1.verifyBusinessOrAdmin, async (req, res) => {
    try {
        const product = await productServicePrisma_1.productServicePrisma.updateProduct(req.params.id, req.body);
        res.json({
            success: true,
            message: 'Product updated successfully',
            data: product,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Delete product (soft delete)
router.delete('/:id', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        await productServicePrisma_1.productServicePrisma.deleteProduct(req.params.id);
        res.json({ success: true, message: 'Product deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================================================
// Admin Routes
// ============================================================================
// Get product count
router.get('/stats/count', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const { businessId, isActive } = req.query;
        const count = await productServicePrisma_1.productServicePrisma.getProductCount({
            businessId: businessId,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        });
        res.json({ success: true, data: { count } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
