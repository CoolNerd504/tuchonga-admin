# Firebase Storage Migration Guide

## 📦 Overview

Your application stores images in **Firebase Storage** (Google Cloud Storage). When migrating from Firebase Firestore to Prisma, you have several options for handling these files.

---

## 🎯 Current Storage Usage

### Files Stored in Firebase Storage

**Admin Dashboard:**
- Product images (main + additional)
- Service images (main + additional)
- Business logos
- (Potentially) User profile images

**Mobile App:**
- User profile images
- Product/service images
- Review images (if applicable)

**Storage Buckets:**
- `gs://[your-project].appspot.com/`
- Organized by folders: `product_thumbnails/`, `service_thumbnails/`, `business_logos/`, `profile_images/`

---

## 🔀 Migration Options

### Option 1: Keep Firebase Storage (Recommended) ✅

**Best for:** Most use cases

**Pros:**
- ✅ No migration needed
- ✅ URLs continue to work
- ✅ Firebase Storage is reliable and fast
- ✅ Built-in CDN
- ✅ Good pricing
- ✅ Works perfectly with Prisma

**Cons:**
- ⚠️ Still dependent on Firebase
- ⚠️ Monthly costs

**Implementation:**
```typescript
// Keep using Firebase Storage SDK
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const storage = getStorage();

// Upload file (no changes needed)
const storageRef = ref(storage, `product_thumbnails/${fileName}`);
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);

// Save URL to Prisma
await prisma.product.create({
  data: {
    productName: 'Example',
    mainImage: url, // Firebase Storage URL
  },
});
```

**Decision:** ✅ **Recommended unless you have specific reasons to migrate**

---

### Option 2: Migrate to AWS S3

**Best for:** AWS-heavy infrastructure

**Pros:**
- ✅ Industry standard
- ✅ More storage options
- ✅ Integrates with AWS ecosystem
- ✅ Potentially cheaper at scale

**Cons:**
- ⚠️ Migration required
- ⚠️ More complex setup
- ⚠️ Need to update all URLs in database

