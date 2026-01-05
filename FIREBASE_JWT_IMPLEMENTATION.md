# 🔥 Firebase to JWT Token Implementation

## Overview

This implementation allows users created on Firebase to be automatically created in your database and receive a JWT token for API access.

## Flow

1. **User signs up on Firebase** → Firebase returns user with UID and ID token
2. **Mobile app calls `POST /api/auth/firebase-token`** with Firebase ID token
3. **Backend verifies Firebase token** using Firebase Admin SDK
4. **Backend creates user in database** if they don't exist (or finds existing user)
5. **Backend generates JWT token** for the user
6. **Backend returns JWT token** to mobile app
7. **Mobile app uses JWT token** for all subsequent API calls

---

## 📦 Installation

```bash
npm install firebase-admin
```

---

## 🔧 Setup

### 1. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file

### 2. Set Environment Variable

Add to your `.env` file:

```bash
# Option 1: Full JSON string (recommended)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'

# Option 2: Individual variables (alternative)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**For Railway/Production:**
- Add `FIREBASE_SERVICE_ACCOUNT_KEY` as an environment variable
- Paste the entire JSON content as a single-line string

---

## 📡 API Endpoint

### `POST /api/auth/firebase-token`

**Description:** Exchange Firebase ID token for JWT token and create user if needed

**Authentication:** Required (Firebase ID token)

**Headers:**
```
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

**Request Body:** None (token is in Authorization header)

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "phoneNumber": "+1234567890",
    "fullName": "John Doe",
    "displayName": "John",
    "profileImage": "https://...",
    "hasCompletedProfile": false,
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**

| Status | Response |
|--------|----------|
| `401` | `{ "success": false, "error": "Firebase token required" }` |
| `401` | `{ "success": false, "error": "Invalid Firebase token", "code": "INVALID_FIREBASE_TOKEN" }` |
| `403` | `{ "success": false, "error": "Account is deactivated", "code": "ACCOUNT_DEACTIVATED" }` |
| `500` | `{ "success": false, "error": "Internal server error" }` |

---

## 🔄 Mobile App Usage

### Example Implementation

```typescript
// After Firebase signup/login
async function exchangeFirebaseTokenForJWT(firebaseIdToken: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/firebase-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseIdToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to exchange token');
    }

    // Store JWT token
    await SecureStore.setItemAsync('auth_token', data.token);
    
    // Store user data
    await SecureStore.setItemAsync('user_data', JSON.stringify(data.data));

    return data;
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
}

// Usage in your app
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;

if (user) {
  // Get Firebase ID token
  const firebaseToken = await user.getIdToken();
  
  // Exchange for JWT
  const result = await exchangeFirebaseTokenForJWT(firebaseToken);
  
  console.log('User created/authenticated:', result.data);
  console.log('JWT token:', result.token);
}
```

---

## 🗄️ Database Behavior

### User Creation Logic

The endpoint follows this logic:

1. **Check by Firebase UID** (`firebaseAuthId`)
   - If found → Return existing user

2. **Check by Email** (if provided)
   - If found → Update with Firebase UID → Return user

3. **Check by Phone Number** (if provided)
   - If found → Update with Firebase UID → Return user

4. **Create New User**
   - Creates user with:
     - `firebaseAuthId`: Firebase UID
     - `email`: From Firebase token
     - `phoneNumber`: From Firebase token
     - `fullName`: From Firebase token (if available)
     - `displayName`: First name from Firebase token
     - `profileImage`: From Firebase token (if available)
     - `role`: "user"
     - `hasCompletedProfile`: false
     - `isActive`: true
     - Creates `UserAnalytics` record

---

## 🔐 Security Considerations

### Token Validation

- Firebase tokens are verified using Firebase Admin SDK
- Only valid, non-expired Firebase tokens are accepted
- User must be active in database to receive JWT

### JWT Token

- JWT tokens expire in 7 days (configurable)
- Contains: `userId`, `email`, `role`
- Signed with `JWT_SECRET`

### Error Handling

- Invalid Firebase tokens return `401 Unauthorized`
- Deactivated accounts return `403 Forbidden`
- All errors are logged for debugging

---

## 📝 Files Created/Modified

### New Files

1. **`src/services/firebaseAdminService.ts`**
   - Firebase Admin SDK initialization
   - Token verification
   - User creation/lookup logic

### Modified Files

1. **`api/routes/auth.ts`**
   - Added `POST /api/auth/firebase-token` endpoint

2. **`package.json`**
   - Added `firebase-admin` dependency

---

## ✅ Testing

### Test the Endpoint

```bash
# Get Firebase ID token from your mobile app
# Then test with curl:

curl -X POST https://your-api.com/api/auth/firebase-token \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json"
```

### Expected Results

1. **First call** (new user):
   - Creates user in database
   - Returns JWT token
   - `hasCompletedProfile: false`

2. **Subsequent calls** (existing user):
   - Finds existing user
   - Returns JWT token
   - Updates `firebaseAuthId` if missing

---

## 🚀 Next Steps

After implementing this:

1. **Update mobile app** to call `/api/auth/firebase-token` after Firebase signup
2. **Store JWT token** in mobile app for API calls
3. **Use JWT token** for all authenticated endpoints
4. **Handle token expiration** - refresh or re-authenticate

---

## 🔄 Complete User Flow

```
1. User opens app
   ↓
2. User signs up with Firebase (phone/email)
   ↓
3. Firebase returns user + ID token
   ↓
4. Mobile app calls POST /api/auth/firebase-token
   ↓
5. Backend creates user in database
   ↓
6. Backend returns JWT token
   ↓
7. Mobile app stores JWT token
   ↓
8. User completes profile (optional)
   ↓
9. All API calls use JWT token
```

---

## 📚 Related Documentation

- `BACKEND_SETUP_CONFIRMATION_GUIDE.md` - Mobile app requirements
- `BACKEND_CHANGES_REQUIRED.md` - Implementation details
- `MOBILE_API_GUIDE.md` - Full API documentation

---

**Last Updated:** 2024-12-29  
**Status:** ✅ **IMPLEMENTED**

