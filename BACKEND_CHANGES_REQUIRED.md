# 🔧 Backend Changes Required for Mobile App Integration

## 📋 Executive Summary

The current backend implementation **does NOT support Firebase token authentication**, which is **critical** for mobile app user creation. The mobile app relies on Firebase Auth for initial authentication and expects the backend to:

1. ✅ Accept Firebase ID tokens for user creation
2. ✅ Create users automatically when they don't exist
3. ✅ Support both Firebase tokens and JWT tokens

**Current Status:** ❌ **NOT COMPATIBLE** - Backend only supports JWT tokens

---

## 🚨 Critical Issues

### Issue 1: No Firebase Token Support

**Current State:**
- `verifyToken` middleware only validates JWT tokens
- No Firebase Admin SDK integration
- Cannot verify Firebase ID tokens

**Required Change:**
- Add Firebase Admin SDK
- Create middleware to verify Firebase tokens
- Support both token types in authentication

### Issue 2: User Creation Not Automatic

**Current State:**
- `POST /api/users/me/complete-profile` requires existing user (via `verifyToken`)
- `completeProfile()` only updates existing users
- Cannot create users from Firebase tokens

**Required Change:**
- Modify `complete-profile` endpoint to create users if they don't exist
- Accept Firebase tokens for new user creation
- Lookup user by Firebase UID or email

### Issue 3: Missing Firebase Token Exchange Endpoint

**Current State:**
- No `/api/auth/firebase-token` endpoint
- Mobile app cannot exchange Firebase token for JWT

**Required Change:**
- Add optional endpoint to exchange Firebase token for JWT
- Improves session management

---

## ✅ Required Changes

### 1. Install Firebase Admin SDK

```bash
npm install firebase-admin
```

### 2. Create Firebase Service Configuration

**File:** `src/services/firebaseAdminService.ts` (NEW)

```typescript
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : null;

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    console.warn('Firebase Admin not initialized - Firebase token auth will not work');
  }
}

export const firebaseAdmin = admin;

/**
 * Verify Firebase ID token and extract user info
 */
export async function verifyFirebaseToken(token: string): Promise<{
  uid: string;
  email?: string;
  phoneNumber?: string;
}> {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      phoneNumber: decodedToken.phone_number,
    };
  } catch (error: any) {
    throw new Error(`Invalid Firebase token: ${error.message}`);
  }
}

/**
 * Get or create user from Firebase token
 */
export async function getOrCreateUserFromFirebase(firebaseUser: {
  uid: string;
  email?: string;
  phoneNumber?: string;
}) {
  const { prisma } = await import('./prismaService.js');
  
  // Try to find user by Firebase UID or email
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { firebaseAuthId: firebaseUser.uid },
        ...(firebaseUser.email ? [{ email: firebaseUser.email }] : []),
        ...(firebaseUser.phoneNumber ? [{ phoneNumber: firebaseUser.phoneNumber }] : []),
      ],
    },
  });

  // Create user if doesn't exist
  if (!user) {
    user = await prisma.user.create({
      data: {
        firebaseAuthId: firebaseUser.uid,
        email: firebaseUser.email || null,
        phoneNumber: firebaseUser.phoneNumber || null,
        role: 'user',
        hasCompletedProfile: false,
        isActive: true,
        userAnalytics: {
          create: {},
        },
      },
    });
  } else if (!user.firebaseAuthId) {
    // Update existing user with Firebase UID
    user = await prisma.user.update({
      where: { id: user.id },
      data: { firebaseAuthId: firebaseUser.uid },
    });
  }

  return user;
}
```

### 3. Update Auth Middleware

**File:** `api/middleware/auth.ts` (MODIFY)

Add Firebase token support to `verifyToken`:

