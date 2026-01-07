/**
 * Firebase Data Export Script for Prisma Migration
 * 
 * Exports all Firestore collections to JSON files for migration to Prisma + PostgreSQL
 * Handles both Mobile App and Admin Dashboard data
 * 
 * Usage: npm run migrate:export
 *        or: tsx scripts/export-firebase-data.ts
 */

import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
// Make sure to set GOOGLE_APPLICATION_CREDENTIALS environment variable
// or provide serviceAccountKey.json path
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Export directory
const EXPORT_DIR = path.join(__dirname, '..', 'exports');
const TIMESTAMP = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const EXPORT_PATH = path.join(EXPORT_DIR, `firebase-export-${TIMESTAMP}`);

// Create export directory
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR);
}
if (!fs.existsSync(EXPORT_PATH)) {
  fs.mkdirSync(EXPORT_PATH);
}

/**
 * Convert Firestore Timestamp to ISO string
 */
function convertTimestamp(timestamp: any): string | null {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate().toISOString();
  if (timestamp instanceof Date) return timestamp.toISOString();
  if (typeof timestamp === 'string') return timestamp;
  return null;
}

/**
 * Transform Firestore document to plain object with converted timestamps
 */
function transformDocument(doc: admin.firestore.DocumentSnapshot): any {
  const data = doc.data();
  if (!data) return null;

  const transformed: any = { id: doc.id };

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'toDate' in value) {
      // Firestore Timestamp
      transformed[key] = convertTimestamp(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Nested object - recursively convert timestamps
      transformed[key] = transformNestedObject(value);
    } else {
      transformed[key] = value;
    }
  }

  return transformed;
}

/**
 * Recursively transform nested objects
 */
function transformNestedObject(obj: any): any {
  const transformed: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && 'toDate' in value) {
      transformed[key] = convertTimestamp(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      transformed[key] = transformNestedObject(value);
    } else {
      transformed[key] = value;
    }
  }
  
  return transformed;
}

/**
 * Export a single collection
 */
