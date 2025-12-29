import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from './prismaService.js';

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'staff';

export interface CreateAdminData {
  email: string;
  password: string;
  fullName: string;
  firstname?: string;
  lastname?: string;
  role: AdminRole;
  phoneNumber?: string;
  profileImage?: string;
}

export interface UpdateAdminData {
  email?: string;
  password?: string;
  fullName?: string;
  role?: AdminRole;
  phoneNumber?: string;
  profileImage?: string;
  isActive?: boolean;
}

export interface AdminWithPassword extends Prisma.UserGetPayload<{}> {
  password?: string;
}

export const adminService = {
  // Hash password
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  },

  // Verify password
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  },

  // Create super admin (first admin)
  async createSuperAdmin(data: CreateAdminData) {
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
        firstname: data.firstname,
        lastname: data.lastname,
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
  async createAdmin(data: CreateAdminData) {
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
        firstname: data.firstname,
        lastname: data.lastname,
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
  async getAllAdmins(options?: {
    role?: AdminRole;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.UserWhereInput = {
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
  async getAdminById(id: string) {
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
        firstname: true,
        lastname: true,
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
  async getAdminByEmail(email: string) {
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
  async updateAdmin(id: string, data: UpdateAdminData) {
    const updateData: Prisma.UserUpdateInput = {};

    if (data.email) updateData.email = data.email;
    if (data.fullName) {
      updateData.fullName = data.fullName;
      updateData.displayName = data.fullName;
    }
    if (data.phoneNumber) updateData.phoneNumber = data.phoneNumber;
    if (data.profileImage) updateData.profileImage = data.profileImage;
    if (data.role) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

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
      } else {
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
  async deleteAdmin(id: string) {
    return prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  },

  // Hard delete admin (use with caution)
  async hardDeleteAdmin(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  },

  // Check if super admin exists
  async superAdminExists(): Promise<boolean> {
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'super_admin' },
    });
    return !!superAdmin;
  },

  // Get admin count
  async getAdminCount(role?: AdminRole) {
    const where: Prisma.UserWhereInput = {
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

