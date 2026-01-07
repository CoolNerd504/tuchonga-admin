# 🚀 Start Migration - Products & Services

## Current Status

✅ **Ready to Migrate:**
- Database schema is up to date
- Import script is ready
- Export script is ready
- Exports directory created

⏳ **Action Required:**
- Need Firebase Service Account Key

---

## Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click ⚙️ **Project Settings** (gear icon)
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key** button
6. Save the downloaded JSON file as `serviceAccountKey.json`
7. Place it in the project root directory

**File location:** `/Users/saintux/Work/Tuchonga/AdminApp/tuchonga-admin/serviceAccountKey.json`

---

## Step 2: Run Export

Once `serviceAccountKey.json` is in place, run:

```bash
npm run migrate:export
```

Or directly:
```bash
tsx scripts/export-firebase-data.ts
```

**This will:**
- Export all products from Firebase
- Export all services from Firebase
- Export categories and businesses
- Save to `exports/firebase-export-[timestamp]/`

**Expected output:**
```
✅ Exported X documents to products.json
✅ Exported X documents to services.json
✅ Exported X documents to categories.json
✅ Exported X documents to businesses.json
```

---

## Step 3: Run Import

After export completes, run:

```bash
# Find the latest export directory
EXPORT_DIR=$(ls -td exports/firebase-export-* | head -1)

# Run import
npm run migrate:import "$EXPORT_DIR"
```

Or directly:
```bash
tsx scripts/import-to-prisma.ts "$EXPORT_DIR"
```

**This will:**
- Import businesses first
- Import categories
- Import products (with image URLs preserved)
- Import services (with image URLs preserved)
- Link categories and businesses

**Expected output:**
```
✅ Imported X/Y businesses
✅ Imported X/Y categories
✅ Imported X/Y products
✅ Imported X/Y services
```

---

## Step 4: Verify

```bash
# Open Prisma Studio to verify
npx prisma studio

# Or check via API
npm run dev:api
# Then visit: http://localhost:3001/api/products
```

**Check:**
- ✅ Product count matches Firebase
- ✅ Service count matches Firebase
- ✅ Image URLs are present (Firebase Storage URLs)
- ✅ Categories are linked
- ✅ Businesses are linked

---

## Quick Commands

```bash
# 1. Export (after serviceAccountKey.json is in place)
npx ts-node scripts/export-firebase-data.ts

# 2. Import (replace [timestamp] with actual timestamp)
npx ts-node scripts/import-to-prisma.ts exports/firebase-export-[timestamp]

# 3. Verify
npx prisma studio
```

---

## What Gets Migrated

✅ **Products:**
- Names, descriptions
- Image URLs (pointing to Firebase Storage)
- Categories
- Business relationships
- Review counts
- Rating statistics

✅ **Services:**
- Names, descriptions
- Image URLs (pointing to Firebase Storage)
- Categories
- Business relationships
- Review counts
- Rating statistics

✅ **Image URLs:**
- Preserved as strings
- Continue pointing to Firebase Storage
- No image files need to be moved

---

## Need Help?

See detailed guides:
- `MIGRATION_SETUP.md` - Setup instructions
- `MIGRATION_CHECKLIST.md` - Complete checklist
- `PRODUCTS_SERVICES_MIGRATION_GUIDE.md` - Full guide

---

**Ready when you have `serviceAccountKey.json`!** 🎯

