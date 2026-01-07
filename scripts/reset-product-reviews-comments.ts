/**
 * Reset Product Reviews and Comments
 * 
 * This script resets all review and comment counts for all products to 0.
 * Optionally, it can also delete the actual Review, Comment, and QuickRating records.
 * 
 * Usage:
 *   npm run db:reset-product-reviews
 *   npm run db:reset-product-reviews -- --delete-reviews
 *   npm run db:reset-product-reviews -- --delete-comments
 *   npm run db:reset-product-reviews -- --delete-ratings
 *   npm run db:reset-product-reviews -- --delete-reviews --delete-comments --delete-ratings
 * 
 * Options:
 *   --counts-only      Only reset counts, don't delete records (default if no flags)
 *   --delete-reviews   Delete all Review records for products
 *   --delete-comments  Delete all Comment records for products
 *   --delete-ratings   Delete all QuickRating records for products
 * 
 * What gets reset:
 *   - totalReviews: 0
 *   - positiveReviews: 0
 *   - neutralReviews: 0
 *   - negativeReviews: 0
 *   - quickRatingTotal: 0
 *   - quickRatingAvg: null
 *   - quickRating1-5: 0
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

interface ResetOptions {
  resetCountsOnly?: boolean; // If true, only reset counts, don't delete records
  deleteReviews?: boolean; // Delete actual Review records
  deleteComments?: boolean; // Delete actual Comment records
  deleteQuickRatings?: boolean; // Delete actual QuickRating records
}

async function resetProductReviewsAndComments(options: ResetOptions = {}) {
  const {
    resetCountsOnly = false,
    deleteReviews = false,
    deleteComments = false,
    deleteQuickRatings = false,
  } = options;

  console.log('🔄 Starting Product Reviews and Comments Reset');
  console.log('='.repeat(60));
  console.log('Options:');
  console.log(`  - Reset counts only: ${resetCountsOnly}`);
  console.log(`  - Delete reviews: ${deleteReviews}`);
  console.log(`  - Delete comments: ${deleteComments}`);
  console.log(`  - Delete quick ratings: ${deleteQuickRatings}`);
  console.log('='.repeat(60));
  console.log('');

  try {
    // Get all products
    const products = await prisma.product.findMany({
      select: {
        id: true,
        productName: true,
        totalReviews: true,
        positiveReviews: true,
        neutralReviews: true,
        negativeReviews: true,
        quickRatingTotal: true,
        quickRatingAvg: true,
      },
    });

    console.log(`📦 Found ${products.length} products to process\n`);

    let processedCount = 0;
    let deletedReviewsCount = 0;
    let deletedCommentsCount = 0;
    let deletedQuickRatingsCount = 0;

    for (const product of products) {
      console.log(`Processing: ${product.productName} (${product.id})`);

      // Delete actual records if requested
      if (deleteReviews) {
        const deletedReviews = await prisma.review.deleteMany({
          where: { productId: product.id },
        });
        deletedReviewsCount += deletedReviews.count;
        console.log(`  ✅ Deleted ${deletedReviews.count} reviews`);
      }

      if (deleteComments) {
        const deletedComments = await prisma.comment.deleteMany({
          where: { productId: product.id },
        });
        deletedCommentsCount += deletedComments.count;
        console.log(`  ✅ Deleted ${deletedComments.count} comments`);
      }

      if (deleteQuickRatings) {
        const deletedRatings = await prisma.quickRating.deleteMany({
          where: { productId: product.id },
        });
        deletedQuickRatingsCount += deletedRatings.count;
        console.log(`  ✅ Deleted ${deletedRatings.count} quick ratings`);
      }

      // Reset all review and rating counts
      await prisma.product.update({
        where: { id: product.id },
        data: {
          // Review counts
          totalReviews: 0,
          positiveReviews: 0,
          neutralReviews: 0,
          negativeReviews: 0,
          // Quick rating counts
          quickRatingTotal: 0,
          quickRatingAvg: null,
          quickRating1: 0,
          quickRating2: 0,
          quickRating3: 0,
          quickRating4: 0,
          quickRating5: 0,
        },
      });

      console.log(`  ✅ Reset all counts to 0`);
      processedCount += 1;
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Reset Complete!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   - Products processed: ${processedCount}`);
    if (deleteReviews) {
      console.log(`   - Reviews deleted: ${deletedReviewsCount}`);
    }
    if (deleteComments) {
      console.log(`   - Comments deleted: ${deletedCommentsCount}`);
    }
    if (deleteQuickRatings) {
      console.log(`   - Quick ratings deleted: ${deletedQuickRatingsCount}`);
    }
    console.log(`   - All review counts reset to 0`);
    console.log(`   - All quick rating counts reset to 0`);
    console.log('='.repeat(60));
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Error during reset:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const options: ResetOptions = {
    resetCountsOnly: args.includes('--counts-only'),
    deleteReviews: args.includes('--delete-reviews'),
    deleteComments: args.includes('--delete-comments'),
    deleteQuickRatings: args.includes('--delete-ratings'),
  };

  // If no specific options, default to reset counts only (safest)
  if (!options.deleteReviews && !options.deleteComments && !options.deleteQuickRatings) {
    options.resetCountsOnly = true;
    console.log('ℹ️  No deletion flags specified. Defaulting to reset counts only.');
    console.log('   Use --delete-reviews, --delete-comments, or --delete-ratings to delete records.\n');
  }

  await resetProductReviewsAndComments(options);
}

main();

