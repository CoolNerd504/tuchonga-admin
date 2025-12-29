import type { Product, Prisma } from '@prisma/client';
import { prisma } from './prismaService';

export interface CreateProductData {
  productName: string;
  description?: string;
  mainImage?: string;
  additionalImages?: string[];
  businessId?: string;
  productOwner?: string;
  isActive?: boolean;
  categoryIds?: string[];
}

export interface UpdateProductData {
  productName?: string;
  description?: string;
  mainImage?: string;
  additionalImages?: string[];
  businessId?: string;
  productOwner?: string;
  isActive?: boolean;
  categoryIds?: string[];
}

export const productService = {
  // Get all products
  async getAll(options?: {
    includeInactive?: boolean;
    businessId?: string;
    categoryId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.ProductWhereInput = {};

    if (!options?.includeInactive) {
      where.isActive = true;
    }

    if (options?.businessId) {
      where.businessId = options.businessId;
    }

    if (options?.categoryId) {
      where.categories = {
        some: {
          categoryId: options.categoryId,
        },
      };
    }

    return prisma.product.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit,
      skip: options?.offset,
    });
  },

  // Get product by ID
  async getById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        business: true,
        reviews: {
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
          orderBy: {
            createdAt: 'desc',
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                displayName: true,
                profileImage: true,
              },
            },
            reactions: true,
          },
          where: {
            isDeleted: false,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            reviews: true,
            comments: true,
            favorites: true,
            quickRatings: true,
          },
        },
      },
    });
  },

  // Create product
  async create(data: CreateProductData) {
    const { categoryIds, ...productData } = data;

    return prisma.product.create({
      data: {
        ...productData,
        additionalImages: data.additionalImages || [],
        categories: categoryIds
          ? {
              create: categoryIds.map((categoryId) => ({
                categoryId,
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
  },

  // Update product
  async update(id: string, data: UpdateProductData) {
    const { categoryIds, ...productData } = data;

    // If categoryIds are provided, update categories
    if (categoryIds !== undefined) {
      // Delete existing categories
      await prisma.productCategory.deleteMany({
        where: { productId: id },
      });

      // Create new categories
      if (categoryIds.length > 0) {
        await prisma.productCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            productId: id,
            categoryId,
          })),
        });
      }
    }

    return prisma.product.update({
      where: { id },
      data: productData,
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        business: true,
      },
    });
  },

  // Delete product
  async delete(id: string) {
    return prisma.product.delete({
      where: { id },
    });
  },

  // Increment view count
  async incrementViews(id: string) {
    return prisma.product.update({
      where: { id },
      data: {
        totalViews: {
          increment: 1,
        },
      },
    });
  },

  // Get product statistics
  async getStats(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            reviews: true,
            comments: true,
            favorites: true,
            quickRatings: true,
          },
        },
      },
    });

    if (!product) return null;

    return {
      totalViews: product.totalViews,
      totalReviews: product._count.reviews,
      totalComments: product._count.comments,
      totalFavorites: product._count.favorites,
      totalQuickRatings: product._count.quickRatings,
      positiveReviews: product.positiveReviews,
      neutralReviews: product.neutralReviews,
      negativeReviews: product.negativeReviews,
    };
  },
};

