# Quick Migration Steps - Products & Services

## Since Images Stay in Firebase Storage

Since you're keeping Firebase Storage, you only need to migrate the **metadata** (data), not the images themselves. The image URLs will be copied as strings to PostgreSQL.

---

## 3 Simple Steps

### Step 1: Export from Firebase

```bash
npm run migrate:export
```

Or:
```bash
tsx scripts/export-firebase-data.ts
```

**Output:** `exports/firebase-export-[timestamp]/products.json` and `services.json`

---

### Step 2: Import to PostgreSQL

```bash
# Use the latest export directory
npm run migrate:import exports/firebase-export-[timestamp]
```

Or:
```bash
tsx scripts/import-to-prisma.ts exports/firebase-export-[timestamp]
```

**What happens:**
- ✅ Products imported with `mainImage` and `additionalImages` URLs preserved
- ✅ Services imported with `mainImage` and `additionalImages` URLs preserved
- ✅ Image URLs point to Firebase Storage (unchanged)
- ✅ Categories and businesses linked

---

### Step 3: Verify

```bash
# Check in Prisma Studio
npx prisma studio

# Or check via API
curl http://localhost:3001/api/products | jq '.data[0].mainImage'
```

**Expected:** Image URLs should be Firebase Storage URLs like:
```
https://firebasestorage.googleapis.com/v0/b/[project].appspot.com/o/...
```

---

## That's It! 🎉

**No image migration needed** - the URLs are just strings in the database pointing to Firebase Storage.

---

## What Gets Migrated

✅ Product/Service names, descriptions  
✅ Categories  
✅ Business relationships  
✅ Review counts  
✅ Rating statistics  
✅ **Image URLs** (as strings pointing to Firebase Storage)  
✅ Timestamps  

## What Stays in Firebase

✅ **Image files** (remain in Firebase Storage)  
✅ **Image URLs** (continue to work)  

---

## Future Uploads

After migration, when uploading new images:

1. Upload to Firebase Storage (as before)
2. Get the download URL
3. Save the URL to PostgreSQL (instead of Firestore)

**No changes to upload logic needed** - just save to different database!

