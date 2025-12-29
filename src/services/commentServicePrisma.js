import { prisma } from './prismaService';
export const commentServicePrisma = {
    // ============================================================================
    // CRUD Operations
    // ============================================================================
    async createComment(data) {
        const { userId, userName, userAvatar, itemId, itemType, text, parentId } = data;
        // Calculate depth
        let depth = 0;
        if (parentId) {
            const parent = await prisma.comment.findUnique({
                where: { id: parentId },
            });
            if (parent) {
                depth = Math.min(parent.depth + 1, 2); // Max depth of 2
            }
        }
        // Determine product/service ID based on itemType
        const productId = itemType === 'PRODUCT' ? itemId : null;
        const serviceId = itemType === 'SERVICE' ? itemId : null;
        const comment = await prisma.comment.create({
            data: {
                userId,
                userName,
                userAvatar,
                itemId,
                itemType,
                productId,
                serviceId,
                text,
                parentId,
                depth,
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
                reactions: true,
            },
        });
        // Update parent reply count
        if (parentId) {
            await prisma.comment.update({
                where: { id: parentId },
                data: {
                    replyCount: { increment: 1 },
                },
            });
        }
        // Update user analytics
        await this.updateUserCommentAnalytics(userId, itemType);
        return comment;
    },
    async getCommentById(id) {
        return prisma.comment.findUnique({
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
                reactions: true,
            },
        });
    },
    async getAllComments(filters = {}) {
        const { itemId, itemType, userId, parentId, isDeleted = false, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', hasReplies, search, } = filters;
        const where = {
            isDeleted,
        };
        if (itemId)
            where.itemId = itemId;
        if (itemType)
            where.itemType = itemType;
        if (userId)
            where.userId = userId;
        if (parentId !== undefined)
            where.parentId = parentId;
        if (hasReplies === true) {
            where.replyCount = { gt: 0 };
        }
        if (search) {
            where.text = { contains: search, mode: 'insensitive' };
        }
        const [comments, total] = await Promise.all([
            prisma.comment.findMany({
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
                    reactions: true,
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.comment.count({ where }),
        ]);
        return {
            comments,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
    async getProductComments(productId, filters = {}) {
        return this.getAllComments({
            ...filters,
            itemId: productId,
            itemType: 'PRODUCT',
            parentId: null, // Only root comments
        });
    },
    async getServiceComments(serviceId, filters = {}) {
        return this.getAllComments({
            ...filters,
            itemId: serviceId,
            itemType: 'SERVICE',
            parentId: null, // Only root comments
        });
    },
    async getCommentReplies(parentId, filters = {}) {
        return this.getAllComments({
            ...filters,
            parentId,
        });
    },
    async updateComment(id, userId, data) {
        const comment = await prisma.comment.findUnique({
            where: { id },
        });
        if (!comment) {
            throw new Error('Comment not found');
        }
        if (comment.userId !== userId) {
            throw new Error('Not authorized to update this comment');
        }
        return prisma.comment.update({
            where: { id },
            data: {
                text: data.text,
                isEdited: true,
                editedAt: new Date(),
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
                reactions: true,
            },
        });
    },
    async deleteComment(id, userId, isAdmin = false) {
        const comment = await prisma.comment.findUnique({
            where: { id },
        });
        if (!comment) {
            throw new Error('Comment not found');
        }
        if (!isAdmin && comment.userId !== userId) {
            throw new Error('Not authorized to delete this comment');
        }
        // Soft delete
        await prisma.comment.update({
            where: { id },
            data: { isDeleted: true },
        });
        // Update parent reply count
        if (comment.parentId) {
            await prisma.comment.update({
                where: { id: comment.parentId },
                data: {
                    replyCount: { decrement: 1 },
                },
            });
        }
        return { success: true };
    },
    // ============================================================================
    // Reactions
    // ============================================================================
    async reactToComment(commentId, userId, reactionType) {
        // Check for existing reaction
        const existingReaction = await prisma.commentReaction.findUnique({
            where: {
                userId_commentId: {
                    userId,
                    commentId,
                },
            },
        });
        if (existingReaction) {
            if (existingReaction.reactionType === reactionType) {
                // Remove reaction if same type
                return this.removeReaction(commentId, userId);
            }
            // Update reaction type
            const oldType = existingReaction.reactionType;
            await prisma.commentReaction.update({
                where: { id: existingReaction.id },
                data: { reactionType },
            });
            // Update comment counts
            const decrementField = oldType === 'AGREE' ? 'agreeCount' : 'disagreeCount';
            const incrementField = reactionType === 'AGREE' ? 'agreeCount' : 'disagreeCount';
            await prisma.comment.update({
                where: { id: commentId },
                data: {
                    [decrementField]: { decrement: 1 },
                    [incrementField]: { increment: 1 },
                },
            });
            return { action: 'updated', reactionType };
        }
        // Create new reaction
        await prisma.commentReaction.create({
            data: {
                commentId,
                userId,
                reactionType,
            },
        });
        // Update comment counts
        const incrementField = reactionType === 'AGREE' ? 'agreeCount' : 'disagreeCount';
        await prisma.comment.update({
            where: { id: commentId },
            data: {
                [incrementField]: { increment: 1 },
            },
        });
        // Update user analytics
        await this.updateUserReactionAnalytics(userId, reactionType);
        return { action: 'created', reactionType };
    },
    async removeReaction(commentId, userId) {
        const reaction = await prisma.commentReaction.findUnique({
            where: {
                userId_commentId: {
                    userId,
                    commentId,
                },
            },
        });
        if (!reaction) {
            throw new Error('Reaction not found');
        }
        await prisma.commentReaction.delete({
            where: { id: reaction.id },
        });
        // Update comment counts
        const decrementField = reaction.reactionType === 'AGREE' ? 'agreeCount' : 'disagreeCount';
        await prisma.comment.update({
            where: { id: commentId },
            data: {
                [decrementField]: { decrement: 1 },
            },
        });
        return { action: 'removed' };
    },
    async getUserReaction(commentId, userId) {
        return prisma.commentReaction.findUnique({
            where: {
                userId_commentId: {
                    userId,
                    commentId,
                },
            },
        });
    },
    // ============================================================================
    // Reporting
    // ============================================================================
    async reportComment(commentId, userId, reason) {
        await prisma.comment.update({
            where: { id: commentId },
            data: { isReported: true },
        });
        // You could also create a separate report record here if needed
        // For now, just marking the comment as reported
        return { success: true };
    },
    // ============================================================================
    // User Analytics
    // ============================================================================
    async updateUserCommentAnalytics(userId, itemType) {
        const incrementField = itemType === 'PRODUCT' ? { productComments: { increment: 1 } } : { serviceComments: { increment: 1 } };
        await prisma.userAnalytics.upsert({
            where: { userId },
            update: {
                totalComments: { increment: 1 },
                ...incrementField,
                lastCommentAt: new Date(),
            },
            create: {
                userId,
                totalComments: 1,
                productComments: itemType === 'PRODUCT' ? 1 : 0,
                serviceComments: itemType === 'SERVICE' ? 1 : 0,
                lastCommentAt: new Date(),
            },
        });
    },
    async updateUserReactionAnalytics(userId, reactionType) {
        const incrementField = reactionType === 'AGREE' ? { totalAgrees: { increment: 1 } } : { totalDisagrees: { increment: 1 } };
        await prisma.userAnalytics.upsert({
            where: { userId },
            update: incrementField,
            create: {
                userId,
                totalAgrees: reactionType === 'AGREE' ? 1 : 0,
                totalDisagrees: reactionType === 'DISAGREE' ? 1 : 0,
            },
        });
    },
    // ============================================================================
    // Statistics
    // ============================================================================
    async getCommentCount(filters) {
        const where = {
            isDeleted: false,
        };
        if (filters?.itemId)
            where.itemId = filters.itemId;
        if (filters?.itemType)
            where.itemType = filters.itemType;
        if (filters?.userId)
            where.userId = filters.userId;
        return prisma.comment.count({ where });
    },
};
