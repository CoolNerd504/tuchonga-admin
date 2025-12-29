"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mobileUserService_1 = require("../../src/services/mobileUserService");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ============================================================================
// Protected Routes (User)
// ============================================================================
// Get current user profile
router.get('/me', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await mobileUserService_1.mobileUserService.getUserById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, data: user });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Update current user profile
router.put('/me', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { fullName, displayName, profileImage, location, phoneNumber, email, gender } = req.body;
        const user = await mobileUserService_1.mobileUserService.updateUser(userId, {
            fullName,
            displayName,
            profileImage,
            location,
            phoneNumber,
            email,
            gender,
        });
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Complete profile
router.post('/me/complete-profile', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { fullName, displayName, profileImage, location, phoneNumber, gender } = req.body;
        if (!fullName) {
            return res.status(400).json({
                success: false,
                error: 'Full name is required',
            });
        }
        const user = await mobileUserService_1.mobileUserService.completeProfile(userId, {
            fullName,
            displayName: displayName || fullName,
            profileImage,
            location,
            phoneNumber,
            gender,
        });
        res.json({
            success: true,
            message: 'Profile completed successfully',
            data: user,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get current user analytics
router.get('/me/analytics', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const analytics = await mobileUserService_1.mobileUserService.getUserAnalytics(userId);
        res.json({ success: true, data: analytics });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================================================
// Admin Routes
// ============================================================================
// Get all users
router.get('/', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const { search, role, isActive, hasCompletedProfile, page, limit, sortBy, sortOrder, } = req.query;
        const result = await mobileUserService_1.mobileUserService.getAllUsers({
            search: search,
            role: role,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            hasCompletedProfile: hasCompletedProfile === 'true' ? true : hasCompletedProfile === 'false' ? false : undefined,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            sortBy: sortBy,
            sortOrder: sortOrder,
        });
        res.json({
            success: true,
            data: result.users,
            meta: result.meta,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get user by ID
router.get('/:id', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const user = await mobileUserService_1.mobileUserService.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, data: user });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Update user
router.put('/:id', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const user = await mobileUserService_1.mobileUserService.updateUser(req.params.id, req.body);
        res.json({
            success: true,
            message: 'User updated successfully',
            data: user,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Deactivate user
router.post('/:id/deactivate', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        await mobileUserService_1.mobileUserService.deactivateUser(req.params.id);
        res.json({ success: true, message: 'User deactivated successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Reactivate user
router.post('/:id/reactivate', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        await mobileUserService_1.mobileUserService.reactivateUser(req.params.id);
        res.json({ success: true, message: 'User reactivated successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Delete user (soft delete)
router.delete('/:id', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        await mobileUserService_1.mobileUserService.deleteUser(req.params.id);
        res.json({ success: true, message: 'User deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get user count
router.get('/stats/count', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const { role, isActive } = req.query;
        const count = await mobileUserService_1.mobileUserService.getUserCount({
            role: role,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        });
        res.json({ success: true, data: { count } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get user analytics by ID
router.get('/:id/analytics', auth_1.verifyToken, auth_1.verifyAdmin, async (req, res) => {
    try {
        const analytics = await mobileUserService_1.mobileUserService.getUserAnalytics(req.params.id);
        res.json({ success: true, data: analytics });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
