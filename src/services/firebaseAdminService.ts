import * as admin from 'firebase-admin';
import { prisma } from './prismaService.js';

// Initialize Firebase Admin SDK
let firebaseAdminInitialized = false;

function initializeFirebaseAdmin() {
  if (firebaseAdminInitialized) {
    return;
  }

  try {
    // Check if Firebase Admin is already initialized
    if (admin.apps.length > 0) {
      firebaseAdminInitialized = true;
      return;
    }

    // Try to get service account from environment
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey && serviceAccountKey.trim()) {
      console.log('🔍 Found FIREBASE_SERVICE_ACCOUNT_KEY, attempting to parse...');
      console.log(`   Key type: ${typeof serviceAccountKey}`);
      console.log(`   Key length: ${serviceAccountKey.length} characters`);
      console.log(`   Key is empty: ${serviceAccountKey.trim().length === 0}`);
      console.log(`   Key preview (first 100 chars): ${serviceAccountKey.substring(0, 100)}...`);
      
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        
        console.log('✅ JSON parsed successfully');
        console.log(`   Parsed type: ${typeof serviceAccount}`);
        console.log(`   Is object: ${typeof serviceAccount === 'object' && serviceAccount !== null}`);
        
        if (!serviceAccount || typeof serviceAccount !== 'object') {
          console.error(`   ❌ Parsed value is not a valid object. Type: ${typeof serviceAccount}, Value: ${JSON.stringify(serviceAccount)}`);
          throw new Error('Parsed value is not a valid object');
        }
        
        console.log(`   Project ID: ${serviceAccount.project_id || 'MISSING'} (type: ${typeof serviceAccount.project_id})`);
        console.log(`   Client Email: ${serviceAccount.client_email || 'MISSING'} (type: ${typeof serviceAccount.client_email})`);
        
        // Detailed private_key logging
        console.log(`   Private Key exists: ${!!serviceAccount.private_key}`);
        console.log(`   Private Key type: ${typeof serviceAccount.private_key}`);
        
        if (serviceAccount.private_key) {
          if (typeof serviceAccount.private_key === 'string') {
            console.log(`   Private Key length: ${serviceAccount.private_key.length} characters`);
            console.log(`   Private Key preview (first 50 chars): ${serviceAccount.private_key.substring(0, 50)}...`);
            console.log(`   Private Key contains BEGIN: ${serviceAccount.private_key.includes('BEGIN PRIVATE KEY')}`);
            console.log(`   Private Key contains END: ${serviceAccount.private_key.includes('END PRIVATE KEY')}`);
            const privateKeyInfo = `Present (${serviceAccount.private_key.length} chars)`;
            console.log(`   Private Key: ${privateKeyInfo}`);
          } else {
            console.error(`   ❌ Private Key is not a string! Type: ${typeof serviceAccount.private_key}`);
            console.error(`   Private Key value: ${JSON.stringify(serviceAccount.private_key).substring(0, 100)}`);
            throw new Error(`private_key must be a string, got ${typeof serviceAccount.private_key}`);
          }
        } else {
          console.log(`   Private Key: MISSING or falsy`);
        }
        
        // Check for single backslash issue
        if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
          console.log('\n🔍 Checking private_key format in raw environment variable...');
          const rawKey = serviceAccountKey;
          console.log(`   Raw key length: ${rawKey.length}`);
          const privateKeyMatch = rawKey.match(/"private_key"\s*:\s*"([^"]*)"/);
          
          if (privateKeyMatch) {
            console.log(`   ✅ Regex match found`);
            console.log(`   Match groups count: ${privateKeyMatch.length}`);
            if (privateKeyMatch[1] !== undefined) {
              const privateKeyInEnv = privateKeyMatch[1];
              console.log(`   Extracted private_key from env length: ${privateKeyInEnv.length}`);
              console.log(`   Contains single \\n: ${privateKeyInEnv.includes('\\n')}`);
              console.log(`   Contains double \\\\n: ${privateKeyInEnv.includes('\\\\n')}`);
              
              if (typeof privateKeyInEnv === 'string') {
                if (privateKeyInEnv.includes('\\n') && !privateKeyInEnv.includes('\\\\n')) {
                  console.error('   ❌ ERROR: Private key has single backslash \\n instead of double backslash \\\\n');
                  console.error('   This will cause JSON parsing to fail!');
                  console.error('   Fix: Replace all \\n with \\\\n in the private_key field in .env');
                  throw new Error('Invalid private key format: single backslash detected. Use \\\\n (double backslash) in .env file.');
                } else {
                  console.log('   ✅ Private key format check passed');
                  if (privateKeyInEnv.includes('\\\\n')) {
                    console.log('   ✅ Has correct double backslash format');
                  }
                }
              } else {
                console.error(`   ❌ Extracted private_key is not a string! Type: ${typeof privateKeyInEnv}`);
              }
            } else {
              console.error(`   ❌ Regex match[1] is undefined`);
            }
          } else {
            console.log(`   ⚠️  Could not find private_key in raw string (regex did not match)`);
            console.log(`   This might be okay if using individual env variables`);
          }
        }
        
        // Validate required fields before initializing
        console.log('\n🔐 Validating service account fields before initialization...');
        const missingFields = [];
        if (!serviceAccount.project_id) missingFields.push('project_id');
        if (!serviceAccount.private_key) missingFields.push('private_key');
        if (!serviceAccount.client_email) missingFields.push('client_email');
        
        if (missingFields.length > 0) {
          console.error(`   ❌ Missing required fields: ${missingFields.join(', ')}`);
          throw new Error(`Missing required fields in service account: ${missingFields.join(', ')}`);
        }
        
        console.log(`   ✅ All required fields present`);
        console.log(`   project_id type: ${typeof serviceAccount.project_id}, value: ${serviceAccount.project_id}`);
        console.log(`   client_email type: ${typeof serviceAccount.client_email}, value: ${serviceAccount.client_email}`);
        console.log(`   private_key type: ${typeof serviceAccount.private_key}, length: ${typeof serviceAccount.private_key === 'string' ? serviceAccount.private_key.length : 'N/A'}`);
        
        if (typeof serviceAccount.private_key !== 'string') {
          console.error(`   ❌ private_key must be a string, got: ${typeof serviceAccount.private_key}`);
          throw new Error(`private_key must be a string, got ${typeof serviceAccount.private_key}`);
        }
        
        console.log('   ✅ All validations passed, initializing Firebase Admin SDK...');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        firebaseAdminInitialized = true;
        console.log('✅ Firebase Admin SDK initialized successfully');
      } catch (parseError: any) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:');
        console.error('   Error:', parseError.message);
        if (parseError.message?.includes('Unexpected token') || parseError.message?.includes('JSON')) {
          console.error('   This is likely a JSON parsing error.');
          console.error('   Common causes:');
          console.error('   1. Single backslash \\n instead of double backslash \\\\n in private_key');
          console.error('   2. Missing quotes around the JSON string');
          console.error('   3. Invalid JSON format');
          console.error('   See FIX_NEWLINE_FORMAT.md for help');
        }
      }
    } else {
      // Try individual environment variables
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

      if (projectId && privateKey && clientEmail) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey,
            clientEmail,
          }),
        });
        firebaseAdminInitialized = true;
        console.log('✅ Firebase Admin SDK initialized successfully');
      } else {
        console.warn('⚠️ Firebase Admin SDK not initialized - Firebase token auth will not work');
        console.warn('   Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
      }
    }
  } catch (error: any) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
  }
}

