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
    
    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        firebaseAdminInitialized = true;
        console.log('✅ Firebase Admin SDK initialized successfully');
      } catch (parseError) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseError);
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

