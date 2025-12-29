import { prisma } from './prismaService.js';
export const categoryService = {
    // Get all categories
    async getAll(type) {
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
    async getById(id) {
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
    async getByName(name) {
        return prisma.category.findUnique({
            where: { name },
        });
    },
    // Create category
    async create(data) {
        return prisma.category.create({
            data,
        });
    },
    // Update category
    async update(id, data) {
        return prisma.category.update({
            where: { id },
            data,
        });
    },
    // Delete category
    async delete(id) {
        return prisma.category.delete({
            where: { id },
        });
    },
    // Get categories by type
    async getByType(type) {
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
