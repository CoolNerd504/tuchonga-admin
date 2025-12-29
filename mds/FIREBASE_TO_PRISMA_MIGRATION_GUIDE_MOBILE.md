# Firebase to Prisma Migration Guide

## 📋 Overview

This guide covers migrating from Firebase Firestore (NoSQL) to Prisma with a SQL database (PostgreSQL, MySQL, or SQLite). This is a significant architectural change that requires careful planning.

## 🎯 Migration Strategy

### Phase 1: Data Export & Analysis
### Phase 2: Schema Design
### Phase 3: Data Transformation
### Phase 4: Data Import
### Phase 5: Application Migration

---

## 📊 Current Firebase Collections

Based on your codebase, here are the collections to migrate:

1. **`users`** - User profiles with analytics
2. **`products`** - Product listings
3. **`services`** - Service listings
4. **`categories`** - Categories for products/services
5. **`businesses`** - Business owner profiles
6. **`reviews`** - Sentiment-based reviews
7. **`quickRatings`** - Quick emoji ratings
8. **`comments`** - Comment system with threading
9. **`commentReactions`** - Agree/disagree reactions
10. **`commentReports`** - Comment moderation
11. **`favorites`** - User favorites
12. **`userRatingHistory`** - Rating history tracking
13. **`surveyResponses`** - Survey data
14. **`surveyTemplates`** - Survey templates

---

## 🔧 Step 1: Export Firebase Data

### Option A: Firebase CLI Export (Recommended)

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Export all Firestore data
firebase firestore:export gs://tuchonga-bf6af.appspot.com/backup/$(date +%Y%m%d)

# Download from Google Cloud Storage
gsutil -m cp -r gs://tuchonga-bf6af.appspot.com/backup/$(date +%Y%m%d) ./firebase-export
```

### Option B: Node.js Script (More Control)

Create `scripts/export-firebase-data.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const firebaseConfig = {
  apiKey: "AIzaSyBIxsRpwzeAG5yKni7rmpS5zaf_8dUnahg",
  projectId: "tuchonga-bf6af",
  // ... other config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collections = [
  'users',
  'products',
  'services',
  'categories',
  'businesses',
  'reviews',
  'quickRatings',
  'comments',
  'commentReactions',
  'commentReports',
  'favorites',
  'userRatingHistory',
  'surveyResponses',
  'surveyTemplates',
];

