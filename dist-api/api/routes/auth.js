"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminService_1 = require("../../src/services/adminService");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Get admin by email
        const admin = await adminService_1.adminService.getAdminByEmail(email);
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Get password hash from AdminAuth
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../../src/services/prismaService')));
        const adminAuth = await prisma.adminAuth.findUnique({
            where: { userId: admin.id },
        });
        if (!adminAuth) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Verify password
        const isValid = await adminService_1.adminService.verifyPassword(password, adminAuth.passwordHash);
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
        const token = jsonwebtoken_1.default.sign({
            userId: admin.id,
            email: admin.email,
            role: admin.role,
        }, JWT_SECRET, { expiresIn: '7d' });
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
    }
    catch (error) {
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
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const admin = await adminService_1.adminService.getAdminById(decoded.userId);
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
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});
exports.default = router;
