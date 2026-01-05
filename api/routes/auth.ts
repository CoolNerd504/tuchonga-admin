import express from 'express';
import { adminService } from '../../src/services/adminService.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get admin by email
    const admin = await adminService.getAdminByEmail(email);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get password hash from AdminAuth
    const { prisma } = await import('../../src/services/prismaService');
    const adminAuth = await prisma.adminAuth.findUnique({
      where: { userId: admin.id },
    });

    if (!adminAuth) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await adminService.verifyPassword(password, adminAuth.passwordHash);
    if (!isValid) {
      // Increment login attempts
      await prisma.adminAuth.update({
        where: { userId: admin.id },
        data: {
          loginAttempts: { increment: 1 },
        },
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (adminAuth.lockedUntil && adminAuth.lockedUntil > new Date()) {
      return res.status(403).json({ error: 'Account is locked. Please try again later.' });
    }

    // Reset login attempts and update last login
    await prisma.adminAuth.update({
      where: { userId: admin.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: admin.id,
        email: admin.email,
        role: admin.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return admin data (without password)
    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        firstname: admin.firstname,
        lastname: admin.lastname,
        displayName: admin.displayName,
        role: admin.role,
        profileImage: admin.profileImage,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
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

    res.json({
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        firstname: admin.firstname,
        lastname: admin.lastname,
        displayName: admin.displayName,
        role: admin.role,
        profileImage: admin.profileImage,
      },
    });
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Exchange Firebase token for JWT token
// This endpoint is called when a user signs up on Firebase
// It creates the user in the database if they don't exist and returns a JWT token
router.post('/firebase-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Firebase token required',
      });
    }

    // Import Firebase Admin service
    const { verifyFirebaseToken, getOrCreateUserFromFirebase } = await import('../../src/services/firebaseAdminService.js');
    const { generateToken } = await import('../middleware/auth.js');

    // Verify Firebase token
    let firebaseUser;
    try {
      firebaseUser = await verifyFirebaseToken(token);
    } catch (error: any) {
      // Check if Firebase Admin SDK is not initialized
      if (error.message?.includes('Firebase Admin SDK not initialized')) {
        return res.status(500).json({
          success: false,
          error: 'Firebase authentication is not configured on the server. Please contact support.',
          code: 'FIREBASE_NOT_CONFIGURED',
          details: 'The server administrator needs to configure FIREBASE_SERVICE_ACCOUNT_KEY',
        });
      }
      
      return res.status(401).json({
        success: false,
        error: error.message || 'Invalid Firebase token',
        code: 'INVALID_FIREBASE_TOKEN',
      });
    }
    
    // Get or create user in database
    const user = await getOrCreateUserFromFirebase(firebaseUser);

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    // Generate JWT token
    const jwtToken = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Return JWT token and user data
    res.json({
      success: true,
      token: jwtToken,
      data: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        displayName: user.displayName,
        profileImage: user.profileImage,
        hasCompletedProfile: user.hasCompletedProfile,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Firebase token exchange error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// Firebase status endpoint (for diagnostics)
router.get('/firebase-status', async (req, res) => {
  try {
    const { getFirebaseAdminInitialized, firebaseAdmin } = await import('../../src/services/firebaseAdminService.js');
    
    // Access the initialization status
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const hasServiceAccountKey = !!serviceAccountKey;
    const isInitialized = getFirebaseAdminInitialized();
    const hasApps = firebaseAdmin.apps.length > 0;
    
    res.json({
      firebaseAdminInitialized: isInitialized && hasApps,
      hasServiceAccountKey,
      serviceAccountKeyLength: serviceAccountKey?.length || 0,
      message: (isInitialized && hasApps)
        ? '✅ Firebase Admin SDK is initialized and ready'
        : '❌ Firebase Admin SDK is NOT initialized',
      troubleshooting: !(isInitialized && hasApps) ? {
        commonIssues: [
          'FIREBASE_SERVICE_ACCOUNT_KEY not set in .env file',
          'JSON parsing error (check for single \\n instead of \\\\n in private_key)',
          'Invalid JSON format in FIREBASE_SERVICE_ACCOUNT_KEY',
          'Missing required fields in service account JSON'
        ],
        fixGuide: 'See FIX_NEWLINE_FORMAT.md for help with newline format issues'
      } : undefined
    });
  } catch (error: any) {
    res.status(500).json({
      firebaseAdminInitialized: false,
      error: error.message,
      message: '❌ Error checking Firebase status'
    });
  }
});

export default router;

