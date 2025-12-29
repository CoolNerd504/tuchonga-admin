import express from 'express';
import { productServicePrisma } from '../../src/services/productServicePrisma.js';
import { verifyToken, verifyAdmin, verifyBusinessOrAdmin } from '../middleware/auth';

const router = express.Router();

// ============================================================================
// Public Routes
// ============================================================================

// Get all products (with filters)
router.get('/', async (req, res) => {
  try {
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

    res.json({
      success: true,
      data: result.products,
      meta: result.meta,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await productServicePrisma.getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (error: any) {
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
// Protected Routes (Business/Admin)
// ============================================================================

// Create product
router.post('/', verifyToken, verifyBusinessOrAdmin, async (req, res) => {
  try {
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

    const product = await productServicePrisma.createProduct({
      productName,
      description,
      mainImage,
      additionalImages,
      businessId,
      productOwner,
      categoryIds,
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
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


