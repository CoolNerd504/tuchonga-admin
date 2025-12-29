import bcrypt from 'bcryptjs';
import { prisma } from './prismaService';
export const adminService = {
    // Hash password
    async hashPassword(password) {
        return bcrypt.hash(password, 10);
    },
    // Verify password
    async verifyPassword(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    },
    // Create super admin (first admin)
    async createSuperAdmin(data) {
        // Check if any admin exists
        const existingAdmin = await prisma.user.findFirst({
            where: {
                role: {
                    in: ['super_admin', 'admin'],
                },
            },
        });
        if (existingAdmin) {
            throw new Error('Super admin already exists. Use createAdmin instead.');
        }
        const hashedPassword = await this.hashPassword(data.password);
        return prisma.user.create({
            data: {
                email: data.email,
                fullName: data.fullName,
                displayName: data.fullName,
                phoneNumber: data.phoneNumber,
                profileImage: data.profileImage,
                role: 'super_admin',
                hasCompletedProfile: true,
                isActive: true,
                adminAuth: {
                    create: {
                        passwordHash: hashedPassword,
                    },
                },
            },
            include: {
                adminAuth: false, // Don't return password hash
            },
        });
    },
    // Create admin
    async createAdmin(data) {
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }
        const hashedPassword = await this.hashPassword(data.password);
        return prisma.user.create({
            data: {
                email: data.email,
                fullName: data.fullName,
                displayName: data.fullName,
                phoneNumber: data.phoneNumber,
                profileImage: data.profileImage,
                role: data.role,
                hasCompletedProfile: true,
                isActive: true,
                adminAuth: {
                    create: {
                        passwordHash: hashedPassword,
                    },
                },
            },
            include: {
                adminAuth: false, // Don't return password hash
            },
        });
    },
    // Get all admins
    async getAllAdmins(options) {
        const where = {
            role: {
                in: ['super_admin', 'admin', 'moderator', 'staff'],
            },
        };
        if (options?.role) {
            where.role = options.role;
        }
        if (options?.isActive !== undefined) {
            where.isActive = options.isActive;
        }
        return prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                fullName: true,
                displayName: true,
                phoneNumber: true,
                profileImage: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: options?.limit,
            skip: options?.offset,
        });
    },
    // Get admin by ID
    async getAdminById(id) {
        return prisma.user.findFirst({
            where: {
                id,
                role: {
                    in: ['super_admin', 'admin', 'moderator', 'staff'],
                },
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                displayName: true,
                phoneNumber: true,
                profileImage: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    },
    // Get admin by email
    async getAdminByEmail(email) {
        return prisma.user.findFirst({
            where: {
                email,
                role: {
                    in: ['super_admin', 'admin', 'moderator', 'staff'],
                },
            },
        });
    },
    // Update admin
    async updateAdmin(id, data) {
        const updateData = {};
        if (data.email)
            updateData.email = data.email;
        if (data.fullName) {
            updateData.fullName = data.fullName;
            updateData.displayName = data.fullName;
        }
        if (data.phoneNumber)
            updateData.phoneNumber = data.phoneNumber;
        if (data.profileImage)
            updateData.profileImage = data.profileImage;
        if (data.role)
            updateData.role = data.role;
        if (data.isActive !== undefined)
            updateData.isActive = data.isActive;
        // If password is provided, hash it and update AdminAuth
        if (data.password) {
            const hashedPassword = await this.hashPassword(data.password);
            // Update or create AdminAuth
            const adminAuth = await prisma.adminAuth.findUnique({
                where: { userId: id },
            });
            if (adminAuth) {
                await prisma.adminAuth.update({
                    where: { userId: id },
                    data: { passwordHash: hashedPassword },
                });
            }
            else {
                await prisma.adminAuth.create({
                    data: {
                        userId: id,
                        passwordHash: hashedPassword,
                    },
                });
            }
        }
        return prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                fullName: true,
                displayName: true,
                phoneNumber: true,
                profileImage: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    },
    // Delete admin (soft delete by setting isActive to false)
    async deleteAdmin(id) {
        return prisma.user.update({
            where: { id },
            data: { isActive: false },
        });
    },
    // Hard delete admin (use with caution)
    async hardDeleteAdmin(id) {
        return prisma.user.delete({
            where: { id },
        });
    },
    // Check if super admin exists
    async superAdminExists() {
        const superAdmin = await prisma.user.findFirst({
            where: { role: 'super_admin' },
        });
        return !!superAdmin;
    },
    // Get admin count
    async getAdminCount(role) {
        const where = {
            role: {
                in: ['super_admin', 'admin', 'moderator', 'staff'],
            },
        };
        if (role) {
            where.role = role;
        }
        return prisma.user.count({ where });
    },
};
