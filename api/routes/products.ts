import express from 'express';
import { productServicePrisma } from '../../src/services/productServicePrisma.js';
import { verifyToken, verifyAdmin, verifyBusinessOrAdmin, optionalAuth } from '../middleware/auth';
import { quickRatingServicePrisma } from '../../src/services/quickRatingServicePrisma.js';

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

// Get product by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const product = await productServicePrisma.getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // If user is authenticated, fetch their rating for this product
    let productWithRating = product;
    if (user && user.userId) {
      const userRating = await quickRatingServicePrisma.getUserRatingForItem(
        user.userId,
        product.id
      );

      productWithRating = {
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
      } as any;
    } else {
      productWithRating = {
        ...product,
        userRating: {
          hasRated: false,
          rating: null,
          canUpdate: true,
          hoursUntilUpdate: 0,
        },
      } as any;
    }

    res.json({ success: true, data: productWithRating });
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


