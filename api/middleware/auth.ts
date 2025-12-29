import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../src/services/prismaService';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Extended Request type with user info
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    fullName?: string;
    displayName?: string;
    profileImage?: string;
  };
}

/**
 * Verify JWT token and attach user info to request
 */
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token required',
        code: 'AUTH_TOKEN_REQUIRED',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        displayName: true,
        profileImage: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'AUTH_INVALID_TOKEN',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated',
        code: 'AUTH_ACCOUNT_DEACTIVATED',
      });
    }

    // Attach user to request
    (req as AuthenticatedRequest).user = {
      userId: user.id,
      email: user.email || '',
      role: user.role,
      fullName: user.fullName || undefined,
      displayName: user.displayName || undefined,
      profileImage: user.profileImage || undefined,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token has expired',
        code: 'AUTH_TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'AUTH_INVALID_TOKEN',
    });
  }
};

/**
 * Optional auth - attach user if token exists, but don't require it
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        displayName: true,
        profileImage: true,
        isActive: true,
      },
    });

    if (user && user.isActive) {
      (req as AuthenticatedRequest).user = {
        userId: user.id,
        email: user.email || '',
        role: user.role,
        fullName: user.fullName || undefined,
        displayName: user.displayName || undefined,
        profileImage: user.profileImage || undefined,
      };
    }

    next();
  } catch {
    // Token invalid, continue without user
    next();
  }
};

/**
 * Verify user has admin role (admin, super_admin, moderator, staff)
 */
export const verifyAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_TOKEN_REQUIRED',
    });
  }

  const adminRoles = ['admin', 'super_admin', 'moderator', 'staff'];
  if (!adminRoles.includes(user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'FORBIDDEN',
    });
  }

  next();
};

/**
 * Verify user is super admin
 */
export const verifySuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_TOKEN_REQUIRED',
    });
  }

  if (user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Super admin access required',
      code: 'FORBIDDEN',
    });
  }

  next();
};

/**
 * Verify user is business owner or admin
 */
export const verifyBusinessOrAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_TOKEN_REQUIRED',
    });
  }

  const allowedRoles = ['business', 'admin', 'super_admin', 'moderator', 'staff'];
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Business or admin access required',
      code: 'FORBIDDEN',
    });
  }

  next();
};

/**
 * Verify user owns the resource or is admin
 */
export const verifyOwnerOrAdmin = (ownerIdField: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_TOKEN_REQUIRED',
      });
    }

    const ownerId = req.params[ownerIdField] || req.body[ownerIdField];
    const adminRoles = ['admin', 'super_admin'];

    if (user.userId !== ownerId && !adminRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'You can only access your own resources',
        code: 'FORBIDDEN',
      });
    }

    next();
  };
};

/**
 * Generate JWT token for a user
 */
export const generateToken = (user: {
  id: string;
  email?: string | null;
  role: string;
}): string => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email || '',
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Refresh token (generates new token from existing valid token)
 */
export const refreshToken = (token: string): string | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };

    return jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  } catch {
    return null;
  }
};


