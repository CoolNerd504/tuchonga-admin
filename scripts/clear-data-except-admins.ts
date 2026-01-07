/**
 * Clear All Data Except Super Admin and Admin Users
 * 
 * This script deletes all data from the database except users with
 * role 'super_admin' or 'admin'. This ensures a clean slate for
 * importing Firebase data.
 * 
 * Usage: tsx scripts/clear-data-except-admins.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDataExceptAdmins() {
  console.log('🧹 Starting database cleanup (preserving admins)...\n');

  try {
    // Step 1: Get admin user IDs to preserve
    const adminUsers = await prisma.user.findMany({
      where: {
        role: {
          in: ['super_admin', 'admin'],
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    console.log(`✅ Found ${adminUsers.length} admin users to preserve:`);
    adminUsers.forEach((user) => {
      console.log(`   - ${user.email} (${user.role})`);
    });
    console.log('');

    const adminUserIds = adminUsers.map((u) => u.id);

    // Step 2: Delete in order to respect foreign key constraints
    // Start with child tables that reference other tables

    console.log('🗑️  Deleting data (preserving admins)...\n');

    // Delete Survey responses (if any)
    const surveyCount = await prisma.survey.count();
    if (surveyCount > 0) {
      await prisma.survey.deleteMany({});
      console.log(`   ✅ Deleted ${surveyCount} surveys`);
    }

    // Delete Survey Templates
    const surveyTemplateCount = await prisma.surveyTemplate.count();
    if (surveyTemplateCount > 0) {
      await prisma.surveyTemplate.deleteMany({});
      console.log(`   ✅ Deleted ${surveyTemplateCount} survey templates`);
    }

    // Delete Favorites (but preserve admin favorites if needed)
    const favoriteCount = await prisma.favorite.count();
    if (favoriteCount > 0) {
      await prisma.favorite.deleteMany({});
      console.log(`   ✅ Deleted ${favoriteCount} favorites`);
    }

    // Delete Quick Ratings
    const quickRatingCount = await prisma.quickRating.count();
    if (quickRatingCount > 0) {
      await prisma.quickRating.deleteMany({});
      console.log(`   ✅ Deleted ${quickRatingCount} quick ratings`);
    }

    // Delete Comment Reactions
    const commentReactionCount = await prisma.commentReaction.count();
    if (commentReactionCount > 0) {
      await prisma.commentReaction.deleteMany({});
      console.log(`   ✅ Deleted ${commentReactionCount} comment reactions`);
    }

    // Delete Comments
    const commentCount = await prisma.comment.count();
    if (commentCount > 0) {
      await prisma.comment.deleteMany({});
      console.log(`   ✅ Deleted ${commentCount} comments`);
    }

    // Delete Reviews
    const reviewCount = await prisma.review.count();
    if (reviewCount > 0) {
      await prisma.review.deleteMany({});
      console.log(`   ✅ Deleted ${reviewCount} reviews`);
    }

    // Delete Product-Category relationships
    const productCategoryCount = await prisma.productCategory.count();
    if (productCategoryCount > 0) {
      await prisma.productCategory.deleteMany({});
      console.log(`   ✅ Deleted ${productCategoryCount} product-category relationships`);
    }

    // Delete Service-Category relationships
    const serviceCategoryCount = await prisma.serviceCategory.count();
    if (serviceCategoryCount > 0) {
      await prisma.serviceCategory.deleteMany({});
      console.log(`   ✅ Deleted ${serviceCategoryCount} service-category relationships`);
    }

    // Delete Products
    const productCount = await prisma.product.count();
    if (productCount > 0) {
      await prisma.product.deleteMany({});
      console.log(`   ✅ Deleted ${productCount} products`);
    }

    // Delete Services
    const serviceCount = await prisma.service.count();
    if (serviceCount > 0) {
      await prisma.service.deleteMany({});
      console.log(`   ✅ Deleted ${serviceCount} services`);
    }

    // Delete Categories
    const categoryCount = await prisma.category.count();
    if (categoryCount > 0) {
      await prisma.category.deleteMany({});
      console.log(`   ✅ Deleted ${categoryCount} categories`);
    }

    // Delete Businesses
    const businessCount = await prisma.business.count();
    if (businessCount > 0) {
      await prisma.business.deleteMany({});
      console.log(`   ✅ Deleted ${businessCount} businesses`);
    }

    // Delete User Analytics (but preserve admin analytics)
    const userAnalyticsCount = await prisma.userAnalytics.count({
      where: {
        userId: {
          notIn: adminUserIds,
        },
      },
    });
    if (userAnalyticsCount > 0) {
      await prisma.userAnalytics.deleteMany({
        where: {
          userId: {
            notIn: adminUserIds,
          },
        },
      });
      console.log(`   ✅ Deleted ${userAnalyticsCount} user analytics (non-admin)`);
    }

    // Delete Staff (but preserve admin staff if any)
    const staffCount = await prisma.staff.count({
      where: {
        userId: {
          notIn: adminUserIds,
        },
      },
    });
    if (staffCount > 0) {
      await prisma.staff.deleteMany({
        where: {
          userId: {
            notIn: adminUserIds,
          },
        },
      });
      console.log(`   ✅ Deleted ${staffCount} staff members (non-admin)`);
    }

    // Delete Users (but preserve admins)
    const userCount = await prisma.user.count({
      where: {
        role: {
          notIn: ['super_admin', 'admin'],
        },
      },
    });
    if (userCount > 0) {
      await prisma.user.deleteMany({
        where: {
          role: {
            notIn: ['super_admin', 'admin'],
          },
        },
      });
      console.log(`   ✅ Deleted ${userCount} users (non-admin)`);
    }

    // AdminAuth and Staff records for admins are preserved automatically
    // because we're not deleting admin users

    console.log('\n✅ Database cleanup complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Admin users preserved: ${adminUsers.length}`);
    console.log(`   - All other data cleared`);
    console.log(`\n✨ Ready for Firebase data import!`);
  } catch (error: any) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearDataExceptAdmins()
  .then(() => {
    console.log('\n🎉 Cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error);
    process.exit(1);
  });