async function exportCollection(collectionName: string): Promise<number> {
  console.log(`\n📦 Exporting collection: ${collectionName}`);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    const documents: any[] = [];

    snapshot.forEach((doc) => {
      const transformed = transformDocument(doc);
      if (transformed) {
        documents.push(transformed);
      }
    });

    const filePath = path.join(EXPORT_PATH, `${collectionName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));

    console.log(`✅ Exported ${documents.length} documents to ${collectionName}.json`);
    return documents.length;
  } catch (error) {
    console.error(`❌ Error exporting ${collectionName}:`, error);
    return 0;
  }
}

/**
 * Export all collections
 */
async function exportAllCollections() {
  console.log('🚀 Starting Firebase Data Export for Prisma Migration');
  console.log(`📁 Export location: ${EXPORT_PATH}\n`);

  const collections = [
    // Core User Data
    'users',              // Mobile app users + admin staff users
    'staff',              // Admin staff members

    // Content
    'products',           // Product catalog
    'services',           // Service catalog
    'categories',         // Product & service categories
    'businesses',         // Business owners

    // User Engagement
    'reviews',            // Sentiment reviews (mobile app)
    'comments',           // Comments on products/services (mobile app)
    'quickRatings',       // Quick emoji ratings (mobile app)
    'favorites',          // User favorites (mobile app)

    // Reactions & History
    'commentReactions',   // Agree/disagree on comments (mobile app)
    'userRatingHistory',  // Historical ratings (mobile app)

    // Surveys (if exists)
    'surveys',            // User surveys (mobile app - optional)
    'surveyTemplates',    // Survey templates (mobile app - optional)
  ];

  const results: { [key: string]: number } = {};
  let totalDocuments = 0;

  for (const collectionName of collections) {
    const count = await exportCollection(collectionName);
    results[collectionName] = count;
    totalDocuments += count;
  }

  // Create summary report
  const summary = {
    exportDate: new Date().toISOString(),
    exportPath: EXPORT_PATH,
    totalCollections: collections.length,
    totalDocuments,
    collections: results,
    notes: [
      'All Firestore Timestamps converted to ISO 8601 strings',
      'Nested objects preserved as JSON',
      'Document IDs preserved in "id" field',
      'Arrays preserved as-is',
      'Review schema alignment for mobile app and admin dashboard',
    ],
  };

  const summaryPath = path.join(EXPORT_PATH, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  // Create README for the export
  const readme = `# Firebase Data Export

**Export Date**: ${new Date().toISOString()}
**Total Collections**: ${collections.length}
**Total Documents**: ${totalDocuments}

## Collections Exported

${Object.entries(results)
  .map(([name, count]) => `- **${name}**: ${count} documents`)
  .join('\n')}

## Data Transformations Applied

1. ✅ Firestore Timestamps → ISO 8601 strings
2. ✅ Document IDs → "id" field
3. ✅ Nested objects preserved
4. ✅ Arrays preserved
5. ✅ All field types maintained

## Files Generated

${collections.map((name) => `- \`${name}.json\` - ${results[name]} documents`).join('\n')}
- \`summary.json\` - Export metadata
- \`README.md\` - This file

## Next Steps

1. Review exported data for completeness
2. Check \`summary.json\` for counts
3. Design Prisma schema based on exported structure
4. Create transformation script for data import
5. Set up PostgreSQL database
6. Run Prisma migrations
7. Import transformed data

## Collection Details

### Users Collection
- Mobile app users (phone/email auth)
- Admin staff users (email auth with "Admin" role)
- Includes analytics (reviews, comments)

### Products & Services
- Product/service catalog
- Images stored as URLs (Firebase Storage)
- Categories as arrays
- Review counts and sentiment data
- Quick rating distributions

### Reviews
- Sentiment-based reviews: "Would recommend", "Its Good", "Dont mind it", "It's bad"
- Links to users and products/services
- Optional text field

### Comments
- Threaded comments (depth field)
- Agree/Disagree reactions
- Links to products/services via itemId (mobile app) or parentId (legacy)
- Supports both schemas for backward compatibility

### Quick Ratings
- Emoji-based ratings (1-5 scale)
- Daily update limit (24 hours)
- Distribution data

### Favorites
- User saved products/services
- Composite ID: {userId}_{itemType}_{itemId}

### Comment Reactions
- Agree/Disagree reactions
- Composite ID: {userId}-{commentId}

## Important Notes

- **Image URLs**: All image URLs point to Firebase Storage. Consider migrating to another storage solution or keeping Firebase Storage.
- **Auth Users**: Users in \`users\` collection may have corresponding Firebase Auth accounts. Export Firebase Auth users separately if needed.
- **Composite IDs**: Some collections use composite IDs (favorites, commentReactions). Plan how to handle these in Prisma.
- **Nested Analytics**: User analytics are nested objects. Decide whether to normalize or use JSON columns in PostgreSQL.

## Verification Checklist

- [ ] All expected collections exported
- [ ] Document counts match Firestore console
- [ ] No sensitive data (passwords, tokens) in exports
- [ ] Timestamp fields converted correctly
- [ ] Arrays and nested objects intact
- [ ] Foreign key references identifiable

---

**Generated by**: Firebase Export Script for Prisma Migration
**Version**: 1.0.0
`;

  const readmePath = path.join(EXPORT_PATH, 'README.md');
  fs.writeFileSync(readmePath, readme);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Export Complete!');
  console.log('='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   Total Collections: ${collections.length}`);
  console.log(`   Total Documents: ${totalDocuments}`);
  console.log(`   Export Location: ${EXPORT_PATH}`);
  console.log(`\n📄 Files Created:`);
  console.log(`   - ${collections.length} collection JSON files`);
  console.log(`   - summary.json (metadata)`);
  console.log(`   - README.md (documentation)`);
  console.log(`\n🔍 Next Steps:`);
  console.log(`   1. Review summary.json for counts`);
  console.log(`   2. Check README.md for details`);
  console.log(`   3. Verify data completeness`);
  console.log(`   4. Design Prisma schema`);
  console.log(`   5. Create transformation script`);
  console.log('\n');
}

/**
 * Export Firebase Auth users (optional)
 */
async function exportAuthUsers(): Promise<void> {
  console.log('\n🔐 Exporting Firebase Auth Users');
  
  try {
    const authUsers: any[] = [];
    let nextPageToken: string | undefined;

    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      
      listUsersResult.users.forEach((userRecord) => {
        authUsers.push({
          uid: userRecord.uid,
          email: userRecord.email || null,
          phoneNumber: userRecord.phoneNumber || null,
          displayName: userRecord.displayName || null,
          photoURL: userRecord.photoURL || null,
          emailVerified: userRecord.emailVerified,
          disabled: userRecord.disabled,
          metadata: {
            creationTime: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime,
          },
          customClaims: userRecord.customClaims || {},
        });
      });

      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    const authFilePath = path.join(EXPORT_PATH, 'firebase-auth-users.json');
    fs.writeFileSync(authFilePath, JSON.stringify(authUsers, null, 2));

    console.log(`✅ Exported ${authUsers.length} Firebase Auth users to firebase-auth-users.json`);
    console.log('⚠️  Note: Passwords cannot be exported. Users will need to reset passwords or use migration strategy.');
  } catch (error) {
    console.error('❌ Error exporting Firebase Auth users:', error);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await exportAllCollections();
    await exportAuthUsers();

    console.log('🎉 Firebase export completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error during export:', error);
    process.exit(1);
  }
}

// Run the export
main();




