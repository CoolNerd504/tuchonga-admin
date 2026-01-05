import express from 'express';
import { commentServicePrisma } from '../../src/services/commentServicePrisma.js';
import { verifyToken, verifyAdmin, optionalAuth } from '../middleware/auth';

const router = express.Router();

// ============================================================================
// Public Routes
// ============================================================================

// Get comments for a product
router.get('/product/:productId', optionalAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { page, limit, sortBy, sortOrder, hasReplies, search, includeReplies } = req.query;

    const result = await commentServicePrisma.getProductComments(req.params.productId, {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
      hasReplies: hasReplies === 'true',
      search: search as string,
      includeReplies: includeReplies === 'true',
    });

    // Add user reactions if authenticated
    let commentsWithReactions = result.comments;
    if (user && user.userId) {
      const commentIds = result.comments.map((c: any) => c.id);
      const userReactions = await commentServicePrisma.getUserReactionsForComments(
        user.userId,
        commentIds
      );

      const reactionMap = new Map(
        userReactions.map((r: any) => [r.commentId, r])
      );

      commentsWithReactions = result.comments.map((comment: any) => {
        const userReaction = reactionMap.get(comment.id);
        const commentWithReaction: any = {
          ...comment,
          userReaction: userReaction ? {
            hasReacted: true,
            reactionType: userReaction.reactionType,
          } : {
            hasReacted: false,
            reactionType: null,
          },
          // Include nested replies if requested
          replies: comment.replies || [],
        };
        return commentWithReaction;
      });
    } else {
      commentsWithReactions = result.comments.map((comment: any) => ({
        ...comment,
        userReaction: {
          hasReacted: false,
          reactionType: null,
        },
        replies: comment.replies || [],
      }));
    }

    res.json({
      success: true,
      data: commentsWithReactions,
      meta: result.meta,
    });
  } catch (error: any) {
    console.error('Get product comments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get comments for a service
router.get('/service/:serviceId', optionalAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { page, limit, sortBy, sortOrder, hasReplies, search, includeReplies } = req.query;

    const result = await commentServicePrisma.getServiceComments(req.params.serviceId, {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
      hasReplies: hasReplies === 'true',
      search: search as string,
      includeReplies: includeReplies === 'true',
    });

    // Add user reactions if authenticated
    let commentsWithReactions = result.comments;
    if (user && user.userId) {
      const commentIds = result.comments.map((c: any) => c.id);
      const userReactions = await commentServicePrisma.getUserReactionsForComments(
        user.userId,
        commentIds
      );

      const reactionMap = new Map(
        userReactions.map((r: any) => [r.commentId, r])
      );

      commentsWithReactions = result.comments.map((comment: any) => {
        const userReaction = reactionMap.get(comment.id);
        const commentWithReaction: any = {
          ...comment,
          userReaction: userReaction ? {
            hasReacted: true,
            reactionType: userReaction.reactionType,
          } : {
            hasReacted: false,
            reactionType: null,
          },
          replies: comment.replies || [],
        };
        return commentWithReaction;
      });
    } else {
      commentsWithReactions = result.comments.map((comment: any) => ({
        ...comment,
        userReaction: {
          hasReacted: false,
          reactionType: null,
        },
        replies: comment.replies || [],
      }));
    }

    res.json({
      success: true,
      data: commentsWithReactions,
      meta: result.meta,
    });
  } catch (error: any) {
    console.error('Get service comments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get comment by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const comment = await commentServicePrisma.getCommentById(req.params.id);

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    // Add user reaction if authenticated
    let commentWithReaction: any = comment;
    if (user && user.userId) {
      const userReaction = await commentServicePrisma.getUserReaction(req.params.id, user.userId);
      commentWithReaction = {
        ...comment,
        userReaction: userReaction ? {
          hasReacted: true,
          reactionType: userReaction.reactionType,
        } : {
          hasReacted: false,
          reactionType: null,
        },
      };
    } else {
      commentWithReaction = {
        ...comment,
        userReaction: {
          hasReacted: false,
          reactionType: null,
        },
      };
    }

    res.json({ success: true, data: commentWithReaction });
  } catch (error: any) {
    console.error('Get comment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get replies for a comment (nested thread)
router.get('/:id/replies', optionalAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { page, limit, sortBy, sortOrder } = req.query;

    const result = await commentServicePrisma.getCommentReplies(req.params.id, {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });

    // Add user reactions if authenticated
    let repliesWithReactions = result.comments;
    if (user && user.userId) {
      const replyIds = result.comments.map((c: any) => c.id);
      const userReactions = await commentServicePrisma.getUserReactionsForComments(
        user.userId,
        replyIds
      );

      const reactionMap = new Map(
        userReactions.map((r: any) => [r.commentId, r])
      );

      repliesWithReactions = result.comments.map((reply: any) => {
        const userReaction = reactionMap.get(reply.id);
        const replyWithReaction: any = {
          ...reply,
          userReaction: userReaction ? {
            hasReacted: true,
            reactionType: userReaction.reactionType,
          } : {
            hasReacted: false,
            reactionType: null,
          },
          // Include nested replies (replies to replies)
          replies: reply.replies || [],
        };
        return replyWithReaction;
      });
    } else {
      repliesWithReactions = result.comments.map((reply: any) => ({
        ...reply,
        userReaction: {
          hasReacted: false,
          reactionType: null,
        },
        replies: reply.replies || [],
      }));
    }

    res.json({
      success: true,
      data: repliesWithReactions,
      meta: result.meta,
    });
  } catch (error: any) {
    console.error('Get comment replies error:', error);
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
    const user = (req as any).user;

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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update comment
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete comment
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const isAdmin = ['admin', 'super_admin'].includes((req as any).user.role);

    await commentServicePrisma.deleteComment(req.params.id, userId, isAdmin);

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// React to comment (agree/disagree)
router.post('/:id/react', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove reaction
router.delete('/:id/react', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;

    await commentServicePrisma.removeReaction(req.params.id, userId);

    res.json({ success: true, message: 'Reaction removed' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's reaction for a comment
router.get('/:id/reaction', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;

    const reaction = await commentServicePrisma.getUserReaction(req.params.id, userId);

    res.json({
      success: true,
      data: {
        hasReacted: !!reaction,
        reaction,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Report comment
router.post('/:id/report', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { reason } = req.body;

    await commentServicePrisma.reportComment(req.params.id, userId, reason);

    res.json({ success: true, message: 'Comment reported successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


