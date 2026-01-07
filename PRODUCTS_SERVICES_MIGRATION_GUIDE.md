# Products & Services Migration Guide - Firebase to PostgreSQL

## Overview

This guide explains how to migrate products and services from Firebase Firestore to PostgreSQL while keeping images in Firebase Storage. The image URLs will remain unchanged and continue pointing to Firebase Storage.

---

## Migration Strategy

### What Gets Migrated
- ✅ Product/Service metadata (name, description, categories, etc.)
- ✅ Review counts and statistics
- ✅ Quick rating data
- ✅ Business relationships
- ✅ Category associations
- ✅ Timestamps and status fields

### What Stays in Firebase
- ✅ **Image files** remain in Firebase Storage
- ✅ **Image URLs** remain unchanged (pointing to Firebase Storage)
- ✅ No image migration needed

---

## Step-by-Step Migration Process

### Step 1: Export Data from Firebase

Run the export script to get all products and services data:

```bash
npx ts-node scripts/export-firebase-data.ts
```

This will create:
- `exports/firebase-export-[timestamp]/products.json`
- `exports/firebase-export-[timestamp]/services.json`
- `exports/firebase-export-[timestamp]/categories.json`
- `exports/firebase-export-[timestamp]/businesses.json`

**What's exported:**
- All product fields including `mainImage` and `additionalImages` (URLs)
- All service fields including `mainImage` and `additionalImages` (URLs)
- Categories and business relationships

---

### Step 2: Verify Exported Data

Check the exported JSON files to ensure:
- ✅ All products/services are present
- ✅ Image URLs are included (Firebase Storage URLs)
- ✅ Categories are included
- ✅ Business relationships are included

```bash
# Check product count
cat exports/firebase-export-[timestamp]/products.json | jq '. | length'

# Check a sample product
cat exports/firebase-export-[timestamp]/products.json | jq '.[0]'

# Verify image URLs
cat exports/firebase-export-[timestamp]/products.json | jq '.[0] | {mainImage, additionalImages}'
```

---

### Step 3: Ensure Prisma Schema is Ready

Verify your Prisma schema has all required fields:

```prisma
model Product {
  id                String   @id @default(uuid())
  productName       String
  description       String?
  mainImage         String?  // Firebase Storage URL
  additionalImages  String[] // Array of Firebase Storage URLs
  // ... other fields
}

model Service {
  id                String   @id @default(uuid())
  serviceName       String
  description       String?
  mainImage         String?  // Firebase Storage URL
  additionalImages  String[] // Array of Firebase Storage URLs
  // ... other fields
}
```

**Note:** The schema already supports image URLs as strings, so no changes needed.

---

### Step 4: Run Prisma Migrations

Ensure all migrations are applied:

```bash
# Check migration status
npx prisma migrate status

# Apply any pending migrations
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate
```

---

### Step 5: Import Products and Services

The existing import script already handles image URLs correctly. Run:

```bash
# Set the export directory (use latest export)
npx ts-node scripts/import-to-prisma.ts exports/firebase-export-[timestamp]
```

Or if you've set up a symlink:

```bash
# Create symlink to latest export
ln -sfn exports/firebase-export-[timestamp] exports/latest

# Run import (uses exports/latest by default)
npx ts-node scripts/import-to-prisma.ts
```

**What the import script does:**
- ✅ Imports products with `mainImage` and `additionalImages` URLs preserved
- ✅ Imports services with `mainImage` and `additionalImages` URLs preserved
- ✅ Links products/services to businesses
- ✅ Creates category relationships
- ✅ Preserves all Firebase Storage URLs as-is

---

### Step 6: Verify Import

Check that data was imported correctly:

```bash
# Open Prisma Studio
npx prisma studio
```

**Verify:**
1. ✅ Product count matches Firebase
2. ✅ Service count matches Firebase
3. ✅ Image URLs are present and point to Firebase Storage
4. ✅ Categories are linked correctly
5. ✅ Business relationships are correct

**Or use SQL:**

