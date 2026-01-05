# 📱 Mobile App Implementation Guide (No Firebase Required)

## 🎯 Overview

This guide provides a **simplified authentication flow** that **does NOT require Firebase**. Users can register and login directly via the API using email/password or phone number.

---

## 🚀 Quick Start

### Base URL

**Production:** `https://tuchonga-admin-production.up.railway.app/api`  
**Development:** `http://localhost:3001/api`

---

## 📋 Authentication Flow

### Option 1: Register → Login → Use App

```
1. User registers → POST /api/users/register
2. User logs in → POST /api/auth/mobile-login
3. App stores JWT token
4. Use token for all protected endpoints
```

### Option 2: Register and Complete Profile in One Step

```
1. User registers with full profile → POST /api/users/register-complete
2. User logs in → POST /api/auth/mobile-login
3. App stores JWT token
4. Use token for all protected endpoints
```

---

## 🔐 Authentication Endpoints

### 1. Register User

**Endpoint:** `POST /api/users/register`

**Description:** Register a new user with email and password

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "fullName": "John Doe",
  "displayName": "John",
  "phoneNumber": "+1234567890",
  "profileImage": "https://...",
  "location": "New York, NY",
  "gender": "male"
}
```

**Required Fields:**
- `email` (string) - User's email address
- `password` (string) - User's password (min 6 characters recommended)
- `fullName` (string) - User's full name

**Optional Fields:**
- `displayName` (string) - Display name (defaults to fullName)
- `phoneNumber` (string) - Phone number
- `profileImage` (string) - Profile image URL
- `location` (string) - User location
- `gender` (string) - "male", "female", "other"

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "displayName": "John",
    "profileImage": null,
    "gender": "male",
    "role": "user",
    "hasCompletedProfile": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | - | Missing required fields |
| 409 | `EMAIL_EXISTS` | Email already registered |

**Example Implementation:**
```typescript
const registerUser = async (userData: {
  email: string;
  password: string;
  fullName: string;
  displayName?: string;
  phoneNumber?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/users/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Registration failed');
  }
  
  return data.data; // User object
};
```

---

### 2. Register and Complete Profile (One Step)

**Endpoint:** `POST /api/users/register-complete`

**Description:** Register a new user and mark profile as completed in one request

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "fullName": "John Doe",
  "displayName": "John",
  "phoneNumber": "+1234567890",
  "profileImage": "https://...",
  "location": "New York, NY",
  "gender": "male"
}
```

**Required Fields:**
- `fullName` (string) - User's full name
- Either `email` + `password` OR `phoneNumber`

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered and profile completed successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "displayName": "John",
    "phoneNumber": "+1234567890",
    "profileImage": null,
    "location": "New York, NY",
    "gender": "male",
    "role": "user",
    "hasCompletedProfile": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Example Implementation:**
```typescript
const registerAndCompleteProfile = async (userData: {
  email: string;
  password: string;
  fullName: string;
  displayName?: string;
  phoneNumber?: string;
  profileImage?: string;
  location?: string;
  gender?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/users/register-complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Registration failed');
  }
  
  return data.data; // User object with hasCompletedProfile: true
};
```

---

### 3. Login

**Endpoint:** `POST /api/auth/mobile-login`

**Description:** Login with email and password to get JWT token

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

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
    "profileImage": null,
    "role": "user",
    "hasCompletedProfile": true
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | - | Email and password required |
| 401 | `INVALID_CREDENTIALS` | Invalid email or password |
| 403 | `ACCOUNT_DEACTIVATED` | Account is deactivated |

**Example Implementation:**
```typescript
const login = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/mobile-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }
  
  // Store token securely (e.g., SecureStore in React Native)
  await SecureStore.setItemAsync('authToken', data.token);
  
  return {
    token: data.token,
    user: data.data,
  };
};
```

---

### 4. Verify Token

**Endpoint:** `GET /api/auth/verify`

**Description:** Verify if current JWT token is valid

**Authentication:** Required (JWT token)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "admin": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "displayName": "John",
    "role": "user",
    "profileImage": null
  }
}
```

---

## 👤 User Profile Endpoints

### 1. Get Current User Profile

**Endpoint:** `GET /api/users/me`

**Authentication:** Required (JWT token)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "phoneNumber": "+1234567890",
    "fullName": "John Doe",
    "displayName": "John",
    "profileImage": null,
    "location": "New York, NY",
    "gender": "male",
    "role": "user",
    "hasCompletedProfile": true,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 2. Complete Profile

**Endpoint:** `POST /api/users/me/complete-profile`

**Description:** Complete user profile (can also be used to update profile)

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "fullName": "John Doe",
  "displayName": "John",
  "profileImage": "https://...",
  "location": "New York, NY",
  "phoneNumber": "+1234567890",
  "gender": "male"
}
```

