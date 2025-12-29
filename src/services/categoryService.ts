import type { CategoryType } from '@prisma/client';
import { prisma } from './prismaService';

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

export const categoryService = {
  // Get all categories
  async getAll(type?: CategoryType) {
    return prisma.category.findMany({
      where: type ? { type } : undefined,
      include: {
        _count: {
          select: {
            products: true,
            services: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  },

  // Get category by ID
  async getById(id: string) {
    return prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                productName: true,
                mainImage: true,
                isActive: true,
              },
            },
          },
        },
        services: {
          include: {
            service: {
              select: {
                id: true,
                serviceName: true,
                mainImage: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: {
            products: true,
            services: true,
          },
        },
      },
    });
  },

  // Get category by name
  async getByName(name: string) {
    return prisma.category.findUnique({
      where: { name },
    });
  },

  // Create category
  async create(data: CreateCategoryData) {
    return prisma.category.create({
      data,
    });
  },

  // Update category
  async update(id: string, data: UpdateCategoryData) {
    return prisma.category.update({
      where: { id },
      data,
    });
  },

  // Delete category
  async delete(id: string) {
    return prisma.category.delete({
      where: { id },
    });
  },

  // Get categories by type
  async getByType(type: CategoryType) {
    return prisma.category.findMany({
      where: { type },
      include: {
        _count: {
          select: {
            products: type === 'PRODUCT',
            services: type === 'SERVICE',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  },
};

