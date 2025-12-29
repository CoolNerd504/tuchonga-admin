"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const serviceServicePrisma_1 = require("../../src/services/serviceServicePrisma");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ============================================================================
// Public Routes
// ============================================================================
// Get all services (with filters)
router.get('/', async (req, res) => {
    try {
        const { search, categories, businessId, isActive, page, limit, sortBy, sortOrder, } = req.query;
        const result = await serviceServicePrisma_1.serviceServicePrisma.getAllServices({
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
            data: result.services,
            meta: result.meta,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get service by ID
router.get('/:id', async (req, res) => {
    try {
        const service = await serviceServicePrisma_1.serviceServicePrisma.getServiceById(req.params.id);
        if (!service) {
            return res.status(404).json({ success: false, error: 'Service not found' });
        }
        res.json({ success: true, data: service });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Track service view
router.post('/:id/view', async (req, res) => {
    try {
        await serviceServicePrisma_1.serviceServicePrisma.incrementViews(req.params.id);
        res.json({ success: true, message: 'View tracked' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Search services
router.get('/search/:query', async (req, res) => {
    try {
        const { limit } = req.query;
        const services = await serviceServicePrisma_1.serviceServicePrisma.searchServices(req.params.query, limit ? parseInt(limit) : 20);
        res.json({ success: true, data: services });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================================================
// Protected Routes (Business/Admin)
// ============================================================================
// Create service
router.post('/', auth_1.verifyToken, auth_1.verifyBusinessOrAdmin, async (req, res) => {
    try {
        const { serviceName, description, mainImage, additionalImages, businessId, serviceOwner, categoryIds, } = req.body;
        if (!serviceName) {
            return res.status(400).json({ success: false, error: 'Service name is required' });
        }
        const service = await serviceServicePrisma_1.serviceServicePrisma.createService({
            serviceName,
            description,
            mainImage,
            additionalImages,
            businessId,
            serviceOwner,
            categoryIds,
        });
        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            data: service,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Update service
router.put('/:id', auth_1.verifyToken, auth_1.verifyBusinessOrAdmin, async (req, res) => {
    try {
        const service = await serviceServicePrisma_1.serviceServicePrisma.updateService(req.params.id, req.body);
        res.json({
            success: true,
            message: 'Service updated successfully',
            data: service,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Delete service (soft delete)
router.delete('/:id', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        await serviceServicePrisma_1.serviceServicePrisma.deleteService(req.params.id);
        res.json({ success: true, message: 'Service deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================================================
// Admin Routes
// ============================================================================
// Get service count
router.get('/stats/count', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const { businessId, isActive } = req.query;
        const count = await serviceServicePrisma_1.serviceServicePrisma.getServiceCount({
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
