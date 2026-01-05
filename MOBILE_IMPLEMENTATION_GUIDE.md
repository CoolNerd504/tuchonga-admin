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

### Get All Products

**Endpoint:** `GET /api/products`

**Description:** Get paginated list of products with optional filters. If user is authenticated, includes their rating for each product.

**Authentication:** Optional (JWT token - if provided, includes user's ratings)

**Query Parameters:**
- `search` (string) - Search by product name, description, or owner
- `categories` (string) - Comma-separated category names
- `businessId` (string) - Filter by business ID
- `isActive` (boolean) - Filter by active status (default: true)
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 20)
- `sortBy` (string) - Sort field (default: 'createdAt')
- `sortOrder` (string) - Sort order: 'asc' or 'desc' (default: 'desc')

**Headers (Optional):**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "product-id",
      "productName": "Product Name",
      "description": "Product description",
      "mainImage": "https://...",
      "isActive": true,
      "isVerified": true,
      "quickRatingAvg": 4.2,
      "quickRatingTotal": 150,
      "userRating": {
        "hasRated": true,
        "rating": 4,
        "canUpdate": false,
        "hoursUntilUpdate": 12,
        "lastUpdated": "2024-01-01T12:00:00.000Z"
      },
      // ... other product fields
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

**User Rating Object:**
- `hasRated` (boolean) - Whether user has rated this product
- `rating` (number | null) - User's rating (1-5) or null if not rated
- `canUpdate` (boolean) - Whether user can update their rating (24hr cooldown)
- `hoursUntilUpdate` (number) - Hours remaining until user can update
- `lastUpdated` (string | null) - ISO date of last rating update

**Example Implementation:**
```typescript
const getProducts = async (filters?: {
  search?: string;
  categories?: string[];
  page?: number;
  limit?: number;
}) => {
  const token = await SecureStore.getItemAsync('authToken');
  
  const queryParams = new URLSearchParams();
  if (filters?.search) queryParams.append('search', filters.search);
  if (filters?.categories) queryParams.append('categories', filters.categories.join(','));
  if (filters?.page) queryParams.append('page', filters.page.toString());
  if (filters?.limit) queryParams.append('limit', filters.limit.toString());
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(
    `${API_BASE_URL}/products?${queryParams.toString()}`,
    { headers }
  );

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch products');
  }
  
  return data;
};
```

---

### Get Product by ID

**Endpoint:** `GET /api/products/:id`

**Description:** Get a single product by ID. If user is authenticated, includes their rating.

**Authentication:** Optional (JWT token - if provided, includes user's rating)

**Headers (Optional):**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "product-id",
    "productName": "Product Name",
    "description": "Product description",
    "mainImage": "https://...",
    "additionalImages": ["https://..."],
    "isActive": true,
    "isVerified": true,
    "quickRatingAvg": 4.2,
    "quickRatingTotal": 150,
    "userRating": {
      "hasRated": true,
      "rating": 4,
      "canUpdate": false,
      "hoursUntilUpdate": 12,
      "lastUpdated": "2024-01-01T12:00:00.000Z"
    },
    "categories": [...],
    "business": {...},
    "creator": {...},
    // ... other product fields
  }
}
```

---

### Get All Services

**Endpoint:** `GET /api/services`

**Description:** Get paginated list of services with optional filters. If user is authenticated, includes their rating for each service.

**Authentication:** Optional (JWT token - if provided, includes user's ratings)

**Query Parameters:** Same as Get All Products

**Success Response (200):** Same structure as Get All Products, but with service fields

---

### Get Service by ID

**Endpoint:** `GET /api/services/:id`

**Description:** Get a single service by ID. If user is authenticated, includes their rating.

**Authentication:** Optional (JWT token - if provided, includes user's rating)

**Success Response (200):** Same structure as Get Product by ID, but with service fields

---

### Create Product

**Endpoint:** `POST /api/products`

**Description:** Create a new product (any authenticated user can create). Products created by regular users are **unverified by default** and require admin approval. Products created by business/admin users are verified automatically.

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
    "isVerified": false,
    "createdBy": "user-id",
    "creator": {
      "id": "user-id",
      "email": "user@example.com",
      "fullName": "User Name",
      "displayName": "Display Name"
    },
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

**Description:** Create a new service (any authenticated user can create). Services created by regular users are **unverified by default** and require admin approval. Services created by business/admin users are verified automatically.

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
    "isVerified": false,
    "createdBy": "user-id",
    "creator": {
      "id": "user-id",
      "email": "user@example.com",
      "fullName": "User Name",
      "displayName": "Display Name"
    },
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

## 🔐 Admin Verification Endpoints

### Verify Product

**Endpoint:** `POST /api/products/:id/verify`

**Description:** Admin endpoint to verify a product (admin only)

**Authentication:** Required (JWT token with admin role)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Product verified successfully",
  "data": {
    "id": "product-id",
    "isVerified": true,
    ...
  }
}
```

### Unverify Product

**Endpoint:** `POST /api/products/:id/unverify`

**Description:** Admin endpoint to unverify a product (admin only)

