import express from 'express';
import { commentServicePrisma } from '../../src/services/commentServicePrisma';
import { verifyToken } from '../middleware/auth';
const router = express.Router();
// ============================================================================
// Public Routes
// ============================================================================
// Get comments for a product
router.get('/product/:productId', async (req, res) => {
    try {
        const { page, limit, sortBy, sortOrder, hasReplies, search } = req.query;
        const result = await commentServicePrisma.getProductComments(req.params.productId, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            sortBy: sortBy,
            sortOrder: sortOrder,
            hasReplies: hasReplies === 'true',
            search: search,
        });
        res.json({
            success: true,
            data: result.comments,
            meta: result.meta,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get comments for a service
router.get('/service/:serviceId', async (req, res) => {
    try {
        const { page, limit, sortBy, sortOrder, hasReplies, search } = req.query;
        const result = await commentServicePrisma.getServiceComments(req.params.serviceId, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            sortBy: sortBy,
            sortOrder: sortOrder,
            hasReplies: hasReplies === 'true',
            search: search,
        });
        res.json({
            success: true,
            data: result.comments,
            meta: result.meta,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get comment by ID
router.get('/:id', async (req, res) => {
    try {
        const comment = await commentServicePrisma.getCommentById(req.params.id);
        if (!comment) {
            return res.status(404).json({ success: false, error: 'Comment not found' });
        }
        res.json({ success: true, data: comment });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get replies for a comment
router.get('/:id/replies', async (req, res) => {
    try {
        const { page, limit, sortBy, sortOrder } = req.query;
        const result = await commentServicePrisma.getCommentReplies(req.params.id, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            sortBy: sortBy,
            sortOrder: sortOrder,
        });
        res.json({
            success: true,
            data: result.comments,
            meta: result.meta,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============================================================================
// Protected Routes
// ============================================================================
// Create comment
router.post('/', verifyToken, async (req, res) => {
    try {
        const { itemId, itemType, text, parentId } = req.body;
        const user = req.user;
        if (!itemId || !itemType || !text) {
            return res.status(400).json({
                success: false,
                error: 'itemId, itemType, and text are required',
            });
        }
        const comment = await commentServicePrisma.createComment({
            userId: user.userId,
            userName: user.fullName || user.displayName || user.email || 'Anonymous',
            userAvatar: user.profileImage,
            itemId,
            itemType,
            text,
            parentId,
        });
        res.status(201).json({
            success: true,
            message: 'Comment created successfully',
            data: comment,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Update comment
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'Text is required',
            });
        }
        const comment = await commentServicePrisma.updateComment(req.params.id, userId, { text });
        res.json({
            success: true,
            message: 'Comment updated successfully',
            data: comment,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Delete comment
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
        await commentServicePrisma.deleteComment(req.params.id, userId, isAdmin);
        res.json({ success: true, message: 'Comment deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// React to comment (agree/disagree)
router.post('/:id/react', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { reactionType } = req.body;
        if (!reactionType || !['AGREE', 'DISAGREE'].includes(reactionType)) {
            return res.status(400).json({
                success: false,
                error: 'Valid reactionType (AGREE or DISAGREE) is required',
            });
        }
        const result = await commentServicePrisma.reactToComment(req.params.id, userId, reactionType);
        res.json({
            success: true,
            message: `Reaction ${result.action}`,
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Remove reaction
router.delete('/:id/react', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        await commentServicePrisma.removeReaction(req.params.id, userId);
        res.json({ success: true, message: 'Reaction removed' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get user's reaction for a comment
router.get('/:id/reaction', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const reaction = await commentServicePrisma.getUserReaction(req.params.id, userId);
        res.json({
            success: true,
            data: {
                hasReacted: !!reaction,
                reaction,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Report comment
router.post('/:id/report', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { reason } = req.body;
        await commentServicePrisma.reportComment(req.params.id, userId, reason);
        res.json({ success: true, message: 'Comment reported successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
export default router;
