import express from 'express';
import { quickRatingServicePrisma } from '../../src/services/quickRatingServicePrisma.js';
import { verifyToken, verifyAdmin } from '../middleware/auth';

const router = express.Router();

// ============================================================================
// Public Routes
// ============================================================================

// Get rating stats for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const stats = await quickRatingServicePrisma.getProductRatingStats(req.params.productId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get rating stats for a service
router.get('/service/:serviceId', async (req, res) => {
  try {
    const stats = await quickRatingServicePrisma.getServiceRatingStats(req.params.serviceId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all quick ratings for a product with user info (for admin dashboard)
router.get('/product/:productId/users', async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await quickRatingServicePrisma.getProductQuickRatingsWithUsers(
      req.params.productId,
      {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 100,
      }
    );

    res.json({
      success: true,
      data: result.ratings,
      meta: result.meta,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Protected Routes
// ============================================================================

// Submit or update quick rating
router.post('/', verifyToken, async (req, res) => {
  try {
    const { itemId, itemType, rating } = req.body;
    const userId = (req as any).user.userId;

    if (!itemId || !itemType || rating === undefined) {
      return res.status(400).json({
        success: false,
        error: 'itemId, itemType, and rating are required',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5',
      });
    }

    // Convert itemType string to enum (handle both lowercase and uppercase)
    let normalizedItemType: 'PRODUCT' | 'SERVICE';
    const itemTypeUpper = itemType.toUpperCase();
    
    if (itemTypeUpper === 'PRODUCT') {
      normalizedItemType = 'PRODUCT';
    } else if (itemTypeUpper === 'SERVICE') {
      normalizedItemType = 'SERVICE';
    } else {
      return res.status(400).json({
        success: false,
        error: 'itemType must be either "product" or "service"',
      });
    }

    const result = await quickRatingServicePrisma.createOrUpdateRating({
      userId,
      itemId,
      itemType: normalizedItemType,
      rating,
    });

    res.status(result.isNewRating ? 201 : 200).json({
      success: true,
      message: result.message || 'Rating submitted successfully',
      data: {
        id: result.id,
        userId: result.userId,
        itemId: result.itemId,
        itemType: result.itemType,
        rating: result.rating,
        isNewRating: result.isNewRating,
        isUpdate: result.isUpdate,
        canUpdateIn: result.canUpdateIn,
        nextUpdateTime: result.nextUpdateTime,
        lastUpdated: result.lastUpdated,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      },
    });
  } catch (error: any) {
    // Handle 24-hour limit error
    if (error.message.includes('once every') || error.message.includes('Time remaining')) {
      return res.status(429).json({
        success: false,
        error: error.message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 24 * 60 * 60, // 24 hours in seconds
      });
    }
    
    // Handle Prisma validation errors
    if (error.message.includes('Invalid value') || error.message.includes('Expected')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data. Please check itemType (must be "product" or "service") and rating (must be 1-5)',
        code: 'VALIDATION_ERROR',
        details: error.message,
      });
    }
    
    console.error('Quick rating error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to submit rating',
      code: 'INTERNAL_ERROR',
    });
  }
});

// Get user's rating for an item
router.get('/user/:itemId', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const rating = await quickRatingServicePrisma.getUserRatingForItem(userId, req.params.itemId);

    res.json({
      success: true,
      data: {
        hasRated: !!rating,
        rating,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's all ratings
router.get('/user/me/all', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { itemType, page, limit } = req.query;

    const result = await quickRatingServicePrisma.getUserRatings(userId, {
      itemType: itemType as any,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });

    res.json({
      success: true,
      data: result.ratings,
      meta: result.meta,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete rating
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const isAdmin = ['admin', 'super_admin'].includes((req as any).user.role);

    await quickRatingServicePrisma.deleteRating(req.params.id, userId, isAdmin);

    res.json({ success: true, message: 'Rating deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Admin Routes
// ============================================================================

// Get all ratings (admin)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { itemId, itemType, userId, page, limit } = req.query;

    const result = await quickRatingServicePrisma.getAllRatings({
      itemId: itemId as string,
      itemType: itemType as any,
      userId: userId as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });

    res.json({
      success: true,
      data: result.ratings,
      meta: result.meta,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


