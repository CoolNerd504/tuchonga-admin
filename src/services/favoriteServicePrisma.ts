import type { Prisma, ItemType } from '@prisma/client';
import { prisma } from './prismaService.js';

// Types
export interface FavoriteFilters {
  userId?: string;
  itemType?: ItemType;
  page?: number;
  limit?: number;
}

export interface CreateFavoriteData {
  userId: string;
  itemId: string;
  itemType: ItemType;
}

export const favoriteServicePrisma = {
  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async addFavorite(data: CreateFavoriteData) {
    const { userId, itemId, itemType } = data;

    // Check if already favorited
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId,
        },
      },
    });

    if (existing) {
      return existing; // Already favorited
    }

    const productId = itemType === 'PRODUCT' ? itemId : null;
    const serviceId = itemType === 'SERVICE' ? itemId : null;

    return prisma.favorite.create({
      data: {
        userId,
        itemId,
        itemType,
        productId,
        serviceId,
      },
      include: {
        product: {
          select: {
            id: true,
            productName: true,
            mainImage: true,
            productOwner: true,
          },
        },
        service: {
          select: {
            id: true,
            serviceName: true,
            mainImage: true,
            serviceOwner: true,
          },
        },
      },
    });
  },

  async removeFavorite(userId: string, itemId: string) {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId,
        },
      },
    });

    if (!favorite) {
      throw new Error('Favorite not found');
    }

    await prisma.favorite.delete({
      where: { id: favorite.id },
    });

    return { success: true };
  },

  async isFavorited(userId: string, itemId: string): Promise<boolean> {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId,
        },
      },
    });

    return !!favorite;
  },

  async toggleFavorite(data: CreateFavoriteData) {
    const isFavorited = await this.isFavorited(data.userId, data.itemId);

    if (isFavorited) {
      await this.removeFavorite(data.userId, data.itemId);
      return { action: 'removed', isFavorited: false };
    }
    await this.addFavorite(data);
    return { action: 'added', isFavorited: true };
  },

  // ============================================================================
  // Queries
  // ============================================================================

  async getUserFavorites(userId: string, filters: FavoriteFilters = {}) {
    const { itemType, page = 1, limit = 20 } = filters;

    const where: Prisma.FavoriteWhereInput = { userId };
    if (itemType) where.itemType = itemType;

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              productName: true,
              description: true,
              mainImage: true,
              productOwner: true,
              quickRatingAvg: true,
              totalReviews: true,
              categories: {
                include: {
                  category: true,
                },
              },
            },
          },
          service: {
            select: {
              id: true,
              serviceName: true,
              description: true,
              mainImage: true,
              serviceOwner: true,
              quickRatingAvg: true,
              totalReviews: true,
              categories: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.favorite.count({ where }),
    ]);

    // Format favorites to include item details
    const formattedFavorites = favorites.map((f) => ({
      id: f.id,
      itemId: f.itemId,
      itemType: f.itemType,
      createdAt: f.createdAt,
      item: f.itemType === 'PRODUCT' ? f.product : f.service,
    }));

    return {
      favorites: formattedFavorites,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getUserFavoriteProducts(userId: string, filters: FavoriteFilters = {}) {
    return this.getUserFavorites(userId, { ...filters, itemType: 'PRODUCT' });
  },

  async getUserFavoriteServices(userId: string, filters: FavoriteFilters = {}) {
    return this.getUserFavorites(userId, { ...filters, itemType: 'SERVICE' });
  },

  async getFavoriteCount(userId: string, itemType?: ItemType): Promise<number> {
    const where: Prisma.FavoriteWhereInput = { userId };
    if (itemType) where.itemType = itemType;

    return prisma.favorite.count({ where });
  },

  // ============================================================================
  // Admin Functions
  // ============================================================================

  async getItemFavoriteCount(itemId: string): Promise<number> {
    return prisma.favorite.count({
      where: { itemId },
    });
  },

  async getItemFavoritedByUsers(itemId: string, limit = 10) {
    return prisma.favorite.findMany({
      where: { itemId },
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
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async getMostFavoritedProducts(limit = 10) {
    const favorites = await prisma.favorite.groupBy({
      by: ['itemId'],
      where: { itemType: 'PRODUCT' },
      _count: true,
      orderBy: {
        _count: {
          itemId: 'desc',
        },
      },
      take: limit,
    });

    const productIds = favorites.map((f) => f.itemId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return favorites.map((f) => ({
      product: products.find((p) => p.id === f.itemId),
      favoriteCount: f._count,
    }));
  },

  async getMostFavoritedServices(limit = 10) {
    const favorites = await prisma.favorite.groupBy({
      by: ['itemId'],
      where: { itemType: 'SERVICE' },
      _count: true,
      orderBy: {
        _count: {
          itemId: 'desc',
        },
      },
      take: limit,
    });

    const serviceIds = favorites.map((f) => f.itemId);
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return favorites.map((f) => ({
      service: services.find((s) => s.id === f.itemId),
      favoriteCount: f._count,
    }));
  },

  // ============================================================================
  // Tracking with Sentiment Trends
  // ============================================================================

  async getUserFavoritesWithTracking(userId: string, filters: FavoriteFilters = {}) {
    const { itemType, page = 1, limit = 100 } = filters; // Higher limit for tracking

    const where: Prisma.FavoriteWhereInput = { userId };
    if (itemType) where.itemType = itemType;

    const favorites = await prisma.favorite.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            productName: true,
            description: true,
            mainImage: true,
            productOwner: true,
            quickRatingAvg: true,
            quickRatingTotal: true,
            totalReviews: true,
            positiveReviews: true,
            neutralReviews: true,
            negativeReviews: true,
            categories: {
              include: {
                category: true,
              },
            },
          },
        },
        service: {
          select: {
            id: true,
            serviceName: true,
            description: true,
            mainImage: true,
            serviceOwner: true,
            quickRatingAvg: true,
            quickRatingTotal: true,
            totalReviews: true,
            positiveReviews: true,
            neutralReviews: true,
            negativeReviews: true,
            categories: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Import services for sentiment calculation
    const { reviewServicePrisma } = await import('./reviewServicePrisma.js');
    const { quickRatingServicePrisma } = await import('./quickRatingServicePrisma.js');

    // Process each favorite to add sentiment tracking
    const favoritesWithTracking = await Promise.all(
      favorites.map(async (favorite) => {
        const item = favorite.itemType === 'PRODUCT' ? favorite.product : favorite.service;
        if (!item) return null;

        const itemId = item.id;

        // Get current sentiment stats
        const reviewStats = await reviewServicePrisma.getReviewStats(
          favorite.itemType === 'PRODUCT' ? itemId : undefined,
          favorite.itemType === 'SERVICE' ? itemId : undefined
        );

        // Get quick rating stats
        const quickRatingStats = favorite.itemType === 'PRODUCT'
          ? await quickRatingServicePrisma.getProductRatingStats(itemId)
          : await quickRatingServicePrisma.getServiceRatingStats(itemId);

        // Calculate current sentiment score (0-100, higher is better)
        const totalReviews = reviewStats.total || 0;
        const positiveCount = reviewStats.positive || 0;
        const neutralCount = reviewStats.neutral || 0;
        const negativeCount = reviewStats.negative || 0;

        // Sentiment score: (positive * 2 + neutral) / (total * 2) * 100
        // This gives positive reviews more weight
        const currentSentimentScore = totalReviews > 0
          ? Math.round(((positiveCount * 2 + neutralCount) / (totalReviews * 2)) * 100)
          : 0;

        // Calculate sentiment from quick ratings (1-5 scale, convert to 0-100)
        const quickRatingScore = quickRatingStats.average > 0
          ? Math.round(((quickRatingStats.average - 1) / 4) * 100)
          : 0;

        // Use quick rating if available, otherwise use review sentiment
        const overallSentimentScore = quickRatingStats.total > 0
          ? quickRatingScore
          : currentSentimentScore;

        // Get reviews from the last 30 days vs older reviews to calculate trend
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentReviews = await prisma.review.findMany({
          where: {
            ...(favorite.itemType === 'PRODUCT' ? { productId: itemId } : { serviceId: itemId }),
            createdAt: { gte: thirtyDaysAgo },
          },
        });

        const olderReviews = await prisma.review.findMany({
          where: {
            ...(favorite.itemType === 'PRODUCT' ? { productId: itemId } : { serviceId: itemId }),
            createdAt: { lt: thirtyDaysAgo },
          },
        });

        // Calculate recent sentiment score
        const recentPositive = recentReviews.filter(
          (r) => r.sentiment === 'WOULD_RECOMMEND' || r.sentiment === 'ITS_GOOD'
        ).length;
        const recentNeutral = recentReviews.filter((r) => r.sentiment === 'DONT_MIND_IT').length;
        const recentNegative = recentReviews.filter((r) => r.sentiment === 'ITS_BAD').length;
        const recentTotal = recentReviews.length;

        const recentSentimentScore = recentTotal > 0
          ? Math.round(((recentPositive * 2 + recentNeutral) / (recentTotal * 2)) * 100)
          : overallSentimentScore;

        // Calculate older sentiment score
        const olderPositive = olderReviews.filter(
          (r) => r.sentiment === 'WOULD_RECOMMEND' || r.sentiment === 'ITS_GOOD'
        ).length;
        const olderNeutral = olderReviews.filter((r) => r.sentiment === 'DONT_MIND_IT').length;
        const olderNegative = olderReviews.filter((r) => r.sentiment === 'ITS_BAD').length;
        const olderTotal = olderReviews.length;

        const olderSentimentScore = olderTotal > 0
          ? Math.round(((olderPositive * 2 + olderNeutral) / (olderTotal * 2)) * 100)
          : overallSentimentScore;

        // Determine trend
        let trend: 'improving' | 'declining' | 'stable' = 'stable';
        const trendDifference = recentSentimentScore - olderSentimentScore;

        if (Math.abs(trendDifference) < 5) {
          trend = 'stable';
        } else if (trendDifference > 0) {
          trend = 'improving';
        } else {
          trend = 'declining';
        }

        // Calculate days since favorited
        const daysSinceFavorited = Math.floor(
          (new Date().getTime() - favorite.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          id: favorite.id,
          itemId: favorite.itemId,
          itemType: favorite.itemType,
          favoritedAt: favorite.createdAt,
          daysSinceFavorited,
          item: {
            ...item,
            name: favorite.itemType === 'PRODUCT' 
              ? (item as any).productName 
              : (item as any).serviceName,
          },
          sentiment: {
            current: {
              score: overallSentimentScore,
              positive: positiveCount,
              neutral: neutralCount,
              negative: negativeCount,
              total: totalReviews,
              averageRating: quickRatingStats.average || 0,
              totalRatings: quickRatingStats.total || 0,
            },
            recent: {
              score: recentSentimentScore,
              total: recentTotal,
            },
            older: {
              score: olderSentimentScore,
              total: olderTotal,
            },
            trend,
            trendDifference: Math.abs(trendDifference),
          },
        };
      })
    );

    // Filter out nulls
    const validFavorites = favoritesWithTracking.filter((f) => f !== null);

    // Get total count
    const total = await prisma.favorite.count({ where });

    return {
      favorites: validFavorites,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};