**Required Fields:**
- `fullName` (string)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile completed successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "displayName": "John",
    "phoneNumber": "+1234567890",
    "profileImage": null,
    "location": "New York, NY",
    "gender": "male",
    "hasCompletedProfile": true,
    "role": "user",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Example Implementation:**
```typescript
const completeProfile = async (profileData: {
  fullName: string;
  displayName?: string;
  phoneNumber?: string;
  profileImage?: string;
  location?: string;
  gender?: string;
}) => {
  const token = await SecureStore.getItemAsync('authToken');
  
  const response = await fetch(`${API_BASE_URL}/users/me/complete-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Profile completion failed');
  }
  
  return data.data;
};
```

---

### 3. Update Profile

**Endpoint:** `PUT /api/users/me`

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "fullName": "John Doe Updated",
  "displayName": "Johnny",
  "profileImage": "https://...",
  "location": "Los Angeles, CA",
  "phoneNumber": "+1234567890",
  "email": "newemail@example.com",
  "gender": "male"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    // Updated user object
  }
}
```

---

## 🔄 Complete User Flow Example

### Flow 1: Register → Login → Complete Profile

```typescript
// Step 1: Register
const user = await registerUser({
  email: 'user@example.com',
  password: 'securePassword123',
  fullName: 'John Doe',
  displayName: 'John',
});

// Step 2: Login
const { token, user: loggedInUser } = await login(
  'user@example.com',
  'securePassword123'
);

// Step 3: Complete Profile (optional)
if (!loggedInUser.hasCompletedProfile) {
  await completeProfile({
    fullName: 'John Doe',
    displayName: 'John',
    phoneNumber: '+1234567890',
    location: 'New York, NY',
    gender: 'male',
  });
}
```

### Flow 2: Register and Complete in One Step

```typescript
// Step 1: Register and complete profile
const user = await registerAndCompleteProfile({
  email: 'user@example.com',
  password: 'securePassword123',
  fullName: 'John Doe',
  displayName: 'John',
  phoneNumber: '+1234567890',
  location: 'New York, NY',
  gender: 'male',
});

// Step 2: Login
const { token } = await login(
  'user@example.com',
  'securePassword123'
);

// User is ready to use the app!
```

---

## 🔒 Token Management

### Storing Tokens

**React Native (Expo):**
```typescript
import * as SecureStore from 'expo-secure-store';

// Store token
await SecureStore.setItemAsync('authToken', token);

// Retrieve token
const token = await SecureStore.getItemAsync('authToken');

// Delete token (logout)
await SecureStore.deleteItemAsync('authToken');
```

**React Native (Bare):**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store token
await AsyncStorage.setItem('authToken', token);

// Retrieve token
const token = await AsyncStorage.getItem('authToken');

// Delete token (logout)
await AsyncStorage.removeItem('authToken');
```

### Using Token in Requests

```typescript
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = await SecureStore.getItemAsync('authToken');
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
};

// Example usage
const userProfile = await makeAuthenticatedRequest(
  `${API_BASE_URL}/users/me`
).then(res => res.json());
```

---

## ⚠️ Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE" // Optional
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `EMAIL_EXISTS` | 409 | Email already registered |
| `PHONE_EXISTS` | 409 | Phone number already registered |
| `INVALID_CREDENTIALS` | 401 | Invalid email or password |
| `ACCOUNT_DEACTIVATED` | 403 | Account is deactivated |
| `AUTH_TOKEN_EXPIRED` | 401 | Token has expired |
| `AUTH_INVALID_TOKEN` | 401 | Invalid or missing token |

### Error Handling Example

```typescript
const handleApiError = (error: any, response: Response) => {
  if (response.status === 401) {
    // Token expired or invalid - redirect to login
    return { shouldLogout: true, message: 'Please login again' };
  }
  
  if (response.status === 403) {
    // Account deactivated
    return { shouldLogout: true, message: 'Account is deactivated' };
  }
  
  if (response.status === 409) {
    // Conflict (email/phone exists)
    return { message: error.error || 'Already registered' };
  }
  
  return { message: error.error || 'An error occurred' };
};
```

---

## 📝 Complete Implementation Example

```typescript
// apiService.ts
const API_BASE_URL = 'https://tuchonga-admin-production.up.railway.app/api';

