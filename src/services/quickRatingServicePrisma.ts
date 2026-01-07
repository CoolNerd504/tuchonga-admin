import type { Prisma, ItemType } from '@prisma/client';
import { prisma } from './prismaService.js';
import { productServicePrisma } from './productServicePrisma.js';
import { serviceServicePrisma } from './serviceServicePrisma.js';

// Types
export interface CreateQuickRatingData {
  userId: string;
  itemId: string;
  itemType: ItemType;
  rating: number; // 1-5
}

const DAILY_UPDATE_LIMIT_HOURS = 24;

export const quickRatingServicePrisma = {
  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async createOrUpdateRating(data: CreateQuickRatingData) {
    const { userId, itemId, itemType, rating } = data;

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check for existing rating
    const existing = await prisma.quickRating.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId,
        },
      },
    });

    const productId = itemType === 'PRODUCT' ? itemId : null;
    const serviceId = itemType === 'SERVICE' ? itemId : null;

    let result;

    if (existing) {
      // Check if update is allowed (24-hour limit)
      const hoursSinceUpdate =
        (Date.now() - existing.lastUpdated.getTime()) / (1000 * 60 * 60);

      if (hoursSinceUpdate < DAILY_UPDATE_LIMIT_HOURS) {
        const hoursRemaining = Math.ceil(DAILY_UPDATE_LIMIT_HOURS - hoursSinceUpdate);
        const minutesRemaining = Math.ceil((DAILY_UPDATE_LIMIT_HOURS - hoursSinceUpdate) * 60);
        
        throw new Error(
          `You can only update your rating once every ${DAILY_UPDATE_LIMIT_HOURS} hours. ` +
            `Time remaining: ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''} (${minutesRemaining} minutes)`
        );
      }

      // Update existing rating (after 24 hours)
      // This counts as a new vote in community tallies
      result = await prisma.quickRating.update({
        where: { id: existing.id },
        data: {
          rating,
          lastUpdated: new Date(),
          updatedAt: new Date(), // Track when it was updated
        },
      });
    } else {
      // Create new rating (first time rating)
      result = await prisma.quickRating.create({
        data: {
          userId,
          itemId,
          itemType,
          productId,
          serviceId,
          rating,
        },
      });
    }

    // Update product/service rating stats (recalculates community tallies)
    if (productId) {
      await productServicePrisma.updateRatingStats(productId);
    } else if (serviceId) {
      await serviceServicePrisma.updateRatingStats(serviceId);
    }

    // Calculate when user can update again
    const nextUpdateTime = new Date(result.lastUpdated.getTime() + DAILY_UPDATE_LIMIT_HOURS * 60 * 60 * 1000);
    const hoursUntilNextUpdate = DAILY_UPDATE_LIMIT_HOURS;

    return {
      ...result,
      isNewRating: !existing,
      isUpdate: !!existing,
      canUpdateIn: hoursUntilNextUpdate,
      nextUpdateTime: nextUpdateTime.toISOString(),
      message: existing 
        ? 'Rating updated successfully. Your new vote has been counted in community tallies.'
        : 'Rating submitted successfully.',
    };
  },

  async getRatingById(id: string) {
    return prisma.quickRating.findUnique({
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
      },
    });
  },

  async getUserRatingForItem(userId: string, itemId: string) {
    const rating = await prisma.quickRating.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId,
        },
      },
    });

    if (!rating) return null;

    // Calculate if update is allowed
    const hoursSinceUpdate =
      (Date.now() - rating.lastUpdated.getTime()) / (1000 * 60 * 60);
    const canUpdate = hoursSinceUpdate >= DAILY_UPDATE_LIMIT_HOURS;
    const hoursUntilUpdate = canUpdate
      ? 0
      : Math.ceil(DAILY_UPDATE_LIMIT_HOURS - hoursSinceUpdate);

    return {
      ...rating,
      canUpdate,
      hoursUntilUpdate,
    };
  },

  /**
   * Get user ratings for multiple items at once (for list views)
   * Returns a map of itemId -> rating for efficient lookup
   */
  async getUserRatingsForItems(
    userId: string,
    itemIds: string[],
    itemType?: ItemType
  ): Promise<any[]> {
    if (!itemIds || itemIds.length === 0) {
      return [];
    }

    const where: Prisma.QuickRatingWhereInput = {
      userId,
      itemId: { in: itemIds },
    };

    if (itemType) {
      where.itemType = itemType;
    }

    const ratings = await prisma.quickRating.findMany({
      where,
    });

    // Calculate update status for each rating
    return ratings.map((rating) => {
      const hoursSinceUpdate =
        (Date.now() - rating.lastUpdated.getTime()) / (1000 * 60 * 60);
      const canUpdate = hoursSinceUpdate >= DAILY_UPDATE_LIMIT_HOURS;
      const hoursUntilUpdate = canUpdate
        ? 0
        : Math.ceil(DAILY_UPDATE_LIMIT_HOURS - hoursSinceUpdate);

      return {
        ...rating,
        canUpdate,
        hoursUntilUpdate,
      };
    });
  },

  async deleteRating(id: string, userId: string, isAdmin = false) {
    const rating = await prisma.quickRating.findUnique({
      where: { id },
    });

    if (!rating) {
      throw new Error('Rating not found');
    }

    if (!isAdmin && rating.userId !== userId) {
      throw new Error('Not authorized to delete this rating');
    }

    await prisma.quickRating.delete({
      where: { id },
    });

    // Update product/service rating stats
    if (rating.productId) {
      await productServicePrisma.updateRatingStats(rating.productId);
    } else if (rating.serviceId) {
      await serviceServicePrisma.updateRatingStats(rating.serviceId);
    }

    return { success: true };
  },

  // ============================================================================
  // Statistics
  // ============================================================================

  async getItemRatingStats(itemId: string, itemType?: ItemType) {
    const where: Prisma.QuickRatingWhereInput = { itemId };
    if (itemType) where.itemType = itemType;

    const ratings = await prisma.quickRating.groupBy({
      by: ['rating'],
      where,
      _count: true,
    });

    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    let total = 0;
    let sum = 0;

    ratings.forEach((r) => {
      distribution[r.rating] = r._count;
      total += r._count;
      sum += r.rating * r._count;
    });

    const average = total > 0 ? sum / total : 0;

    return {
      total,
      average: Math.round(average * 100) / 100,
      distribution,
    };
  },

  async getProductRatingStats(productId: string) {
    return this.getItemRatingStats(productId, 'PRODUCT');
  },

  async getServiceRatingStats(serviceId: string) {
    return this.getItemRatingStats(serviceId, 'SERVICE');
  },

  /**
   * Get all quick ratings for a product with user information
   * Used for admin dashboard to show who rated and when
   */
  async getProductQuickRatingsWithUsers(
    productId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { page = 1, limit = 100 } = options;

    const where: Prisma.QuickRatingWhereInput = {
      itemId: productId,
      itemType: 'PRODUCT',
    };

    const [ratings, total] = await Promise.all([
      prisma.quickRating.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              displayName: true,
              profileImage: true,
              email: true,
              firstname: true,
              lastname: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quickRating.count({ where }),
    ]);

    return {
      ratings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get all quick ratings for a service with user information
   * Used for admin dashboard to show who rated and when
   */
  async getServiceQuickRatingsWithUsers(
    serviceId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { page = 1, limit = 100 } = options;

    const where: Prisma.QuickRatingWhereInput = {
      itemId: serviceId,
      itemType: 'SERVICE',
    };

    const [ratings, total] = await Promise.all([
      prisma.quickRating.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              displayName: true,
              profileImage: true,
              email: true,
              firstname: true,
              lastname: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quickRating.count({ where }),
    ]);

    return {
      ratings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  // ============================================================================
  // User Ratings
  // ============================================================================

  async getUserRatings(
    userId: string,
    options: {
      itemType?: ItemType;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { itemType, page = 1, limit = 20 } = options;

    const where: Prisma.QuickRatingWhereInput = { userId };
    if (itemType) where.itemType = itemType;

    const [ratings, total] = await Promise.all([
      prisma.quickRating.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              productName: true,
              mainImage: true,
            },
          },
          service: {
            select: {
              id: true,
              serviceName: true,
              mainImage: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quickRating.count({ where }),
    ]);

    return {
      ratings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  // ============================================================================
  // Admin Functions
  // ============================================================================

  async getAllRatings(
    options: {
      itemId?: string;
      itemType?: ItemType;
      userId?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { itemId, itemType, userId, page = 1, limit = 20 } = options;

    const where: Prisma.QuickRatingWhereInput = {};
    if (itemId) where.itemId = itemId;
    if (itemType) where.itemType = itemType;
    if (userId) where.userId = userId;

    const [ratings, total] = await Promise.all([
      prisma.quickRating.findMany({
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
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quickRating.count({ where }),
    ]);

    return {
      ratings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};