```sql
-- Check product count
SELECT COUNT(*) FROM "Product";

-- Check products with images
SELECT id, "productName", "mainImage", "additionalImages" 
FROM "Product" 
WHERE "mainImage" IS NOT NULL 
LIMIT 10;

-- Verify Firebase Storage URLs
SELECT id, "productName", "mainImage" 
FROM "Product" 
WHERE "mainImage" LIKE '%firebasestorage.googleapis.com%' 
LIMIT 10;
```

---

## Image URL Format

### Firebase Storage URLs

Your image URLs will look like:

```
https://firebasestorage.googleapis.com/v0/b/[project-id].appspot.com/o/product_thumbnails%2F[filename]?alt=media&token=[token]
```

or

```
https://storage.googleapis.com/[project-id].appspot.com/products/[filename]
```

**These URLs will continue to work** - no changes needed!

---

## Import Script Details

### Products Import

The `importProducts()` function in `scripts/import-to-prisma.ts`:

```typescript
await prisma.product.create({
  data: {
    id: product.id,
    productName: product.product_name,
    description: product.description || null,
    mainImage: product.mainImage || null,  // ✅ Firebase URL preserved
    additionalImages: product.additionalImages || [],  // ✅ Firebase URLs preserved
    // ... other fields
  },
});
```

### Services Import

The `importServices()` function:

```typescript
await prisma.service.create({
  data: {
    id: service.id,
    serviceName: service.service_name,
    description: service.description || null,
    mainImage: service.mainImage || null,  // ✅ Firebase URL preserved
    additionalImages: service.additionalImages || [],  // ✅ Firebase URLs preserved
    // ... other fields
  },
});
```

---

## Field Mapping

### Products

| Firebase Field | Prisma Field | Notes |
|---------------|--------------|-------|
| `id` | `id` | Document ID preserved |
| `product_name` | `productName` | Name field |
| `description` | `description` | Description |
| `mainImage` | `mainImage` | ✅ Firebase Storage URL |
| `additionalImages` | `additionalImages` | ✅ Array of Firebase Storage URLs |
| `category` | `categories` (relation) | Linked via `ProductCategory` |
| `productOwner` | `productOwner` | Business name (denormalized) |
| `productOwner` | `businessId` | Linked to Business table |
| `isActive` | `isActive` | Status |
| `total_views` | `totalViews` | View count |
| `total_reviews` | `totalReviews` | Review count |
| `positive_reviews` | `positiveReviews` | Sentiment count |
| `neutral_reviews` | `neutralReviews` | Sentiment count |
| `negative_reviews` | `negativeReviews` | Sentiment count |
| `quickRating` | `quickRatingAvg`, `quickRatingTotal`, etc. | Rating stats |
| `createdAt` | `createdAt` | Timestamp |
| `updatedAt` | `updatedAt` | Timestamp |

### Services

| Firebase Field | Prisma Field | Notes |
|---------------|--------------|-------|
| `id` | `id` | Document ID preserved |
| `service_name` | `serviceName` | Name field |
| `description` | `description` | Description |
| `mainImage` | `mainImage` | ✅ Firebase Storage URL |
| `additionalImages` | `additionalImages` | ✅ Array of Firebase Storage URLs |
| `category` | `categories` (relation) | Linked via `ServiceCategory` |
| `service_owner` | `serviceOwner` | Business name (denormalized) |
| `service_owner` | `businessId` | Linked to Business table |
| `isActive` | `isActive` | Status |
| `total_views` | `totalViews` | View count |
| `total_reviews` | `totalReviews` | Review count |
| `positive_reviews` | `positiveReviews` | Sentiment count |
| `neutral_reviews` | `neutralReviews` | Sentiment count |
| `negative_reviews` | `negativeReviews` | Sentiment count |
| `quickRating` | `quickRatingAvg`, `quickRatingTotal`, etc. | Rating stats |
| `createdAt` | `createdAt` | Timestamp |
| `updatedAt` | `updatedAt` | Timestamp |

---

## Complete Migration Checklist

### Pre-Migration

- [ ] Backup Firebase data (export script)
- [ ] Backup PostgreSQL database
- [ ] Verify Prisma schema is up to date
- [ ] Run `npx prisma migrate deploy`
- [ ] Run `npx prisma generate`
- [ ] Test database connection

### Migration