**Authentication:** Required (JWT token with admin role)

### Verify Service

**Endpoint:** `POST /api/services/:id/verify`

**Description:** Admin endpoint to verify a service (admin only)

**Authentication:** Required (JWT token with admin role)

### Unverify Service

**Endpoint:** `POST /api/services/:id/unverify`

**Description:** Admin endpoint to unverify a service (admin only)

**Authentication:** Required (JWT token with admin role)

---

## 📋 Verification Status

### For Regular Users:
- Products/services created by regular users (`role: "user"`) are **unverified by default** (`isVerified: false`)
- These items require admin approval before being publicly visible
- The `createdBy` field tracks which user created the item
- The `creator` object contains user details (id, email, fullName, displayName)

### For Business/Admin Users:
- Products/services created by business/admin users are **verified automatically** (`isVerified: true`)
- These items are immediately available publicly
- Business/admin users can optionally set `isVerified: false` in the request body if needed

---

---

## ⭐ User Rating in Product/Service Lists

### Overview

When listing products or services, the API automatically includes the authenticated user's rating information for each item. This allows the mobile app to:

1. **Show which items the user has rated** - Display a visual indicator (e.g., filled star)
2. **Display the user's rating** - Show the exact rating (1-5) the user gave
3. **Indicate update availability** - Show if/when the user can update their rating
4. **Handle unauthenticated users** - Gracefully handle cases where no token is provided

### Response Structure

Every product/service in the list includes a `userRating` object:

```typescript
interface UserRating {
  hasRated: boolean;        // Whether user has rated this item
  rating: number | null;     // User's rating (1-5) or null
  canUpdate: boolean;       // Whether user can update (24hr cooldown passed)
  hoursUntilUpdate: number; // Hours remaining until update allowed
  lastUpdated: string | null; // ISO date of last update
}
```

### Usage Examples

#### Display Rated Items

```typescript
const ProductCard = ({ product }) => {
  const { userRating } = product;
  
  return (
    <View>
      <Text>{product.productName}</Text>
      
      {/* Show user's rating if they've rated */}
      {userRating.hasRated && (
        <View>
          <Text>Your Rating: {userRating.rating} ⭐</Text>
          {!userRating.canUpdate && (
            <Text>
              Can update in {userRating.hoursUntilUpdate} hours
            </Text>
          )}
        </View>
      )}
      
      {/* Show community average */}
      <Text>Average: {product.quickRatingAvg} ({product.quickRatingTotal} ratings)</Text>
    </View>
  );
};
```

#### Handle Rating Updates

```typescript
const handleRatingPress = async (productId: string, newRating: number) => {
  const product = products.find(p => p.id === productId);
  
  if (!product.userRating.hasRated) {
    // First time rating - allow immediately
    await submitRating(productId, 'product', newRating);
  } else if (product.userRating.canUpdate) {
    // Can update - allow
    await submitRating(productId, 'product', newRating);
  } else {
    // Cannot update yet - show message
    Alert.alert(
      'Update Not Available',
      `You can update your rating in ${product.userRating.hoursUntilUpdate} hours`
    );
  }
};
```

### Important Notes

1. **Authentication is Optional**: The endpoints work without authentication, but `userRating` will always show `hasRated: false` if no token is provided.

2. **Batch Fetching**: When fetching a list, all user ratings are fetched in a single batch query for efficiency.

3. **Performance**: The user rating lookup is optimized and doesn't significantly impact response time.

4. **Always Include Token**: For the best user experience, always include the JWT token in the Authorization header when fetching products/services.

---

## ⭐ User Rating in Product/Service Lists

### Overview

When listing products or services, the API automatically includes the authenticated user's rating information for each item. This allows the mobile app to:

1. **Show which items the user has rated** - Display a visual indicator (e.g., filled star)
2. **Display the user's rating** - Show the exact rating (1-5) the user gave
3. **Indicate update availability** - Show if/when the user can update their rating
4. **Handle unauthenticated users** - Gracefully handle cases where no token is provided

### Response Structure

Every product/service in the list includes a `userRating` object:

```typescript
interface UserRating {
  hasRated: boolean;        // Whether user has rated this item
  rating: number | null;     // User's rating (1-5) or null
  canUpdate: boolean;       // Whether user can update (24hr cooldown passed)
  hoursUntilUpdate: number; // Hours remaining until update allowed
  lastUpdated: string | null; // ISO date of last update
}
```

### Usage Examples

#### Display Rated Items

```typescript
const ProductCard = ({ product }) => {
  const { userRating } = product;
  
  return (
    <View>
      <Text>{product.productName}</Text>
      
      {/* Show user's rating if they've rated */}
      {userRating.hasRated && (
        <View>
          <Text>Your Rating: {userRating.rating} ⭐</Text>
          {!userRating.canUpdate && (
            <Text>
              Can update in {userRating.hoursUntilUpdate} hours
            </Text>
          )}
        </View>
      )}
      
      {/* Show community average */}
      <Text>Average: {product.quickRatingAvg} ({product.quickRatingTotal} ratings)</Text>
    </View>
  );
};
```

