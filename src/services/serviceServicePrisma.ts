import type { Prisma } from '@prisma/client';
import { prisma } from './prismaService.js';

// Types
export interface ServiceFilters {
  search?: string;
  categories?: string[];
  businessId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'serviceName' | 'quickRatingAvg' | 'totalViews' | 'totalReviews';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateServiceData {
  serviceName: string;
  description?: string;
  mainImage?: string;
  additionalImages?: string[];
  businessId?: string;
  serviceOwner?: string;
  categoryIds?: string[];
}

export interface UpdateServiceData {
  serviceName?: string;
  description?: string;
  mainImage?: string;
  additionalImages?: string[];
  businessId?: string;
  serviceOwner?: string;
  categoryIds?: string[];
  isActive?: boolean;
}

export const serviceServicePrisma = {
  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async createService(data: CreateServiceData) {
    const { categoryIds, ...serviceData } = data;

    const service = await prisma.service.create({
      data: {
        ...serviceData,
        additionalImages: serviceData.additionalImages || [],
        categories: categoryIds
          ? {
              create: categoryIds.map((categoryId) => ({
                category: { connect: { id: categoryId } },
              })),
            }
          : undefined,
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        business: true,
      },
    });

    return this.formatService(service);
  },

  async getServiceById(id: string) {
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        business: true,
        _count: {
          select: {
            reviews: true,
            comments: true,
            favorites: true,
          },
        },
      },
    });

    if (!service) return null;
    return this.formatService(service);
  },

  async getAllServices(filters: ServiceFilters = {}) {
    const {
      search,
      categories,
      businessId,
      isActive = true,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.ServiceWhereInput = {
      isActive,
    };

    if (businessId) {
      where.businessId = businessId;
    }

    if (search) {
      where.OR = [
        { serviceName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { serviceOwner: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categories && categories.length > 0) {
      where.categories = {
        some: {
          category: {
            name: { in: categories },
          },
        },
      };
    }

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          business: true,
          _count: {
            select: {
              reviews: true,
              comments: true,
              favorites: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.service.count({ where }),
    ]);

    return {
      services: services.map(this.formatService),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async updateService(id: string, data: UpdateServiceData) {
    const { categoryIds, ...updateData } = data;

    // If categories are being updated, delete existing and create new
    if (categoryIds !== undefined) {
      await prisma.serviceCategory.deleteMany({
        where: { serviceId: id },
      });

      if (categoryIds.length > 0) {
        await prisma.serviceCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            serviceId: id,
            categoryId,
          })),
        });
      }
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        ...updateData,
        lastUpdate: new Date(),
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        business: true,
      },
    });

    return this.formatService(service);
  },

  async deleteService(id: string) {
    // Soft delete
    return prisma.service.update({
      where: { id },
      data: { isActive: false },
    });
  },

  async hardDeleteService(id: string) {
    return prisma.service.delete({
      where: { id },
    });
  },

  // ============================================================================
  // Analytics
  // ============================================================================

  async incrementViews(id: string) {
    return prisma.service.update({
      where: { id },
      data: {
        totalViews: { increment: 1 },
      },
    });
  },

  async updateRatingStats(id: string) {
    const ratings = await prisma.quickRating.groupBy({
      by: ['rating'],
      where: { serviceId: id },
      _count: true,
    });

    const ratingCounts = {
      quickRating1: 0,
      quickRating2: 0,
      quickRating3: 0,
      quickRating4: 0,
      quickRating5: 0,
    };

    let total = 0;
    let sum = 0;

    ratings.forEach((r) => {
      const key = `quickRating${r.rating}` as keyof typeof ratingCounts;
      ratingCounts[key] = r._count;
      total += r._count;
      sum += r.rating * r._count;
    });

    const avg = total > 0 ? sum / total : null;

    return prisma.service.update({
      where: { id },
      data: {
        ...ratingCounts,
        quickRatingTotal: total,
        quickRatingAvg: avg,
      },
    });
  },

  async updateReviewStats(id: string) {
    const reviews = await prisma.review.groupBy({
      by: ['sentiment'],
      where: { serviceId: id },
      _count: true,
    });

    let positive = 0;
    let neutral = 0;
    let negative = 0;

    reviews.forEach((r) => {
      if (r.sentiment === 'WOULD_RECOMMEND' || r.sentiment === 'ITS_GOOD') {
        positive += r._count;
      } else if (r.sentiment === 'DONT_MIND_IT') {
        neutral += r._count;
      } else {
        negative += r._count;
      }
    });

    const total = positive + neutral + negative;

    return prisma.service.update({
      where: { id },
      data: {
        totalReviews: total,
        positiveReviews: positive,
        neutralReviews: neutral,
        negativeReviews: negative,
      },
    });
  },

  // ============================================================================
  // Search
  // ============================================================================

  async searchServices(query: string, limit = 20) {
    return prisma.service.findMany({
      where: {
        isActive: true,
        OR: [
          { serviceName: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { serviceOwner: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
      orderBy: [{ quickRatingAvg: 'desc' }, { totalViews: 'desc' }],
      take: limit,
    });
  },

  // ============================================================================
  // Counts
  // ============================================================================

  async getServiceCount(filters?: { businessId?: string; isActive?: boolean }) {
    const where: Prisma.ServiceWhereInput = {};

    if (filters?.businessId) {
      where.businessId = filters.businessId;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return prisma.service.count({ where });
  },

  // ============================================================================
  // Helpers
  // ============================================================================

  formatService(service: any) {
    return {
      id: service.id,
      serviceName: service.serviceName,
      description: service.description,
      mainImage: service.mainImage,
      additionalImages: service.additionalImages,
      isActive: service.isActive,
      businessId: service.businessId,
      business: service.business,
      serviceOwner: service.serviceOwner,
      categories: service.categories?.map((sc: any) => sc.category) || [],
      totalViews: service.totalViews,
      totalReviews: service.totalReviews,
      positiveReviews: service.positiveReviews,
      neutralReviews: service.neutralReviews,
      negativeReviews: service.negativeReviews,
      quickRatingAvg: service.quickRatingAvg,
      quickRatingTotal: service.quickRatingTotal,
      quickRating1: service.quickRating1,
      quickRating2: service.quickRating2,
      quickRating3: service.quickRating3,
      quickRating4: service.quickRating4,
      quickRating5: service.quickRating5,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      lastUpdate: service.lastUpdate,
      _count: service._count,
    };
  },
};


