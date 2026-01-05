# 🔧 Backend Setup Confirmation Guide

## Overview

This guide outlines the API endpoints, authentication methods, and data formats that the TuChonga Mobile App expects from the backend. Use this guide to confirm your backend implementation matches the mobile app's requirements.

---

## 📋 Table of Contents

1. [Base Configuration](#base-configuration)
2. [Authentication Endpoints](#authentication-endpoints)
3. [User Management Endpoints](#user-management-endpoints)
4. [Token Management](#token-management)
5. [Error Handling](#error-handling)
6. [User Creation Flow](#user-creation-flow)
7. [Testing Checklist](#testing-checklist)

---

## ⚙️ Base Configuration

### Base URL

**Production:** `https://tuchonga-admin-production.up.railway.app/api`

**Development:** Configurable via `EXPO_PUBLIC_API_URL` environment variable

### Required Headers

All authenticated requests must accept:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Important:** The mobile app uses **two types of tokens**:
1. **Firebase ID Tokens** - Used for initial user creation and authentication
2. **JWT Tokens** - Used for session management after user creation

---

## 🔐 Authentication Endpoints

### 1. Login Endpoint

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user with email and password to get JWT token

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Expected Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "displayName": "John",
    "phoneNumber": "+1234567890",
    "role": "user",
    "hasCompletedProfile": true,
    "profileImage": "https://...",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Expected Error Responses:**

| Status | Response |
|--------|----------|
| `400` | `{ "error": "Email and password are required" }` |
| `401` | `{ "error": "Invalid credentials" }` |
| `403` | `{ "error": "Account is locked. Please try again later." }` |
| `500` | `{ "error": "Internal server error" }` |

**Mobile App Usage:**
- Called after Firebase Auth signup/login to get JWT token
- Used when user already exists in API with email/password

---

### 2. Verify Token Endpoint

**Endpoint:** `GET /api/auth/verify`

**Description:** Verify if current JWT token is valid

**Authentication:** Required (Bearer JWT token)

**Expected Success Response (200):**
```json
{
  "success": true,
  "admin": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "displayName": "John",
    "phoneNumber": "+1234567890",
    "role": "user",
    "hasCompletedProfile": true,
    "profileImage": "https://...",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Expected Error Responses:**

| Status | Response |
|--------|----------|
| `401` | `{ "error": "No token provided" }` or `{ "error": "Invalid token" }` |

**Mobile App Usage:**
- Called on app startup to verify token validity
- Used to check if user session is still active

---

### 3. Firebase Token Exchange (Optional but Recommended)

**Endpoint:** `POST /api/auth/firebase-token`

**Description:** Exchange Firebase ID token for API JWT token

**Authentication:** Required (Bearer Firebase ID token)

**Request Body:**
```json
{
  "firebaseUid": "firebase-user-id",
  "email": "user@example.com"
}
```

**Expected Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "hasCompletedProfile": false
  }
}
```

**Expected Error Responses:**

| Status | Response |
|--------|----------|
| `401` | `{ "error": "Invalid Firebase token" }` |
| `404` | `{ "error": "User not found" }` |

**Mobile App Usage:**
- Called after Firebase Auth to get JWT token
- Used when user exists in API but needs JWT token
- **Note:** If this endpoint doesn't exist, mobile app will use Firebase token as fallback

---

## 👤 User Management Endpoints

### 1. Get Current User

**Endpoint:** `GET /api/users/me`

**Description:** Get authenticated user's profile

**Authentication:** Required (Bearer token - JWT or Firebase token)

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
    "profileImage": "https://...",
    "location": "City, Country",
    "gender": "male",
    "hasCompletedProfile": true,
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Expected Error Responses:**

| Status | Response |
|--------|----------|
| `401` | `{ "success": false, "error": "Unauthorized" }` or `{ "error": "Session expired. Please login again." }` |

**Mobile App Usage:**
- Called to check if user exists in API
- Used to verify user authentication status
- **Important:** Must accept Firebase tokens for new users who don't have JWT yet

---

### 2. Update User Profile

**Endpoint:** `PUT /api/users/me`

**Description:** Update authenticated user's profile

**Authentication:** Required (Bearer token - JWT or Firebase token)

**Request Body:**
```json
{
  "fullName": "John Doe",
  "displayName": "John",
  "phoneNumber": "+1234567890",
  "profileImage": "https://...",
  "location": "City, Country",
  "gender": "male"
}
```

**Expected Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "displayName": "John",
    "phoneNumber": "+1234567890",
    "profileImage": "https://...",
    "location": "City, Country",
    "gender": "male",
    "hasCompletedProfile": true,
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Mobile App Usage:**
- Called to update user profile information
- Used after profile completion

---

### 3. Complete User Profile (CRITICAL)

**Endpoint:** `POST /api/users/me/complete-profile`

**Description:** Complete user profile (first-time setup). **This endpoint MUST create the user if they don't exist.**

**Authentication:** Required (Bearer Firebase ID token for new users, JWT token for existing users)

**Request Body:**
```json
{
  "fullName": "John Doe",
  "displayName": "John",
  "phoneNumber": "+1234567890",
  "profileImage": "https://...",
  "location": "City, Country",
  "gender": "male"
}
```

**Required Fields:**
- `fullName` (string, required)

**Optional Fields:**
- `displayName` (string)
- `phoneNumber` (string)
- `profileImage` (string, URL)
- `location` (string)
- `gender` (string)

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
    "profileImage": "https://...",
    "location": "City, Country",
    "gender": "male",
    "hasCompletedProfile": true,
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Expected Error Responses:**

| Status | Response |
|--------|----------|
| `400` | `{ "success": false, "error": "Full name is required" }` |
| `401` | `{ "success": false, "error": "Unauthorized" }` or `{ "error": "Session expired. Please login again." }` |
| `500` | `{ "success": false, "error": "Internal server error" }` |

**CRITICAL REQUIREMENTS:**

1. **Must accept Firebase ID tokens** in Authorization header for new users
2. **Must create user if they don't exist** when called with Firebase token
3. **Must update user if they already exist**
4. **Must set `hasCompletedProfile: true`** after successful completion
5. **Should return user data** in response

**Mobile App Usage:**
- Called immediately after Firebase signup to create user in API
- Called when user completes their profile for the first time
- **This is the primary endpoint for user creation in the API**

---

## 🔑 Token Management

### Token Types

The mobile app uses two types of tokens:

1. **Firebase ID Tokens**
   - Obtained from Firebase Auth
   - Used for initial user creation
   - Format: JWT token from Firebase
   - Sent in `Authorization: Bearer <firebase-token>` header

2. **API JWT Tokens**
   - Obtained from `/api/auth/login` or `/api/auth/firebase-token`
   - Used for session management
   - Format: JWT token from your API
   - Sent in `Authorization: Bearer <jwt-token>` header

### Token Validation

**Backend must:**
- Accept Firebase ID tokens for:
  - `GET /api/users/me` (for new users)
  - `POST /api/users/me/complete-profile` (for user creation)
- Accept API JWT tokens for:
  - All authenticated endpoints (after user has JWT)
- Validate token format and expiration
- Return `401 Unauthorized` for invalid/expired tokens

### Token Expiration

- **Firebase tokens:** Valid for 1 hour (Firebase default)
- **API JWT tokens:** Recommended 7 days (configurable)

---

## ⚠️ Error Handling

### Response Format

All responses must follow this format:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE" // Optional
}
```

### HTTP Status Codes

| Code | Meaning | Mobile App Action |
|------|---------|-------------------|
| `200` | Success | Process response data |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Show error message to user |
| `401` | Unauthorized | Clear token, redirect to login |
| `403` | Forbidden | Show permission error |
| `404` | Not Found | Show not found error |
| `429` | Too Many Requests | Show rate limit message |
| `500` | Server Error | Show generic error, allow retry |

### Error Message Format

**Important:** Error messages must be in the `error` field, not `message`:

```json
{
  "success": false,
  "error": "Session expired. Please login again."
}
```

**NOT:**
```json
{
  "success": false,
  "message": "Session expired. Please login again."
}
```

---

## 🔄 User Creation Flow

### Expected Flow

1. **User signs up on Firebase**
   - Mobile app creates account in Firebase Auth
   - Firebase returns user object with `uid`, `email`, etc.

2. **Mobile app calls `POST /api/users/me/complete-profile`**
   - Uses Firebase ID token in Authorization header
   - Sends minimal user data (fullName, email, phoneNumber)
   - **Backend MUST create user if they don't exist**

3. **Backend creates user in database**
   - Creates user record with Firebase UID or email as identifier
   - Sets `hasCompletedProfile: false` initially
   - Returns user data

4. **Mobile app attempts to get JWT token**
   - Calls `/api/auth/login` with email/password (if available)
   - OR calls `/api/auth/firebase-token` with Firebase token
   - Stores JWT token for future requests

5. **User completes profile**
   - Mobile app calls `POST /api/users/me/complete-profile` again
   - Updates user with full profile information
   - Sets `hasCompletedProfile: true`

### Backend Requirements

**For `/api/users/me/complete-profile` endpoint:**

1. **Must accept Firebase ID tokens** in Authorization header
2. **Must verify Firebase token** (validate with Firebase Admin SDK)
3. **Must create user if they don't exist** based on:
   - Firebase UID (from token)
   - OR email address
4. **Must update user if they already exist**
5. **Must return user data** in response
6. **Must set `hasCompletedProfile` flag** appropriately

**Example Backend Logic:**

```javascript
// Pseudo-code for /api/users/me/complete-profile
async function completeProfile(req, res) {
  const firebaseToken = req.headers.authorization?.replace('Bearer ', '');
  
  // Verify Firebase token
  const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
  const firebaseUid = decodedToken.uid;
  const email = decodedToken.email;
  
  // Check if user exists
  let user = await User.findOne({ 
    $or: [
      { firebaseUid: firebaseUid },
      { email: email }
    ]
  });
  
  // Create user if doesn't exist
  if (!user) {
    user = await User.create({
      firebaseUid: firebaseUid,
      email: email,
      fullName: req.body.fullName,
      displayName: req.body.displayName || req.body.fullName,
      phoneNumber: req.body.phoneNumber,
      profileImage: req.body.profileImage,
      hasCompletedProfile: false,
      // ... other fields
    });
  } else {
    // Update existing user
    user = await User.findByIdAndUpdate(user.id, {
      fullName: req.body.fullName,
      displayName: req.body.displayName || user.displayName,
      phoneNumber: req.body.phoneNumber || user.phoneNumber,
      profileImage: req.body.profileImage || user.profileImage,
      location: req.body.location || user.location,
      gender: req.body.gender || user.gender,
      hasCompletedProfile: true,
      updatedAt: new Date()
    }, { new: true });
  }
  
  return res.json({
    success: true,
    message: "Profile completed successfully",
    data: user
  });
}
```

---

## ✅ Testing Checklist

Use this checklist to verify your backend implementation:

### Authentication Endpoints

- [ ] `POST /api/auth/login` returns JWT token and user data
- [ ] `GET /api/auth/verify` validates JWT token correctly
- [ ] `POST /api/auth/firebase-token` (optional) exchanges Firebase token for JWT
- [ ] All endpoints return proper error responses for invalid credentials

### User Management Endpoints

- [ ] `GET /api/users/me` accepts both Firebase and JWT tokens
- [ ] `GET /api/users/me` returns user data in correct format
- [ ] `PUT /api/users/me` updates user profile correctly
- [ ] `POST /api/users/me/complete-profile` **creates user if they don't exist**
- [ ] `POST /api/users/me/complete-profile` **accepts Firebase tokens**
- [ ] `POST /api/users/me/complete-profile` updates `hasCompletedProfile` flag
- [ ] All endpoints return proper error responses

### Token Validation

- [ ] Firebase ID tokens are validated correctly
- [ ] JWT tokens are validated correctly
- [ ] Expired tokens return `401 Unauthorized`
- [ ] Invalid tokens return `401 Unauthorized`
- [ ] Error messages use `error` field, not `message`

### Response Format

- [ ] All success responses include `success: true`
- [ ] All error responses include `success: false`
- [ ] User data is in `data` field for success responses
- [ ] Error messages are in `error` field for error responses
- [ ] Content-Type is `application/json`

### User Creation Flow

- [ ] New user can be created via `POST /api/users/me/complete-profile` with Firebase token
- [ ] User is created with correct Firebase UID or email
- [ ] User can be retrieved via `GET /api/users/me` after creation
- [ ] User can complete profile and `hasCompletedProfile` is set to `true`
- [ ] User can login via `POST /api/auth/login` after creation

---

## 🚨 Common Issues and Solutions

### Issue: "Session expired" errors

**Cause:** Backend not accepting Firebase tokens or JWT tokens expired

**Solution:**
- Ensure `/api/users/me/complete-profile` accepts Firebase tokens
- Ensure JWT tokens have appropriate expiration time
- Verify token validation logic

### Issue: User not created in API

**Cause:** `/api/users/me/complete-profile` not creating users

**Solution:**
- Verify endpoint creates user if they don't exist
- Check Firebase token validation
- Ensure user lookup by Firebase UID or email works

### Issue: "JSON Parse error: Unexpected character: <"

**Cause:** Backend returning HTML error page instead of JSON

**Solution:**
- Ensure all endpoints return JSON responses
- Check error handling middleware
- Verify Content-Type header is `application/json`

### Issue: Token not accepted

**Cause:** Backend not validating Firebase tokens correctly

**Solution:**
- Implement Firebase Admin SDK token verification
- Ensure Authorization header parsing is correct
- Verify token format validation

---

## 📞 Support

If you have questions or need clarification on any endpoint requirements, please refer to:
- `MOBILE_API_GUIDE.md` - Full API documentation
- `src/services/apiAuthService.ts` - Mobile app implementation
- `src/services/apiClient.ts` - API client implementation

---

## 📝 Notes

1. **Firebase Token Support:** The mobile app relies heavily on Firebase tokens for initial user creation. Your backend MUST support Firebase token validation.

2. **User Creation:** The primary method for user creation is via `POST /api/users/me/complete-profile`. This endpoint must create users if they don't exist.

3. **Token Exchange:** While `/api/auth/firebase-token` is optional, it's recommended for better session management. If not implemented, the mobile app will use Firebase tokens as fallback.

4. **Error Format:** Always use `error` field for error messages, not `message`. The mobile app specifically looks for the `error` field.

5. **Response Format:** All responses must include a `success` boolean field. This is critical for the mobile app's error handling.

---

**Last Updated:** Based on mobile app implementation as of current date
**Mobile App Version:** Current implementation
**API Base URL:** `https://tuchonga-admin-production.up.railway.app/api`

