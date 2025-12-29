import express from 'express';
import { adminService } from '../../src/services/adminService';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  console.warn('⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET in production!');
  return 'your-secret-key-change-in-production';
})();

// Middleware to verify admin token
const verifyAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const admin = await adminService.getAdminById(decoded.userId);

    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Attach admin to request
    (req as any).admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to verify super admin
const verifySuperAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const admin = (req as any).admin;
    if (admin.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }
    next();
  } catch (error) {
    res.status(403).json({ error: 'Super admin access required' });
  }
};

// Check if super admin exists (public endpoint for setup)
router.get('/setup/check', async (req, res) => {
  try {
    const exists = await adminService.superAdminExists();
    res.json({ superAdminExists: exists });
  } catch (error: any) {
    console.error('Error checking super admin existence:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to check super admin status',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Create super admin (public endpoint for initial setup)
router.post('/setup/super-admin', async (req, res) => {
  try {
    // Check if super admin already exists
    const exists = await adminService.superAdminExists();
    if (exists) {
      return res.status(400).json({ error: 'Super admin already exists' });
    }

    const { email, password, firstname, lastname, phoneNumber } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Email and password are required'
      });
    }

    if (!firstname || !lastname) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'First name and last name are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Combine firstname and lastname into fullName for database
    const fullName = `${firstname.trim()} ${lastname.trim()}`.trim();

    const admin = await adminService.createSuperAdmin({
      email,
      password,
      fullName,
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      phoneNumber,
      role: 'super_admin',
    });

    res.status(201).json({
      message: 'Super admin created successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
      },
    });
  } catch (error: any) {
    console.error('Create super admin error:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Internal server error';
    
    // Check for common database errors
    if (error.code === 'P2002') {
      errorMessage = 'An admin with this email already exists';
    } else if (error.message?.includes('connect')) {
      errorMessage = 'Database connection failed. Please check your DATABASE_URL configuration.';
    } else if (error.message?.includes('Prisma')) {
      errorMessage = `Database error: ${error.message}`;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get all admins (requires admin authentication)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const { role, isActive, limit, offset } = req.query;
    const admins = await adminService.getAllAdmins({
      role: role as any,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(admins);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get admin by ID
router.get('/:id', verifyAdmin, async (req, res) => {
  try {
    const admin = await adminService.getAdminById(req.params.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json(admin);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create admin (requires super admin)
router.post('/', verifyAdmin, verifySuperAdmin, async (req, res) => {
  try {
    const { email, password, firstname, lastname, role, phoneNumber, profileImage } = req.body;

    if (!email || !password || !firstname || !lastname || !role) {
      return res.status(400).json({ error: 'Email, password, first name, last name, and role are required' });
    }

    // Combine firstname and lastname into fullName for database
    const fullName = `${firstname.trim()} ${lastname.trim()}`.trim();

    const admin = await adminService.createAdmin({
      email,
      password,
      fullName,
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      role,
      phoneNumber,
      profileImage,
    });

    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update admin
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    const targetId = req.params.id;

    // Only super admin can update other admins, or admin can update themselves
    if (admin.role !== 'super_admin' && admin.id !== targetId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Only super admin can change roles
    if (req.body.role && admin.role !== 'super_admin') {
      delete req.body.role;
    }

    const updatedAdmin = await adminService.updateAdmin(targetId, req.body);
    res.json({
      message: 'Admin updated successfully',
      admin: updatedAdmin,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete admin (soft delete)
router.delete('/:id', verifyAdmin, verifySuperAdmin, async (req, res) => {
  try {
    const targetId = req.params.id;
    const admin = (req as any).admin;

    // Cannot delete yourself
    if (admin.id === targetId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await adminService.deleteAdmin(targetId);
    res.json({ message: 'Admin deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get admin statistics
router.get('/stats/count', verifyAdmin, async (req, res) => {
  try {
    const { role } = req.query;
    const count = await adminService.getAdminCount(role as any);
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

