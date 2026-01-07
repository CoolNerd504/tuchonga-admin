# Migration Setup Guide

## Quick Setup Steps

### 1. Get Firebase Service Account Key

**Option A: Download from Firebase Console**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click ⚙️ **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the JSON file as `serviceAccountKey.json` in your project root
7. **Important:** Add to `.gitignore` if not already there

**Option B: Use Environment Variable**

If you prefer not to store the key file, you can modify the export script to use environment variables:

```typescript
// In scripts/export-firebase-data.ts
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : require('../serviceAccountKey.json');
```

Then set:
```bash
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

---

### 2. Verify Database Connection

```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# Or check .env file (if accessible)
# DATABASE_URL should be set to your PostgreSQL connection string
```

---

### 3. Run Migration

Once you have the service account key:

```bash
# Step 1: Export from Firebase
npx ts-node scripts/export-firebase-data.ts

# Step 2: Find the export directory
ls -td exports/firebase-export-* | head -1

# Step 3: Import to PostgreSQL
npx ts-node scripts/import-to-prisma.ts exports/firebase-export-[timestamp]
```

---

## Current Status

✅ **Ready:**
- Database migrations applied
- Import script ready
- Export script ready
- Exports directory created

⏳ **Needed:**
- Firebase Service Account Key (`serviceAccountKey.json`)

---

## Next Steps

1. **Get Firebase Service Account Key** (see above)
2. **Place it in project root** as `serviceAccountKey.json`
3. **Run export script** to get products/services from Firebase
4. **Run import script** to migrate to PostgreSQL

---

## Alternative: Manual Export

If you can't use the script, you can manually export from Firebase Console:

1. Go to Firebase Console → Firestore Database
2. Export each collection:
   - `products` → Download as JSON
   - `services` → Download as JSON
   - `categories` → Download as JSON
   - `businesses` → Download as JSON
3. Place files in `exports/manual-export/`
4. Modify import script to read from manual export location

---

## Ready to Proceed?

Once you have `serviceAccountKey.json` in place, we can run:

```bash
# Export
npx ts-node scripts/export-firebase-data.ts

# Import  
npx ts-node scripts/import-to-prisma.ts exports/firebase-export-[timestamp]
```

Let me know when you have the service account key ready!

