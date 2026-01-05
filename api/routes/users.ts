import express from 'express';
import { mobileUserService } from '../../src/services/mobileUserService.js';
import { verifyToken, verifyAdmin } from '../middleware/auth';

const router = express.Router();

// ============================================================================
// Protected Routes (User)
// ============================================================================

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const user = await mobileUserService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error: any) {
    console.error('❌ Error in GET /api/users/me:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update current user profile
router.put('/me', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { fullName, displayName, profileImage, location, phoneNumber, email, gender } = req.body;

    const user = await mobileUserService.updateUser(userId, {
      fullName,
      displayName,
      profileImage,
      location,
      phoneNumber,
      email,
      gender,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error: any) {
    console.error('❌ Error in GET /api/users/me:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Complete profile
router.post('/me/complete-profile', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { fullName, displayName, profileImage, location, phoneNumber, gender } = req.body;

    if (!fullName) {
      return res.status(400).json({
        success: false,
        error: 'Full name is required',
      });
    }

    const user = await mobileUserService.completeProfile(userId, {
      fullName,
      displayName: displayName || fullName,
      profileImage,
      location,
      phoneNumber,
      gender,
    });

    res.json({
      success: true,
      message: 'Profile completed successfully',
      data: user,
    });
  } catch (error: any) {
    console.error('❌ Error in POST /api/users/me/complete-profile:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current user analytics
router.get('/me/analytics', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const analytics = await mobileUserService.getUserAnalytics(userId);

    res.json({ success: true, data: analytics });
  } catch (error: any) {
    console.error('❌ Error in GET /api/users/me:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Admin Routes
// ============================================================================

// Get all users
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const {
      search,
      role,
      isActive,
      hasCompletedProfile,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await mobileUserService.getAllUsers({
      search: search as string,
      role: role as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      hasCompletedProfile:
        hasCompletedProfile === 'true' ? true : hasCompletedProfile === 'false' ? false : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });

    res.json({
      success: true,
      data: result.users,
      meta: result.meta,
    });
  } catch (error: any) {
    console.error('❌ Error in GET /api/users/me:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user by ID
router.get('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await mobileUserService.getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error: any) {
    console.error('❌ Error in GET /api/users/me:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await mobileUserService.updateUser(req.params.id, req.body);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error: any) {
    console.error('❌ Error in GET /api/users/me:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deactivate user
router.post('/:id/deactivate', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await mobileUserService.deactivateUser(req.params.id);
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error: any) {
    console.error('❌ Error in GET /api/users/me:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reactivate user
router.post('/:id/reactivate', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await mobileUserService.reactivateUser(req.params.id);
    res.json({ success: true, message: 'User reactivated successfully' });
  } catch (error: any) {
    console.error('❌ Error in GET /api/users/me:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete user (soft delete)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await mobileUserService.deleteUser(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('❌ Error in GET /api/users/me:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user count
router.get('/stats/count', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { role, isActive } = req.query;
    const count = await mobileUserService.getUserCount({
      role: role as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    res.json({ success: true, data: { count } });
  } catch (error: any) {
    console.error('❌ Error in GET /api/users/me:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user analytics by ID
router.get('/:id/analytics', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const analytics = await mobileUserService.getUserAnalytics(req.params.id);
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    console.error('❌ Error in GET /api/users/me:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


