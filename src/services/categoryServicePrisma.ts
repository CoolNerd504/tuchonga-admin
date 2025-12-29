import type { Prisma, CategoryType } from '@prisma/client';
import { prisma } from './prismaService';

// Types
export interface CategoryFilters {
  type?: CategoryType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  type: CategoryType;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  type?: CategoryType;
}

export const categoryServicePrisma = {
  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async createCategory(data: CreateCategoryData) {
    // Check if category already exists
    const existing = await prisma.category.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new Error('Category with this name already exists');
    }

    return prisma.category.create({
      data,
    });
  },

  async getCategoryById(id: string) {
    return prisma.category.findUnique({
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

  async getCategoryByName(name: string) {
    return prisma.category.findUnique({
      where: { name },
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

  async getAllCategories(filters: CategoryFilters = {}) {
    const { type, search, page = 1, limit = 100 } = filters;

    const where: Prisma.CategoryWhereInput = {};

    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        include: {
          _count: {
            select: {
              products: true,
              services: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.category.count({ where }),
    ]);

    return {
      categories,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getProductCategories() {
    return this.getAllCategories({ type: 'PRODUCT' });
  },

  async getServiceCategories() {
    return this.getAllCategories({ type: 'SERVICE' });
  },

  async updateCategory(id: string, data: UpdateCategoryData) {
    // Check if new name conflicts with existing
    if (data.name) {
      const existing = await prisma.category.findFirst({
        where: {
          name: data.name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new Error('Category with this name already exists');
      }
    }

    return prisma.category.update({
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

  async deleteCategory(id: string) {
    // Check if category has products or services
    const category = await prisma.category.findUnique({
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

    if (!category) {
      throw new Error('Category not found');
    }

    if (category._count.products > 0 || category._count.services > 0) {
      throw new Error(
        `Cannot delete category. It has ${category._count.products} products and ${category._count.services} services.`
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return { success: true };
  },

  // ============================================================================
  // Statistics
  // ============================================================================

  async getCategoryStats() {
    const [productCategories, serviceCategories, categoriesWithCounts] = await Promise.all([
      prisma.category.count({ where: { type: 'PRODUCT' } }),
      prisma.category.count({ where: { type: 'SERVICE' } }),
      prisma.category.findMany({
        include: {
          _count: {
            select: {
              products: true,
              services: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const categoriesWithItems = categoriesWithCounts.filter(
      (c) => c._count.products > 0 || c._count.services > 0
    );

    const emptyCategories = categoriesWithCounts.filter(
      (c) => c._count.products === 0 && c._count.services === 0
    );

    return {
      total: categoriesWithCounts.length,
      productCategories,
      serviceCategories,
      categoriesWithItems: categoriesWithItems.length,
      emptyCategories: emptyCategories.length,
      breakdown: categoriesWithCounts.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        productCount: c._count.products,
        serviceCount: c._count.services,
      })),
    };
  },

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  async bulkCreateCategories(categories: CreateCategoryData[]) {
    const results: { created: string[]; failed: { name: string; error: string }[] } = {
      created: [],
      failed: [],
    };

    for (const cat of categories) {
      try {
        await this.createCategory(cat);
        results.created.push(cat.name);
      } catch (error: any) {
        results.failed.push({ name: cat.name, error: error.message });
      }
    }

    return results;
  },
};