- [ ] Export products from Firebase
- [ ] Export services from Firebase
- [ ] Export categories from Firebase
- [ ] Export businesses from Firebase
- [ ] Verify exported JSON files
- [ ] Import businesses first (if not already imported)
- [ ] Import categories first (if not already imported)
- [ ] Import products
- [ ] Import services
- [ ] Verify image URLs are preserved

### Post-Migration

- [ ] Verify product count matches
- [ ] Verify service count matches
- [ ] Check image URLs in database
- [ ] Test image loading in application
- [ ] Verify categories are linked
- [ ] Verify business relationships
- [ ] Test product/service creation (new items)
- [ ] Test product/service updates
- [ ] Monitor for any issues

---

## Testing Image URLs

After migration, test that images still load:

### In Admin Dashboard

```typescript
// Test product image
const product = await prisma.product.findFirst();
console.log('Product image URL:', product.mainImage);
// Should be: https://firebasestorage.googleapis.com/...

// Test in browser
// Image should load from Firebase Storage
```

### In Mobile App

```typescript
// Fetch product details
const response = await fetch(`${API_URL}/api/products/${productId}`);
const data = await response.json();

// Image URL should work
<Image source={{ uri: data.data.mainImage }} />
```

---

## Troubleshooting

### Issue: Image URLs not imported

**Solution:** Check the export JSON - ensure `mainImage` and `additionalImages` fields are present.

### Issue: Images not loading after migration

**Possible causes:**
1. Firebase Storage rules changed
2. Image URLs expired (if using signed URLs)
3. Network/CORS issues

**Solution:**
- Verify Firebase Storage rules allow public read
- Check if URLs are signed URLs (they should be permanent public URLs)
- Test URL directly in browser

### Issue: Missing categories

**Solution:** Ensure categories are imported before products/services.

### Issue: Missing business relationships

**Solution:** Ensure businesses are imported before products/services.

---

## Image URL Examples

### Main Image
```json
{
  "mainImage": "https://firebasestorage.googleapis.com/v0/b/tuchonga.appspot.com/o/product_thumbnails%2Fproduct-123.jpg?alt=media&token=abc123"
}
```

### Additional Images
```json
{
  "additionalImages": [
    "https://firebasestorage.googleapis.com/v0/b/tuchonga.appspot.com/o/products%2Fproduct-123-1.jpg?alt=media&token=def456",
    "https://firebasestorage.googleapis.com/v0/b/tuchonga.appspot.com/o/products%2Fproduct-123-2.jpg?alt=media&token=ghi789"
  ]
}
```

**These URLs will continue to work** - Firebase Storage serves them publicly.

---

## Quick Start Commands

```bash
# 1. Export from Firebase
npx ts-node scripts/export-firebase-data.ts

# 2. Find latest export directory
ls -lt exports/ | head -5

# 3. Import to PostgreSQL
npx ts-node scripts/import-to-prisma.ts exports/firebase-export-[timestamp]

# 4. Verify in Prisma Studio
npx prisma studio

# 5. Test API endpoint
curl http://localhost:3001/api/products | jq '.data[0] | {id, productName, mainImage}'
```

---

## Important Notes

1. **No Image Migration Needed**: Since you're keeping Firebase Storage, image URLs are just strings in the database. They don't need to be migrated.

2. **URLs Remain Valid**: Firebase Storage URLs will continue to work as long as:
   - Firebase Storage rules allow public read
   - Files haven't been deleted
   - Project hasn't been deleted

3. **Future Uploads**: New product/service images can still be uploaded to Firebase Storage, and the URLs will be saved to PostgreSQL.

4. **No Breaking Changes**: The mobile app and admin dashboard can continue using Firebase Storage SDK for uploads, just save the URLs to PostgreSQL instead of Firestore.

---

## Summary

✅ **Products & Services Data**: Migrated from Firestore to PostgreSQL  
✅ **Image URLs**: Preserved as-is, pointing to Firebase Storage  
✅ **No Image Migration**: Images stay in Firebase Storage  
✅ **No Breaking Changes**: URLs continue to work  
✅ **Future Uploads**: Continue using Firebase Storage, save URLs to PostgreSQL  

The migration is straightforward - just move the metadata, keep the image URLs pointing to Firebase Storage!

