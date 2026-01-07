import express from 'express';
import { mobileUserService } from '../../src/services/mobileUserService.js';
import { verifyToken, verifyAdmin, verifySuperAdmin } from '../middleware/auth';
import { prisma } from '../../src/services/prismaService.js';

const router = express.Router();

// ============================================================================
// Public Routes (Registration)
// ============================================================================

// Register new user (no authentication required)
router.post('/register', async (req, res) => {
  try {
    const { email, phoneNumber, password, fullName, displayName, profileImage, location, gender } = req.body;

    // Validate required fields
    if (!email && !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Email or phone number is required',
      });
    }

    let user;
    
    // Register with email/password if provided
    if (email && password) {
      user = await mobileUserService.registerWithEmail({
        email,
        password,
        fullName,
        displayName,
        profileImage,
        location,
        gender,
      });
    } 
    // Register with phone number if provided
    else if (phoneNumber) {
      user = await mobileUserService.registerWithPhone(phoneNumber);
      // Update with additional profile data if provided
      if (fullName || displayName || profileImage || location || gender) {
        user = await mobileUserService.updateUser(user.id, {
          fullName,
          displayName,
          profileImage,
          location,
          gender,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either email+password or phoneNumber is required',
      });
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user,
    });
  } catch (error: any) {
    console.error('❌ Error in POST /api/users/register:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Registration failed' 
    });
  }
});

// Register and complete profile in one step (no authentication required)
router.post('/register-complete', async (req, res) => {
  try {
    const { email, phoneNumber, password, fullName, displayName, profileImage, location, gender } = req.body;

    if (!fullName) {
      return res.status(400).json({
        success: false,
        error: 'Full name is required',
      });
    }

    let user;
    
    // Register first
    if (email && password) {
      user = await mobileUserService.registerWithEmail({
        email,
        password,
        fullName,
        displayName: displayName || fullName,
        profileImage,
        location,
        gender,
      });
    } else if (phoneNumber) {
      user = await mobileUserService.registerWithPhone(phoneNumber);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either email+password or phoneNumber is required',
      });
    }

    // Complete profile
    user = await mobileUserService.completeProfile(user.id, {
      fullName,
      displayName: displayName || fullName,
      profileImage,
      location,
      phoneNumber,
      gender,
    });

    res.status(201).json({
      success: true,
      message: 'User registered and profile completed successfully',
      data: user,
    });
  } catch (error: any) {
    console.error('❌ Error in POST /api/users/register-complete:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Registration failed' 
    });
  }
});

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
    const currentUser = (req as any).user;
    const targetUserId = req.params.id;

    // Prevent deactivating yourself
    if (currentUser.userId === targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot deactivate your own account',
      });
    }

    // Check if target user is an admin or super_admin
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, email: true },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Only super_admin can deactivate other admins
    if (['admin', 'super_admin'].includes(targetUser.role) && currentUser.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Only super admins can deactivate admin accounts',
      });
    }

    await mobileUserService.deactivateUser(targetUserId);
    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: { userId: targetUserId, email: targetUser.email },
    });
  } catch (error: any) {
    console.error('❌ Error in POST /api/users/:id/deactivate:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reactivate user
router.post('/:id/reactivate', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    const targetUserId = req.params.id;

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, email: true },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Only super_admin can reactivate admin accounts
    if (['admin', 'super_admin'].includes(targetUser.role) && currentUser.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Only super admins can reactivate admin accounts',
      });
    }

    await mobileUserService.reactivateUser(targetUserId);
    res.json({
      success: true,
      message: 'User reactivated successfully',
      data: { userId: targetUserId, email: targetUser.email },
    });
  } catch (error: any) {
    console.error('❌ Error in POST /api/users/:id/reactivate:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete user (soft delete - deactivates user)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    const targetUserId = req.params.id;

    // Prevent deleting yourself
    if (currentUser.userId === targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
      });
    }

    // Check if target user is an admin or super_admin
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, email: true },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Only super_admin can delete other admins
    if (['admin', 'super_admin'].includes(targetUser.role) && currentUser.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Only super admins can delete admin accounts',
      });
    }

    await mobileUserService.deleteUser(targetUserId);
    res.json({
      success: true,
      message: 'User deleted successfully (deactivated)',
      data: { userId: targetUserId, email: targetUser.email },
    });
  } catch (error: any) {
    console.error('❌ Error in DELETE /api/users/:id:');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Hard delete user (permanently delete from database - super admin only)
router.delete('/:id/hard', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    const targetUserId = req.params.id;

    // Prevent deleting yourself
    if (currentUser.userId === targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
      });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, email: true },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Prevent deleting other super admins
    if (targetUser.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete other super admin accounts',
      });
    }

    await mobileUserService.hardDeleteUser(targetUserId);
    res.json({
      success: true,
      message: 'User permanently deleted successfully',
      data: { userId: targetUserId, email: targetUser.email },
    });
  } catch (error: any) {
    console.error('❌ Error in DELETE /api/users/:id/hard:');
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


