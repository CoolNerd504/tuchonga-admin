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

export default router;

