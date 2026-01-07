# Firebase to Prisma Migration Guide
## TuChonga Mobile App + Admin Dashboard

This guide provides a complete step-by-step process for migrating from Firebase Firestore to Prisma + PostgreSQL, covering both the mobile app and admin dashboard.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Pre-Migration Setup](#pre-migration-setup)
4. [Step-by-Step Migration](#step-by-step-migration)
5. [Data Verification](#data-verification)
6. [Application Updates](#application-updates)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Rollback Plan](#rollback-plan)
10. [Post-Migration](#post-migration)

---

## 🎯 Overview

### Why Migrate to Prisma?

**Benefits:**
- ✅ **Type Safety**: Full TypeScript support with auto-generated types
- ✅ **Better Queries**: More powerful SQL queries vs NoSQL
- ✅ **Transactions**: ACID-compliant transactions
- ✅ **Relationships**: Proper foreign keys and joins
- ✅ **Performance**: Better indexing and query optimization
- ✅ **Cost**: Potentially lower costs vs Firestore
- ✅ **Flexibility**: Easier data migrations and schema changes

**Trade-offs:**
- ⚠️ **Offline Support**: Firestore has better built-in offline support
- ⚠️ **Real-time**: Need to implement real-time updates separately
- ⚠️ **Scalability**: Need to manage database scaling
- ⚠️ **Firebase Auth**: Still need Firebase for authentication (or migrate to another solution)

### Migration Scope

**Collections to Migrate:**
- ✅ Users (mobile + admin staff)
- ✅ Products
- ✅ Services
- ✅ Businesses
- ✅ Categories
- ✅ Reviews (sentiment-based)
- ✅ Comments (with threading)
- ✅ Quick Ratings (emoji-based)
- ✅ Favorites
- ✅ Comment Reactions
- ✅ User Analytics

**Total Documents:** ~[To be counted during export]

---

## 🛠️ Prerequisites

### 1. Tools & Software

```bash
# Node.js v18+
node --version

# npm or yarn
npm --version

# PostgreSQL
psql --version

# Firebase Admin SDK
npm install firebase-admin

# Prisma
npm install prisma @prisma/client

# TypeScript
npm install -D typescript ts-node @types/node
```

### 2. Database Setup

**Option A: Local PostgreSQL**
```bash
# macOS (via Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Create database
psql postgres
CREATE DATABASE tuchonga;
\q
```

**Option B: Cloud PostgreSQL**
- [Supabase](https://supabase.com/) (recommended, free tier)
- [Railway](https://railway.app/)
- [Neon](https://neon.tech/)
- [AWS RDS](https://aws.amazon.com/rds/)
- [Google Cloud SQL](https://cloud.google.com/sql)

### 3. Firebase Service Account

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save as `serviceAccountKey.json` in project root
4. Add to `.gitignore`:

```bash
echo "serviceAccountKey.json" >> .gitignore
```

---

## 🔧 Pre-Migration Setup

### Step 1: Install Dependencies

```bash
# In admin dashboard project
cd /path/to/admin-dashboard

# Install Prisma
npm install prisma @prisma/client

# Install Firebase Admin SDK
npm install firebase-admin

# Install dev dependencies
npm install -D typescript ts-node @types/node
```

### Step 2: Initialize Prisma

```bash
npx prisma init
```

This creates:
- `prisma/schema.prisma` - Database schema
- `.env` - Environment variables

### Step 3: Configure Database Connection

Edit `.env`:

```bash
# PostgreSQL connection string
DATABASE_URL="postgresql://username:password@localhost:5432/tuchonga?schema=public"

# For Supabase:
# DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
```

### Step 4: Copy Migration Files

Copy the provided files to your project:

```
scripts/
  ├── export-firebase-data.ts    # Export script
  └── import-to-prisma.ts         # Import script

prisma/
  └── schema.prisma               # Database schema
```

### Step 5: Backup Firebase Data

**Important:** Always backup before migration!

```bash
# Using Firebase CLI (full backup)
firebase firestore:export gs://[YOUR-BUCKET]/backups/$(date +%Y%m%d)

# Or use our export script (JSON files)
npx ts-node scripts/export-firebase-data.ts
```

---

## 📦 Step-by-Step Migration

### Phase 1: Export Firebase Data

```bash
# Run export script
npx ts-node scripts/export-firebase-data.ts
```

**What This Does:**
1. Connects to Firebase using service account
2. Exports all collections to JSON files
3. Converts Firestore Timestamps to ISO strings
4. Preserves document IDs
5. Creates export summary and README

**Output:**
```
exports/
  └── firebase-export-2025-12-28T12-00-00/
      ├── users.json
      ├── products.json
      ├── services.json
      ├── businesses.json
      ├── categories.json
      ├── reviews.json
      ├── comments.json
      ├── quickRatings.json
      ├── favorites.json
      ├── commentReactions.json
      ├── staff.json
      ├── firebase-auth-users.json
      ├── summary.json
      └── README.md
```

**Verification:**
```bash
# Check export summary
cat exports/latest/summary.json | jq

# Count documents
jq '. | length' exports/latest/users.json
jq '. | length' exports/latest/products.json
```

---

### Phase 2: Create Database Schema

The Prisma schema is already provided (`prisma/schema.prisma`). Review and customize if needed.

**Key Design Decisions:**

1. **IDs**: Using UUIDs for new records, preserving Firebase IDs for migrated data
2. **Timestamps**: Using PostgreSQL `timestamp` type
3. **Arrays**: Using PostgreSQL `text[]` for string arrays
4. **Nested Objects**: Using `Json` type for complex nested data (e.g., analytics)
5. **Enums**: Using Prisma enums for fixed values (sentiment, item type)
6. **Relationships**: Proper foreign keys with cascade deletes

**Create Database Tables:**

```bash
# Run migrations
npx prisma migrate dev --name init

# This creates tables and indexes
```

**Verify Schema:**

```bash
# Open Prisma Studio to view empty tables
npx prisma studio
```

---

### Phase 3: Import Data to Prisma

```bash
# Run import script (using latest export)
npx ts-node scripts/import-to-prisma.ts

# Or specify export directory
npx ts-node scripts/import-to-prisma.ts exports/firebase-export-2025-12-28T12-00-00
```

**Import Order (Important!):**
1. Users (no dependencies)
2. User Analytics (depends on Users)
3. Staff (depends on Users)
4. Businesses (no dependencies)
5. Categories (no dependencies)
6. Products (depends on Businesses, Categories)
7. Services (depends on Businesses, Categories)
8. Reviews (depends on Users, Products/Services)
9. Comments (depends on Users, Products/Services)
10. Comment Reactions (depends on Users, Comments)
11. Quick Ratings (depends on Users, Products/Services)
12. Favorites (depends on Users, Products/Services)

**What This Does:**
- Transforms Firebase data to Prisma format
- Creates records with preserved IDs
- Links relationships (foreign keys)
- Handles missing references gracefully
- Reports errors for debugging

**Expected Output:**
```
👤 Importing Users...
✅ Imported 1250/1250 users

📊 Importing User Analytics...
✅ Imported 1180 user analytics

👔 Importing Staff...
✅ Imported 5/5 staff members

🏢 Importing Businesses...
✅ Imported 45/45 businesses

📂 Importing Categories...
✅ Imported 12/12 categories

📦 Importing Products...
✅ Imported 320/320 products

🛠️  Importing Services...
✅ Imported 180/180 services

⭐ Importing Reviews...
✅ Imported 890/890 reviews

💬 Importing Comments...
✅ Imported 1540/1540 comments

👍 Importing Comment Reactions...
✅ Imported 3200/3200 comment reactions

😊 Importing Quick Ratings...
✅ Imported 2100/2100 quick ratings

❤️  Importing Favorites...
✅ Imported 650/650 favorites

✅ Import Complete!
```

---

### Phase 4: Verify Data Integrity

```bash
# Open Prisma Studio
npx prisma studio
```

**Manual Checks:**

1. **User Counts:**
```sql
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "UserAnalytics";
SELECT COUNT(*) FROM "Staff";
```

2. **Content Counts:**
```sql
SELECT COUNT(*) FROM "Product";
SELECT COUNT(*) FROM "Service";
SELECT COUNT(*) FROM "Business";
SELECT COUNT(*) FROM "Category";
```

3. **Engagement Counts:**
```sql
SELECT COUNT(*) FROM "Review";
SELECT COUNT(*) FROM "Comment";
SELECT COUNT(*) FROM "QuickRating";
SELECT COUNT(*) FROM "Favorite";
```

4. **Relationships:**
```sql
-- Products with categories
SELECT COUNT(*) FROM "ProductCategory";

-- Services with categories
SELECT COUNT(*) FROM "ServiceCategory";

-- Comments with reactions
SELECT COUNT(*) FROM "CommentReaction";
```

5. **Data Samples:**
```sql
-- Check user with analytics
SELECT u.*, ua.*
FROM "User" u
LEFT JOIN "UserAnalytics" ua ON u.id = ua."userId"
LIMIT 5;

-- Check product with categories
SELECT p.*, array_agg(c.name) as categories
FROM "Product" p
LEFT JOIN "ProductCategory" pc ON p.id = pc."productId"
LEFT JOIN "Category" c ON pc."categoryId" = c.id
GROUP BY p.id
LIMIT 5;

-- Check reviews by sentiment
SELECT sentiment, COUNT(*) as count
FROM "Review"
GROUP BY sentiment;
```

**Automated Verification Script:**

```bash
# Create verification script
cat > scripts/verify-data.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 Verifying Data Integrity\n');
  
  const counts = {
    users: await prisma.user.count(),
    userAnalytics: await prisma.userAnalytics.count(),
    staff: await prisma.staff.count(),
    businesses: await prisma.business.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    services: await prisma.service.count(),
    reviews: await prisma.review.count(),
    comments: await prisma.comment.count(),
    commentReactions: await prisma.commentReaction.count(),
    quickRatings: await prisma.quickRating.count(),
    favorites: await prisma.favorite.count(),
  };
  
  console.log('📊 Record Counts:');
  Object.entries(counts).forEach(([name, count]) => {
    console.log(`   ${name}: ${count}`);
  });
  
  // Check for orphaned records
  const orphanedReviews = await prisma.review.count({
    where: {
      AND: [
        { productId: null },
        { serviceId: null }
      ]
    }
  });
  
  const orphanedComments = await prisma.comment.count({
    where: {
      AND: [
        { productId: null },
        { serviceId: null }
      ]
    }
  });
  
  console.log('\n⚠️  Orphaned Records:');
  console.log(`   Reviews: ${orphanedReviews}`);
  console.log(`   Comments: ${orphanedComments}`);
  
  if (orphanedReviews === 0 && orphanedComments === 0) {
    console.log('\n✅ All relationships intact!');
  } else {
    console.log('\n❌ Found orphaned records - review import logs');
  }
  
  await prisma.$disconnect();
}

verify();
EOF

npx ts-node scripts/verify-data.ts
```

---

## 💻 Application Updates

### For Admin Dashboard (React + TypeScript)

#### Step 1: Install Prisma Client

```bash
npm install @prisma/client
npx prisma generate
```

#### Step 2: Create Prisma Service

```typescript
// src/services/prismaService.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// Helper: Convert Prisma dates to display format
export function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString();
}

// Helper: Pagination
export function getPaginationParams(page: number, limit: number) {
  return {
    skip: page * limit,
    take: limit,
  };
}
```

#### Step 3: Update User Service

```typescript
// src/services/userService.ts (New)
import { prisma } from './prismaService';

export async function getUsers(page: number = 0, limit: number = 10) {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip: page * limit,
      take: limit,
      include: {
        userAnalytics: true,
        staffProfile: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.user.count(),
  ]);

  return { users, total };
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      userAnalytics: true,
      reviews: true,
      comments: true,
      favorites: true,
    },
  });
}

export async function createUser(data: any) {
  return prisma.user.create({
    data: {
      email: data.email,
      phoneNumber: data.phoneNumber,
      fullName: data.fullName,
      displayName: data.displayName,
      profileImage: data.profileImage,
      hasCompletedProfile: true,
      role: 'user',
      userAnalytics: {
        create: {
          // Initialize analytics with zeros
        },
      },
    },
  });
}

export async function updateUser(id: string, data: any) {
  return prisma.user.update({
    where: { id },
    data,
  });
}
```

#### Step 4: Update Product Service

```typescript
// src/services/productService.ts (New)
import { prisma } from './prismaService';

export async function getProducts(page: number = 0, limit: number = 25) {
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      skip: page * limit,
      take: limit,
      include: {
        business: true,
        categories: {
          include: {
            category: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            comments: {
              where: { isDeleted: false },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.product.count(),
  ]);

  return { products, total };
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      business: true,
      categories: {
        include: {
          category: true,
        },
      },
      reviews: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      comments: {
        where: { isDeleted: false },
        include: {
          user: true,
          reactions: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });
}

export async function createProduct(data: any) {
  return prisma.product.create({
    data: {
      productName: data.product_name,
      description: data.description,
      mainImage: data.mainImage,
      additionalImages: data.additionalImages || [],
      productOwner: data.productOwner,
      businessId: data.businessId,
      isActive: data.isActive,
      categories: {
        create: data.categoryIds?.map((catId: string) => ({
          categoryId: catId,
        })),
      },
    },
  });
}

export async function updateProduct(id: string, data: any) {
  return prisma.product.update({
    where: { id },
    data: {
      productName: data.product_name,
      description: data.description,
      mainImage: data.mainImage,
      additionalImages: data.additionalImages,
      isActive: data.isActive,
      // Update categories if provided
      ...(data.categoryIds && {
        categories: {
          deleteMany: {},
          create: data.categoryIds.map((catId: string) => ({
            categoryId: catId,
          })),
        },
      }),
    },
  });
}

export async function incrementProductViews(id: string) {
  return prisma.product.update({
    where: { id },
    data: {
      totalViews: {
        increment: 1,
      },
    },
  });
}
```

#### Step 5: Update Dashboard Analytics

```typescript
// src/services/analyticsService.ts (New)
import { prisma } from './prismaService';

export async function getDashboardStats() {
  const [
    totalUsers,
    totalProducts,
    totalServices,
    totalBusinesses,
    genderDistribution,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.service.count(),
    prisma.business.count(),
    prisma.user.groupBy({
      by: ['gender'], // Add gender field to User model if needed
      _count: true,
    }),
  ]);

  // Calculate monthly trends
  const now = new Date();
  const months = Array.from({ length: 8 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (7 - i), 1);
    return date;
  });

  const userTrends = await Promise.all(
    months.map(month =>
      prisma.user.count({
        where: {
          createdAt: {
            gte: month,
            lt: new Date(month.getFullYear(), month.getMonth() + 1, 1),
          },
        },
      })
    )
  );

  return {
    counts: {
      users: totalUsers,
      products: totalProducts,
      services: totalServices,
      businesses: totalBusinesses,
    },
    trends: {
      users: userTrends,
    },
    genderDistribution,
  };
}
```

### For Mobile App (React Native + Redux)

Similar approach - create Prisma services and update Redux thunks to use Prisma instead of Firebase.

**Note:** Mobile apps typically can't connect directly to PostgreSQL. Options:
1. **Backend API**: Create REST/GraphQL API (Express, NestJS, etc.)
2. **Supabase**: Use Supabase client (has offline support)
3. **Hasura**: GraphQL API layer over PostgreSQL

---

## 🧪 Testing

### 1. Unit Tests

```typescript
// tests/services/productService.test.ts
import { getProducts, getProductById } from '../src/services/productService';
import { prisma } from '../src/services/prismaService';

describe('Product Service', () => {
  it('should get products with pagination', async () => {
    const result = await getProducts(0, 10);
    expect(result.products).toHaveLength(10);
    expect(result.total).toBeGreaterThan(0);
  });

  it('should get product by ID with relations', async () => {
    const products = await prisma.product.findMany({ take: 1 });
    const product = await getProductById(products[0].id);
    expect(product).toHaveProperty('categories');
    expect(product).toHaveProperty('reviews');
  });
});
```

### 2. Integration Tests

```bash
# Test all CRUD operations
npm run test:integration
```

### 3. Performance Tests

```bash
# Compare query performance
npm run test:performance
```

---

## 🚀 Deployment

### Development → Production

```bash
# 1. Set up production database
DATABASE_URL="postgresql://prod-user:prod-pass@prod-host:5432/tuchonga"

# 2. Run migrations
npx prisma migrate deploy

# 3. Import production data
npx ts-node scripts/import-to-prisma.ts exports/production-backup

# 4. Verify data
npx ts-node scripts/verify-data.ts

# 5. Update environment variables
# Set DATABASE_URL in production environment

# 6. Deploy application
npm run build
# Deploy to your hosting platform
```

---

## 🔄 Rollback Plan

If migration fails:

```bash
# 1. Keep Firebase running (don't delete data)

# 2. Revert application code to use Firebase
git revert [migration-commit]

# 3. Redeploy application

# 4. Fix migration issues

# 5. Re-attempt migration with fixed scripts
```

---

## ✅ Post-Migration

### 1. Monitor Performance

```typescript
// Add Prisma query logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Monitor slow queries
prisma.$on('query', (e) => {
  if (e.duration > 1000) { // > 1 second
    console.warn('Slow query detected:', e.query);
  }
});
```

### 2. Optimize Queries

```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_product_name ON "Product"("productName");
CREATE INDEX idx_product_business ON "Product"("businessId");
CREATE INDEX idx_review_sentiment ON "Review"("sentiment");

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM "Product" WHERE "businessId" = 'some-id';
```

### 3. Set Up Backups

```bash
# Automated daily backups
pg_dump -U username -d tuchonga > backup-$(date +%Y%m%d).sql

# Or use managed database backup features (Supabase, Railway, etc.)
```

### 4. Archive Firebase Project

After 30 days of successful operation:

```bash
# 1. Export final backup from Firebase
firebase firestore:export gs://[YOUR-BUCKET]/final-backup

# 2. Delete Firestore data (optional, costs savings)
# Be careful! This is irreversible!

# 3. Keep Firebase Auth running (if still used for authentication)
```

---

## 📚 Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Firebase to SQL Migration](https://firebase.google.com/docs/firestore/manage-data/export-import)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

---

**Last Updated**: December 28, 2025
**Status**: Ready for Migration
**Estimated Time**: 2-4 hours (depending on data size)
**Difficulty**: Medium

---

## 🆘 Troubleshooting

### Common Issues

**Issue**: "Cannot connect to database"
```bash
# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

**Issue**: "Foreign key constraint violation"
```bash
# Disable constraints temporarily (development only!)
SET session_replication_role = 'replica';
# ... import data ...
SET session_replication_role = 'origin';
```

**Issue**: "Out of memory during import"
```bash
# Import in smaller batches
# Modify import script to process 100 records at a time
```

**Issue**: "Data type mismatch"
```bash
# Check Prisma schema types
# Update schema and re-run migration
npx prisma migrate dev --name fix_types
```

---

**Questions?** Create an issue or contact the dev team.




