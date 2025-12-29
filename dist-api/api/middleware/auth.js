"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshToken = exports.generateToken = exports.verifyOwnerOrAdmin = exports.verifyBusinessOrAdmin = exports.verifySuperAdmin = exports.verifyAdmin = exports.optionalAuth = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prismaService_1 = require("../../src/services/prismaService");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
/**
 * Verify JWT token and attach user info to request
 */
const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Authentication token required',
                code: 'AUTH_TOKEN_REQUIRED',
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Get user from database
        const user = await prismaService_1.prisma.user.findUnique({
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
        req.user = {
            userId: user.id,
            email: user.email || '',
            role: user.role,
            fullName: user.fullName || undefined,
            displayName: user.displayName || undefined,
            profileImage: user.profileImage || undefined,
        };
        next();
    }
    catch (error) {
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
exports.verifyToken = verifyToken;
/**
 * Optional auth - attach user if token exists, but don't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return next();
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await prismaService_1.prisma.user.findUnique({
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
            req.user = {
                userId: user.id,
                email: user.email || '',
                role: user.role,
                fullName: user.fullName || undefined,
                displayName: user.displayName || undefined,
                profileImage: user.profileImage || undefined,
            };
        }
        next();
    }
    catch {
        // Token invalid, continue without user
        next();
    }
};
exports.optionalAuth = optionalAuth;
/**
 * Verify user has admin role (admin, super_admin, moderator, staff)
 */
const verifyAdmin = (req, res, next) => {
    const user = req.user;
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
exports.verifyAdmin = verifyAdmin;
/**
 * Verify user is super admin
 */
const verifySuperAdmin = (req, res, next) => {
    const user = req.user;
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
exports.verifySuperAdmin = verifySuperAdmin;
/**
 * Verify user is business owner or admin
 */
const verifyBusinessOrAdmin = (req, res, next) => {
    const user = req.user;
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
exports.verifyBusinessOrAdmin = verifyBusinessOrAdmin;
/**
 * Verify user owns the resource or is admin
 */
const verifyOwnerOrAdmin = (ownerIdField) => {
    return (req, res, next) => {
        const user = req.user;
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
exports.verifyOwnerOrAdmin = verifyOwnerOrAdmin;
/**
 * Generate JWT token for a user
 */
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign({
        userId: user.id,
        email: user.email || '',
        role: user.role,
    }, JWT_SECRET, { expiresIn: '7d' });
};
exports.generateToken = generateToken;
/**
 * Refresh token (generates new token from existing valid token)
 */
const refreshToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return jsonwebtoken_1.default.sign({
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        }, JWT_SECRET, { expiresIn: '7d' });
    }
    catch {
        return null;
    }
};
exports.refreshToken = refreshToken;
