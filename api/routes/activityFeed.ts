import express from 'express';
import { activityFeedService } from '../../src/services/activityFeedService.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// ============================================================================
// Public Routes
// ============================================================================

// Get activity feed
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { itemType, activityTypes, limit, page } = req.query;

    // Parse activity types if provided
    let parsedActivityTypes;
    if (activityTypes) {
      parsedActivityTypes = Array.isArray(activityTypes)
        ? activityTypes
        : (activityTypes as string).split(',');
    }

    const result = await activityFeedService.getActivityFeed({
      itemType: itemType as any,
      activityTypes: parsedActivityTypes as any,
      limit: limit ? parseInt(limit as string) : 50,
      page: page ? parseInt(page as string) : 1,
    });

    res.json({
      success: true,
      data: result.activities,
      meta: result.meta,
    });
  } catch (error: any) {
    console.error('Get activity feed error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

