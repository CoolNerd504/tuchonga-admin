# Prisma Migration Quick Start

This is a TL;DR version of the complete migration guide. For full details, see [FIREBASE_TO_PRISMA_COMPLETE_GUIDE.md](./FIREBASE_TO_PRISMA_COMPLETE_GUIDE.md).

---

## ⚡ Quick Start (30 minutes)

### 1. Prerequisites

```bash
# Install dependencies
npm install prisma @prisma/client firebase-admin
npm install -D typescript ts-node @types/node

# Set up PostgreSQL (local or cloud)
# Option 1: Local
brew install postgresql@15
brew services start postgresql@15
createdb tuchonga

# Option 2: Cloud (Supabase - recommended)
# Sign up at https://supabase.com and create a project
```

### 2. Configure

```bash
# Initialize Prisma
npx prisma init

# Edit .env with your database URL
echo 'DATABASE_URL="postgresql://username:password@localhost:5432/tuchonga"' > .env

# Get Firebase service account key
# Firebase Console → Settings → Service Accounts → Generate New Private Key
# Save as serviceAccountKey.json
```

### 3. Run Migration

```bash
# Step 1: Export Firebase data
npm run migrate:export

# Step 2: Create database schema
npm run migrate:schema

# Step 3: Import data to Prisma
npm run migrate:import

# Step 4: Verify data
npm run migrate:verify
```

### 4. Update Application

```typescript
// Replace Firebase imports with Prisma
import { prisma } from './services/prismaService';

// Example: Get products
const products = await prisma.product.findMany({
  include: {
    categories: { include: { category: true } },
    business: true,
  },
});
```

### 5. Test & Deploy

```bash
# Test locally
npm run dev

# Build for production
npm run build

# Deploy with updated DATABASE_URL
```

---

## 📦 NPM Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "migrate:export": "ts-node scripts/export-firebase-data.ts",
    "migrate:schema": "prisma migrate dev --name init",
    "migrate:import": "ts-node scripts/import-to-prisma.ts",
    "migrate:verify": "ts-node scripts/verify-data.ts",
    "migrate:all": "npm run migrate:export && npm run migrate:schema && npm run migrate:import && npm run migrate:verify",
    "prisma:studio": "prisma studio",
    "prisma:generate": "prisma generate"
  }
}
```

---

## 🎯 Migration Checklist

- [ ] Install dependencies
- [ ] Set up PostgreSQL database
- [ ] Configure `.env` with `DATABASE_URL`
- [ ] Add Firebase service account key
- [ ] Run `npm run migrate:export`
- [ ] Review exported data in `exports/` folder
- [ ] Run `npm run migrate:schema`
- [ ] Verify schema in Prisma Studio (`npm run prisma:studio`)
- [ ] Run `npm run migrate:import`
- [ ] Run `npm run migrate:verify`
- [ ] Update application code to use Prisma
- [ ] Test all features locally
- [ ] Deploy to production
- [ ] Monitor for 7 days
- [ ] Archive Firebase (optional)

---

## 🔍 Key Files

| File | Purpose |
|------|---------|
| `scripts/export-firebase-data.ts` | Export Firebase to JSON |
| `scripts/import-to-prisma.ts` | Import JSON to Prisma |
| `scripts/verify-data.ts` | Verify data integrity |
| `prisma/schema.prisma` | Database schema definition |
| `.env` | Database connection string |
| `serviceAccountKey.json` | Firebase admin credentials |

---

## 🚨 Important Notes

1. **Backup First**: Always backup Firebase before migration
2. **Test Locally**: Test full migration locally before production
3. **Keep Firebase**: Don't delete Firebase data for at least 30 days
4. **Auth Strategy**: Decide if keeping Firebase Auth or migrating to another solution
5. **Offline Support**: Plan for offline functionality (Firestore has better offline support)
6. **Real-time Updates**: Implement WebSockets or polling if needed

---

## 💡 Common Commands

```bash
# View database in browser
npx prisma studio

# Generate Prisma Client after schema changes
npx prisma generate

# Create migration after schema changes
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only!)
npx prisma migrate reset

# Export current database
pg_dump -U username -d tuchonga > backup.sql

# Import database backup
psql -U username -d tuchonga < backup.sql
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't connect to database | Check `DATABASE_URL` in `.env` |
| Export script fails | Verify `serviceAccountKey.json` path |
| Import fails with FK errors | Check data export completeness |
| Missing data after import | Run verify script, check logs |
| Slow queries | Add indexes, check query optimization |

---

## 📚 Next Steps

1. **Read Full Guide**: [FIREBASE_TO_PRISMA_COMPLETE_GUIDE.md](./FIREBASE_TO_PRISMA_COMPLETE_GUIDE.md)
2. **Review Alignment**: [ANALYTICS_ALIGNMENT_GAPS.md](./ANALYTICS_ALIGNMENT_GAPS.md)
3. **Check Admin Features**: [ADMIN_DASHBOARD_COMPREHENSIVE_FEATURES.md](./ADMIN_DASHBOARD_COMPREHENSIVE_FEATURES.md)
4. **Mobile App Features**: [COMPREHENSIVE_FEATURE_SUMMARY.md](./COMPREHENSIVE_FEATURE_SUMMARY.md)

---

**Estimated Time**: 30 minutes (small dataset) to 2 hours (large dataset)

**Support**: Create an issue or contact dev team

**Last Updated**: December 28, 2025