async function exportCollection(collectionName: string) {
  console.log(`📦 Exporting ${collectionName}...`);
  
  const snapshot = await getDocs(collection(db, collectionName));
  const data: any[] = [];
  
  snapshot.forEach((doc) => {
    const docData = doc.data();
    // Convert Firestore Timestamps to ISO strings
    const processed = processDocument(docData);
    data.push({
      id: doc.id,
      ...processed,
    });
  });
  
  const outputPath = path.join(__dirname, '../exports', `${collectionName}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  
  console.log(`✅ Exported ${data.length} documents from ${collectionName}`);
  return data;
}

function processDocument(data: any): any {
  if (data === null || data === undefined) return data;
  
  if (data.toDate && typeof data.toDate === 'function') {
    // Firestore Timestamp
    return data.toDate().toISOString();
  }
  
  if (data instanceof Date) {
    return data.toISOString();
  }
  
  if (Array.isArray(data)) {
    return data.map(item => processDocument(item));
  }
  
  if (typeof data === 'object') {
    const processed: any = {};
    for (const [key, value] of Object.entries(data)) {
      processed[key] = processDocument(value);
    }
    return processed;
  }
  
  return data;
}

async function exportAll() {
  const exportDir = path.join(__dirname, '../exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  
  const results: Record<string, any[]> = {};
  
  for (const collectionName of collections) {
    try {
      results[collectionName] = await exportCollection(collectionName);
    } catch (error) {
      console.error(`❌ Error exporting ${collectionName}:`, error);
    }
  }
  
  // Export summary
  const summary = {
    exportedAt: new Date().toISOString(),
    collections: Object.keys(results),
    counts: Object.fromEntries(
      Object.entries(results).map(([key, value]) => [key, value.length])
    ),
  };
  
  fs.writeFileSync(
    path.join(exportDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );
  
  console.log('\n📊 Export Summary:');
  console.log(JSON.stringify(summary, null, 2));
}

exportAll().catch(console.error);
```

**Run the export:**
```bash
npx ts-node scripts/export-firebase-data.ts
```

---

## 🗄️ Step 2: Design Prisma Schema

Create `prisma/schema.prisma`:

```prisma
// This is your Prisma schema file

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // or "mysql" or "sqlite"
  url      = env("DATABASE_URL")
}

// Users Table
model User {
  id                  String   @id @default(cuid())
  uid                 String   @unique // Firebase UID
  email               String?  @unique
  phoneNumber         String?  @unique
  displayName         String?
  fullName            String?
  photoURL            String?
  profileImage        String?
  role                String   @default("Mobile") // Mobile, Business, Admin
  hasCompletedProfile Boolean  @default(false)
  profileCompletedAt  DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // Relations
  reviews             Review[]
  comments            Comment[]
  commentReactions    CommentReaction[]
  favorites           Favorite[]
  quickRatings        QuickRating[]
  ratingHistory       UserRatingHistory[]
  surveyResponses     SurveyResponse[]
  businesses          Business[] @relation("BusinessOwner")

  // Analytics (stored as JSON or separate tables)
  analytics           Json? // Store analytics as JSON initially

  @@index([uid])
  @@index([email])
  @@index([phoneNumber])
}

// Categories Table
model Category {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  type        String   // "product" or "service"
  icon        String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  products    Product[]
  services    Service[]

  @@index([type])
  @@index([isActive])
}

// Businesses Table
model Business {
  id          String   @id @default(cuid())
  name        String
  description String?
  ownerId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  owner       User     @relation("BusinessOwner", fields: [ownerId], references: [id])
  products    Product[]
  services    Service[]

  @@index([ownerId])
}

// Products Table
model Product {
  id                    String   @id @default(cuid())
  product_name          String
  description           String?
  category              String[]  // Array of category names
  mainImage             String?
  images                String[] // Array of image URLs
  price                 Float?
  productOwner          String?
  businessId            String?
  isActive              Boolean  @default(true)
  
  // Rating fields
  totalRatings          Int      @default(0)
  total_reviews         Int      @default(0)
  positive_reviews      Int      @default(0)
  neutral_reviews       Int      @default(0)
  negative_reviews      Int      @default(0)
  
  // Sentiment distribution (stored as JSON)
  sentimentDistribution Json?    // { "Would recommend": 0, "Its Good": 0, "Dont mind it": 0, "It's bad": 0 }
  totalSentimentReviews Int      @default(0)
  lastSentimentUpdate   DateTime?
  
  // Reviewed by tracking (JSON or separate table)
  reviewedBy            Json?    // Map of userId -> { sentiment, timestamp }
  reviewers             String[] // Array of user IDs
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  business              Business? @relation(fields: [businessId], references: [id])
  reviews               Review[]
  comments              Comment[]
  favorites             Favorite[]
  quickRatings          QuickRating[]

  @@index([isActive])
  @@index([productOwner])
  @@index([businessId])
  // Full-text search index (PostgreSQL)
  @@index([product_name], type: Gin)
}

// Services Table (similar to Products)
model Service {
  id                    String   @id @default(cuid())
  service_name          String
  description           String?
  category              String[]  // Array of category names
  mainImage             String?
  images                String[] // Array of image URLs
  price                 Float?
  service_owner         String?
  businessId            String?
  isActive              Boolean  @default(true)
  
  // Rating fields
  totalRatings          Int      @default(0)
  total_reviews         Int      @default(0)
  positive_reviews      Int      @default(0)
  neutral_reviews       Int      @default(0)
  negative_reviews      Int      @default(0)
  
  // Sentiment distribution
  sentimentDistribution Json?
  totalSentimentReviews Int      @default(0)
  lastSentimentUpdate   DateTime?
  
  reviewedBy            Json?
  reviewers             String[]

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  business              Business? @relation(fields: [businessId], references: [id])
  reviews               Review[]
  comments              Comment[]
  favorites             Favorite[]
  quickRatings          QuickRating[]

  @@index([isActive])
  @@index([service_owner])
  @@index([businessId])
  @@index([service_name], type: Gin)
}

// Reviews Table
model Review {
  id                String   @id @default(cuid())
  product_id        String?
  service_id        String?
  userId            String
  sentiment         String   // "Would recommend", "Its Good", "Dont mind it", "It's bad"
  text              String?
  sentimentHistory  Json?    // Array of { sentiment, timestamp }
  timestamp         DateTime @default(now())
  
  // User info at time of review
  userDisplayName   String?
  userPhoneNumber   String?
  productName       String?
  productCategories String[]
  serviceName       String?
  serviceCategories String[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  user              User     @relation(fields: [userId], references: [id])
  product           Product? @relation(fields: [product_id], references: [id])
  service           Service? @relation(fields: [service_id], references: [id])

  @@index([userId])
  @@index([product_id])
  @@index([service_id])
  @@index([timestamp])
  // Unique constraint: one review per user per product/service
  @@unique([userId, product_id])
  @@unique([userId, service_id])
}

// Quick Ratings Table
model QuickRating {
  id        String   @id @default(cuid())
  productId String?
  serviceId String?
  userId    String   // Phone number without +
  rating    Int      // 1-4 emoji rating
  source    String   // "product" or "service"
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  user      User     @relation(fields: [userId], references: [id])
  product   Product? @relation(fields: [productId], references: [id])
  service   Service? @relation(fields: [serviceId], references: [id])

  @@index([userId])
  @@index([productId])
  @@index([serviceId])
  @@unique([userId, productId])
  @@unique([userId, serviceId])
}

// Comments Table
model Comment {
  id            String   @id @default(cuid())
  itemId        String   // Product or Service ID
  itemType      String   // "product" or "service"
  userId        String
  parentId      String?  // For threading
  text          String
  isDeleted     Boolean  @default(false)
  
  // Counts
  replyCount    Int      @default(0)
  agreeCount    Int      @default(0)
  disagreeCount Int      @default(0)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  user          User     @relation(fields: [userId], references: [id])
  product       Product? @relation(fields: [itemId], references: [id], map: "comment_itemId")
  service       Service? @relation(fields: [itemId], references: [id], map: "comment_itemId")
  parent        Comment? @relation("CommentThread", fields: [parentId], references: [id])
  replies       Comment[] @relation("CommentThread")
  reactions     CommentReaction[]
  reports       CommentReport[]

  @@index([itemId, itemType])
  @@index([userId])
  @@index([parentId])
  @@index([createdAt])
}

// Comment Reactions Table
model CommentReaction {
  id        String   @id @default(cuid())
  commentId String
  userId    String
  type      String   // "agree" or "disagree"
  createdAt DateTime @default(now())

  // Relations
  user      User     @relation(fields: [userId], references: [id])
  comment   Comment  @relation(fields: [commentId], references: [id])

  @@unique([commentId, userId])
  @@index([commentId])
  @@index([userId])
}

// Comment Reports Table
model CommentReport {
  id        String   @id @default(cuid())
  commentId String
  reportedBy String
  reason    String?
  status    String   @default("pending") // pending, reviewed, resolved
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  comment   Comment  @relation(fields: [commentId], references: [id])

  @@index([commentId])
  @@index([status])
}

// Favorites Table
model Favorite {
  id        String   @id @default(cuid())
  userId    String
  itemId    String   // Product or Service ID
  itemType  String   // "product" or "service"
  createdAt DateTime @default(now())

  // Relations
  user      User     @relation(fields: [userId], references: [id])
  product   Product? @relation(fields: [itemId], references: [id], map: "favorite_itemId")
  service   Service? @relation(fields: [itemId], references: [id], map: "favorite_itemId")

  @@unique([userId, itemId, itemType])
  @@index([userId])
  @@index([itemId, itemType])
}

// User Rating History Table
model UserRatingHistory {
  id        String   @id @default(cuid())
  userId    String   // Phone number without +
  itemId    String
  itemType  String   // "product" or "service"
  rating    Int      // 1-4
  timestamp DateTime @default(now())

  // Relations
  user      User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([itemId, itemType])
  @@index([timestamp])
}

// Survey Templates Table
model SurveyTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?
  questions   Json     // Array of question objects
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  responses   SurveyResponse[]

  @@index([isActive])
}

// Survey Responses Table
model SurveyResponse {
  id         String   @id @default(cuid())
  templateId String
  userId     String
  itemId     String?  // Product or Service ID
  itemType   String?  // "product" or "service"
  responses  Json     // Array of answers
  createdAt  DateTime @default(now())

  // Relations
  template  SurveyTemplate @relation(fields: [templateId], references: [id])
  user      User           @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([templateId])
  @@index([itemId, itemType])
}
```

---

## 🔄 Step 3: Data Transformation Script

Create `scripts/transform-firebase-to-prisma.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface FirebaseExport {
  [collectionName: string]: any[];
}

// Load exported Firebase data
const exportDir = path.join(__dirname, '../exports');
const collections = fs.readdirSync(exportDir)
  .filter(file => file.endsWith('.json') && file !== 'summary.json');

const data: FirebaseExport = {};

for (const file of collections) {
  const collectionName = file.replace('.json', '');
  const content = fs.readFileSync(path.join(exportDir, file), 'utf-8');
  data[collectionName] = JSON.parse(content);
}

// Transform Users
function transformUsers(users: any[]) {
  return users.map(user => ({
    uid: user.uid || user.id,
    email: user.email || null,
    phoneNumber: user.phoneNumber || null,
    displayName: user.displayName || null,
    fullName: user.fullName || null,
    photoURL: user.photoURL || null,
    profileImage: user.profileImage || null,
    role: user.role || 'Mobile',
    hasCompletedProfile: user.hasCompletedProfile || false,
    profileCompletedAt: user.profileCompletedAt || null,
    analytics: user.analytics || null,
    createdAt: user.createdAt || new Date().toISOString(),
    updatedAt: user.updatedAt || new Date().toISOString(),
  }));
}

// Transform Products
function transformProducts(products: any[]) {
  return products.map(product => ({
    id: product.id,
    product_name: product.product_name || product.name || '',
    description: product.description || null,
    category: Array.isArray(product.category) ? product.category : [],
    mainImage: product.mainImage || product.main_image || null,
    images: Array.isArray(product.images) ? product.images : [],
    price: product.price || null,
    productOwner: product.productOwner || product.owner || null,
    businessId: product.businessId || null,
    isActive: product.isActive !== false,
    totalRatings: product.totalRatings || 0,
    total_reviews: product.total_reviews || 0,
    positive_reviews: product.positive_reviews || 0,
    neutral_reviews: product.neutral_reviews || 0,
    negative_reviews: product.negative_reviews || 0,
    sentimentDistribution: product.sentimentDistribution || null,
    totalSentimentReviews: product.totalSentimentReviews || 0,
    lastSentimentUpdate: product.lastSentimentUpdate || null,
    reviewedBy: product.reviewedBy || null,
    reviewers: Array.isArray(product.reviewers) ? product.reviewers : [],
    createdAt: product.createdAt || new Date().toISOString(),
    updatedAt: product.updatedAt || new Date().toISOString(),
  }));
}

// Transform Reviews
function transformReviews(reviews: any[]) {
  return reviews.map(review => ({
    id: review.id,
    product_id: review.product_id || null,
    service_id: review.service_id || null,
    userId: review.userId || review.user_id || '',
    sentiment: review.sentiment || '',
    text: review.text || null,
    sentimentHistory: review.sentimentHistory || null,
    timestamp: review.timestamp || review.createdAt || new Date().toISOString(),
    userDisplayName: review.userDisplayName || null,
    userPhoneNumber: review.userPhoneNumber || null,
    productName: review.productName || null,
    productCategories: Array.isArray(review.productCategories) ? review.productCategories : [],
    serviceName: review.serviceName || null,
    serviceCategories: Array.isArray(review.serviceCategories) ? review.serviceCategories : [],
    createdAt: review.createdAt || new Date().toISOString(),
    updatedAt: review.updatedAt || new Date().toISOString(),
  }));
}

// Transform Comments
function transformComments(comments: any[]) {
  return comments.map(comment => ({
    id: comment.id,
    itemId: comment.itemId || '',
    itemType: comment.itemType || '',
    userId: comment.userId || '',
    parentId: comment.parentId || null,
    text: comment.text || '',
    isDeleted: comment.isDeleted || false,
    replyCount: comment.replyCount || 0,
    agreeCount: comment.agreeCount || 0,
    disagreeCount: comment.disagreeCount || 0,
    createdAt: comment.createdAt || new Date().toISOString(),
    updatedAt: comment.updatedAt || new Date().toISOString(),
  }));
}

// Transform all collections
const transformed: Record<string, any[]> = {
  users: transformUsers(data.users || []),
  products: transformProducts(data.products || []),
  services: transformProducts(data.services || []), // Similar structure
  reviews: transformReviews(data.reviews || []),
  comments: transformComments(data.comments || []),
  // Add other transformations...
};

// Save transformed data
const outputDir = path.join(__dirname, '../prisma-seed');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

for (const [collection, transformedData] of Object.entries(transformed)) {
  fs.writeFileSync(
    path.join(outputDir, `${collection}.json`),
    JSON.stringify(transformedData, null, 2)
  );
  console.log(`✅ Transformed ${transformedData.length} ${collection}`);
}
```

---

## 📥 Step 4: Prisma Seed Script

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Load transformed data
  const seedDir = path.join(__dirname, '../prisma-seed');
  
  // Seed Users
  const users = JSON.parse(
    fs.readFileSync(path.join(seedDir, 'users.json'), 'utf-8')
  );
  
  for (const userData of users) {
    await prisma.user.upsert({
      where: { uid: userData.uid },
      update: userData,
      create: userData,
    });
  }
  console.log(`✅ Seeded ${users.length} users`);

  // Seed Products
  const products = JSON.parse(
    fs.readFileSync(path.join(seedDir, 'products.json'), 'utf-8')
  );
  
  for (const productData of products) {
    await prisma.product.create({
      data: productData,
    });
  }
  console.log(`✅ Seeded ${products.length} products`);

  // Continue for other collections...
  
  console.log('✅ Seeding complete!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Update `package.json`:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

## ⚠️ Important Considerations

### 1. **Data Type Differences**

**Firestore → SQL:**
- Timestamps: Convert Firestore Timestamps to ISO strings, then to DateTime
- Arrays: Use JSON columns or separate junction tables
- Nested Objects: Use JSON columns or normalize into separate tables
- References: Convert document references to foreign keys

### 2. **Relationships**

**Firestore (NoSQL):**
- Document references
- Subcollections
- Denormalized data

**SQL (Prisma):**
- Foreign keys
- Normalized tables
- Join queries

### 3. **Indexes**

Recreate Firestore indexes as SQL indexes:
```sql
-- Example: Product search index
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('english', product_name));
```

### 4. **Authentication**

Firebase Auth → Your own auth system:
- Export user credentials (if possible)
- Implement OAuth/JWT
- Migrate phone numbers and emails

### 5. **File Storage**

Firebase Storage → Your storage solution:
- Export all images/files
- Upload to S3, Cloudinary, or local storage
- Update URLs in database

---

## 🚀 Migration Steps Summary

1. **Export Data**: Use Firebase CLI or custom script
2. **Design Schema**: Create Prisma schema matching your data
3. **Transform Data**: Convert Firestore format to SQL format
4. **Create Database**: Run `prisma migrate dev`
5. **Seed Data**: Run `prisma db seed`
6. **Update Application**: Replace Firebase calls with Prisma
7. **Test Thoroughly**: Verify all data migrated correctly
8. **Deploy**: Update production database

---

## 📝 Next Steps

1. Choose your SQL database (PostgreSQL recommended)
2. Set up Prisma in your project
3. Run the export script
4. Design and refine your Prisma schema
5. Transform and import data
6. Update your application code

---

**Note**: This is a complex migration. Consider:
- Running both systems in parallel initially
- Migrating incrementally (one collection at a time)
- Having a rollback plan
- Testing thoroughly before switching

