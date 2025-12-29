import express from 'express';
import { quickRatingServicePrisma } from '../../src/services/quickRatingServicePrisma';
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

    const result = await quickRatingServicePrisma.createOrUpdateRating({
      userId,
      itemId,
      itemType,
      rating,
    });

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      data: result,
    });
  } catch (error: any) {
    // Handle 24-hour limit error
    if (error.message.includes('once every')) {
      return res.status(429).json({
        success: false,
        error: error.message,
        code: 'RATE_LIMIT_EXCEEDED',
      });
    }
    res.status(500).json({ success: false, error: error.message });
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


