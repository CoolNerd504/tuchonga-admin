import type { Prisma } from '@prisma/client';
import { prisma } from './prismaService';

// Types
export interface BusinessFilters {
  search?: string;
  isVerified?: boolean;
  status?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateBusinessData {
  name: string;
  businessEmail?: string;
  businessPhone?: string;
  location?: string;
  logo?: string;
  pocFirstname?: string;
  pocLastname?: string;
  pocPhone?: string;
}

export interface UpdateBusinessData {
  name?: string;
  businessEmail?: string;
  businessPhone?: string;
  location?: string;
  logo?: string;
  pocFirstname?: string;
  pocLastname?: string;
  pocPhone?: string;
  isVerified?: boolean;
  status?: boolean;
}

export const businessServicePrisma = {
  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async createBusiness(data: CreateBusinessData) {
    // Check if email already exists
    if (data.businessEmail) {
      const existing = await prisma.business.findUnique({
        where: { businessEmail: data.businessEmail },
      });

      if (existing) {
        throw new Error('Business with this email already exists');
      }
    }

    return prisma.business.create({
      data,
      include: {
        _count: {
          select: {
            products: true,
            services: true,
          },
        },
      },
    });
  },

  async getBusinessById(id: string) {
    return prisma.business.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            services: true,
          },
        },
      },
    });
  },

  async getBusinessByEmail(email: string) {
    return prisma.business.findUnique({
      where: { businessEmail: email },
      include: {
        _count: {
          select: {
            products: true,
            services: true,
          },
        },
      },
    });
  },

  async getAllBusinesses(filters: BusinessFilters = {}) {
    const {
      search,
      isVerified,
      status,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.BusinessWhereInput = {};

    if (isVerified !== undefined) where.isVerified = isVerified;
    if (status !== undefined) where.status = status;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { businessEmail: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { pocFirstname: { contains: search, mode: 'insensitive' } },
        { pocLastname: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        include: {
          _count: {
            select: {
              products: true,
              services: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.business.count({ where }),
    ]);

    return {
      businesses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async updateBusiness(id: string, data: UpdateBusinessData) {
    // Check if new email conflicts with existing
    if (data.businessEmail) {
      const existing = await prisma.business.findFirst({
        where: {
          businessEmail: data.businessEmail,
          NOT: { id },
        },
      });

      if (existing) {
        throw new Error('Business with this email already exists');
      }
    }

    return prisma.business.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            products: true,
            services: true,
          },
        },
      },
    });
  },

  async deleteBusiness(id: string) {
    // Check if business has products or services
    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            services: true,
          },
        },
      },
    });

    if (!business) {
      throw new Error('Business not found');
    }

    if (business._count.products > 0 || business._count.services > 0) {
      // Soft delete by setting status to false
      return prisma.business.update({
        where: { id },
        data: { status: false },
      });
    }

    // Hard delete if no products/services
    await prisma.business.delete({
      where: { id },
    });

    return { success: true };
  },

  // ============================================================================
  // Verification
  // ============================================================================

  async verifyBusiness(id: string) {
    return prisma.business.update({
      where: { id },
      data: { isVerified: true },
    });
  },

  async unverifyBusiness(id: string) {
    return prisma.business.update({
      where: { id },
      data: { isVerified: false },
    });
  },

  // ============================================================================
  // Products & Services
  // ============================================================================

  async getBusinessProducts(businessId: string, filters?: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = filters || {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { businessId, isActive: true },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where: { businessId, isActive: true } }),
    ]);

    return {
      products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getBusinessServices(businessId: string, filters?: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = filters || {};

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where: { businessId, isActive: true },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.service.count({ where: { businessId, isActive: true } }),
    ]);

    return {
      services,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  // ============================================================================
  // Statistics
  // ============================================================================

  async getBusinessStats() {
    const [total, verified, active] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { isVerified: true } }),
      prisma.business.count({ where: { status: true } }),
    ]);

    return {
      total,
      verified,
      unverified: total - verified,
      active,
      inactive: total - active,
    };
  },

  async getBusinessAnalytics(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        products: {
          select: {
            totalViews: true,
            totalReviews: true,
            quickRatingAvg: true,
          },
        },
        services: {
          select: {
            totalViews: true,
            totalReviews: true,
            quickRatingAvg: true,
          },
        },
      },
    });

    if (!business) {
      throw new Error('Business not found');
    }

    const productStats = {
      count: business.products.length,
      totalViews: business.products.reduce((sum, p) => sum + p.totalViews, 0),
      totalReviews: business.products.reduce((sum, p) => sum + p.totalReviews, 0),
      avgRating:
        business.products.length > 0
          ? business.products.reduce((sum, p) => sum + (p.quickRatingAvg || 0), 0) /
            business.products.length
          : 0,
    };

    const serviceStats = {
      count: business.services.length,
      totalViews: business.services.reduce((sum, s) => sum + s.totalViews, 0),
      totalReviews: business.services.reduce((sum, s) => sum + s.totalReviews, 0),
      avgRating:
        business.services.length > 0
          ? business.services.reduce((sum, s) => sum + (s.quickRatingAvg || 0), 0) /
            business.services.length
          : 0,
    };

    return {
      business: {
        id: business.id,
        name: business.name,
        isVerified: business.isVerified,
        status: business.status,
      },
      products: productStats,
      services: serviceStats,
      totals: {
        items: productStats.count + serviceStats.count,
        views: productStats.totalViews + serviceStats.totalViews,
        reviews: productStats.totalReviews + serviceStats.totalReviews,
      },
    };
  },
};