**Implementation:** See [Migration Script](#migration-script-firebase-to-s3)

---

### Option 3: Migrate to Cloudinary

**Best for:** Image-heavy apps needing transformations

**Pros:**
- ✅ Image transformations on-the-fly
- ✅ Automatic optimization
- ✅ Responsive images
- ✅ Free tier available
- ✅ Great for product images

**Cons:**
- ⚠️ Migration required
- ⚠️ Need to update all URLs in database
- ⚠️ Can be expensive at scale

**Implementation:** See [Migration Script](#migration-script-firebase-to-cloudinary)

---

### Option 4: Migrate to Supabase Storage

**Best for:** Using Supabase for database

**Pros:**
- ✅ Integrated with Supabase
- ✅ Good pricing
- ✅ Easy to use
- ✅ Built-in image transformations

**Cons:**
- ⚠️ Migration required
- ⚠️ Need to update all URLs in database
- ⚠️ Relatively new service

**Implementation:** See [Migration Script](#migration-script-firebase-to-supabase)

---

## 📊 Storage Analysis Script

First, analyze what you have in Firebase Storage:

```typescript
// scripts/analyze-firebase-storage.ts
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: '[your-project].appspot.com',
});

const bucket = admin.storage().bucket();

interface StorageAnalysis {
  totalFiles: number;
  totalSize: number;
  filesByFolder: { [folder: string]: { count: number; size: number } };
  filesByType: { [type: string]: { count: number; size: number } };
  files: Array<{
    name: string;
    size: number;
    contentType: string;
    url: string;
    created: string;
  }>;
}

async function analyzeStorage(): Promise<StorageAnalysis> {
  console.log('🔍 Analyzing Firebase Storage...\n');

  const [files] = await bucket.getFiles();

  const analysis: StorageAnalysis = {
    totalFiles: 0,
    totalSize: 0,
    filesByFolder: {},
    filesByType: {},
    files: [],
  };

  for (const file of files) {
    const [metadata] = await file.getMetadata();
    const size = parseInt(metadata.size || '0', 10);
    const contentType = metadata.contentType || 'unknown';
    const folder = file.name.split('/')[0] || 'root';

    // Get public URL (if file is public)
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500', // Far future date
    });

    analysis.totalFiles++;
    analysis.totalSize += size;

    // By folder
    if (!analysis.filesByFolder[folder]) {
      analysis.filesByFolder[folder] = { count: 0, size: 0 };
    }
    analysis.filesByFolder[folder].count++;
    analysis.filesByFolder[folder].size += size;

    // By type
    if (!analysis.filesByType[contentType]) {
      analysis.filesByType[contentType] = { count: 0, size: 0 };
    }
    analysis.filesByType[contentType].count++;
    analysis.filesByType[contentType].size += size;

    // File details
    analysis.files.push({
      name: file.name,
      size,
      contentType,
      url,
      created: metadata.timeCreated || '',
    });
  }

  return analysis;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

async function main() {
  const analysis = await analyzeStorage();

  console.log('📊 Firebase Storage Analysis\n');
  console.log(`Total Files: ${analysis.totalFiles}`);
  console.log(`Total Size: ${formatBytes(analysis.totalSize)}\n`);

  console.log('📁 Files by Folder:');
  Object.entries(analysis.filesByFolder).forEach(([folder, stats]) => {
    console.log(`   ${folder}: ${stats.count} files (${formatBytes(stats.size)})`);
  });

  console.log('\n📄 Files by Type:');
  Object.entries(analysis.filesByType).forEach(([type, stats]) => {
    console.log(`   ${type}: ${stats.count} files (${formatBytes(stats.size)})`);
  });

  // Save detailed report
  const reportPath = path.join(__dirname, '..', 'exports', 'storage-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
  console.log(`\n✅ Detailed report saved to: ${reportPath}`);

  // Save file list CSV
  const csvPath = path.join(__dirname, '..', 'exports', 'storage-files.csv');
  const csvContent = [
    'Name,Size,Type,URL,Created',
    ...analysis.files.map(f => 
      `"${f.name}",${f.size},"${f.contentType}","${f.url}","${f.created}"`
    ),
  ].join('\n');
  fs.writeFileSync(csvPath, csvContent);
  console.log(`✅ File list saved to: ${csvPath}\n`);
}

main().catch(console.error);
```

**Run:**
```bash
npm run storage:analyze
```

---

## 🔄 Migration Script: Firebase to S3

```typescript
// scripts/migrate-storage-to-s3.ts
import * as admin from 'firebase-admin';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: '[your-project].appspot.com',
});

const bucket = admin.storage().bucket();
const prisma = new PrismaClient();

// Configure AWS S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const S3_BUCKET = process.env.AWS_S3_BUCKET!;

interface MigrationResult {
  total: number;
  migrated: number;
  failed: number;
  errors: Array<{ file: string; error: string }>;
}

async function migrateFile(
  firebaseFile: admin.storage.File
): Promise<{ oldUrl: string; newUrl: string } | null> {
  try {
    const fileName = firebaseFile.name;
    console.log(`   Migrating: ${fileName}`);

    // Download from Firebase
    const [fileBuffer] = await firebaseFile.download();
    const [metadata] = await firebaseFile.getMetadata();

    // Upload to S3
    const s3Key = fileName; // Keep same path structure
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: metadata.contentType,
        ACL: 'public-read', // Make publicly accessible
      })
    );

    // Generate new URL
    const newUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${s3Key}`;

    // Get old URL
    const [oldUrl] = await firebaseFile.getSignedUrl({
      action: 'read',
      expires: '03-01-2500',
    });

    return { oldUrl, newUrl };
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function updateDatabaseUrls(urlMap: Map<string, string>) {
  console.log('\n🔄 Updating database URLs...');

  let updated = 0;

  // Update products
  const products = await prisma.product.findMany();
  for (const product of products) {
    const updates: any = {};

    if (product.mainImage && urlMap.has(product.mainImage)) {
      updates.mainImage = urlMap.get(product.mainImage);
    }

    if (product.additionalImages) {
      updates.additionalImages = product.additionalImages.map(
        url => urlMap.get(url) || url
      );
    }

    if (Object.keys(updates).length > 0) {
      await prisma.product.update({
        where: { id: product.id },
        data: updates,
      });
      updated++;
    }
  }

  console.log(`   ✅ Updated ${updated} products`);

  // Update services (similar logic)
  const services = await prisma.service.findMany();
  for (const service of services) {
    const updates: any = {};

    if (service.mainImage && urlMap.has(service.mainImage)) {
      updates.mainImage = urlMap.get(service.mainImage);
    }

    if (service.additionalImages) {
      updates.additionalImages = service.additionalImages.map(
        url => urlMap.get(url) || url
      );
    }

    if (Object.keys(updates).length > 0) {
      await prisma.service.update({
        where: { id: service.id },
        data: updates,
      });
      updated++;
    }
  }

  console.log(`   ✅ Updated ${updated} services`);

  // Update businesses
  const businesses = await prisma.business.findMany();
  for (const business of businesses) {
    if (business.logo && urlMap.has(business.logo)) {
      await prisma.business.update({
        where: { id: business.id },
        data: { logo: urlMap.get(business.logo) },
      });
      updated++;
    }
  }

  console.log(`   ✅ Updated ${updated} businesses`);

  // Update users
  const users = await prisma.user.findMany();
  for (const user of users) {
    if (user.profileImage && urlMap.has(user.profileImage)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { profileImage: urlMap.get(user.profileImage) },
      });
      updated++;
    }
  }

  console.log(`   ✅ Updated ${updated} users`);
  console.log(`\n✅ Total database records updated: ${updated}`);
}

async function main() {
  console.log('🚀 Starting Firebase Storage → AWS S3 Migration\n');

  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    failed: 0,
    errors: [],
  };

  const urlMap = new Map<string, string>();

  // Get all files
  const [files] = await bucket.getFiles();
  result.total = files.length;

  console.log(`📦 Found ${files.length} files to migrate\n`);

  // Migrate files
  for (const file of files) {
    const urls = await migrateFile(file);

    if (urls) {
      urlMap.set(urls.oldUrl, urls.newUrl);
      result.migrated++;
    } else {
      result.failed++;
      result.errors.push({
        file: file.name,
        error: 'Migration failed',
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total Files: ${result.total}`);
  console.log(`Migrated: ${result.migrated}`);
  console.log(`Failed: ${result.failed}`);

  if (result.failed > 0) {
    console.log('\n❌ Failed Files:');
    result.errors.forEach(err => {
      console.log(`   - ${err.file}: ${err.error}`);
    });
  }

  // Update database
  if (result.migrated > 0) {
    await updateDatabaseUrls(urlMap);
  }

  // Save URL mapping
  const mappingPath = path.join(__dirname, '..', 'exports', 'url-mapping.json');
  fs.writeFileSync(
    mappingPath,
    JSON.stringify(Array.from(urlMap.entries()), null, 2)
  );
  console.log(`\n✅ URL mapping saved to: ${mappingPath}`);

  await prisma.$disconnect();
  console.log('\n🎉 Migration Complete!');
}

main().catch(console.error);
```

---

## 🔄 Migration Script: Firebase to Cloudinary

```typescript
// scripts/migrate-storage-to-cloudinary.ts
import * as admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';

const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: '[your-project].appspot.com',
});

const bucket = admin.storage().bucket();
const prisma = new PrismaClient();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function migrateFile(
  firebaseFile: admin.storage.File
): Promise<{ oldUrl: string; newUrl: string } | null> {
  try {
    const fileName = firebaseFile.name;
    console.log(`   Migrating: ${fileName}`);

    // Download from Firebase
    const [fileBuffer] = await firebaseFile.download();

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'tuchonga', // Organize in Cloudinary
          public_id: fileName.replace(/\.[^/.]+$/, ''), // Remove extension
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(fileBuffer);
    });

    const newUrl = (result as any).secure_url;

    // Get old URL
    const [oldUrl] = await firebaseFile.getSignedUrl({
      action: 'read',
      expires: '03-01-2500',
    });

    return { oldUrl, newUrl };
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

// Use similar updateDatabaseUrls and main functions as S3 example
```

---

## 🔄 Migration Script: Firebase to Supabase

```typescript
// scripts/migrate-storage-to-supabase.ts
import * as admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: '[your-project].appspot.com',
});

const bucket = admin.storage().bucket();
const prisma = new PrismaClient();

// Configure Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function migrateFile(
  firebaseFile: admin.storage.File
): Promise<{ oldUrl: string; newUrl: string } | null> {
  try {
    const fileName = firebaseFile.name;
    console.log(`   Migrating: ${fileName}`);

    // Download from Firebase
    const [fileBuffer] = await firebaseFile.download();
    const [metadata] = await firebaseFile.getMetadata();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('tuchonga')
      .upload(fileName, fileBuffer, {
        contentType: metadata.contentType,
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('tuchonga')
      .getPublicUrl(fileName);

    const newUrl = urlData.publicUrl;

    // Get old URL
    const [oldUrl] = await firebaseFile.getSignedUrl({
      action: 'read',
      expires: '03-01-2500',
    });

    return { oldUrl, newUrl };
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

// Use similar updateDatabaseUrls and main functions as S3 example
```

---

## 📝 NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "storage:analyze": "ts-node scripts/analyze-firebase-storage.ts",
    "storage:migrate:s3": "ts-node scripts/migrate-storage-to-s3.ts",
    "storage:migrate:cloudinary": "ts-node scripts/migrate-storage-to-cloudinary.ts",
    "storage:migrate:supabase": "ts-node scripts/migrate-storage-to-supabase.ts"
  }
}
```

---

## 🔐 Environment Variables

```bash
# .env

# If keeping Firebase Storage (Option 1)
# No additional variables needed - use existing Firebase config

# If migrating to AWS S3 (Option 2)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your-bucket-name

# If migrating to Cloudinary (Option 3)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# If migrating to Supabase Storage (Option 4)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
```

---

## ✅ Recommended Approach

### **Keep Firebase Storage** (No Migration)

**Why:**
1. ✅ No downtime
2. ✅ No risk of data loss
3. ✅ URLs continue to work
4. ✅ Reliable and fast
5. ✅ Easy to maintain

**When to Migrate:**
- You're already using AWS heavily
- You need advanced image transformations (Cloudinary)
- You're using Supabase and want everything in one place
- Firebase Storage is significantly more expensive for your use case

---

## 🚀 Migration Checklist

If you decide to migrate storage:

- [ ] Run storage analysis script
- [ ] Review file count and sizes
- [ ] Choose destination (S3, Cloudinary, Supabase)
- [ ] Set up destination storage service
- [ ] Configure credentials in `.env`
- [ ] Test migration with 10 files first
- [ ] Verify URLs work
- [ ] Run full migration
- [ ] Verify database updates
- [ ] Test application (upload, view, delete)
- [ ] Monitor for 7 days
- [ ] Delete from Firebase Storage (optional)

---

## 💰 Cost Comparison

| Service | Storage Cost | Bandwidth Cost | Free Tier | Best For |
|---------|-------------|----------------|-----------|----------|
| **Firebase Storage** | $0.026/GB | $0.12/GB | 5 GB storage, 1 GB/day bandwidth | General use |
| **AWS S3** | $0.023/GB | $0.09/GB | 5 GB storage, 15 GB/month bandwidth (12 months) | AWS ecosystem |
| **Cloudinary** | $0.06/GB | Included | 25 GB storage, 25 GB bandwidth | Image transformations |
| **Supabase Storage** | $0.021/GB | $0.09/GB | 1 GB storage, 2 GB bandwidth | Supabase users |

---

## ⚠️ Important Notes

1. **Don't Delete Firebase Files:** Keep originals until migration verified
2. **Test First:** Migrate 10 files first, verify everything works
3. **Monitor Costs:** New service may have different pricing
4. **Update Mobile App:** If URLs change, update mobile app too
5. **CDN:** Consider CloudFront (S3), Cloudinary CDN, or Supabase CDN

---

## 🎯 Decision Matrix

| Factor | Keep Firebase | Migrate to S3 | Migrate to Cloudinary | Migrate to Supabase |
|--------|--------------|---------------|---------------------|-------------------|
| **Effort** | ⭐⭐⭐⭐⭐ (None) | ⭐⭐ (Medium) | ⭐⭐ (Medium) | ⭐⭐⭐ (Easy if using Supabase) |
| **Risk** | ⭐⭐⭐⭐⭐ (None) | ⭐⭐ (Medium) | ⭐⭐ (Medium) | ⭐⭐⭐ (Low) |
| **Cost** | ⭐⭐⭐⭐ (Good) | ⭐⭐⭐⭐⭐ (Best) | ⭐⭐⭐ (Higher) | ⭐⭐⭐⭐⭐ (Best) |
| **Features** | ⭐⭐⭐ (Basic) | ⭐⭐⭐ (Basic) | ⭐⭐⭐⭐⭐ (Advanced) | ⭐⭐⭐⭐ (Good) |

---

## 🏆 Recommendation

**For TuChonga Admin + Mobile App:**

✅ **Keep Firebase Storage** for now. Reasons:
1. It's working well
2. No immediate need to change
3. Prisma migration is complex enough
4. You can migrate storage later if needed
5. Reduces migration risk

**Consider migrating later if:**
- You move to AWS infrastructure
- You need image transformations
- Firebase Storage costs become significant
- You fully commit to Supabase

---

**Last Updated:** December 28, 2025
**Status:** Ready for implementation



