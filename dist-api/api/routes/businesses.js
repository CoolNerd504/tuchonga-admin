"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const businessServicePrisma_1 = require("../../src/services/businessServicePrisma");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ============================================================================
// Public Routes
// ============================================================================
// Get all businesses
router.get('/', async (req, res) => {
    try {
        const { search, isVerified, status, page, limit, sortBy, sortOrder } = req.query;
        const result = await businessServicePrisma_1.businessServicePrisma.getAllBusinesses({
            search: search,
            isVerified: isVerified === 'true' ? true : isVerified === 'false' ? false : undefined,
            status: status === 'true' ? true : status === 'false' ? false : undefined,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            sortBy: sortBy,
            sortOrder: sortOrder,
        });
        res.json({
            success: true,
            data: result.businesses,
            meta: result.meta,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get business by ID
router.get('/:id', async (req, res) => {
    try {
        const business = await businessServicePrisma_1.businessServicePrisma.getBusinessById(req.params.id);
        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }
        res.json({ success: true, data: business });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get business products
router.get('/:id/products', async (req, res) => {
    try {
        const { page, limit } = req.query;
        const result = await businessServicePrisma_1.businessServicePrisma.getBusinessProducts(req.params.id, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
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
// Get business services
router.get('/:id/services', async (req, res) => {
    try {
        const { page, limit } = req.query;
        const result = await businessServicePrisma_1.businessServicePrisma.getBusinessServices(req.params.id, {
            page: page ? parseInt(limit) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
        res.json({
            success: true,
            data: result.services,
            meta: result.meta,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================================================
// Admin Routes
// ============================================================================
// Create business
router.post('/', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const { name, businessEmail, businessPhone, location, logo, pocFirstname, pocLastname, pocPhone, } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Business name is required',
            });
        }
        const business = await businessServicePrisma_1.businessServicePrisma.createBusiness({
            name,
            businessEmail,
            businessPhone,
            location,
            logo,
            pocFirstname,
            pocLastname,
            pocPhone,
        });
        res.status(201).json({
            success: true,
            message: 'Business created successfully',
            data: business,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Update business
router.put('/:id', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const business = await businessServicePrisma_1.businessServicePrisma.updateBusiness(req.params.id, req.body);
        res.json({
            success: true,
            message: 'Business updated successfully',
            data: business,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Delete business
router.delete('/:id', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        await businessServicePrisma_1.businessServicePrisma.deleteBusiness(req.params.id);
        res.json({ success: true, message: 'Business deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Verify business
router.post('/:id/verify', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const business = await businessServicePrisma_1.businessServicePrisma.verifyBusiness(req.params.id);
        res.json({
            success: true,
            message: 'Business verified successfully',
            data: business,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Unverify business
router.post('/:id/unverify', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const business = await businessServicePrisma_1.businessServicePrisma.unverifyBusiness(req.params.id);
        res.json({
            success: true,
            message: 'Business verification removed',
            data: business,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get business stats
router.get('/stats/overview', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const stats = await businessServicePrisma_1.businessServicePrisma.getBusinessStats();
        res.json({ success: true, data: stats });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get business analytics
router.get('/:id/analytics', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const analytics = await businessServicePrisma_1.businessServicePrisma.getBusinessAnalytics(req.params.id);
        res.json({ success: true, data: analytics });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
