"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryServicePrisma = void 0;
const prismaService_1 = require("./prismaService");
exports.categoryServicePrisma = {
    // ============================================================================
    // CRUD Operations
    // ============================================================================
    async createCategory(data) {
        // Check if category already exists
        const existing = await prismaService_1.prisma.category.findUnique({
            where: { name: data.name },
        });
        if (existing) {
            throw new Error('Category with this name already exists');
        }
        return prismaService_1.prisma.category.create({
            data,
        });
    },
    async getCategoryById(id) {
        return prismaService_1.prisma.category.findUnique({
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
    async getCategoryByName(name) {
        return prismaService_1.prisma.category.findUnique({
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
    async getAllCategories(filters = {}) {
        const { type, search, page = 1, limit = 100 } = filters;
        const where = {};
        if (type)
            where.type = type;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [categories, total] = await Promise.all([
            prismaService_1.prisma.category.findMany({
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
            prismaService_1.prisma.category.count({ where }),
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
    async updateCategory(id, data) {
        // Check if new name conflicts with existing
        if (data.name) {
            const existing = await prismaService_1.prisma.category.findFirst({
                where: {
                    name: data.name,
                    NOT: { id },
                },
            });
            if (existing) {
                throw new Error('Category with this name already exists');
            }
        }
        return prismaService_1.prisma.category.update({
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
    async deleteCategory(id) {
        // Check if category has products or services
        const category = await prismaService_1.prisma.category.findUnique({
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
            throw new Error(`Cannot delete category. It has ${category._count.products} products and ${category._count.services} services.`);
        }
        await prismaService_1.prisma.category.delete({
            where: { id },
        });
        return { success: true };
    },
    // ============================================================================
    // Statistics
    // ============================================================================
    async getCategoryStats() {
        const [productCategories, serviceCategories, categoriesWithCounts] = await Promise.all([
            prismaService_1.prisma.category.count({ where: { type: 'PRODUCT' } }),
            prismaService_1.prisma.category.count({ where: { type: 'SERVICE' } }),
            prismaService_1.prisma.category.findMany({
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
        const categoriesWithItems = categoriesWithCounts.filter((c) => c._count.products > 0 || c._count.services > 0);
        const emptyCategories = categoriesWithCounts.filter((c) => c._count.products === 0 && c._count.services === 0);
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
    async bulkCreateCategories(categories) {
        const results = {
            created: [],
            failed: [],
        };
        const promises = categories.map((cat) => this.createCategory(cat)
            .then(() => ({ success: true, name: cat.name }))
            .catch((error) => ({ success: false, name: cat.name, error: error.message })));
        const settled = await Promise.allSettled(promises);
        settled.forEach((result) => {
            if (result.status === 'fulfilled') {
                if (result.value.success) {
                    results.created.push(result.value.name);
                }
                else {
                    results.failed.push({ name: result.value.name, error: result.value.error });
                }
            }
            else {
                // This shouldn't happen since we catch in the promise, but handle it anyway
                const reason = result.reason;
                results.failed.push({ name: 'unknown', error: reason?.message || 'Unknown error' });
            }
        });
        return results;
    },
};