class ApiService {
  private async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('authToken');
  }

  async register(userData: {
    email: string;
    password: string;
    fullName: string;
    displayName?: string;
    phoneNumber?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data.data;
  }

  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/mobile-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    
    await SecureStore.setItemAsync('authToken', data.token);
    return { token: data.token, user: data.data };
  }

  async getCurrentUser() {
    const token = await this.getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data.data;
  }

  async completeProfile(profileData: {
    fullName: string;
    displayName?: string;
    phoneNumber?: string;
    profileImage?: string;
    location?: string;
    gender?: string;
  }) {
    const token = await this.getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/users/me/complete-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data.data;
  }

  async logout() {
    await SecureStore.deleteItemAsync('authToken');
  }
}

export const apiService = new ApiService();
```

---

## 🎯 Recommended Flow

### For New Users:

1. **Show registration screen**
2. **User enters:** email, password, fullName, displayName, phoneNumber
3. **Call:** `POST /api/users/register-complete` (one step)
4. **Call:** `POST /api/auth/mobile-login` to get token
5. **Store token** securely
6. **Navigate to main app**

### For Existing Users:

1. **Show login screen**
2. **User enters:** email, password
3. **Call:** `POST /api/auth/mobile-login`
4. **Store token** securely
5. **Navigate to main app**

### On App Start:

1. **Check for stored token**
2. **If token exists:** Call `GET /api/users/me` to verify
3. **If valid:** Navigate to main app
4. **If invalid:** Navigate to login screen

---

## ✅ Benefits of This Approach

1. **No Firebase Required** - Simpler setup, no Firebase Admin SDK needed
2. **Direct API Control** - Full control over user creation and authentication
3. **Simpler Flow** - Register → Login → Use app
4. **Standard JWT** - Uses standard JWT tokens for authentication
5. **Easier Debugging** - All authentication happens in your backend

---

## 🔄 Migration from Firebase

If you're currently using Firebase Auth:

1. **Keep Firebase for existing users** (optional)
2. **Use new endpoints for new users**
3. **Gradually migrate** existing users to email/password login

---

---

## 📦 Product & Service Management

### Create Product

**Endpoint:** `POST /api/products`

**Description:** Create a new product (any authenticated user can create)

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "productName": "Product Name",
  "description": "Product description",
  "mainImage": "https://...",
  "additionalImages": ["https://...", "https://..."],
  "businessId": "optional-business-id",
  "productOwner": "Optional business name",
  "categoryIds": ["category-id-1", "category-id-2"]
}
```

**Required Fields:**
- `productName` (string)

**Optional Fields:**
- `description` (string)
- `mainImage` (string) - Main product image URL
- `additionalImages` (string[]) - Array of additional image URLs
- `businessId` (string) - Optional business ID (if user owns a business)
- `productOwner` (string) - Optional business name
- `categoryIds` (string[]) - Array of category IDs

**Success Response (201):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "uuid",
    "productName": "Product Name",
    "description": "Product description",
    "mainImage": "https://...",
    "additionalImages": ["https://..."],
    "businessId": null,
    "productOwner": null,
    "isActive": true,
    "categories": [...],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Example Implementation:**
```typescript
const createProduct = async (productData: {
  productName: string;
  description?: string;
  mainImage?: string;
  additionalImages?: string[];
  categoryIds?: string[];
  businessId?: string;
}) => {
  const token = await SecureStore.getItemAsync('authToken');
  
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(productData),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create product');
  }
  
  return data.data;
};
```

---

### Create Service

**Endpoint:** `POST /api/services`

**Description:** Create a new service (any authenticated user can create)

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "serviceName": "Service Name",
  "description": "Service description",
  "mainImage": "https://...",
  "additionalImages": ["https://...", "https://..."],
  "businessId": "optional-business-id",
  "serviceOwner": "Optional business name",
  "categoryIds": ["category-id-1", "category-id-2"]
}
```

**Required Fields:**
- `serviceName` (string)

**Optional Fields:**
- `description` (string)
- `mainImage` (string) - Main service image URL
- `additionalImages` (string[]) - Array of additional image URLs
- `businessId` (string) - Optional business ID (if user owns a business)
- `serviceOwner` (string) - Optional business name
- `categoryIds` (string[]) - Array of category IDs

**Success Response (201):**
```json
{
  "success": true,
  "message": "Service created successfully",
  "data": {
    "id": "uuid",
    "serviceName": "Service Name",
    "description": "Service description",
    "mainImage": "https://...",
    "additionalImages": ["https://..."],
    "businessId": null,
    "serviceOwner": null,
    "isActive": true,
    "categories": [...],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Example Implementation:**
```typescript
const createService = async (serviceData: {
  serviceName: string;
  description?: string;
  mainImage?: string;
  additionalImages?: string[];
  categoryIds?: string[];
  businessId?: string;
}) => {
  const token = await SecureStore.getItemAsync('authToken');
  
  const response = await fetch(`${API_BASE_URL}/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(serviceData),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create service');
  }
  
  return data.data;
};
```

---

**Last Updated:** 2024-12-29

