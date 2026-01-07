/**
 * Firebase to Prisma Data Transformation & Import Script
 * 
 * Transforms exported Firebase data and imports into PostgreSQL via Prisma
 * Handles both Mobile App and Admin Dashboard data
 * 
 * Usage: npm run migrate:import [export-directory]
 *        or: tsx scripts/import-to-prisma.ts [export-directory]
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

// Path to exported Firebase data
const EXPORT_DIR = process.argv[2] || path.join(__dirname, '..', 'exports', 'latest');

/**
 * Read JSON file from export directory
 */
function readExportFile(filename: string): any[] {
  const filePath = path.join(EXPORT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filename}`);
    return [];
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Map Firebase sentiment to Prisma enum
 */
function mapReviewSentiment(sentiment: string): string {
  const mapping: { [key: string]: string } = {
    'Would recommend': 'WOULD_RECOMMEND',
    'Its Good': 'ITS_GOOD',
    'Dont mind it': 'DONT_MIND_IT',
    "It's bad": 'ITS_BAD',
  };
  return mapping[sentiment] || 'DONT_MIND_IT';
}

/**
 * Map Firebase item type to Prisma enum
 */
function mapItemType(type: string): string {
  if (type === 'product' || type === 'Product') return 'PRODUCT';
  if (type === 'service' || type === 'Service') return 'SERVICE';
  return 'PRODUCT';
}

/**
 * Map Firebase category type to Prisma enum
 */
function mapCategoryType(type: string): string {
  return type === 'service' ? 'SERVICE' : 'PRODUCT';
}

/**
 * Import Users
 */
async function importUsers() {
  console.log('\n👤 Importing Users...');
  
  const users = readExportFile('users.json');
  let count = 0;
  
  for (const user of users) {
    try {
      await prisma.user.create({
        data: {
          id: user.id,
          firebaseAuthId: user.id, // Assuming Firebase doc ID = Auth UID
          email: user.email || null,
          phoneNumber: user.phoneNumber || user.mobile || null,
          fullName: user.fullName || null,
          displayName: user.displayName || null,
          firstname: user.firstname || null,
          lastname: user.lastname || null,
          profileImage: user.profileImage || null,
          location: user.location || null,
          mobile: user.mobile || null,
          hasCompletedProfile: user.hasCompletedProfile || false,
          profileCompletedAt: user.profileCompletedAt || null,
          isActive: user.isActive !== undefined ? user.isActive : true,
          role: user.role || 'user',
          createdAt: user.createdAt || new Date(),
          updatedAt: user.updatedAt || new Date(),
        },
      });
      count++;
    } catch (error: any) {
      console.error(`❌ Error importing user ${user.id}:`, error.message);
    }
  }
  
  console.log(`✅ Imported ${count}/${users.length} users`);
}

/**
 * Import User Analytics
 */
async function importUserAnalytics() {
  console.log('\n📊 Importing User Analytics...');
  
  const users = readExportFile('users.json');
  let count = 0;
  
  for (const user of users) {
    if (!user.analytics) continue;
    
    try {
      await prisma.userAnalytics.create({
        data: {
          userId: user.id,
          totalReviews: user.analytics.totalReviews || user.analytics.reviews?.totalReviews || 0,
          productReviews: user.analytics.reviews?.productReviews || 0,
          serviceReviews: user.analytics.reviews?.serviceReviews || 0,
          reviewHistory: user.analytics.reviews?.reviewHistory || [],
          lastReviewAt: user.analytics.reviews?.lastReviewAt || null,
          positiveReviews: user.analytics.reviews?.sentimentBreakdown?.positive || 0,
          neutralReviews: user.analytics.reviews?.sentimentBreakdown?.neutral || 0,
          negativeReviews: user.analytics.reviews?.sentimentBreakdown?.negative || 0,
          totalComments: user.analytics.comments?.totalComments || 0,
          productComments: user.analytics.comments?.productComments || 0,
          serviceComments: user.analytics.comments?.serviceComments || 0,
          commentHistory: user.analytics.comments?.commentHistory || [],
          lastCommentAt: user.analytics.comments?.lastCommentAt || null,
          totalReplies: user.analytics.comments?.totalReplies || 0,
          totalAgrees: user.analytics.comments?.totalAgrees || 0,
          totalDisagrees: user.analytics.comments?.totalDisagrees || 0,
          totalCoSigns: user.analytics.totalCoSigns || 0,
          totalFiftyFifty: user.analytics.totalFiftyFifty || 0,
        },
      });
      count++;
    } catch (error: any) {
      console.error(`❌ Error importing analytics for user ${user.id}:`, error.message);
    }
  }
  
  console.log(`✅ Imported ${count} user analytics`);
}

/**
 * Import Staff
 */
async function importStaff() {
  console.log('\n👔 Importing Staff...');
  
  const staff = readExportFile('staff.json');
  let count = 0;
  
  for (const member of staff) {
    try {
      // Check if user exists (staff should have corresponding user record)
      const userExists = await prisma.user.findUnique({
        where: { id: member.authUserId || member.id },
      });
      
      if (!userExists) {
        console.log(`⚠️  User not found for staff: ${member.email}`);
        continue;
      }
      
      await prisma.staff.create({
        data: {
          id: member.id,
          userId: member.authUserId || member.id,
          role: member.role || 'Records',
          mobile: member.mobile || null,
          isActive: member.isActive !== undefined ? member.isActive : true,
          createdAt: member.createdAt || new Date(),
          updatedAt: new Date(),
        },
      });
      count++;
    } catch (error: any) {
      console.error(`❌ Error importing staff ${member.id}:`, error.message);
    }
  }
  
  console.log(`✅ Imported ${count}/${staff.length} staff members`);
}

/**
 * Import Businesses
 */
async function importBusinesses() {
  console.log('\n🏢 Importing Businesses...');
  
  const businesses = readExportFile('businesses.json');
  let count = 0;
  
  for (const business of businesses) {
    try {
      await prisma.business.create({
        data: {
          id: business.id,
          name: business.name,
          businessEmail: business.business_email || null,
          businessPhone: business.business_phone || null,
          location: business.location || null,
          logo: business.logo || null,
          pocFirstname: business.poc_firstname || null,
          pocLastname: business.poc_lastname || null,
          pocPhone: business.poc_phone || null,
          isVerified: business.isVerified || false,
          status: business.status !== undefined ? business.status : true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      count++;
    } catch (error: any) {
      console.error(`❌ Error importing business ${business.id}:`, error.message);
    }
  }
  
  console.log(`✅ Imported ${count}/${businesses.length} businesses`);
}

/**
 * Import Categories
 */
async function importCategories() {
  console.log('\n📂 Importing Categories...');
  
  const categories = readExportFile('categories.json');
  let count = 0;
  
  for (const category of categories) {
    try {
      await prisma.category.create({
        data: {
          id: category.id,
          name: category.name,
          description: category.description || null,
          type: mapCategoryType(category.type),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      count++;
    } catch (error: any) {
      console.error(`❌ Error importing category ${category.id}:`, error.message);
    }
  }
  
  console.log(`✅ Imported ${count}/${categories.length} categories`);
}

/**
 * Import Products
 */
async function importProducts() {
  console.log('\n📦 Importing Products...');
  
  const products = readExportFile('products.json');
  let count = 0;
  
  for (const product of products) {
    try {
      // Find business by name (if productOwner is a business name)
      let businessId = null;
      if (product.productOwner) {
        const business = await prisma.business.findFirst({
          where: { name: product.productOwner },
        });
        businessId = business?.id || null;
      }
      
      await prisma.product.create({
        data: {
          id: product.id,
          productName: product.product_name,
          description: product.description || null,
          mainImage: product.mainImage || null,
          additionalImages: product.additionalImages || [],
          isActive: product.isActive !== undefined ? product.isActive : true,
          isVerified: product.isVerified !== undefined ? product.isVerified : false, // Default to false for imported items
          businessId,
          productOwner: product.productOwner || null,
          createdBy: product.createdBy || null, // Will be null for imported items, can be updated later
          totalViews: product.total_views || 0,
          totalReviews: product.total_reviews || 0,
          positiveReviews: product.positive_reviews || 0,
          neutralReviews: product.neutral_reviews || 0,
          negativeReviews: product.total_reviews 
            ? (product.total_reviews - (product.positive_reviews || 0) - (product.neutral_reviews || 0))
            : 0,
          quickRatingAvg: product.quickRating?.average || null,
          quickRatingTotal: product.quickRating?.total || 0,
          quickRating1: product.quickRating?.distribution?.['1'] || 0,
          quickRating2: product.quickRating?.distribution?.['2'] || 0,
          quickRating3: product.quickRating?.distribution?.['3'] || 0,
          quickRating4: product.quickRating?.distribution?.['4'] || 0,
          quickRating5: product.quickRating?.distribution?.['5'] || 0,
          createdAt: product.createdAt || new Date(),
          updatedAt: product.updatedAt || new Date(),
          lastUpdate: product.lastUpdate || product.updatedAt || null,
        },
      });
      count++;
      
      // Import product-category relationships
      if (product.category && Array.isArray(product.category)) {
        for (const categoryName of product.category) {
          const category = await prisma.category.findFirst({
            where: { name: categoryName },
          });
          
          if (category) {
            await prisma.productCategory.create({
              data: {
                productId: product.id,
                categoryId: category.id,
              },
            }).catch(() => {}); // Ignore duplicates
          }
        }
      }
    } catch (error: any) {
      console.error(`❌ Error importing product ${product.id}:`, error.message);
    }
  }
  
  console.log(`✅ Imported ${count}/${products.length} products`);
}

/**
 * Import Services
 */
async function importServices() {
  console.log('\n🛠️  Importing Services...');
  
  const services = readExportFile('services.json');
  let count = 0;
  
  for (const service of services) {
    try {
      // Find business by name
      let businessId = null;
      if (service.service_owner) {
        const business = await prisma.business.findFirst({
          where: { name: service.service_owner },
        });
        businessId = business?.id || null;
      }
      
      await prisma.service.create({
        data: {
          id: service.id,
          serviceName: service.service_name,
          description: service.description || null,
          mainImage: service.mainImage || null,
          additionalImages: service.additionalImages || [],
          isActive: service.isActive !== undefined ? service.isActive : true,
          isVerified: service.isVerified !== undefined ? service.isVerified : false, // Default to false for imported items
          businessId,
          serviceOwner: service.service_owner || null,
          createdBy: service.createdBy || null, // Will be null for imported items, can be updated later
          totalViews: service.total_views || 0,
          totalReviews: service.total_reviews || 0,
          positiveReviews: service.positive_reviews || 0,
          neutralReviews: service.neutral_reviews || 0,
          negativeReviews: service.total_reviews 
            ? (service.total_reviews - (service.positive_reviews || 0) - (service.neutral_reviews || 0))
            : 0,
          quickRatingAvg: service.quickRating?.average || null,
          quickRatingTotal: service.quickRating?.total || 0,
          quickRating1: service.quickRating?.distribution?.['1'] || 0,
          quickRating2: service.quickRating?.distribution?.['2'] || 0,
          quickRating3: service.quickRating?.distribution?.['3'] || 0,
          quickRating4: service.quickRating?.distribution?.['4'] || 0,
          quickRating5: service.quickRating?.distribution?.['5'] || 0,
          createdAt: service.createdAt || new Date(),
          updatedAt: service.updatedAt || new Date(),
          lastUpdate: service.lastUpdate || service.updatedAt || null,
        },
      });
      count++;
      
      // Import service-category relationships
      if (service.category && Array.isArray(service.category)) {
        for (const categoryName of service.category) {
          const category = await prisma.category.findFirst({
            where: { name: categoryName },
          });
          
          if (category) {
            await prisma.serviceCategory.create({
              data: {
                serviceId: service.id,
                categoryId: category.id,
              },
            }).catch(() => {}); // Ignore duplicates
          }
        }
      }
    } catch (error: any) {
      console.error(`❌ Error importing service ${service.id}:`, error.message);
    }
  }
  
  console.log(`✅ Imported ${count}/${services.length} services`);
}

/**
 * Import Reviews
 */
async function importReviews() {
  console.log('\n⭐ Importing Reviews...');
  
  const reviews = readExportFile('reviews.json');
  let count = 0;
  
  for (const review of reviews) {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({ where: { id: review.userId } });
      if (!user) {
        console.log(`⚠️  User not found for review ${review.id}: userId=${review.userId}`);
        continue;
      }

      // Check if product or service exists
      const productId = review.product_id;
      const serviceId = review.service_id;
      
      if (productId) {
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
          console.log(`⚠️  Product not found for review ${review.id}: productId=${productId}`);
          continue;
        }
      }
      
      if (serviceId) {
        const service = await prisma.service.findUnique({ where: { id: serviceId } });
        if (!service) {
          console.log(`⚠️  Service not found for review ${review.id}: serviceId=${serviceId}`);
          continue;
        }
      }

      if (!productId && !serviceId) {
        console.log(`⚠️  Skipping review ${review.id}: missing productId and serviceId`);
        continue;
      }

      await prisma.review.create({
        data: {
          id: review.id,
          userId: review.userId,
          productId: productId || null,
          serviceId: serviceId || null,
          sentiment: mapReviewSentiment(review.sentiment),
          text: review.text || null,
          reviewText: review.reviewText || null,
          sentimentHistory: review.sentimentHistory || null,
          createdAt: review.timestamp || new Date(),
          updatedAt: new Date(),
        },
      });
      count++;
    } catch (error: any) {
      console.error(`❌ Error importing review ${review.id}:`, error.message);
    }
  }
  
  console.log(`✅ Imported ${count}/${reviews.length} reviews`);
}

/**
 * Import Comments
 */
async function importComments() {
  console.log('\n💬 Importing Comments...');
  
  const comments = readExportFile('comments.json');
  let count = 0;
  
  for (const comment of comments) {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({ where: { id: comment.userId } });
      if (!user) {
        console.log(`⚠️  User not found for comment ${comment.id}: userId=${comment.userId}`);
        continue;
      }

      // Determine itemType and itemId (don't use parentId as itemId)
      const itemId = comment.itemId;
      if (!itemId) {
        console.log(`⚠️  Skipping comment ${comment.id}: missing itemId`);
        continue;
      }

      const itemType = comment.itemType 
        ? mapItemType(comment.itemType) 
        : (comment.parentType ? mapItemType(comment.parentType) : 'PRODUCT');
      
      // Try to find product or service
      let productId = null;
      let serviceId = null;
      
      if (itemType === 'PRODUCT') {
        const product = await prisma.product.findUnique({ where: { id: itemId } });
        if (!product) {
          console.log(`⚠️  Product not found for comment ${comment.id}: itemId=${itemId}`);
          continue; // Skip if product doesn't exist
        }
        productId = product.id;
      } else {
        const service = await prisma.service.findUnique({ where: { id: itemId } });
        if (!service) {
          console.log(`⚠️  Service not found for comment ${comment.id}: itemId=${itemId}`);
          continue; // Skip if service doesn't exist
        }
        serviceId = service.id;
      }

      // Check if parent comment exists (if parentId is set)
      if (comment.parentId) {
        const parentComment = await prisma.comment.findUnique({ where: { id: comment.parentId } });
        if (!parentComment) {
          console.log(`⚠️  Parent comment not found for comment ${comment.id}: parentId=${comment.parentId}`);
          // Continue anyway - might be imported later, or parent might not exist
        }
      }
      
      await prisma.comment.create({
        data: {
          id: comment.id,
          userId: comment.userId,
          userName: comment.userName,
          userAvatar: comment.userAvatar || null,
          itemId,
          itemType,
          productId,
          serviceId,
          text: comment.text,
          parentId: comment.parentId || null,
          depth: comment.depth || 0,
          agreeCount: comment.agreeCount || 0,
          disagreeCount: comment.disagreeCount || 0,
          replyCount: comment.replyCount || 0,
          isEdited: comment.isEdited || false,
          isReported: comment.isReported || false,
          isDeleted: comment.isDeleted || false,
          createdAt: comment.createdAt || comment.timestamp || new Date(),
          updatedAt: comment.updatedAt || new Date(),
          editedAt: comment.editedAt || null,
        },
      });
      count++;
    } catch (error: any) {
      console.error(`❌ Error importing comment ${comment.id}:`, error.message);
    }
  }
  
  console.log(`✅ Imported ${count}/${comments.length} comments`);
}

/**
 * Import Comment Reactions
 */
async function importCommentReactions() {
  console.log('\n👍 Importing Comment Reactions...');
  
  const reactions = readExportFile('commentReactions.json');
  let count = 0;
  
  for (const reaction of reactions) {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({ where: { id: reaction.userId } });
      if (!user) {
        console.log(`⚠️  User not found for reaction ${reaction.id}: userId=${reaction.userId}`);
        continue;
      }

      // Check if comment exists
      const comment = await prisma.comment.findUnique({ where: { id: reaction.commentId } });
      if (!comment) {
        console.log(`⚠️  Comment not found for reaction ${reaction.id}: commentId=${reaction.commentId}`);
        continue;
      }

      await prisma.commentReaction.create({
        data: {
          id: reaction.id,
          userId: reaction.userId,
          commentId: reaction.commentId,
          reactionType: reaction.reactionType === 'agree' ? 'AGREE' : 'DISAGREE',
          createdAt: reaction.createdAt || new Date(),
        },
      });
      count++;
    } catch (error: any) {
      console.error(`❌ Error importing reaction ${reaction.id}:`, error.message);
    }
  }
  
  console.log(`✅ Imported ${count}/${reactions.length} comment reactions`);
}

/**
 * Import Quick Ratings
 */
async function importQuickRatings() {
  console.log('\n😊 Importing Quick Ratings...');
  
  const ratings = readExportFile('quickRatings.json');
  let count = 0;
  
  for (const rating of ratings) {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({ where: { id: rating.userId } });
      if (!user) {
        console.log(`⚠️  User not found for quick rating ${rating.id}: userId=${rating.userId}`);
        continue;
      }

      // Extract itemId from various possible fields
      const itemId = rating.itemId || rating.productId || rating.product_id || rating.serviceId || rating.service_id;
      if (!itemId) {
        console.log(`⚠️  Skipping quick rating ${rating.id}: missing itemId/productId/serviceId`);
        continue;
      }

      // Determine itemType from source or itemType field
      let itemType = 'PRODUCT';
      if (rating.itemType) {
        itemType = mapItemType(rating.itemType);
      } else if (rating.source) {
        itemType = mapItemType(rating.source);
      } else if (rating.serviceId || rating.service_id) {
        itemType = 'SERVICE';
      }

      let productId = null;
      let serviceId = null;
      
      if (itemType === 'PRODUCT') {
        const product = await prisma.product.findUnique({ where: { id: itemId } });
        if (!product) {
          console.log(`⚠️  Product not found for quick rating ${rating.id}: itemId=${itemId}`);
          continue; // Skip if product doesn't exist
        }
        productId = product.id;
      } else {
        const service = await prisma.service.findUnique({ where: { id: itemId } });
        if (!service) {
          console.log(`⚠️  Service not found for quick rating ${rating.id}: itemId=${itemId}`);
          continue; // Skip if service doesn't exist
        }
        serviceId = service.id;
      }
      
      await prisma.quickRating.create({
        data: {
          id: rating.id,
          userId: rating.userId,
          itemId: itemId,
          itemType,
          productId,
          serviceId,
          rating: rating.rating,
          lastUpdated: rating.lastUpdated || rating.updatedAt || rating.timestamp || new Date(),
          createdAt: rating.createdAt || rating.timestamp || new Date(),
          updatedAt: rating.updatedAt || rating.timestamp || new Date(),
        },
      });
      count++;
    } catch (error: any) {
      console.error(`❌ Error importing quick rating ${rating.id}:`, error.message);
    }
  }
  
  console.log(`✅ Imported ${count}/${ratings.length} quick ratings`);
}

/**
 * Import Favorites
 */
async function importFavorites() {
  console.log('\n❤️  Importing Favorites...');
  
  const favorites = readExportFile('favorites.json');
  let count = 0;
  
  for (const favorite of favorites) {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({ where: { id: favorite.userId } });
      if (!user) {
        console.log(`⚠️  User not found for favorite ${favorite.id}: userId=${favorite.userId}`);
        continue;
      }

      // Skip if itemId is missing
      if (!favorite.itemId) {
        console.log(`⚠️  Skipping favorite ${favorite.id}: missing itemId`);
        continue;
      }

      const itemType = favorite.itemType ? mapItemType(favorite.itemType) : 'PRODUCT';
      let productId = null;
      let serviceId = null;
      
      if (itemType === 'PRODUCT') {
        const product = await prisma.product.findUnique({ where: { id: favorite.itemId } });
        if (!product) {
          console.log(`⚠️  Product not found for favorite ${favorite.id}: itemId=${favorite.itemId}`);
          continue; // Skip if product doesn't exist
        }
        productId = product.id;
      } else {
        const service = await prisma.service.findUnique({ where: { id: favorite.itemId } });
        if (!service) {
          console.log(`⚠️  Service not found for favorite ${favorite.id}: itemId=${favorite.itemId}`);
          continue; // Skip if service doesn't exist
        }
        serviceId = service.id;
      }
      
      await prisma.favorite.create({
        data: {
          id: favorite.id,
          userId: favorite.userId,
          itemId: favorite.itemId,
          itemType,
          productId,
          serviceId,
          createdAt: favorite.createdAt || new Date(),
        },
      });
      count++;
    } catch (error: any) {
      console.error(`❌ Error importing favorite ${favorite.id}:`, error.message);
    }
  }
  
  console.log(`✅ Imported ${count}/${favorites.length} favorites`);
}

/**
 * Main import function
 */
async function main() {
  console.log('🚀 Starting Firebase to Prisma Data Import');
  console.log(`📁 Reading from: ${EXPORT_DIR}\n`);
  
  try {
    // Order matters: import parent entities before children
    // Only import core data - skip user-generated content (comments, reviews, ratings, favorites)
    console.log('📋 Importing core data only (skipping user-generated content)...\n');
    
    await importUsers();
    await importUserAnalytics();
    await importStaff();
    await importBusinesses();
    await importCategories();
    await importProducts();
    await importServices();
    
    // Skip user-generated content:
    // - Reviews
    // - Comments
    // - Comment Reactions
    // - Quick Ratings
    // - Favorites
    console.log('\n⏭️  Skipped user-generated content (reviews, comments, ratings, favorites)');
    console.log('   This will be a clean slate for new user interactions.\n');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Import Complete!');
    console.log('='.repeat(60));
    console.log('\n🔍 Next Steps:');
    console.log('   1. Verify data in Prisma Studio: npx prisma studio');
    console.log('   2. Test application with new database');
    console.log('   3. Users can now create new reviews, comments, and ratings');
    console.log('\n');
  } catch (error) {
    console.error('\n❌ Fatal error during import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
main();




