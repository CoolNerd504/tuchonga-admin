import express from 'express';
import { serviceServicePrisma } from '../../src/services/serviceServicePrisma.js';
import { verifyToken, verifyAdmin, verifyBusinessOrAdmin, optionalAuth } from '../middleware/auth';
import { quickRatingServicePrisma } from '../../src/services/quickRatingServicePrisma.js';

const router = express.Router();

// ============================================================================
// Public Routes
// ============================================================================

// Get all services (with filters)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      search,
      categories,
      businessId,
      isActive,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await serviceServicePrisma.getAllServices({
      search: search as string,
      categories: categories ? (categories as string).split(',') : undefined,
      businessId: businessId as string,
      isActive: isActive === 'false' ? false : true,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });

    // If user is authenticated, fetch their ratings for all services
    let servicesWithRatings: any[] = result.services;
    if (user && user.userId) {
      const serviceIds = result.services.map((s: any) => s.id);
      const userRatings = await quickRatingServicePrisma.getUserRatingsForItems(
        user.userId,
        serviceIds,
        'SERVICE'
      );

      // Create a map of itemId -> rating for quick lookup
      const ratingMap = new Map(
        userRatings.map((rating: any) => [rating.itemId, rating])
      );

      // Add user rating info to each service
      servicesWithRatings = result.services.map((service: any) => {
        const userRating = ratingMap.get(service.id);
        return {
          ...service,
          userRating: userRating ? {
            hasRated: true,
            rating: userRating.rating,
            canUpdate: userRating.canUpdate,
            hoursUntilUpdate: userRating.hoursUntilUpdate,
            lastUpdated: userRating.lastUpdated,
          } : {
            hasRated: false,
            rating: null,
            canUpdate: true,
            hoursUntilUpdate: 0,
          },
        };
      });
    } else {
      // No user, add default userRating object
      servicesWithRatings = result.services.map((service: any) => ({
        ...service,
        userRating: {
          hasRated: false,
          rating: null,
          canUpdate: true,
          hoursUntilUpdate: 0,
        },
      }));
    }

    res.json({
      success: true,
      data: servicesWithRatings,
      meta: result.meta,
    });
  } catch (error: any) {
    console.error('Get services error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get service by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const service = await serviceServicePrisma.getServiceById(req.params.id);

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    // If user is authenticated, fetch their rating for this service
    let serviceWithRating = service;
    if (user && user.userId) {
      const userRating = await quickRatingServicePrisma.getUserRatingForItem(
        user.userId,
        service.id
      );

      serviceWithRating = {
        ...service,
        userRating: userRating ? {
          hasRated: true,
          rating: userRating.rating,
          canUpdate: userRating.canUpdate,
          hoursUntilUpdate: userRating.hoursUntilUpdate,
          lastUpdated: userRating.lastUpdated,
        } : {
          hasRated: false,
          rating: null,
          canUpdate: true,
          hoursUntilUpdate: 0,
        },
      } as any;
    } else {
      serviceWithRating = {
        ...service,
        userRating: {
          hasRated: false,
          rating: null,
          canUpdate: true,
          hoursUntilUpdate: 0,
        },
      } as any;
    }

    res.json({ success: true, data: serviceWithRating });
  } catch (error: any) {
    console.error('Get service error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Track service view
router.post('/:id/view', async (req, res) => {
  try {
    await serviceServicePrisma.incrementViews(req.params.id);
    res.json({ success: true, message: 'View tracked' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search services
router.get('/search/:query', async (req, res) => {
  try {
    const { limit } = req.query;
    const services = await serviceServicePrisma.searchServices(
      req.params.query,
      limit ? parseInt(limit as string) : 20
    );

    res.json({ success: true, data: services });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Protected Routes (Authenticated Users)
// ============================================================================

// Create service (any authenticated user can create)
router.post('/', verifyToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      serviceName,
      description,
      mainImage,
      additionalImages,
      businessId,
      serviceOwner,
      categoryIds,
    } = req.body;

    if (!serviceName) {
      return res.status(400).json({ success: false, error: 'Service name is required' });
    }

    // Determine verification status based on user role
    // Regular users: unverified (default false)
    // Business/Admin: verified (can set isVerified in request, defaults to true)
    const isAdminOrBusiness = ['admin', 'super_admin', 'business', 'moderator', 'staff'].includes(user.role);
    const isVerified = isAdminOrBusiness ? (req.body.isVerified !== undefined ? req.body.isVerified : true) : false;

    const service = await serviceServicePrisma.createService({
      serviceName,
      description,
      mainImage,
      additionalImages,
      businessId,
      serviceOwner,
      categoryIds,
      createdBy: user.id,  // Track who created this
      isVerified,          // Set verification status
    });

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: service,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update service
router.put('/:id', verifyToken, verifyBusinessOrAdmin, async (req, res) => {
  try {
    const service = await serviceServicePrisma.updateService(req.params.id, req.body);

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: service,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete service (soft delete)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await serviceServicePrisma.deleteService(req.params.id);
    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify service (admin only)
router.post('/:id/verify', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const service = await serviceServicePrisma.verifyService(req.params.id);
    res.json({
      success: true,
      message: 'Service verified successfully',
      data: service,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Unverify service (admin only)
router.post('/:id/unverify', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const service = await serviceServicePrisma.unverifyService(req.params.id);
    res.json({
      success: true,
      message: 'Service unverified successfully',
      data: service,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Admin Routes
// ============================================================================

// Get service count
router.get('/stats/count', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { businessId, isActive } = req.query;
    const count = await serviceServicePrisma.getServiceCount({
      businessId: businessId as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    res.json({ success: true, data: { count } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


