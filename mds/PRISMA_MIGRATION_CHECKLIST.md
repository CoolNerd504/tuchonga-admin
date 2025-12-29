# Prisma Migration Checklist

## ✅ Pre-Migration Checklist

### 1. Backup Current Data
- [ ] Export all Firestore data using Firebase CLI or export script
- [ ] Verify export files are complete
- [ ] Store backups in secure location
- [ ] Document current Firebase project ID and configuration

### 2. Choose Database
- [ ] Select SQL database (PostgreSQL recommended)
- [ ] Set up database instance (local or cloud)
- [ ] Get connection string
- [ ] Test database connection

### 3. Set Up Prisma
- [ ] Install Prisma CLI: `npm install -g prisma`
- [ ] Install Prisma Client: `npm install @prisma/client`
- [ ] Initialize Prisma: `npx prisma init`
- [ ] Configure `DATABASE_URL` in `.env`

---

## 📋 Migration Steps

### Phase 1: Data Export
- [ ] Run export script: `npx ts-node scripts/export-firebase-data.ts`
- [ ] Verify all collections exported successfully
- [ ] Check `exports/summary.json` for counts
- [ ] Review exported JSON files for data quality

### Phase 2: Schema Design
- [ ] Review current Firestore structure
- [ ] Design Prisma schema (`prisma/schema.prisma`)
- [ ] Map Firestore collections to Prisma models
- [ ] Handle nested objects (JSON vs normalized tables)
- [ ] Define relationships and foreign keys
- [ ] Add indexes for performance
- [ ] Review schema with team

### Phase 3: Data Transformation
- [ ] Create transformation script
- [ ] Convert Firestore Timestamps to ISO strings
- [ ] Handle arrays and nested objects
- [ ] Map document IDs to new ID system
- [ ] Resolve foreign key references
- [ ] Test transformation on sample data

### Phase 4: Database Setup
- [ ] Create database: `npx prisma migrate dev --name init`
- [ ] Verify tables created correctly
- [ ] Check indexes created
- [ ] Test database connection

### Phase 5: Data Import
- [ ] Create seed script (`prisma/seed.ts`)
- [ ] Transform and import users first
- [ ] Import categories
- [ ] Import businesses
- [ ] Import products and services
- [ ] Import reviews and ratings
- [ ] Import comments and reactions
- [ ] Import favorites
- [ ] Verify data integrity

### Phase 6: Application Migration
- [ ] Install Prisma Client in app
- [ ] Replace Firebase imports with Prisma
- [ ] Update authentication service
- [ ] Update product/service services
- [ ] Update review services
- [ ] Update comment services
- [ ] Update favorites service
- [ ] Update all Redux slices
- [ ] Remove Firebase dependencies

### Phase 7: Testing
- [ ] Test user authentication flow
- [ ] Test product/service browsing
- [ ] Test review submission
- [ ] Test comment system
- [ ] Test favorites
- [ ] Test search functionality
- [ ] Test offline functionality (if applicable)
- [ ] Performance testing
- [ ] Load testing

### Phase 8: Deployment
- [ ] Set up production database
- [ ] Run migrations on production
- [ ] Import production data
- [ ] Update environment variables
- [ ] Deploy application
- [ ] Monitor for errors
- [ ] Rollback plan ready

---

## 🔍 Data Verification Checklist

### Users
- [ ] All user documents exported
- [ ] Email addresses preserved
- [ ] Phone numbers preserved
- [ ] Profile images URLs preserved
- [ ] Analytics data preserved
- [ ] Role assignments correct

### Products & Services
- [ ] All products exported
- [ ] All services exported
- [ ] Images URLs preserved
- [ ] Categories preserved
- [ ] Ratings/reviews counts correct
- [ ] Sentiment distribution preserved

### Reviews
- [ ] All reviews exported
- [ ] User references resolved
- [ ] Product/service references resolved
- [ ] Sentiment values preserved
- [ ] Timestamps converted correctly

### Comments
- [ ] All comments exported
- [ ] Threading relationships preserved
- [ ] Reaction counts correct
- [ ] User references resolved

### Favorites
- [ ] All favorites exported
- [ ] User references resolved
- [ ] Product/service references resolved

---

## ⚠️ Common Issues & Solutions

### Issue: Timestamp Conversion
**Solution**: Use `toDate().toISOString()` for Firestore Timestamps

### Issue: Array Fields
**Solution**: Use JSON columns or create junction tables

### Issue: Nested Objects
**Solution**: Use JSON columns or normalize into separate tables

### Issue: Document References
**Solution**: Extract IDs and create foreign key relationships

### Issue: Missing Data
**Solution**: Check Firestore rules, verify export script, check for deleted documents

### Issue: Data Type Mismatches
**Solution**: Review Prisma schema, adjust field types, update transformation script

---

## 📊 Migration Metrics

Track these metrics during migration:

- **Total Collections**: 14
- **Total Documents**: [Count after export]
- **Export Time**: [Duration]
- **Transformation Time**: [Duration]
- **Import Time**: [Duration]
- **Data Loss**: [Count of missing documents]
- **Errors**: [Count and types]

---

## 🚨 Rollback Plan

If migration fails:

1. **Stop Application**: Prevent new data from being written
2. **Restore Firebase**: Keep Firebase running as backup
3. **Fix Issues**: Address migration problems
4. **Re-export**: Export fresh data if needed
5. **Re-import**: Import corrected data
6. **Test Again**: Verify before switching

---

## 📝 Post-Migration Tasks

- [ ] Update documentation
- [ ] Update API documentation
- [ ] Train team on Prisma
- [ ] Set up monitoring
- [ ] Create backup strategy
- [ ] Document new database structure
- [ ] Archive Firebase project (after verification period)

---

## 🔗 Useful Commands

```bash
# Export Firebase data
npx ts-node scripts/export-firebase-data.ts

# Initialize Prisma
npx prisma init

# Create migration
npx prisma migrate dev --name migration_name

# Generate Prisma Client
npx prisma generate

# Seed database
npx prisma db seed

# View database in Prisma Studio
npx prisma studio

# Reset database (development only)
npx prisma migrate reset
```

---

## 📚 Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Firebase Export Guide](https://firebase.google.com/docs/firestore/manage-data/export-import)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Migration Best Practices](https://www.prisma.io/docs/guides/migrate-to-prisma)

---

**Last Updated**: 2025-01-XX
**Status**: Ready for Migration Planning

