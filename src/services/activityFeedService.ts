import { prisma } from './prismaService.js';

export type ActivityType =
  | 'REVIEW_STREAK_POSITIVE'
  | 'REVIEW_STREAK_NEGATIVE'
  | 'TRENDING_UP'
  | 'TRENDING_DOWN'
  | 'NEW_PRODUCT'
  | 'NEW_SERVICE'
  | 'HIGH_ENGAGEMENT'
  | 'CONTROVERSIAL'
  | 'RISING_STAR'
  | 'RATING_MILESTONE'
  | 'ACTIVITY_SPIKE'
  | 'MOST_DISCUSSED'
  | 'SENTIMENT_SWING'
  | 'NEW_FAVORITE'
  | 'RAPID_GROWTH';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  itemId: string;
  itemType: 'PRODUCT' | 'SERVICE';
  itemName: string;
  itemImage?: string;
  timestamp: Date;
  metadata: {
    streakCount?: number;
    sentimentChange?: number;
    engagementScore?: number;
    ratingCount?: number;
    commentCount?: number;
    reviewCount?: number;
    [key: string]: any;
  };
  priority: number; // Higher = more important (0-100)
}

export interface ActivityFeedFilters {
  itemType?: 'PRODUCT' | 'SERVICE';
  activityTypes?: ActivityType[];
  limit?: number;
  page?: number;
}

