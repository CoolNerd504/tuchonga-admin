import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from './prismaService.js';

// Types
export interface CreateUserData {
  email?: string;
  phoneNumber?: string;
  password?: string;
  fullName?: string;
  displayName?: string;
  profileImage?: string;
  location?: string;
  gender?: string;
}

export interface UpdateUserData {
  email?: string;
  phoneNumber?: string;
  fullName?: string;
  displayName?: string;
  profileImage?: string;
  location?: string;
  gender?: string;
  hasCompletedProfile?: boolean;
}

export interface UserFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
  hasCompletedProfile?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'fullName' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export const mobileUserService = {
  // ============================================================================
  // Authentication
  // ============================================================================

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  },

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  },

  // Register user with email/password
  async registerWithEmail(data: CreateUserData) {
    if (!data.email || !data.password) {
      throw new Error('Email and password are required');
    }

    // Check if email exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await this.hashPassword(data.password);

    const user = await prisma.user.create({
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
  async registerWithPhone(phoneNumber: string) {
    // Check if phone exists
    const existing = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (existing) {
      return existing; // Return existing user for login
    }

    // Create new user
    const user = await prisma.user.create({
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
  async loginWithEmail(email: string, password: string) {
    const user = await prisma.user.findUnique({
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
    await prisma.adminAuth.update({
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

  async getUserById(id: string) {
    return prisma.user.findUnique({
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

  async getUserByEmail(email: string) {
    return prisma.user.findUnique({
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

  async getUserByPhone(phoneNumber: string) {
    return prisma.user.findUnique({
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

  async updateUser(id: string, data: UpdateUserData) {
    const updateData: Prisma.UserUpdateInput = {};

    if (data.email !== undefined) updateData.email = data.email;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
    if (data.fullName !== undefined) {
      updateData.fullName = data.fullName;
      if (!data.displayName) {
        updateData.displayName = data.fullName;
      }
    }
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.profileImage !== undefined) updateData.profileImage = data.profileImage;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.hasCompletedProfile !== undefined) {
      updateData.hasCompletedProfile = data.hasCompletedProfile;
      if (data.hasCompletedProfile) {
        updateData.profileCompletedAt = new Date();
      }
    }

    return prisma.user.update({
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
        isActive: true,
        mobile: true,
        firstname: true,
        lastname: true,
        firebaseAuthId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async completeProfile(id: string, data: UpdateUserData) {
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      // Create user if doesn't exist (for Firebase users who haven't been created yet)
      // This happens when complete-profile is called with Firebase token before firebase-token endpoint
      user = await prisma.user.create({
        data: {
          id,
          fullName: data.fullName,
          displayName: data.displayName || data.fullName,
          profileImage: data.profileImage,
          location: data.location,
          phoneNumber: data.phoneNumber,
          gender: data.gender,
          email: data.email,
          role: 'user',
          hasCompletedProfile: true,
          profileCompletedAt: new Date(),
          isActive: true,
          userAnalytics: {
            create: {},
          },
        },
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          fullName: true,
          displayName: true,
          profileImage: true,
          location: true,
          gender: true,
          hasCompletedProfile: true,
          profileCompletedAt: true,
          role: true,
          isActive: true,
          mobile: true,
          firstname: true,
          lastname: true,
          firebaseAuthId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } else {
      // Update existing user
      user = await this.updateUser(id, {
        ...data,
        hasCompletedProfile: true,
      });
    }

    return user;
  },

  // ============================================================================
  // User Analytics
  // ============================================================================

  async getUserAnalytics(userId: string) {
    let analytics = await prisma.userAnalytics.findUnique({
      where: { userId },
    });

    if (!analytics) {
      analytics = await prisma.userAnalytics.create({
        data: { userId },
      });
    }

    return analytics;
  },

  async updateUserAnalytics(
    userId: string,
    data: Partial<{
      totalReviews: number;
      productReviews: number;
      serviceReviews: number;
      totalComments: number;
      productComments: number;
      serviceComments: number;
      totalReplies: number;
      totalAgrees: number;
      totalDisagrees: number;
    }>
  ) {
    return prisma.userAnalytics.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  },

  // ============================================================================
  // Admin Functions
  // ============================================================================

  async getAllUsers(filters: UserFilters = {}) {
    const {
      search,
      role,
      isActive,
      hasCompletedProfile,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.UserWhereInput = {
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
      prisma.user.findMany({
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
      prisma.user.count({ where }),
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

  async getUserCount(filters?: { role?: string; isActive?: boolean }) {
    const where: Prisma.UserWhereInput = {};

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return prisma.user.count({ where });
  },

  async deactivateUser(id: string) {
    return prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  },

  async reactivateUser(id: string) {
    return prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  },

  async deleteUser(id: string) {
    // Soft delete
    return this.deactivateUser(id);
  },

  async hardDeleteUser(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  },
};