```typescript
import { verifyFirebaseToken, getOrCreateUserFromFirebase } from '../../src/services/firebaseAdminService.js';

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token required',
        code: 'AUTH_TOKEN_REQUIRED',
      });
    }

    // Try JWT token first
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        role: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          fullName: true,
          displayName: true,
          profileImage: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          error: user ? 'Account is deactivated' : 'User not found',
          code: user ? 'AUTH_ACCOUNT_DEACTIVATED' : 'AUTH_INVALID_TOKEN',
        });
      }

      (req as AuthenticatedRequest).user = {
        userId: user.id,
        email: user.email || '',
        role: user.role,
        fullName: user.fullName || undefined,
        displayName: user.displayName || undefined,
        profileImage: user.profileImage || undefined,
      };

      return next();
    } catch (jwtError) {
      // JWT verification failed, try Firebase token
      try {
        const firebaseUser = await verifyFirebaseToken(token);
        const user = await getOrCreateUserFromFirebase(firebaseUser);

        if (!user.isActive) {
          return res.status(403).json({
            success: false,
            error: 'Account is deactivated',
            code: 'AUTH_ACCOUNT_DEACTIVATED',
          });
        }

        (req as AuthenticatedRequest).user = {
          userId: user.id,
          email: user.email || '',
          role: user.role,
          fullName: user.fullName || undefined,
          displayName: user.displayName || undefined,
          profileImage: user.profileImage || undefined,
        };

        return next();
      } catch (firebaseError) {
        // Both failed
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          code: 'AUTH_INVALID_TOKEN',
        });
      }
    }
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'AUTH_INVALID_TOKEN',
    });
  }
};
```

### 4. Update Complete Profile Endpoint

**File:** `api/routes/users.ts` (MODIFY)

Modify `POST /api/users/me/complete-profile` to create users if they don't exist:

```typescript
// Complete profile
router.post('/me/complete-profile', verifyToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { fullName, displayName, profileImage, location, phoneNumber, gender } = req.body;

    if (!fullName) {
      return res.status(400).json({
        success: false,
        error: 'Full name is required',
      });
    }

    // Get user - if doesn't exist, create it (for Firebase users)
    let user = await mobileUserService.getUserById(userId);
    
    if (!user) {
      // User doesn't exist - create it
      // This happens when Firebase token creates user but user hasn't completed profile
      const { prisma } = await import('../../src/services/prismaService.js');
      user = await prisma.user.create({
        data: {
          id: userId, // Use the ID from token
          fullName,
          displayName: displayName || fullName,
          profileImage,
          location,
          phoneNumber,
          gender,
          role: 'user',
          hasCompletedProfile: true,
          isActive: true,
          userAnalytics: {
            create: {},
          },
        },
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          fullName: true,
          displayName: true,
          profileImage: true,
          location: true,
          gender: true,
          hasCompletedProfile: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } else {
      // Update existing user
      user = await mobileUserService.completeProfile(userId, {
        fullName,
        displayName: displayName || fullName,
        profileImage,
        location,
        phoneNumber,
        gender,
      });
    }

    res.json({
      success: true,
      message: 'Profile completed successfully',
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Better Approach:** Update `mobileUserService.completeProfile` to handle creation:

**File:** `src/services/mobileUserService.ts` (MODIFY)

```typescript
async completeProfile(id: string, data: UpdateUserData) {
  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    // Create user if doesn't exist (for Firebase users)
    user = await prisma.user.create({
      data: {
        id,
        fullName: data.fullName,
        displayName: data.displayName || data.fullName,
        profileImage: data.profileImage,
        location: data.location,
        phoneNumber: data.phoneNumber,
        gender: data.gender,
        email: data.email,
        role: 'user',
        hasCompletedProfile: true,
        isActive: true,
        userAnalytics: {
          create: {},
        },
      },
    });
  } else {
    // Update existing user
    user = await this.updateUser(id, {
      ...data,
      hasCompletedProfile: true,
    });
  }

  return user;
}
```

### 5. Add Firebase Token Exchange Endpoint (Optional but Recommended)

**File:** `api/routes/auth.ts` (ADD)

```typescript
// Exchange Firebase token for JWT token
router.post('/firebase-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Firebase token required',
      });
    }

    const { verifyFirebaseToken, getOrCreateUserFromFirebase } = await import('../../src/services/firebaseAdminService.js');
    const { generateToken } = await import('../middleware/auth.js');

    // Verify Firebase token
    const firebaseUser = await verifyFirebaseToken(token);
    
    // Get or create user
    const user = await getOrCreateUserFromFirebase(firebaseUser);

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated',
      });
    }

    // Generate JWT token
    const jwtToken = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      token: jwtToken,
      data: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        displayName: user.displayName,
        hasCompletedProfile: user.hasCompletedProfile,
      },
    });
  } catch (error: any) {
    if (error.message.includes('Invalid Firebase token')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Firebase token',
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});
```

---

## 🔧 Environment Variables

Add to `.env`:

```bash
# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