export const activityFeedService = {
  // ============================================================================
  // Activity Generation
  // ============================================================================

  async getActivityFeed(filters: ActivityFeedFilters = {}) {
    const { itemType, activityTypes, limit = 50, page = 1 } = filters;

    // Generate all activity types
    const activities: Activity[] = [];

    // 1. Review Streaks (Positive)
    const positiveStreaks = await this.getReviewStreaks('positive', itemType);
    activities.push(...positiveStreaks);

    // 2. Review Streaks (Negative)
    const negativeStreaks = await this.getReviewStreaks('negative', itemType);
    activities.push(...negativeStreaks);

    // 3. Trending Items (Rapid sentiment improvement)
    const trendingUp = await this.getTrendingItems('up', itemType);
    activities.push(...trendingUp);

    // 4. Declining Items (Rapid sentiment decline)
    const trendingDown = await this.getTrendingItems('down', itemType);
    activities.push(...trendingDown);

    // 5. New Products/Services
    const newItems = await this.getNewItems(itemType);
    activities.push(...newItems);

    // 6. High Engagement Items
    const highEngagement = await this.getHighEngagementItems(itemType);
    activities.push(...highEngagement);

    // 7. Controversial Items (Mixed reviews)
    const controversial = await this.getControversialItems(itemType);
    activities.push(...controversial);

    // 8. Rising Stars (Improving sentiment)
    const risingStars = await this.getRisingStars(itemType);
    activities.push(...risingStars);

    // 9. Rating Milestones
    const milestones = await this.getRatingMilestones(itemType);
    activities.push(...milestones);

    // 10. Activity Spikes (Recent surge in activity)
    const activitySpikes = await this.getActivitySpikes(itemType);
    activities.push(...activitySpikes);

    // 11. Most Discussed (High comment activity)
    const mostDiscussed = await this.getMostDiscussedItems(itemType);
    activities.push(...mostDiscussed);

    // 12. Sentiment Swings (Dramatic changes)
    const sentimentSwings = await this.getSentimentSwings(itemType);
    activities.push(...sentimentSwings);

    // Filter by activity types if specified
    let filteredActivities = activities;
    if (activityTypes && activityTypes.length > 0) {
      filteredActivities = activities.filter((a) => activityTypes.includes(a.type));
    }

    // Sort by priority and timestamp
    filteredActivities.sort((a, b) => {
      // First by priority (higher first)
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // Then by timestamp (newer first)
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedActivities = filteredActivities.slice(startIndex, endIndex);

    return {
      activities: paginatedActivities,
      meta: {
        total: filteredActivities.length,
        page,
        limit,
        totalPages: Math.ceil(filteredActivities.length / limit),
      },
    };
  },

  // ============================================================================
  // Activity Type Generators
  // ============================================================================

  async getReviewStreaks(sentiment: 'positive' | 'negative', itemType?: 'PRODUCT' | 'SERVICE') {
    const activities: Activity[] = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get items with recent reviews
    const where: any = {
      createdAt: { gte: sevenDaysAgo },
      sentiment: sentiment === 'positive' 
        ? { in: ['WOULD_RECOMMEND', 'ITS_GOOD'] }
        : 'ITS_BAD',
    };

    if (itemType === 'PRODUCT') {
      where.productId = { not: null };
    } else if (itemType === 'SERVICE') {
      where.serviceId = { not: null };
    }

    // Group reviews by item and count consecutive same-sentiment reviews
    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { id: true, productName: true, mainImage: true, isActive: true },
        },
        service: {
          select: { id: true, serviceName: true, mainImage: true, isActive: true },
        },
      },
    });

    // Group by item and find streaks
    const itemGroups = new Map<string, any[]>();
    reviews.forEach((review) => {
      const itemId = review.productId || review.serviceId;
      if (!itemId) return;

      if (!itemGroups.has(itemId)) {
        itemGroups.set(itemId, []);
      }
      itemGroups.get(itemId)!.push(review);
    });

    itemGroups.forEach((itemReviews, itemId) => {
      // Count consecutive reviews of same sentiment
      let streak = 1;
      for (let i = 1; i < itemReviews.length; i += 1) {
        if (itemReviews[i].sentiment === itemReviews[i - 1].sentiment) {
          streak += 1;
        } else {
          break;
        }
      }

      if (streak >= 3) {
        const review = itemReviews[0];
        const item = review.product || review.service;
        if (!item || !item.isActive) return;

        activities.push({
          id: `streak-${itemId}-${Date.now()}`,
          type: sentiment === 'positive' ? 'REVIEW_STREAK_POSITIVE' : 'REVIEW_STREAK_NEGATIVE',
          title: sentiment === 'positive' 
            ? `🔥 ${streak} Positive Reviews in a Row!`
            : `⚠️ ${streak} Negative Reviews in a Row`,
            description: sentiment === 'positive'
            ? `${'productName' in item ? item.productName : item.serviceName} is getting consistent positive feedback!`
            : `${'productName' in item ? item.productName : item.serviceName} needs attention - multiple negative reviews`,
          itemId,
          itemType: review.productId ? 'PRODUCT' : 'SERVICE',
          itemName: item.productName || item.serviceName,
          itemImage: item.mainImage || undefined,
          timestamp: review.createdAt,
          metadata: {
            streakCount: streak,
          },
          priority: streak * 10 + (sentiment === 'positive' ? 50 : 40),
        });
      }
    });

    return activities;
  },

  async getTrendingItems(direction: 'up' | 'down', itemType?: 'PRODUCT' | 'SERVICE') {
    const activities: Activity[] = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const where: any = {};
    if (itemType === 'PRODUCT') {
      where.productId = { not: null };
    } else if (itemType === 'SERVICE') {
      where.serviceId = { not: null };
    }

    // Get items with reviews in both periods
    const recentReviews = await prisma.review.findMany({
      where: {
        ...where,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    const olderReviews = await prisma.review.findMany({
      where: {
        ...where,
        createdAt: { gte: thirtyDaysAgo, lt: sevenDaysAgo },
      },
    });

    // Calculate sentiment change per item
    const itemSentimentChange = new Map<string, number>();

    const calculateSentimentScore = (reviews: any[]) => {
      const positive = reviews.filter(
        (r) => r.sentiment === 'WOULD_RECOMMEND' || r.sentiment === 'ITS_GOOD'
      ).length;
      const total = reviews.length;
      return total > 0 ? (positive / total) * 100 : 0;
    };

    const recentGroups = new Map<string, any[]>();
    recentReviews.forEach((r) => {
      const itemId = r.productId || r.serviceId;
      if (!itemId) return;
      if (!recentGroups.has(itemId)) recentGroups.set(itemId, []);
      recentGroups.get(itemId)!.push(r);
    });

    const olderGroups = new Map<string, any[]>();
    olderReviews.forEach((r) => {
      const itemId = r.productId || r.serviceId;
      if (!itemId) return;
      if (!olderGroups.has(itemId)) olderGroups.set(itemId, []);
      olderGroups.get(itemId)!.push(r);
    });

    recentGroups.forEach((reviews, itemId) => {
      const recentScore = calculateSentimentScore(reviews);
      const olderScore = calculateSentimentScore(olderGroups.get(itemId) || []);
      const change = recentScore - olderScore;

      if (direction === 'up' && change > 15) {
        itemSentimentChange.set(itemId, change);
      } else if (direction === 'down' && change < -15) {
        itemSentimentChange.set(itemId, change);
      }
    });

    // Get item details for trending items
    const trendingActivities = await Promise.all(
      Array.from(itemSentimentChange.entries()).map(async ([itemId, change]) => {
        const item = await prisma.product.findUnique({
          where: { id: itemId },
          select: { id: true, productName: true, mainImage: true },
        }) || await prisma.service.findUnique({
          where: { id: itemId },
          select: { id: true, serviceName: true, mainImage: true },
        });

        if (!item) return null;

        return {
          id: `trending-${itemId}-${Date.now()}`,
          type: direction === 'up' ? 'TRENDING_UP' : 'TRENDING_DOWN' as ActivityType,
          title: direction === 'up'
            ? `📈 Sentiment Improving Rapidly!`
            : `📉 Sentiment Declining`,
            description: direction === 'up'
            ? `${'productName' in item ? item.productName : item.serviceName} is gaining positive momentum!`
            : `${'productName' in item ? item.productName : item.serviceName} sentiment is dropping`,
          itemId,
          itemType: (item as any).productName ? 'PRODUCT' : 'SERVICE' as 'PRODUCT' | 'SERVICE',
          itemName: (item as any).productName || (item as any).serviceName,
          itemImage: item.mainImage || undefined,
          timestamp: new Date(),
          metadata: {
            sentimentChange: Math.round(change),
          },
          priority: Math.abs(change) * 2 + 60,
        };
      })
    );

    trendingActivities.forEach((activity) => {
      if (activity) {
        activities.push(activity);
      }
    });

    return activities;
  },

  async getNewItems(itemType?: 'PRODUCT' | 'SERVICE') {
    const activities: Activity[] = [];
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const where: any = {
      createdAt: { gte: threeDaysAgo },
      isActive: true,
    };

    if (itemType === 'PRODUCT') {
      const products = await prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      products.forEach((product) => {
        activities.push({
          id: `new-product-${product.id}`,
          type: 'NEW_PRODUCT',
          title: '✨ New Product Added!',
          description: `${product.productName} is now available`,
          itemId: product.id,
          itemType: 'PRODUCT',
          itemName: product.productName,
          itemImage: product.mainImage || undefined,
          timestamp: product.createdAt,
          metadata: {},
          priority: 30,
        });
      });
    }

    if (itemType === 'SERVICE' || !itemType) {
      const services = await prisma.service.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      services.forEach((service) => {
        activities.push({
          id: `new-service-${service.id}`,
          type: 'NEW_SERVICE',
          title: '✨ New Service Added!',
          description: `${service.serviceName} is now available`,
          itemId: service.id,
          itemType: 'SERVICE',
          itemName: service.serviceName,
          itemImage: service.mainImage || undefined,
          timestamp: service.createdAt,
          metadata: {},
          priority: 30,
        });
      });
    }

    return activities;
  },

  async getHighEngagementItems(itemType?: 'PRODUCT' | 'SERVICE') {
    const activities: Activity[] = [];

    // Get items with high combined engagement (reviews + comments)
    const where: any = {};
    if (itemType === 'PRODUCT') {
      where.productId = { not: null };
    } else if (itemType === 'SERVICE') {
      where.serviceId = { not: null };
    }

    // Get items with most reviews in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentReviews = await prisma.review.groupBy({
      by: itemType === 'PRODUCT' ? ['productId'] : ['serviceId'],
      where: {
        ...where,
        createdAt: { gte: sevenDaysAgo },
      },
      _count: true,
      orderBy: {
        _count: {
          [itemType === 'PRODUCT' ? 'productId' : 'serviceId']: 'desc',
        },
      },
      take: 10,
    });

    const engagementActivities = await Promise.all(
      recentReviews
        .filter((group) => {
          const itemId = (group.productId || group.serviceId) as string;
          return !!itemId;
        })
        .map(async (group) => {
          const itemId = (group.productId || group.serviceId) as string;
          const item = await prisma.product.findUnique({
            where: { id: itemId },
            select: { id: true, productName: true, mainImage: true, isActive: true },
          }) || await prisma.service.findUnique({
            where: { id: itemId },
            select: { id: true, serviceName: true, mainImage: true, isActive: true },
          });

          if (!item || !item.isActive) return null;

          const commentCount = await prisma.comment.count({
            where: {
              [itemType === 'PRODUCT' ? 'productId' : 'serviceId']: itemId,
              createdAt: { gte: sevenDaysAgo },
            },
          });

          const engagementScore = group._count + commentCount * 0.5;

          if (engagementScore >= 5) {
            return {
              id: `engagement-${itemId}-${Date.now()}`,
              type: 'HIGH_ENGAGEMENT' as ActivityType,
              title: '🔥 High Engagement!',
              description: `${'productName' in item ? item.productName : item.serviceName} is getting lots of attention`,
              itemId,
              itemType: 'productName' in item ? 'PRODUCT' : 'SERVICE' as 'PRODUCT' | 'SERVICE',
              itemName: 'productName' in item ? item.productName : item.serviceName,
              itemImage: item.mainImage || undefined,
              timestamp: new Date(),
              metadata: {
                engagementScore: Math.round(engagementScore),
                reviewCount: group._count,
                commentCount,
              },
              priority: Math.round(engagementScore * 5),
            };
          }
          return null;
        })
    );

    engagementActivities.forEach((activity) => {
      if (activity) {
        activities.push(activity);
      }
    });

    return activities;
  },

  async getControversialItems(itemType?: 'PRODUCT' | 'SERVICE') {
    const activities: Activity[] = [];

    // Items with both high positive and negative reviews
    const where: any = { isActive: true };

    const items = itemType === 'PRODUCT'
      ? await prisma.product.findMany({
          where,
          select: {
            id: true,
            productName: true,
            mainImage: true,
            positiveReviews: true,
            negativeReviews: true,
            totalReviews: true,
          },
          take: 100,
        })
      : await prisma.service.findMany({
          where,
          select: {
            id: true,
            serviceName: true,
            mainImage: true,
            positiveReviews: true,
            negativeReviews: true,
            totalReviews: true,
          },
          take: 100,
        });

    items.forEach((item: any) => {
      if (item.totalReviews >= 10) {
        const positiveRatio = item.positiveReviews / item.totalReviews;
        const negativeRatio = item.negativeReviews / item.totalReviews;

        // Controversial = both positive and negative are significant (>20% each)
        if (positiveRatio > 0.2 && negativeRatio > 0.2) {
          activities.push({
            id: `controversial-${item.id}-${Date.now()}`,
            type: 'CONTROVERSIAL',
            title: '⚡ Mixed Opinions',
            description: `${item.productName || item.serviceName} has divided opinions`,
            itemId: item.id,
            itemType: item.productName ? 'PRODUCT' : 'SERVICE',
            itemName: item.productName || item.serviceName,
            itemImage: item.mainImage || undefined,
            timestamp: new Date(),
            metadata: {
              positiveRatio: Math.round(positiveRatio * 100),
              negativeRatio: Math.round(negativeRatio * 100),
            },
            priority: 45,
          });
        }
      }
    });

    return activities;
  },

  async getRisingStars(itemType?: 'PRODUCT' | 'SERVICE') {
    // Similar to trending up but for newer items
    return this.getTrendingItems('up', itemType);
  },

  async getRatingMilestones(itemType?: 'PRODUCT' | 'SERVICE') {
    const activities: Activity[] = [];
    const milestones = [50, 100, 250, 500, 1000];

    const where: any = { isActive: true };

    const items = itemType === 'PRODUCT'
      ? await prisma.product.findMany({
          where,
          select: {
            id: true,
            productName: true,
            mainImage: true,
            quickRatingTotal: true,
          },
        })
      : await prisma.service.findMany({
          where,
          select: {
            id: true,
            serviceName: true,
            mainImage: true,
            quickRatingTotal: true,
          },
        });

    items.forEach((item: any) => {
      const matchingMilestone = milestones.find(
        (milestone) => item.quickRatingTotal >= milestone && item.quickRatingTotal < milestone + 10
      );

      if (matchingMilestone) {
        activities.push({
          id: `milestone-${item.id}-${matchingMilestone}`,
          type: 'RATING_MILESTONE' as ActivityType,
          title: `🎯 ${matchingMilestone} Ratings Milestone!`,
          description: `${item.productName || item.serviceName} reached ${matchingMilestone} ratings!`,
          itemId: item.id,
          itemType: item.productName ? 'PRODUCT' : 'SERVICE' as 'PRODUCT' | 'SERVICE',
          itemName: item.productName || item.serviceName,
          itemImage: item.mainImage || undefined,
          timestamp: new Date(),
          metadata: {
            ratingCount: matchingMilestone,
          },
          priority: matchingMilestone / 10,
        });
      }
    });

    return activities;
  },

  async getActivitySpikes(itemType?: 'PRODUCT' | 'SERVICE') {
    // Items with sudden increase in activity
    return this.getHighEngagementItems(itemType);
  },

  async getMostDiscussedItems(itemType?: 'PRODUCT' | 'SERVICE') {
    const activities: Activity[] = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const where: any = {
      createdAt: { gte: sevenDaysAgo },
      isDeleted: false,
    };

    if (itemType === 'PRODUCT') {
      where.productId = { not: null };
    } else if (itemType === 'SERVICE') {
      where.serviceId = { not: null };
    }

    const commentGroups = await prisma.comment.groupBy({
      by: itemType === 'PRODUCT' ? ['productId'] : ['serviceId'],
      where,
      _count: true,
      orderBy: {
        _count: {
          [itemType === 'PRODUCT' ? 'productId' : 'serviceId']: 'desc',
        },
      },
      take: 10,
    });

    const discussedActivities = await Promise.all(
      commentGroups
        .filter((group) => {
          const itemId = (group.productId || group.serviceId) as string;
          return !!itemId && group._count >= 10;
        })
        .map(async (group) => {
          const itemId = (group.productId || group.serviceId) as string;
          const item = await prisma.product.findUnique({
            where: { id: itemId },
            select: { id: true, productName: true, mainImage: true },
          }) || await prisma.service.findUnique({
            where: { id: itemId },
            select: { id: true, serviceName: true, mainImage: true },
          });

          if (!item) return null;

          return {
            id: `discussed-${itemId}-${Date.now()}`,
            type: 'MOST_DISCUSSED' as ActivityType,
            title: '💬 Hot Discussion!',
            description: `${'productName' in item ? item.productName : item.serviceName} is generating lots of discussion`,
            itemId,
            itemType: (item as any).productName ? 'PRODUCT' : 'SERVICE' as 'PRODUCT' | 'SERVICE',
            itemName: (item as any).productName || (item as any).serviceName,
            itemImage: item.mainImage || undefined,
            timestamp: new Date(),
            metadata: {
              commentCount: group._count,
            },
            priority: group._count * 2,
          };
        })
    );

    discussedActivities.forEach((activity) => {
      if (activity) {
        activities.push(activity);
      }
    });

    return activities;
  },

  async getSentimentSwings(itemType?: 'PRODUCT' | 'SERVICE') {
    // Dramatic sentiment changes (similar to trending but more extreme)
    const trendingUp = await this.getTrendingItems('up', itemType);
    const trendingDown = await this.getTrendingItems('down', itemType);
    return [...trendingUp, ...trendingDown];
  },
};

