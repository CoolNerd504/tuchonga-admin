# Infrastructure-First Migration Plan

## 🎯 Strategy: Set Up Infrastructure First, Migrate Data Later

This approach focuses on:
1. ✅ Setting up Prisma with PostgreSQL
2. ✅ Deploying to Railway
3. ✅ Updating application code to use Prisma
4. ⏳ **Data migration will happen later** (Firebase data stays intact)

---

## Phase 1: Prisma Setup (No Data Migration)

### Step 1: Install Prisma

```bash
# Install Prisma dependencies
npm install prisma @prisma/client
npm install -D typescript ts-node @types/node

# Initialize Prisma
npx prisma init
```

### Step 2: Set Up PostgreSQL Database

**Option A: Railway PostgreSQL (Recommended for Production)**
1. Sign up at [Railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL service
4. Copy the connection string (DATABASE_URL)

**Option B: Local PostgreSQL (For Development)**
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15
createdb tuchonga

# Create .env file
echo 'DATABASE_URL="postgresql://username:password@localhost:5432/tuchonga"' > .env
```

### Step 3: Configure Prisma Schema

The schema is already defined in `prisma/schema.prisma`. Review and customize if needed:

```bash
# Review schema
cat prisma/schema.prisma

# Create initial migration (creates empty tables)
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate
```

### Step 4: Verify Empty Database

```bash
# Open Prisma Studio to view empty database
npx prisma studio
```

You should see all tables created but empty (no data yet).

---

## Phase 2: Railway Deployment Setup

### Step 1: Install Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login
```

### Step 2: Initialize Railway Project

```bash
# Link to existing Railway project or create new
railway init

# Add PostgreSQL service (if not already added)
railway add postgresql
```

### Step 3: Configure Environment Variables

```bash
# Set DATABASE_URL (Railway provides this automatically)
railway variables

# Add other environment variables
railway variables set NODE_ENV=production
railway variables set FIREBASE_API_KEY=your_key
railway variables set FIREBASE_AUTH_DOMAIN=your_domain
# ... other Firebase config
```

### Step 4: Configure Railway Deployment

Create `railway.json` (optional):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Step 5: Update package.json for Railway

```json
{
  "scripts": {
    "start": "vite preview --port $PORT --host 0.0.0.0",
    "build": "tsc && vite build",
    "postinstall": "prisma generate"
  }
}
```

### Step 6: Deploy to Railway

```bash
# Deploy to Railway
railway up

# Or connect to GitHub for auto-deploy
railway link
```

---

## Phase 3: Update Application Code to Use Prisma

### Step 1: Create Prisma Service

Create `src/services/prismaService.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Step 2: Create Service Layer

Create service files that use Prisma instead of Firebase:

**Example: `src/services/productService.ts`**

```typescript
import { prisma } from './prismaService';

export const productService = {
  // Get all products
  async getAll() {
    return prisma.product.findMany({
      include: {
        categories: { include: { category: true } },
        business: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Get product by ID
  async getById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        categories: { include: { category: true } },
        business: true,
        reviews: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  },

  // Create product
  async create(data: any) {
    return prisma.product.create({
      data: {
        productName: data.productName,
        description: data.description,
        mainImage: data.mainImage,
        additionalImages: data.additionalImages || [],
        productOwner: data.productOwner,
        isActive: data.isActive ?? true,
        // ... other fields
      },
    });
  },

  // Update product
  async update(id: string, data: any) {
    return prisma.product.update({
      where: { id },
      data,
    });
  },

  // Delete product
  async delete(id: string) {
    return prisma.product.delete({
      where: { id },
    });
  },
};
```

### Step 3: Update Components to Use Prisma Services

**Before (Firebase):**
```typescript
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const productsSnapshot = await getDocs(collection(db, 'products'));
```

**After (Prisma):**
```typescript
import { productService } from '../services/productService';

const products = await productService.getAll();
```

### Step 4: Update All Firebase Calls

Replace Firebase calls throughout the application:

| Firebase | Prisma |
|----------|--------|
| `collection(db, 'products')` | `prisma.product.findMany()` |
| `doc(db, 'products', id)` | `prisma.product.findUnique({ where: { id } })` |
| `addDoc(collection(...), data)` | `prisma.product.create({ data })` |
| `updateDoc(doc(...), data)` | `prisma.product.update({ where: { id }, data })` |
| `deleteDoc(doc(...))` | `prisma.product.delete({ where: { id } })` |

---

## Phase 4: Keep Firebase for Authentication (Temporary)

Since we're not migrating data yet, keep Firebase Auth:

```typescript
// Keep using Firebase Auth
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// But use Prisma for data
import { prisma } from './services/prismaService';
```

---

## Phase 5: Testing with Empty Database

### Test All Features

1. **Authentication**: Should still work (Firebase Auth)
2. **Data Display**: Will show empty lists (expected)
3. **Create Operations**: Should work and save to Prisma
4. **Update Operations**: Should work with Prisma
5. **Delete Operations**: Should work with Prisma

### Test Checklist

- [ ] User can sign in (Firebase Auth)
- [ ] Dashboard loads (empty data is fine)
- [ ] Can create new product
- [ ] Can create new service
- [ ] Can create new category
- [ ] Can update existing items
- [ ] Can delete items
- [ ] All forms work correctly
- [ ] No console errors

---

## Phase 6: Deploy to Railway

### Step 1: Build and Test Locally

```bash
# Build the application
npm run build

# Test the build locally
npm run start
```

### Step 2: Deploy

```bash
# Deploy to Railway
railway up

# Or push to GitHub (if connected)
git push origin main
```

### Step 3: Verify Deployment

1. Check Railway dashboard for deployment status
2. Visit your Railway URL
3. Test all features
4. Check logs: `railway logs`

---

## 📋 Migration Checklist (Infrastructure Only)

### Prisma Setup
- [ ] Install Prisma dependencies
- [ ] Initialize Prisma
- [ ] Set up PostgreSQL (Railway or local)
- [ ] Configure DATABASE_URL
- [ ] Review and customize schema
- [ ] Run initial migration
- [ ] Generate Prisma Client
- [ ] Verify empty database in Prisma Studio

### Railway Setup
- [ ] Install Railway CLI
- [ ] Create Railway account
- [ ] Create Railway project
- [ ] Add PostgreSQL service
- [ ] Configure environment variables
- [ ] Set up deployment configuration
- [ ] Test local build

### Code Migration
- [ ] Create Prisma service
- [ ] Create product service (Prisma)
- [ ] Create service service (Prisma)
- [ ] Create category service (Prisma)
- [ ] Create review service (Prisma)
- [ ] Create comment service (Prisma)
- [ ] Update all components to use Prisma services
- [ ] Remove Firebase Firestore imports (keep Auth)
- [ ] Test all CRUD operations

### Testing
- [ ] Test authentication (Firebase Auth)
- [ ] Test creating new records
- [ ] Test reading records
- [ ] Test updating records
- [ ] Test deleting records
- [ ] Test all forms
- [ ] Check for console errors

### Deployment
- [ ] Build application
- [ ] Deploy to Railway
- [ ] Verify deployment
- [ ] Test production deployment
- [ ] Monitor logs

---

## 🎯 What's NOT Done Yet (Data Migration)

These will be done later:

- [ ] Export Firebase data
- [ ] Transform Firebase data
- [ ] Import data to Prisma
- [ ] Verify data integrity
- [ ] Compare data counts
- [ ] Migrate Firebase Storage images (optional)

---

## 🔄 Dual System Approach (Temporary)

During this phase, you'll have:

1. **Firebase**: Still contains all your existing data
2. **Prisma/PostgreSQL**: Empty database, ready for new data
3. **Application**: Uses Prisma for new data, Firebase Auth for authentication

**Benefits:**
- ✅ No risk to existing data
- ✅ Can test infrastructure thoroughly
- ✅ Can rollback easily
- ✅ New data goes to Prisma
- ✅ Old data stays in Firebase (safe)

---

## 📝 Next Steps (After Infrastructure is Ready)

Once Prisma and Railway are working:

1. **Test thoroughly** with empty database
2. **Verify all features work**
3. **Deploy to production**
4. **Then plan data migration** (separate task)

---

## 🚨 Important Notes

### Keep Firebase Running
- Don't delete Firebase project
- Keep Firebase Auth active
- Keep Firebase Storage active (for images)
- Old data remains in Firebase

### New Data Strategy
- All new data goes to Prisma
- Old data stays in Firebase
- You can migrate data later when ready

### Rollback Plan
- If Prisma setup fails, you still have Firebase
- Application can switch back to Firebase easily
- No data loss risk

---

## 📚 Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Railway Documentation](https://docs.railway.app)
- [PostgreSQL on Railway](https://docs.railway.app/databases/postgresql)

---

## ✅ Success Criteria

Infrastructure migration is successful when:

- ✅ Prisma is set up and connected
- ✅ Database schema is created
- ✅ Application uses Prisma for data operations
- ✅ Railway deployment works
- ✅ All CRUD operations work
- ✅ No console errors
- ✅ Application is accessible via Railway URL

**Data migration is a separate task and can be done later!**

---

**Last Updated**: January 2025  
**Status**: Infrastructure-First Approach  
**Data Migration**: To be done later

