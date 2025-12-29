"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mobileUserService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prismaService_1 = require("./prismaService");
exports.mobileUserService = {
    // ============================================================================
    // Authentication
    // ============================================================================
    async hashPassword(password) {
        return bcryptjs_1.default.hash(password, 10);
    },
    async verifyPassword(password, hashedPassword) {
        return bcryptjs_1.default.compare(password, hashedPassword);
    },
    // Register user with email/password
    async registerWithEmail(data) {
        if (!data.email || !data.password) {
            throw new Error('Email and password are required');
        }
        // Check if email exists
        const existing = await prismaService_1.prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existing) {
            throw new Error('Email already registered');
        }
        const hashedPassword = await this.hashPassword(data.password);
        const user = await prismaService_1.prisma.user.create({
            data: {
                email: data.email,
                fullName: data.fullName,
                displayName: data.displayName || data.fullName,
                profileImage: data.profileImage,
                location: data.location,
                gender: data.gender,
                role: 'user',
                hasCompletedProfile: false,
                isActive: true,
                adminAuth: {
                    create: {
                        passwordHash: hashedPassword,
                    },
                },
                userAnalytics: {
                    create: {},
                },
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                displayName: true,
                profileImage: true,
                gender: true,
                role: true,
                hasCompletedProfile: true,
                createdAt: true,
            },
        });
        return user;
    },
    // Register user with phone number
    async registerWithPhone(phoneNumber) {
        // Check if phone exists
        const existing = await prismaService_1.prisma.user.findUnique({
            where: { phoneNumber },
        });
        if (existing) {
            return existing; // Return existing user for login
        }
        // Create new user
        const user = await prismaService_1.prisma.user.create({
            data: {
                phoneNumber,
                role: 'user',
                hasCompletedProfile: false,
                isActive: true,
                userAnalytics: {
                    create: {},
                },
            },
            select: {
                id: true,
                phoneNumber: true,
                fullName: true,
                displayName: true,
                profileImage: true,
                role: true,
                hasCompletedProfile: true,
                createdAt: true,
            },
        });
        return user;
    },
    // Login with email
    async loginWithEmail(email, password) {
        const user = await prismaService_1.prisma.user.findUnique({
            where: { email },
            include: {
                adminAuth: true,
            },
        });
        if (!user) {
            throw new Error('Invalid credentials');
        }
        if (!user.isActive) {
            throw new Error('Account is deactivated');
        }
        if (!user.adminAuth?.passwordHash) {
            throw new Error('Password not set for this account');
        }
        const isValid = await this.verifyPassword(password, user.adminAuth.passwordHash);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }
        // Update last login
        await prismaService_1.prisma.adminAuth.update({
            where: { userId: user.id },
            data: { lastLoginAt: new Date() },
        });
        return {
            id: user.id,
            email: user.email,
            phoneNumber: user.phoneNumber,
            fullName: user.fullName,
            displayName: user.displayName,
            profileImage: user.profileImage,
            role: user.role,
            hasCompletedProfile: user.hasCompletedProfile,
        };
    },
    // ============================================================================
    // User Profile
    // ============================================================================
    async getUserById(id) {
        return prismaService_1.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                phoneNumber: true,
                fullName: true,
                displayName: true,
                profileImage: true,
                location: true,
                gender: true,
                role: true,
                hasCompletedProfile: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    },
    async getUserByEmail(email) {
        return prismaService_1.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                phoneNumber: true,
                fullName: true,
                displayName: true,
                profileImage: true,
                location: true,
                gender: true,
                role: true,
                hasCompletedProfile: true,
                createdAt: true,
            },
        });
    },
    async getUserByPhone(phoneNumber) {
        return prismaService_1.prisma.user.findUnique({
            where: { phoneNumber },
            select: {
                id: true,
                email: true,
                phoneNumber: true,
                fullName: true,
                displayName: true,
                profileImage: true,
                location: true,
                role: true,
                hasCompletedProfile: true,
                createdAt: true,
            },
        });
    },
    async updateUser(id, data) {
        const updateData = {};
        if (data.email !== undefined)
            updateData.email = data.email;
        if (data.phoneNumber !== undefined)
            updateData.phoneNumber = data.phoneNumber;
        if (data.fullName !== undefined) {
            updateData.fullName = data.fullName;
            if (!data.displayName) {
                updateData.displayName = data.fullName;
            }
        }
        if (data.displayName !== undefined)
            updateData.displayName = data.displayName;
        if (data.profileImage !== undefined)
            updateData.profileImage = data.profileImage;
        if (data.location !== undefined)
            updateData.location = data.location;
        if (data.gender !== undefined)
            updateData.gender = data.gender;
        if (data.hasCompletedProfile !== undefined) {
            updateData.hasCompletedProfile = data.hasCompletedProfile;
            if (data.hasCompletedProfile) {
                updateData.profileCompletedAt = new Date();
            }
        }
        return prismaService_1.prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                phoneNumber: true,
                fullName: true,
                displayName: true,
                profileImage: true,
                location: true,
                gender: true,
                role: true,
                hasCompletedProfile: true,
                profileCompletedAt: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    },
    async completeProfile(id, data) {
        return this.updateUser(id, {
            ...data,
            hasCompletedProfile: true,
        });
    },
    // ============================================================================
    // User Analytics
    // ============================================================================
    async getUserAnalytics(userId) {
        let analytics = await prismaService_1.prisma.userAnalytics.findUnique({
            where: { userId },
        });
        if (!analytics) {
            analytics = await prismaService_1.prisma.userAnalytics.create({
                data: { userId },
            });
        }
        return analytics;
    },
    async updateUserAnalytics(userId, data) {
        return prismaService_1.prisma.userAnalytics.upsert({
            where: { userId },
            update: data,
            create: { userId, ...data },
        });
    },
    // ============================================================================
    // Admin Functions
    // ============================================================================
    async getAllUsers(filters = {}) {
        const { search, role, isActive, hasCompletedProfile, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = filters;
        const where = {
            role: role || 'user', // Default to regular users
        };
        if (isActive !== undefined) {
            where.isActive = isActive;
        }
        if (hasCompletedProfile !== undefined) {
            where.hasCompletedProfile = hasCompletedProfile;
        }
        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { displayName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search } },
            ];
        }
        const [users, total] = await Promise.all([
            prismaService_1.prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    phoneNumber: true,
                    fullName: true,
                    displayName: true,
                    profileImage: true,
                    location: true,
                    gender: true,
                    role: true,
                    hasCompletedProfile: true,
                    isActive: true,
                    createdAt: true,
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prismaService_1.prisma.user.count({ where }),
        ]);
        return {
            users,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
    async getUserCount(filters) {
        const where = {};
        if (filters?.role) {
            where.role = filters.role;
        }
        if (filters?.isActive !== undefined) {
            where.isActive = filters.isActive;
        }
        return prismaService_1.prisma.user.count({ where });
    },
    async deactivateUser(id) {
        return prismaService_1.prisma.user.update({
            where: { id },
            data: { isActive: false },
        });
    },
    async reactivateUser(id) {
        return prismaService_1.prisma.user.update({
            where: { id },
            data: { isActive: true },
        });
    },
    async deleteUser(id) {
        // Soft delete
        return this.deactivateUser(id);
    },
    async hardDeleteUser(id) {
        return prismaService_1.prisma.user.delete({
            where: { id },
        });
    },
};
