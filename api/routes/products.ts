import express from 'express';
import { productServicePrisma } from '../../src/services/productServicePrisma.js';
import { verifyToken, verifyAdmin, verifyBusinessOrAdmin, optionalAuth } from '../middleware/auth';
import { quickRatingServicePrisma } from '../../src/services/quickRatingServicePrisma.js';
import { reviewServicePrisma } from '../../src/services/reviewServicePrisma.js';
import { commentServicePrisma } from '../../src/services/commentServicePrisma.js';
import { prisma } from '../../src/services/prismaService.js';

const router = express.Router();

// ============================================================================
// Public Routes
// ============================================================================

// Get all products (with filters)
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

    const result = await productServicePrisma.getAllProducts({
      search: search as string,
      categories: categories ? (categories as string).split(',') : undefined,
      businessId: businessId as string,
      isActive: isActive === 'false' ? false : true,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });

    // If user is authenticated, fetch their ratings for all products
    let productsWithRatings: any[] = result.products;
    if (user && user.userId) {
      const productIds = result.products.map((p: any) => p.id);
      const userRatings = await quickRatingServicePrisma.getUserRatingsForItems(
        user.userId,
        productIds,
        'PRODUCT'
      );

      // Create a map of itemId -> rating for quick lookup
      const ratingMap = new Map(
        userRatings.map((rating: any) => [rating.itemId, rating])
      );

      // Add user rating info to each product
      productsWithRatings = result.products.map((product: any) => {
        const userRating = ratingMap.get(product.id);
        return {
          ...product,
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
      productsWithRatings = result.products.map((product: any) => ({
        ...product,
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
      data: productsWithRatings,
      meta: result.meta,
    });
  } catch (error: any) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get product by ID (comprehensive details for mobile app)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { 
      includeComments = 'true', 
      includeReviews = 'false', 
      commentsLimit = '20', 
      commentsPage = '1' 
    } = req.query;
    
    const product = await productServicePrisma.getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Build comprehensive response
    const response: any = {
      // Basic product info
      id: product.id,
      product_name: product.productName,
      productName: product.productName,
      description: product.description,
      mainImage: product.mainImage,
      additionalImages: product.additionalImages || [],
      price: null, // Price field not in schema - add if needed
      category: product.categories?.map((c: any) => c.name) || [],
      productOwner: product.productOwner,
      business: product.business,
      isActive: product.isActive,
      isVerified: product.isVerified,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    // 1. Quick Rating Stats
    const quickRatingStats = await quickRatingServicePrisma.getProductRatingStats(product.id);
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
        product.id
      );

      // Format countdown timer (hours:minutes:seconds)
      const formatCountdown = (hours: number): string => {
        if (hours <= 0) return '0h 0m 0s';
        const h = Math.floor(hours);
        const m = Math.floor((hours - h) * 60);
        const s = Math.floor(((hours - h) * 60 - m) * 60);
        return `${h}h ${m}m ${s}s`;
      };

      response.userRating = userRating ? {
        hasRated: true,
        rating: userRating.rating,
        canUpdate: userRating.canUpdate,
        hoursUntilUpdate: userRating.hoursUntilUpdate,
        countdownTimer: formatCountdown(userRating.hoursUntilUpdate), // Formatted as "16h 17m 43s"
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
        countdownTimer: '0h 0m 0s',
        sentiment: null,
      };
    }

    // 3. Review Stats (sentiment distribution)
    // Priority 1: Calculate from actual reviews array (individual votes)
    const allReviewsResult = await reviewServicePrisma.getProductReviews(product.id, {
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
    const reviewStats = await reviewServicePrisma.getReviewStats(product.id, undefined);
    const sentimentDistribution: Record<string, number> = {
      "Would recommend": sentimentBreakdown["Would recommend"] || reviewStats.distribution?.WOULD_RECOMMEND || 0,
      "Its Good": sentimentBreakdown["Its Good"] || reviewStats.distribution?.ITS_GOOD || 0,
      "Dont mind it": sentimentBreakdown["Dont mind it"] || reviewStats.distribution?.DONT_MIND_IT || 0,
      "It's bad": sentimentBreakdown["It's bad"] || reviewStats.distribution?.ITS_BAD || 0,
    };

    const totalReviewsCount = allReviews.length || product.totalReviews || 0;
    
    // Calculate percentages for progress bars
    const sentimentPercentages = {
      "Would recommend": totalReviewsCount > 0 ? Math.round((sentimentBreakdown["Would recommend"] / totalReviewsCount) * 100) : 0,
      "Its Good": totalReviewsCount > 0 ? Math.round((sentimentBreakdown["Its Good"] / totalReviewsCount) * 100) : 0,
      "Dont mind it": totalReviewsCount > 0 ? Math.round((sentimentBreakdown["Dont mind it"] / totalReviewsCount) * 100) : 0,
      "It's bad": totalReviewsCount > 0 ? Math.round((sentimentBreakdown["It's bad"] / totalReviewsCount) * 100) : 0,
    };

    response.reviewStats = {
      totalReviews: totalReviewsCount,
      totalSentimentReviews: reviewStats.total || 0,
      positiveReviews: positiveCount || product.positiveReviews || 0,
      neutralReviews: neutralCount || product.neutralReviews || 0,
      negativeReviews: negativeCount || product.negativeReviews || 0,
      sentimentDistribution,
      sentimentBreakdown, // Individual vote breakdown
      sentimentPercentages, // Percentages for progress bars
    };
    response.sentimentDistribution = sentimentDistribution;
    response.sentimentBreakdown = sentimentBreakdown; // For bar graph display
    response.sentimentPercentages = sentimentPercentages; // For progress bar display
    response.totalSentimentReviews = allReviews.length || reviewStats.total || 0;
    response.positive_reviews = positiveCount || product.positiveReviews || 0;
    response.neutral_reviews = neutralCount || product.neutralReviews || 0;
    response.negative_reviews = negativeCount || product.negativeReviews || 0;
    response.total_reviews = totalReviewsCount;

    // 4. User's Review Status
    if (user && user.userId) {
      const userReview = await reviewServicePrisma.getUserReviewForItem(
        user.userId,
        product.id,
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
            itemId: product.id,
          },
        },
      });
      response.isFavorite = !!favorite;
    } else {
      response.isFavorite = false;
    }

    // 6. Comments (if requested)
    if (includeComments === 'true') {
      const commentsResult = await commentServicePrisma.getProductComments(product.id, {
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
        itemId: product.id,
        itemType: 'PRODUCT',
      });
      
      // Calculate reply count
      const repliesCount = await prisma.comment.count({
        where: {
          productId: product.id,
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
    console.error('Get product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Track product view
router.post('/:id/view', async (req, res) => {
  try {
    await productServicePrisma.incrementViews(req.params.id);
    res.json({ success: true, message: 'View tracked' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search products
router.get('/search/:query', async (req, res) => {
  try {
    const { limit } = req.query;
    const products = await productServicePrisma.searchProducts(
      req.params.query,
      limit ? parseInt(limit as string) : 20
    );

    res.json({ success: true, data: products });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Protected Routes (Authenticated Users)
// ============================================================================

// Create product (any authenticated user can create)
router.post('/', verifyToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      productName,
      description,
      mainImage,
      additionalImages,
      businessId,
      productOwner,
      categoryIds,
    } = req.body;

    if (!productName) {
      return res.status(400).json({ success: false, error: 'Product name is required' });
    }

    // Determine verification status based on user role
    // Regular users: unverified (default false)
    // Business/Admin: verified (can set isVerified in request, defaults to true)
    const isAdminOrBusiness = ['admin', 'super_admin', 'business', 'moderator', 'staff'].includes(user.role);
    const isVerified = isAdminOrBusiness ? (req.body.isVerified !== undefined ? req.body.isVerified : true) : false;

    const product = await productServicePrisma.createProduct({
      productName,
      description,
      mainImage,
      additionalImages,
      businessId,
      productOwner,
      categoryIds,
      createdBy: user.id,  // Track who created this
      isVerified,          // Set verification status
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error: any) {
    console.error('Create product error:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Failed to create product';
    
    // Handle Prisma foreign key errors
    if (error.code === 'P2003') {
      errorMessage = 'Invalid reference: One or more related records (business or category) do not exist';
    } else if (error.code === 'P2002') {
      errorMessage = 'A product with this name already exists';
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update product
router.put('/:id', verifyToken, verifyBusinessOrAdmin, async (req, res) => {
  try {
    const product = await productServicePrisma.updateProduct(req.params.id, req.body);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete product (soft delete)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await productServicePrisma.deleteProduct(req.params.id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify product (admin only)
router.post('/:id/verify', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const product = await productServicePrisma.verifyProduct(req.params.id);
    res.json({
      success: true,
      message: 'Product verified successfully',
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Unverify product (admin only)
router.post('/:id/unverify', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const product = await productServicePrisma.unverifyProduct(req.params.id);
    res.json({
      success: true,
      message: 'Product unverified successfully',
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Admin Routes
// ============================================================================

// Get product count
router.get('/stats/count', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { businessId, isActive } = req.query;
    const count = await productServicePrisma.getProductCount({
      businessId: businessId as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    res.json({ success: true, data: { count } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


