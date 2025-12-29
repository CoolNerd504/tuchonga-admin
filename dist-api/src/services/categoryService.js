"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryService = void 0;
const prismaService_1 = require("./prismaService");
exports.categoryService = {
    // Get all categories
    async getAll(type) {
        return prismaService_1.prisma.category.findMany({
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
        return prismaService_1.prisma.category.findUnique({
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
        return prismaService_1.prisma.category.findUnique({
            where: { name },
        });
    },
    // Create category
    async create(data) {
        return prismaService_1.prisma.category.create({
            data,
        });
    },
    // Update category
    async update(id, data) {
        return prismaService_1.prisma.category.update({
            where: { id },
            data,
        });
    },
    // Delete category
    async delete(id) {
        return prismaService_1.prisma.category.delete({
            where: { id },
        });
    },
    // Get categories by type
    async getByType(type) {
        return prismaService_1.prisma.category.findMany({
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
