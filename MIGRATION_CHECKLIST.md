# Products & Services Migration Checklist

## Prerequisites

Before starting the migration, ensure you have:

- [ ] **Firebase Service Account Key** (`serviceAccountKey.json`)
  - Download from Firebase Console → Project Settings → Service Accounts
  - Place in project root directory

- [ ] **Database Connection**
  - `DATABASE_URL` or `DATABASE_PUBLIC_URL` in `.env` file
  - Database is accessible and migrations are applied

- [ ] **Backup**
  - Firebase data exported (or ready to export)
  - PostgreSQL database backed up (optional but recommended)

---

## Migration Steps

### Step 1: Export from Firebase

```bash
# Ensure serviceAccountKey.json exists
ls serviceAccountKey.json

# Run export
npx ts-node scripts/export-firebase-data.ts
```

**Expected Output:**
- `exports/firebase-export-[timestamp]/products.json`
- `exports/firebase-export-[timestamp]/services.json`
- `exports/firebase-export-[timestamp]/categories.json`
- `exports/firebase-export-[timestamp]/businesses.json`

**Verify:**
```bash
# Check export directory
ls -la exports/firebase-export-*/

# Check product count
cat exports/firebase-export-*/products.json | jq '. | length'

# Check a sample product
cat exports/firebase-export-*/products.json | jq '.[0] | {id, product_name, mainImage}'
```

---

### Step 2: Import to PostgreSQL

```bash
# Find latest export directory
EXPORT_DIR=$(ls -td exports/firebase-export-* | head -1)
echo "Using export: $EXPORT_DIR"

# Run import
npx ts-node scripts/import-to-prisma.ts "$EXPORT_DIR"
```

**Import Order:**
1. Users (if not already imported)
2. Businesses
3. Categories
4. Products
5. Services
6. Reviews, Comments, Ratings, Favorites

**Expected Output:**
```
✅ Imported X/Y products
✅ Imported X/Y services
```

---

### Step 3: Verify Migration

#### Check Product Count
```bash
# Via Prisma Studio
npx prisma studio

# Or via SQL
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Product\";"
```

#### Check Image URLs
```bash
# Check products with images
psql $DATABASE_URL -c "SELECT id, \"productName\", \"mainImage\" FROM \"Product\" WHERE \"mainImage\" IS NOT NULL LIMIT 5;"
```

#### Test API
```bash
# Start API server
npm run dev:api

# Test endpoint
curl http://localhost:3001/api/products | jq '.data[0] | {id, productName, mainImage}'
```

---

## Troubleshooting

### Issue: serviceAccountKey.json not found

**Solution:**
1. Go to Firebase Console
2. Project Settings → Service Accounts
3. Click "Generate New Private Key"
4. Save as `serviceAccountKey.json` in project root
5. Add to `.gitignore` (if not already)

### Issue: Database connection error

**Solution:**
1. Check `.env` file has `DATABASE_URL` or `DATABASE_PUBLIC_URL`
2. Test connection: `npx prisma db pull`
3. Verify migrations: `npx prisma migrate status`

### Issue: Import fails with foreign key errors

**Solution:**
1. Ensure businesses are imported before products/services
2. Ensure categories are imported before products/services
3. Check import order in script

### Issue: Image URLs not working

**Solution:**
1. Verify URLs in database point to Firebase Storage
2. Check Firebase Storage rules allow public read
3. Test URL directly in browser

---

## Post-Migration

- [ ] Verify all products imported
- [ ] Verify all services imported
- [ ] Test image loading in admin dashboard
- [ ] Test image loading in mobile app
- [ ] Verify categories linked correctly
- [ ] Verify business relationships
- [ ] Test creating new product/service
- [ ] Test updating product/service
- [ ] Monitor for any issues

---

## Rollback Plan

If something goes wrong:

1. **Don't delete Firebase data** - keep it as backup
2. **Clear PostgreSQL tables** (if needed):
   ```sql
   TRUNCATE "Product", "Service", "ProductCategory", "ServiceCategory" CASCADE;
   ```
3. **Re-run import** after fixing issues

---

## Success Criteria

✅ Product count matches Firebase  
✅ Service count matches Firebase  
✅ Image URLs present and valid  
✅ Categories linked correctly  
✅ Business relationships correct  
✅ Images load in application  
✅ API endpoints return correct data  

---

## Next Steps After Migration

1. Update mobile app to use new API endpoints
2. Update admin dashboard to use Prisma
3. Test all CRUD operations
4. Monitor for 1 week
5. Consider removing Firebase Firestore dependency (optional)

