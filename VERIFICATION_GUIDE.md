# ✅ Verification Guide - Firebase Token Integration

## 🎯 Quick Verification Checklist

Use this guide to confirm that Firebase token integration is working correctly.

---

## 📋 Pre-Verification Checklist

Before testing, ensure:

- [ ] `firebase-admin` is installed (`npm install` or `yarn install`)
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` is set in environment variables
- [ ] Backend server is running
- [ ] You have a Firebase project with authentication enabled
- [ ] You can generate Firebase ID tokens from your mobile app

---

## 🔍 Step 1: Check Firebase Admin SDK Initialization

### Local Development

**Start your server and check the logs:**

```bash
npm run dev:api
# or
yarn dev:api
```

**Look for this message:**
```
✅ Firebase Admin SDK initialized successfully
```

**If you see this instead:**
```
⚠️ Firebase Admin SDK not initialized - Firebase token auth will not work
```

**Then:**
- Check if `FIREBASE_SERVICE_ACCOUNT_KEY` is set in your `.env` file
- Verify the JSON format is correct
- Check for any parsing errors in the logs

### Production (Railway)

1. Go to Railway → Your Service → **Deployments**
2. Click on the latest deployment
3. Check the **Logs** tab
4. Look for the initialization message

---

## 🧪 Step 2: Test Firebase Token Exchange Endpoint

### Test 1: Get Firebase ID Token

**From your mobile app or Firebase Console:**

```javascript
// In your mobile app (React Native/Expo)
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;

if (user) {
  const firebaseToken = await user.getIdToken();
  console.log('Firebase Token:', firebaseToken);
  // Use this token in the next step
}
```

### Test 2: Exchange Token for JWT

**Using curl or Postman:**

```bash
curl -X POST http://localhost:3001/api/auth/firebase-token \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "phoneNumber": "+1234567890",
    "fullName": null,
    "displayName": null,
    "profileImage": null,
    "hasCompletedProfile": false,
    "role": "user",
    "createdAt": "2024-12-29T...",
    "updatedAt": "2024-12-29T..."
  }
}
```

**If you get an error:**
- `401 Invalid Firebase token` → Check if token is valid and not expired
- `500 Internal server error` → Check server logs for details
- `Firebase Admin SDK not initialized` → Check environment variable

---

## 🧪 Step 3: Test User Creation Flow

### Test 3a: Complete Profile with Firebase Token

**This should create a user if they don't exist:**

```bash
curl -X POST http://localhost:3001/api/users/me/complete-profile \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "displayName": "John",
    "phoneNumber": "+1234567890",
    "location": "New York, USA",
    "gender": "male"
  }'
```

**Expected Success Response (200):**
```json
{
  "success": true,
  "message": "Profile completed successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "phoneNumber": "+1234567890",
    "fullName": "John Doe",
    "displayName": "John",
    "location": "New York, USA",
    "gender": "male",
    "hasCompletedProfile": true,
    "role": "user",
    "createdAt": "2024-12-29T...",
    "updatedAt": "2024-12-29T..."
  }
}
```

### Test 3b: Get User Profile with Firebase Token

```bash
curl -X GET http://localhost:3001/api/users/me \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "phoneNumber": "+1234567890",
    "fullName": "John Doe",
    "displayName": "John",
    "hasCompletedProfile": true,
    "role": "user",
    ...
  }
}
```

---

## 🧪 Step 4: Test JWT Token Flow

### Test 4a: Use JWT Token from Exchange

After getting JWT from `/api/auth/firebase-token`, use it:

```bash
# Get JWT from previous step
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Use JWT for authenticated requests
curl -X GET http://localhost:3001/api/users/me \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected:** Same response as Firebase token (should work identically)

---

## 🧪 Step 5: Test Database Verification

### Check if User Was Created

**Using Prisma Studio:**
```bash
npm run prisma:studio
```

**Or using SQL:**
```sql
SELECT id, email, phoneNumber, fullName, firebaseAuthId, hasCompletedProfile, createdAt
FROM "User"
WHERE firebaseAuthId IS NOT NULL
ORDER BY createdAt DESC
LIMIT 10;
```

**What to verify:**
- [ ] User record exists in database
- [ ] `firebaseAuthId` field is populated
- [ ] `hasCompletedProfile` is `true` (if profile was completed)
- [ ] `email` or `phoneNumber` matches Firebase user
- [ ] `role` is `user`
- [ ] `isActive` is `true`

---

## 🧪 Step 6: Test Error Cases

### Test 6a: Invalid Token

```bash
curl -X POST http://localhost:3001/api/auth/firebase-token \
  -H "Authorization: Bearer invalid-token-12345" \
  -H "Content-Type: application/json"
```

**Expected Error (401):**
```json
{
  "success": false,
  "error": "Invalid Firebase token: ...",
  "code": "INVALID_FIREBASE_TOKEN"
}
```

### Test 6b: Missing Token

```bash
curl -X POST http://localhost:3001/api/auth/firebase-token \
  -H "Content-Type: application/json"
```

**Expected Error (401):**
```json
{
  "success": false,
  "error": "Firebase token required"
}
```

### Test 6c: Expired Token

Firebase tokens expire after 1 hour. Test with an old token:

