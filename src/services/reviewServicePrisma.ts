import type { Prisma, ReviewSentiment } from '@prisma/client';
import { prisma } from './prismaService.js';
import { productServicePrisma } from './productServicePrisma.js';
import { serviceServicePrisma } from './serviceServicePrisma.js';

// Types
export interface ReviewFilters {
  userId?: string;
  productId?: string;
  serviceId?: string;
  sentiment?: ReviewSentiment;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'sentiment';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateReviewData {
  userId: string;
  productId?: string;
  serviceId?: string;
  sentiment: ReviewSentiment;
  text?: string;
}

export interface UpdateReviewData {
  sentiment?: ReviewSentiment;
  text?: string;
}

export const reviewServicePrisma = {
  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async createOrUpdateReview(data: CreateReviewData) {
    const { userId, productId, serviceId, sentiment, text } = data;

    if (!productId && !serviceId) {
      throw new Error('Either productId or serviceId is required');
    }

    // Check for existing review
    const existingReview = await prisma.review.findFirst({
      where: {
        userId,
        ...(productId ? { productId } : { serviceId }),
      },
    });

    let review;

    if (existingReview) {
      // Update existing review and track history
      const sentimentHistory = (existingReview.sentimentHistory as any[]) || [];
      sentimentHistory.push({
        sentiment: existingReview.sentiment,
        timestamp: existingReview.updatedAt,
      });

      review = await prisma.review.update({
        where: { id: existingReview.id },
        data: {
          sentiment,
          text,
          sentimentHistory,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              displayName: true,
              profileImage: true,
            },
          },
        },
      });
    } else {
      // Create new review
      review = await prisma.review.create({
        data: {
          userId,
          productId,
          serviceId,
          sentiment,
          text,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              displayName: true,
              profileImage: true,
            },
          },
        },
      });

      // Update user analytics
      await this.updateUserReviewAnalytics(userId, productId ? 'product' : 'service');
    }

    // Update product/service stats and get updated counts
    let updatedStats;
    if (productId) {
      await productServicePrisma.updateReviewStats(productId);
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          totalReviews: true,
          positiveReviews: true,
          neutralReviews: true,
          negativeReviews: true,
        },
      });
      updatedStats = product;
    } else if (serviceId) {
      await serviceServicePrisma.updateReviewStats(serviceId);
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: {
          totalReviews: true,
          positiveReviews: true,
          neutralReviews: true,
          negativeReviews: true,
        },
      });
      updatedStats = service;
    }

    // Determine review category (positive, neutral, negative)
    let reviewCategory: 'positive' | 'neutral' | 'negative';
    if (sentiment === 'WOULD_RECOMMEND' || sentiment === 'ITS_GOOD') {
      reviewCategory = 'positive';
    } else if (sentiment === 'DONT_MIND_IT') {
      reviewCategory = 'neutral';
    } else {
      reviewCategory = 'negative';
    }

    return {
      review,
      stats: updatedStats || null,
      reviewCategory,
    };
  },

  async getReviewById(id: string) {
    return prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            profileImage: true,
          },
        },
        product: {
          select: {
            id: true,
            productName: true,
          },
        },
        service: {
          select: {
            id: true,
            serviceName: true,
          },
        },
      },
    });
  },

  async getAllReviews(filters: ReviewFilters = {}) {
    const {
      userId,
      productId,
      serviceId,
      sentiment,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.ReviewWhereInput = {};

    if (userId) where.userId = userId;
    if (productId) where.productId = productId;
    if (serviceId) where.serviceId = serviceId;
    if (sentiment) where.sentiment = sentiment;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              displayName: true,
              profileImage: true,
            },
          },
          product: {
            select: {
              id: true,
              productName: true,
            },
          },
          service: {
            select: {
              id: true,
              serviceName: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getProductReviews(productId: string, filters: ReviewFilters = {}) {
    return this.getAllReviews({ ...filters, productId });
  },

  async getServiceReviews(serviceId: string, filters: ReviewFilters = {}) {
    return this.getAllReviews({ ...filters, serviceId });
  },

  async getUserReviews(userId: string, filters: ReviewFilters = {}) {
    return this.getAllReviews({ ...filters, userId });
  },

  async updateReview(id: string, userId: string, data: UpdateReviewData) {
    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    if (review.userId !== userId) {
      throw new Error('Not authorized to update this review');
    }

    // Track sentiment history if changing
    const updateData: Prisma.ReviewUpdateInput = { ...data };
    if (data.sentiment && data.sentiment !== review.sentiment) {
      const sentimentHistory = (review.sentimentHistory as any[]) || [];
      sentimentHistory.push({
        sentiment: review.sentiment,
        timestamp: review.updatedAt,
      });
      updateData.sentimentHistory = sentimentHistory;
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            profileImage: true,
          },
        },
      },
    });

    // Update product/service stats
    if (review.productId) {
      await productServicePrisma.updateReviewStats(review.productId);
    } else if (review.serviceId) {
      await serviceServicePrisma.updateReviewStats(review.serviceId);
    }

    return updatedReview;
  },

  async deleteReview(id: string, userId: string, isAdmin = false) {
    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    if (!isAdmin && review.userId !== userId) {
      throw new Error('Not authorized to delete this review');
    }

    await prisma.review.delete({
      where: { id },
    });

    // Update product/service stats
    if (review.productId) {
      await productServicePrisma.updateReviewStats(review.productId);
    } else if (review.serviceId) {
      await serviceServicePrisma.updateReviewStats(review.serviceId);
    }

    return { success: true };
  },

  // ============================================================================
  // Statistics
  // ============================================================================

  async getReviewStats(productId?: string, serviceId?: string) {
    const where: Prisma.ReviewWhereInput = {};
    if (productId) where.productId = productId;
    if (serviceId) where.serviceId = serviceId;

    const stats = await prisma.review.groupBy({
      by: ['sentiment'],
      where,
      _count: true,
    });

    const distribution: Record<string, number> = {
      WOULD_RECOMMEND: 0,
      ITS_GOOD: 0,
      DONT_MIND_IT: 0,
      ITS_BAD: 0,
    };

    let total = 0;
    stats.forEach((s) => {
      distribution[s.sentiment] = s._count;
      total += s._count;
    });

    return {
      total,
      distribution,
      positive: distribution.WOULD_RECOMMEND + distribution.ITS_GOOD,
      neutral: distribution.DONT_MIND_IT,
      negative: distribution.ITS_BAD,
    };
  },

  // ============================================================================
  // User Analytics
  // ============================================================================

  async updateUserReviewAnalytics(userId: string, itemType: 'product' | 'service') {
    const incrementField =
      itemType === 'product' ? { productReviews: { increment: 1 } } : { serviceReviews: { increment: 1 } };

    await prisma.userAnalytics.upsert({
      where: { userId },
      update: {
        totalReviews: { increment: 1 },
        ...incrementField,
        lastReviewAt: new Date(),
      },
      create: {
        userId,
        totalReviews: 1,
        productReviews: itemType === 'product' ? 1 : 0,
        serviceReviews: itemType === 'service' ? 1 : 0,
        lastReviewAt: new Date(),
      },
    });
  },

  // ============================================================================
  // Check User Review
  // ============================================================================

  async getUserReviewForItem(userId: string, productId?: string, serviceId?: string) {
    return prisma.review.findFirst({
      where: {
        userId,
        ...(productId ? { productId } : { serviceId }),
      },
    });
  },

  async hasUserReviewed(userId: string, productId?: string, serviceId?: string): Promise<boolean> {
    const review = await this.getUserReviewForItem(userId, productId, serviceId);
    return !!review;
  },
};