// Initialize on module load
initializeFirebaseAdmin();

export { admin as firebaseAdmin };

// Export initialization status getter
export function getFirebaseAdminInitialized(): boolean {
  return firebaseAdminInitialized;
}

/**
 * Verify Firebase ID token and extract user info
 */
export async function verifyFirebaseToken(token: string): Promise<{
  uid: string;
  email?: string;
  phoneNumber?: string;
  name?: string;
  picture?: string;
}> {
  if (!firebaseAdminInitialized) {
    throw new Error('Firebase Admin SDK not initialized. Please configure FIREBASE_SERVICE_ACCOUNT_KEY.');
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      phoneNumber: decodedToken.phone_number,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };
  } catch (error: any) {
    if (error.code === 'auth/id-token-expired') {
      throw new Error('Firebase token has expired');
    }
    if (error.code === 'auth/argument-error') {
      throw new Error('Invalid Firebase token format');
    }
    throw new Error(`Invalid Firebase token: ${error.message}`);
  }
}

/**
 * Get or create user from Firebase token
 * Creates user in database if they don't exist
 */
export async function getOrCreateUserFromFirebase(firebaseUser: {
  uid: string;
  email?: string;
  phoneNumber?: string;
  name?: string;
  picture?: string;
}) {
  // Try to find user by Firebase UID first
  let user = await prisma.user.findUnique({
    where: { firebaseAuthId: firebaseUser.uid },
  });

  if (user) {
    return user;
  }

  // Try to find by email if provided
  if (firebaseUser.email) {
    user = await prisma.user.findUnique({
      where: { email: firebaseUser.email },
    });

    if (user) {
      // Update existing user with Firebase UID
      user = await prisma.user.update({
        where: { id: user.id },
        data: { firebaseAuthId: firebaseUser.uid },
      });
      return user;
    }
  }

  // Try to find by phone number if provided
  if (firebaseUser.phoneNumber) {
    user = await prisma.user.findUnique({
      where: { phoneNumber: firebaseUser.phoneNumber },
    });

    if (user) {
      // Update existing user with Firebase UID
      user = await prisma.user.update({
        where: { id: user.id },
        data: { firebaseAuthId: firebaseUser.uid },
      });
      return user;
    }
  }

  // Create new user
  user = await prisma.user.create({
    data: {
      firebaseAuthId: firebaseUser.uid,
      email: firebaseUser.email || null,
      phoneNumber: firebaseUser.phoneNumber || null,
      fullName: firebaseUser.name || null,
      displayName: firebaseUser.name?.split(' ')[0] || null,
      profileImage: firebaseUser.picture || null,
      role: 'user',
      hasCompletedProfile: false,
      isActive: true,
      userAnalytics: {
        create: {},
      },
    },
  });

  return user;
}