#### Handle Rating Updates

```typescript
const handleRatingPress = async (productId: string, newRating: number) => {
  const product = products.find(p => p.id === productId);
  
  if (!product.userRating.hasRated) {
    // First time rating - allow immediately
    await submitRating(productId, 'product', newRating);
  } else if (product.userRating.canUpdate) {
    // Can update - allow
    await submitRating(productId, 'product', newRating);
  } else {
    // Cannot update yet - show message
    Alert.alert(
      'Update Not Available',
      `You can update your rating in ${product.userRating.hoursUntilUpdate} hours`
    );
  }
};
```

### Important Notes

1. **Authentication is Optional**: The endpoints work without authentication, but `userRating` will always show `hasRated: false` if no token is provided.

2. **Batch Fetching**: When fetching a list, all user ratings are fetched in a single batch query for efficiency.

3. **Performance**: The user rating lookup is optimized and doesn't significantly impact response time.

4. **Always Include Token**: For the best user experience, always include the JWT token in the Authorization header when fetching products/services.

---

## 💬 Comments System

The comment system allows users to comment on products and services with full support for nested threading and reactions (thumbs up/down).

**See:** [COMMENT_SYSTEM_GUIDE.md](./COMMENT_SYSTEM_GUIDE.md) for complete documentation.

### Quick Reference

- **Get Comments:** `GET /api/comments/product/:productId` or `GET /api/comments/service/:serviceId`
- **Create Comment:** `POST /api/comments`
- **React to Comment:** `POST /api/comments/:id/react` (AGREE or DISAGREE)
- **Get Replies:** `GET /api/comments/:id/replies`

**Key Features:**
- ✅ Nested threading (replies to replies, max depth 2)
- ✅ Thumbs up/down reactions
- ✅ User reaction status included when authenticated
- ✅ Automatic reply and reaction counts

---

## ❤️ Favorites Tracking

The favorites tracking endpoint allows users to see all their favorited products and services with sentiment trend analysis showing whether sentiment is improving, declining, or stable over time.

**See:** [FAVORITES_TRACKING_ENDPOINT.md](./FAVORITES_TRACKING_ENDPOINT.md) for complete documentation.

### Get Favorites with Tracking

**Endpoint:** `GET /api/favorites/tracking`

**Description:** Get all user's favorites with sentiment tracking data showing trends over time.

**Authentication:** Required (JWT token)

**Query Parameters:**
- `itemType` (string, optional) - Filter by `PRODUCT` or `SERVICE`
- `page` (number, optional) - Page number (default: `1`)
- `limit` (number, optional) - Items per page (default: `100`)

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "favorite-id",
      "itemId": "product-id",
      "itemType": "PRODUCT",
      "favoritedAt": "2024-01-01T12:00:00.000Z",
      "daysSinceFavorited": 30,
      "item": {
        "id": "product-id",
        "productName": "Product Name",
        "mainImage": "https://...",
        "quickRatingAvg": 3.8,
        "totalReviews": 100
      },
      "sentiment": {
        "current": {
          "score": 75,
          "positive": 60,
          "neutral": 20,
          "negative": 20,
          "total": 100,
          "averageRating": 3.8,
          "totalRatings": 150
        },
        "recent": {
          "score": 80,
          "total": 25
        },
        "older": {
          "score": 70,
          "total": 75
        },
        "trend": "improving",
        "trendDifference": 10
      }
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 100,
    "totalPages": 1
  }
}
```

**Key Features:**
- ✅ Sentiment score (0-100 scale)
- ✅ Trend analysis (improving/declining/stable)
- ✅ Recent vs older review comparison (30-day window)
- ✅ Days since favorited
- ✅ Complete product/service details

**Usage Example:**
```typescript
const fetchFavoritesTracking = async () => {
  const token = await SecureStore.getItemAsync('authToken');
  
  const response = await fetch(`${API_BASE_URL}/favorites/tracking`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const data = await response.json();
  return data.data;
};
```

---

## 📚 Additional Documentation

### Related Guides

- **[Sentiment Breakdown Guide](./SENTIMENT_BREAKDOWN_GUIDE.md)**: Complete guide for displaying review sentiment breakdown in bar graphs
  - Individual vote counting from reviews array
  - Bar graph implementation examples
  - Sentiment categorization (Positive/Neutral/Negative)
  - React Native code examples

- **[Product Details Endpoint](./PRODUCT_DETAILS_ENDPOINT.md)**: Comprehensive product details endpoint documentation

- **[Activity Feed Guide](./ACTIVITY_FEED_GUIDE.md)**: Home page activity feed implementation

- **[Favorites Tracking](./FAVORITES_TRACKING_ENDPOINT.md)**: User favorites with sentiment tracking

- **[Comment System Guide](./COMMENT_SYSTEM_GUIDE.md)**: Nested comments and reactions

- **[Quick Rating Guide](./QUICK_RATING_IMPLEMENTATION_GUIDE.md)**: Emoji-based quick rating system

---

**Last Updated:** 2025-01-05