**Expected Error (401):**
```json
{
  "success": false,
  "error": "Firebase token has expired"
}
```

---

## 📱 Step 7: Mobile App Integration Test

### Test Flow from Mobile App

1. **User signs up on Firebase**
   ```javascript
   // Mobile app code
   const userCredential = await createUserWithEmailAndPassword(auth, email, password);
   const firebaseToken = await userCredential.user.getIdToken();
   ```

2. **Exchange for JWT**
   ```javascript
   const response = await fetch('https://your-api.com/api/auth/firebase-token', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${firebaseToken}`,
       'Content-Type': 'application/json',
     },
   });
   
   const { token, data } = await response.json();
   console.log('JWT Token:', token);
   console.log('User Data:', data);
   ```

3. **Complete Profile**
   ```javascript
   const profileResponse = await fetch('https://your-api.com/api/users/me/complete-profile', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${firebaseToken}`, // or use JWT token
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       fullName: 'John Doe',
       displayName: 'John',
       phoneNumber: '+1234567890',
     }),
   });
   ```

4. **Get User Profile**
   ```javascript
   const userResponse = await fetch('https://your-api.com/api/users/me', {
     headers: {
       'Authorization': `Bearer ${token}`, // Use JWT token
       'Content-Type': 'application/json',
     },
   });
   ```

---

## ✅ Success Criteria

Your setup is working correctly if:

- [x] Firebase Admin SDK initializes successfully (check logs)
- [x] `POST /api/auth/firebase-token` returns JWT token
- [x] User is created in database when using Firebase token
- [x] `GET /api/users/me` works with Firebase token
- [x] `POST /api/users/me/complete-profile` works with Firebase token
- [x] `GET /api/users/me` works with JWT token
- [x] User record exists in database with `firebaseAuthId`
- [x] Mobile app can complete the full flow

---

## 🔍 Debugging Tips

### Check Server Logs

**Look for:**
- Firebase Admin initialization messages
- Token verification errors
- Database query errors
- User creation logs

### Common Issues

1. **"Firebase Admin SDK not initialized"**
   - Check `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable
   - Verify JSON format is correct
   - Check for parsing errors

2. **"Invalid Firebase token"**
   - Token might be expired (refresh it)
   - Token format might be wrong
   - Firebase project might not match

3. **"User not found" after token exchange**
   - Check database connection
   - Verify Prisma migrations are applied
   - Check if user was actually created

4. **"Account is deactivated"**
   - Check `isActive` field in database
   - User might have been deactivated

---

## 📊 Verification Script

Create a test script to verify everything:

```bash
# test-firebase-integration.sh
#!/bin/bash

API_URL="http://localhost:3001/api"
FIREBASE_TOKEN="YOUR_FIREBASE_TOKEN_HERE"

echo "🧪 Testing Firebase Integration..."
echo ""

echo "1. Testing Firebase Token Exchange..."
RESPONSE=$(curl -s -X POST "$API_URL/auth/firebase-token" \
  -H "Authorization: Bearer $FIREBASE_TOKEN" \
  -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Token exchange successful"
  JWT_TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "JWT Token: ${JWT_TOKEN:0:50}..."
else
  echo "❌ Token exchange failed"
  echo "$RESPONSE"
  exit 1
fi

echo ""
echo "2. Testing Get User Profile with Firebase Token..."
RESPONSE=$(curl -s -X GET "$API_URL/users/me" \
  -H "Authorization: Bearer $FIREBASE_TOKEN" \
  -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Get user profile successful"
else
  echo "❌ Get user profile failed"
  echo "$RESPONSE"
  exit 1
fi

echo ""
echo "3. Testing Get User Profile with JWT Token..."
RESPONSE=$(curl -s -X GET "$API_URL/users/me" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Get user profile with JWT successful"
else
  echo "❌ Get user profile with JWT failed"
  echo "$RESPONSE"
  exit 1
fi

echo ""
echo "✅ All tests passed!"
```

---

## 🎯 Quick Verification Commands

### Check if Firebase Admin is initialized:
```bash
# Check server logs for initialization message
# Or test with a simple endpoint
curl http://localhost:3001/api/auth/verify
```

### Check environment variable (local):
```bash
# Check if variable is set
echo $FIREBASE_SERVICE_ACCOUNT_KEY | head -c 50

# Or check .env file
grep FIREBASE_SERVICE_ACCOUNT_KEY .env
```

### Check Railway environment variable:
1. Go to Railway → Your Service → Variables
2. Verify `FIREBASE_SERVICE_ACCOUNT_KEY` exists
3. Check deployment logs for initialization message

---

## 📝 Verification Report Template

After testing, document your results:

```
✅ Firebase Integration Verification Report
Date: [Date]
Environment: [Local/Production]

[ ] Firebase Admin SDK initialized
[ ] POST /api/auth/firebase-token works
[ ] GET /api/users/me works with Firebase token
[ ] GET /api/users/me works with JWT token
[ ] POST /api/users/me/complete-profile works
[ ] User created in database
[ ] firebaseAuthId populated
[ ] Mobile app integration tested

Issues Found:
- [List any issues]

Notes:
- [Any additional notes]
```

---

**Last Updated:** 2024-12-29