Or use individual variables:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

---

## 📝 Database Schema

Ensure `User` model has `firebaseAuthId` field (already exists in schema):

```prisma
model User {
  firebaseAuthId       String?   @unique // Firebase Auth UID
  // ... other fields
}
```

---

## ✅ Testing Checklist

After implementing changes:

- [ ] Install Firebase Admin SDK
- [ ] Create `firebaseAdminService.ts`
- [ ] Update `verifyToken` middleware to support Firebase tokens
- [ ] Update `complete-profile` endpoint to create users
- [ ] Add `/api/auth/firebase-token` endpoint (optional)
- [ ] Test Firebase token authentication
- [ ] Test user creation via Firebase token
- [ ] Test JWT token still works
- [ ] Test mixed token scenarios

---

## 🎯 More Efficient Alternative Approach

### Option A: Unified Token Handler (Recommended)

Instead of trying both JWT and Firebase in `verifyToken`, create a separate middleware:

**File:** `api/middleware/auth.ts` (ADD)

```typescript
/**
 * Verify token (JWT or Firebase) and attach user info
 */
export const verifyTokenOrFirebase = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token required',
        code: 'AUTH_TOKEN_REQUIRED',
      });
    }

    let user;

    // Try JWT first (faster)
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        role: string;
      };
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          fullName: true,
          displayName: true,
          profileImage: true,
          isActive: true,
        },
      });
    } catch {
      // Try Firebase token
      const firebaseUser = await verifyFirebaseToken(token);
      user = await getOrCreateUserFromFirebase(firebaseUser);
    }

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: user ? 'Account is deactivated' : 'User not found',
        code: user ? 'AUTH_ACCOUNT_DEACTIVATED' : 'AUTH_INVALID_TOKEN',
      });
    }

    (req as AuthenticatedRequest).user = {
      userId: user.id,
      email: user.email || '',
      role: user.role,
      fullName: user.fullName || undefined,
      displayName: user.displayName || undefined,
      profileImage: user.profileImage || undefined,
    };

    next();
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'AUTH_INVALID_TOKEN',
    });
  }
};
```

Then use `verifyTokenOrFirebase` for endpoints that need Firebase support:

```typescript
router.post('/me/complete-profile', verifyTokenOrFirebase, async (req, res) => {
  // ...
});
```

### Option B: Separate Firebase Middleware

Create a dedicated middleware for Firebase-only endpoints:

```typescript
export const verifyFirebaseToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Only verify Firebase tokens
  // Create user if doesn't exist
};
```

---

## 📊 Impact Assessment

### Changes Required:

1. **New Files:** 1 (`firebaseAdminService.ts`)
2. **Modified Files:** 3 (`auth.ts`, `users.ts`, `mobileUserService.ts`)
3. **New Dependencies:** 1 (`firebase-admin`)
4. **Environment Variables:** 1 (`FIREBASE_SERVICE_ACCOUNT_KEY`)

### Risk Level: **MEDIUM**

- **Breaking Changes:** None (backward compatible)
- **Database Changes:** None (schema already supports `firebaseAuthId`)
- **Performance Impact:** Minimal (Firebase token verification is fast)

### Benefits:

- ✅ Mobile app can create users seamlessly
- ✅ Supports both Firebase and JWT tokens
- ✅ Better user experience (no manual user creation)
- ✅ Maintains backward compatibility

---

## 🚀 Implementation Priority

1. **HIGH:** Firebase token support in middleware
2. **HIGH:** User creation in `complete-profile`
3. **MEDIUM:** Firebase token exchange endpoint
4. **LOW:** Additional error handling improvements

---

## 📚 Related Documentation

- `BACKEND_SETUP_CONFIRMATION_GUIDE.md` - Mobile app requirements
- `MOBILE_API_GUIDE.md` - Full API documentation
- `prisma/schema.prisma` - Database schema

---

**Last Updated:** 2024-12-29  
**Status:** ⚠️ **REQUIRES IMPLEMENTATION**

