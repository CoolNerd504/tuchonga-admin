import express from 'express';
import { serviceServicePrisma } from '../../src/services/serviceServicePrisma.js';
import { verifyToken, verifyAdmin, verifyBusinessOrAdmin, optionalAuth } from '../middleware/auth';
import { quickRatingServicePrisma } from '../../src/services/quickRatingServicePrisma.js';
import { reviewServicePrisma } from '../../src/services/reviewServicePrisma.js';
import { commentServicePrisma } from '../../src/services/commentServicePrisma.js';
import { prisma } from '../../src/services/prismaService.js';

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

// Get service by ID (comprehensive details for mobile app)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { 
      includeComments = 'true', 
      includeReviews = 'false', 
      commentsLimit = '20', 
      commentsPage = '1' 
    } = req.query;
    
    const service = await serviceServicePrisma.getServiceById(req.params.id);

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    // Build comprehensive response
    const response: any = {
      // Basic service info
      id: service.id,
      service_name: service.serviceName,
      serviceName: service.serviceName,
      description: service.description,
      mainImage: service.mainImage,
      additionalImages: service.additionalImages || [],
      price: null, // Price field not in schema - add if needed
      category: service.categories?.map((c: any) => c.name) || [],
      serviceOwner: service.serviceOwner,
      business: service.business,
      isActive: service.isActive,
      isVerified: service.isVerified,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };

    // 1. Quick Rating Stats
    const quickRatingStats = await quickRatingServicePrisma.getServiceRatingStats(service.id);
    response.quickRatingStats = {
      totalRatings: quickRatingStats.total,
      averageRating: quickRatingStats.average,
      ratingDistribution: quickRatingStats.distribution,
    };
    response.averageRating = quickRatingStats.average;
    response.totalRatings = quickRatingStats.total;

    // 2. User's Quick Rating Status
    if (user && user.userId) {
      const userRating = await quickRatingServicePrisma.getUserRatingForItem(
        user.userId,
        service.id
      );

      response.userRating = userRating ? {
        hasRated: true,
        rating: userRating.rating,
        canUpdate: userRating.canUpdate,
        hoursUntilUpdate: userRating.hoursUntilUpdate,
        lastUpdated: userRating.lastUpdated,
        sentiment: userRating.rating === 4 ? "Would recommend" : 
                   userRating.rating === 3 ? "Its Good" :
                   userRating.rating === 2 ? "Dont mind it" : "It's bad",
      } : {
        hasRated: false,
        rating: null,
        canUpdate: true,
        hoursUntilUpdate: 0,
        sentiment: null,
      };
    } else {
      response.userRating = {
        hasRated: false,
        rating: null,
        canUpdate: true,
        hoursUntilUpdate: 0,
        sentiment: null,
      };
    }

    // 3. Review Stats (sentiment distribution)
    // Priority 1: Calculate from actual reviews array (individual votes)
    const allReviewsResult = await reviewServicePrisma.getServiceReviews(service.id, {
      page: 1,
      limit: 1000, // Get all reviews for accurate breakdown
    });
    const allReviews = allReviewsResult.reviews || [];

    // Calculate sentiment breakdown from actual reviews array
    const sentimentBreakdown = {
      "Would recommend": allReviews.filter((r: any) => r.sentiment === 'WOULD_RECOMMEND').length,
      "Its Good": allReviews.filter((r: any) => r.sentiment === 'ITS_GOOD').length,
      "Dont mind it": allReviews.filter((r: any) => r.sentiment === 'DONT_MIND_IT').length,
      "It's bad": allReviews.filter((r: any) => r.sentiment === 'ITS_BAD').length,
    };

    // Calculate aggregated sentiment counts
    const positiveCount = sentimentBreakdown["Would recommend"] + sentimentBreakdown["Its Good"];
    const neutralCount = sentimentBreakdown["Dont mind it"];
    const negativeCount = sentimentBreakdown["It's bad"];

    // Priority 2: Fallback to reviewStats distribution if reviews array is empty
    const reviewStats = await reviewServicePrisma.getReviewStats(undefined, service.id);
    const sentimentDistribution: Record<string, number> = {
      "Would recommend": sentimentBreakdown["Would recommend"] || reviewStats.distribution?.WOULD_RECOMMEND || 0,
      "Its Good": sentimentBreakdown["Its Good"] || reviewStats.distribution?.ITS_GOOD || 0,
      "Dont mind it": sentimentBreakdown["Dont mind it"] || reviewStats.distribution?.DONT_MIND_IT || 0,
      "It's bad": sentimentBreakdown["It's bad"] || reviewStats.distribution?.ITS_BAD || 0,
    };

    response.reviewStats = {
      totalReviews: allReviews.length || service.totalReviews || 0,
      totalSentimentReviews: reviewStats.total || 0,
      positiveReviews: positiveCount || service.positiveReviews || 0,
      neutralReviews: neutralCount || service.neutralReviews || 0,
      negativeReviews: negativeCount || service.negativeReviews || 0,
      sentimentDistribution,
      sentimentBreakdown, // Individual vote breakdown
    };
    response.sentimentDistribution = sentimentDistribution;
    response.sentimentBreakdown = sentimentBreakdown; // For bar graph display
    response.totalSentimentReviews = allReviews.length || reviewStats.total || 0;
    response.positive_reviews = positiveCount || service.positiveReviews || 0;
    response.neutral_reviews = neutralCount || service.neutralReviews || 0;
    response.negative_reviews = negativeCount || service.negativeReviews || 0;
    response.total_reviews = allReviews.length || service.totalReviews || 0;

    // 4. User's Review Status
    if (user && user.userId) {
      const userReview = await reviewServicePrisma.getUserReviewForItem(
        user.userId,
        service.id,
        undefined
      );
      response.userReview = userReview ? {
        hasReviewed: true,
        review: {
          id: userReview.id,
          sentiment: userReview.sentiment,
          text: userReview.text,
          createdAt: userReview.createdAt,
        },
      } : {
        hasReviewed: false,
        review: null,
      };
    } else {
      response.userReview = {
        hasReviewed: false,
        review: null,
      };
    }

    // 5. Favorite Status
    if (user && user.userId) {
      const favorite = await prisma.favorite.findUnique({
        where: {
          userId_itemId: {
            userId: user.userId,
            itemId: service.id,
          },
        },
      });
      response.isFavorite = !!favorite;
    } else {
      response.isFavorite = false;
    }

    // 6. Comments (if requested)
    if (includeComments === 'true') {
      const commentsResult = await commentServicePrisma.getServiceComments(service.id, {
        page: parseInt(commentsPage as string),
        limit: parseInt(commentsLimit as string),
        includeReplies: true,
      });

      // Add user reactions to comments if authenticated
      let commentsWithReactions = commentsResult.comments;
      if (user && user.userId) {
        // Collect all comment IDs (including nested replies)
        const getAllCommentIds = (comments: any[]): string[] => {
          const ids: string[] = [];
          comments.forEach((comment: any) => {
            ids.push(comment.id);
            if (comment.replies && comment.replies.length > 0) {
              ids.push(...getAllCommentIds(comment.replies));
            }
          });
          return ids;
        };

        const allCommentIds = getAllCommentIds(commentsResult.comments);
        const userReactions = await commentServicePrisma.getUserReactionsForComments(
          user.userId,
          allCommentIds
        );

        const reactionMap = new Map(
          userReactions.map((r: any) => [r.commentId, r])
        );

        // Recursively add reactions to comments and nested replies
        const addReactionsToComments = (comments: any[]): any[] => {
          return comments.map((comment: any) => {
            const userReaction = reactionMap.get(comment.id);
            return {
              ...comment,
              userReaction: userReaction ? {
                hasReacted: true,
                reactionType: userReaction.reactionType,
              } : {
                hasReacted: false,
                reactionType: null,
              },
              replies: comment.replies ? addReactionsToComments(comment.replies) : [],
            };
          });
        };

        commentsWithReactions = addReactionsToComments(commentsResult.comments);
      } else {
        const addDefaultReactions = (comments: any[]): any[] => {
          return comments.map((comment: any) => ({
            ...comment,
            userReaction: {
              hasReacted: false,
              reactionType: null,
            },
            replies: comment.replies ? addDefaultReactions(comment.replies) : [],
          }));
        };
        commentsWithReactions = addDefaultReactions(commentsResult.comments);
      }

      response.comments = {
        items: commentsWithReactions,
        total: commentsResult.meta.total,
        page: commentsResult.meta.page,
        limit: commentsResult.meta.limit,
        totalPages: commentsResult.meta.totalPages,
        hasMore: commentsResult.meta.page < commentsResult.meta.totalPages,
      };

      // Comment Stats
      const commentCount = await commentServicePrisma.getCommentCount({
        itemId: service.id,
        itemType: 'SERVICE',
      });
      
      // Calculate reply count
      const repliesCount = await prisma.comment.count({
        where: {
          serviceId: service.id,
          parentId: { not: null },
          isDeleted: false,
        },
      });

      response.commentStats = {
        totalComments: commentCount,
        totalReplies: repliesCount,
        averageRepliesPerComment: commentCount > 0 ? Math.round((repliesCount / commentCount) * 10) / 10 : 0,
      };
    }

    // 7. Reviews (always include for sentiment breakdown calculation)
    // Use the already fetched allReviews, return first 10 for display
    response.reviews = {
      items: allReviews.slice(0, 10), // Return first 10 for display
      total: allReviewsResult.meta.total || allReviews.length,
      hasMore: allReviews.length > 10,
      // Include all reviews if explicitly requested (for complete breakdown calculation on client)
      allReviews: includeReviews === 'true' ? allReviews : undefined,
    };

    res.json({ success: true, data: response });
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


