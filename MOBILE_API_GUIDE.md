# 📱 TuChonga Mobile API Endpoint Utilization Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Base Configuration](#base-configuration)
3. [Authentication](#authentication)
4. [Error Handling](#error-handling)
5. [API Endpoints](#api-endpoints)
   - [Authentication](#1-authentication-endpoints)
   - [Users](#2-user-endpoints)
   - [Products](#3-product-endpoints)
   - [Services](#4-service-endpoints)
   - [Categories](#5-category-endpoints)
   - [Quick Ratings](#6-quick-rating-endpoints)
   - [Reviews](#7-review-endpoints)
   - [Comments](#8-comment-endpoints)
   - [Favorites](#9-favorite-endpoints)
   - [Businesses](#10-business-endpoints)
   - [Analytics](#11-analytics-endpoints)

---

## 🎯 Overview

This guide provides comprehensive documentation for all mobile API endpoints, including request/response formats, error handling, and example implementations.

### Response Format

All successful responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE" // Optional error code
}
```

---

## ⚙️ Base Configuration

### Base URLs

| Environment | Base URL |
|-------------|----------|
| **Development** | `http://localhost:3001/api` |
| **Production** | `https://tuchonga-admin-production.up.railway.app/api` |

### Headers

All authenticated requests require:

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## 🔐 Authentication

### Token Management

1. **Store token securely** (e.g., SecureStore in React Native)
2. **Include token in all protected requests** via `Authorization` header
3. **Handle token expiration** - refresh or redirect to login
4. **Verify token on app startup** using `/api/auth/verify`

### Token Expiration

- Default expiration: **7 days**
- Refresh token before expiration
- Handle `401 Unauthorized` by redirecting to login

---

## ⚠️ Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| `200` | Success | Process response data |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Check request parameters |
| `401` | Unauthorized | Token invalid/expired - redirect to login |
| `403` | Forbidden | User lacks permission |
| `404` | Not Found | Resource doesn't exist |
| `429` | Too Many Requests | Rate limit exceeded - retry later |
| `500` | Server Error | Server issue - retry or report |

### Error Handling Best Practices

1. **Always check `success` field** in response
2. **Display user-friendly error messages**
3. **Log errors for debugging** (without exposing sensitive data)
4. **Handle network errors** (timeout, no connection)
5. **Implement retry logic** for transient errors (500, 429)
6. **Show loading states** during API calls

### Example Error Handler

```typescript
async function handleApiCall<T>(
  apiCall: () => Promise<Response>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await apiCall();
    const json = await response.json();
    
    if (!response.ok) {
      // Handle specific status codes
      if (response.status === 401) {
        // Token expired - redirect to login
        await logout();
        return { success: false, error: 'Session expired. Please login again.' };
      }
      
      if (response.status === 429) {
        return { success: false, error: 'Too many requests. Please try again later.' };
      }
      
      return { success: false, error: json.error || 'An error occurred' };
    }
    
    return { success: json.success, data: json.data, error: json.error };
  } catch (error: any) {
    // Network errors
    if (error.message.includes('Network')) {
      return { success: false, error: 'No internet connection' };
    }
    
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}
```

---

## 📡 API Endpoints

## 1. Authentication Endpoints

### 1.1 Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user with email and password

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "user",
    "profileImage": "https://..."
  }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `400` | `{ "error": "Email and password are required" }` |
| `401` | `{ "error": "Invalid credentials" }` |
| `403` | `{ "error": "Account is locked. Please try again later." }` |
| `500` | `{ "error": "Internal server error" }` |

**Example Implementation:**

```typescript
async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }
  
  // Store token securely
  await SecureStore.setItemAsync('auth_token', data.token);
  
  return data;
}
```

### 1.2 Verify Token

**Endpoint:** `GET /api/auth/verify`

**Description:** Verify if current token is valid

**Authentication:** Required (Bearer token)

**Success Response (200):**
```json
{
  "admin": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "user"
  }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `401` | `{ "error": "No token provided" }` |
| `401` | `{ "error": "Invalid token" }` |

**Example Implementation:**

```typescript
async function verifyToken(token: string) {
  const response = await fetch(`${API_BASE_URL}/auth/verify`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Token verification failed');
  }
  
  return await response.json();
}
```

---

## 2. User Endpoints

### 2.1 Get Current User Profile

**Endpoint:** `GET /api/users/me`

**Description:** Get authenticated user's profile

**Authentication:** Required

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
    "profileImage": "https://...",
    "location": "City, Country",
    "gender": "male",
    "hasCompletedProfile": true,
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `401` | `{ "success": false, "error": "Unauthorized" }` |
| `404` | `{ "success": false, "error": "User not found" }` |
| `500` | `{ "success": false, "error": "Internal server error" }` |

**Example Implementation:**

```typescript
async function getCurrentUser(token: string) {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch user profile');
  }
  
  return data.data;
}
```

### 2.2 Update User Profile

**Endpoint:** `PUT /api/users/me`

**Description:** Update authenticated user's profile

**Authentication:** Required

**Request Body:**
```json
{
  "fullName": "John Doe",
  "displayName": "John",
  "profileImage": "https://...",
  "location": "City, Country",
  "phoneNumber": "+1234567890",
  "email": "user@example.com",
  "gender": "male"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid",
    "fullName": "John Doe",
    ...
  }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `400` | `{ "success": false, "error": "Validation error message" }` |
| `401` | `{ "success": false, "error": "Unauthorized" }` |
| `500` | `{ "success": false, "error": "Internal server error" }` |

**Example Implementation:**

```typescript
async function updateProfile(
  token: string,
  profileData: {
    fullName?: string;
    displayName?: string;
    profileImage?: string;
    location?: string;
    phoneNumber?: string;
    email?: string;
    gender?: string;
  }
) {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });
  
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to update profile');
  }
  
  return data.data;
}
```

### 2.3 Complete Profile

**Endpoint:** `POST /api/users/me/complete-profile`

**Description:** Mark profile as completed (first-time setup)

**Authentication:** Required

**Request Body:**
```json
{
  "fullName": "John Doe",
  "displayName": "John",
  "profileImage": "https://...",
  "location": "City, Country",
  "phoneNumber": "+1234567890",
  "gender": "male"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile completed successfully",
  "data": { ... }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `400` | `{ "success": false, "error": "Full name is required" }` |
| `401` | `{ "success": false, "error": "Unauthorized" }` |
| `500` | `{ "success": false, "error": "Internal server error" }` |

### 2.4 Get User Analytics

**Endpoint:** `GET /api/users/me/analytics`

**Description:** Get user's activity analytics

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalReviews": 10,
    "totalComments": 5,
    "totalFavorites": 8,
    "totalRatings": 12
  }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `401` | `{ "success": false, "error": "Unauthorized" }` |
| `500` | `{ "success": false, "error": "Internal server error" }` |

---

## 3. Product Endpoints

### 3.1 Get All Products

**Endpoint:** `GET /api/products`

**Description:** Get paginated list of products with optional filters

**Authentication:** Not required

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `search` | string | Search term | - |
| `categories` | string | Comma-separated category IDs | - |
| `businessId` | string | Filter by business ID | - |
| `isActive` | boolean | Filter active products | `true` |
| `page` | number | Page number | `1` |
| `limit` | number | Items per page | `20` |
| `sortBy` | string | Sort field | - |
| `sortOrder` | string | `asc` or `desc` | `desc` |

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "productName": "Product Name",
      "description": "Product description",
      "mainImage": "https://...",
      "additionalImages": ["https://..."],
      "categoryIds": ["uuid1", "uuid2"],
      "categories": [
        { "id": "uuid1", "name": "Category 1" }
      ],
      "businessId": "uuid",
      "business": { ... },
      "isActive": true,
      "totalViews": 100,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `500` | `{ "success": false, "error": "Internal server error" }` |

**Example Implementation:**

```typescript
async function getProducts(filters?: {
  search?: string;
  categories?: string[];
  businessId?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  
  if (filters?.search) params.append('search', filters.search);
  if (filters?.categories) params.append('categories', filters.categories.join(','));
  if (filters?.businessId) params.append('businessId', filters.businessId);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  const response = await fetch(`${API_BASE_URL}/products?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch products');
  }
  
  return data;
}
```

### 3.2 Get Product by ID

**Endpoint:** `GET /api/products/:id`

**Description:** Get single product details

**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "productName": "Product Name",
    "description": "Product description",
    "mainImage": "https://...",
    "additionalImages": ["https://..."],
    "categories": [...],
    "business": { ... },
    "totalViews": 100,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `404` | `{ "success": false, "error": "Product not found" }` |
| `500` | `{ "success": false, "error": "Internal server error" }` |

**Example Implementation:**

```typescript
async function getProductById(productId: string) {
  const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    if (response.status === 404) {
      throw new Error('Product not found');
    }
    throw new Error(data.error || 'Failed to fetch product');
  }
  
  return data.data;
}
```

### 3.3 Track Product View

**Endpoint:** `POST /api/products/:id/view`

**Description:** Increment product view count

**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "message": "View tracked"
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `404` | `{ "success": false, "error": "Product not found" }` |
| `500` | `{ "success": false, "error": "Internal server error" }` |

**Example Implementation:**

```typescript
async function trackProductView(productId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${productId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const data = await response.json();
    
    // Don't throw error for view tracking failures
    if (!response.ok || !data.success) {
      console.warn('Failed to track view:', data.error);
    }
  } catch (error) {
    // Silently fail - view tracking shouldn't break the app
    console.warn('View tracking error:', error);
  }
}
```

### 3.4 Search Products

**Endpoint:** `GET /api/products/search/:query`

**Description:** Search products by query string

**Authentication:** Not required

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `limit` | number | Max results | `20` |

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "productName": "Product Name",
      ...
    }
  ]
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `500` | `{ "success": false, "error": "Internal server error" }` |

---

## 4. Service Endpoints

### 4.1 Get All Services

**Endpoint:** `GET /api/services`

**Description:** Get paginated list of services with optional filters

**Authentication:** Not required

**Query Parameters:** (Same as products)

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "serviceName": "Service Name",
      "description": "Service description",
      "mainImage": "https://...",
      "categoryIds": ["uuid1"],
      "categories": [...],
      "businessId": "uuid",
      "isActive": true,
      "totalViews": 50,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { ... }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `500` | `{ "success": false, "error": "Internal server error" }` |

### 4.2 Get Service by ID

**Endpoint:** `GET /api/services/:id`

**Description:** Get single service details

**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "serviceName": "Service Name",
    ...
  }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `404` | `{ "success": false, "error": "Service not found" }` |
| `500` | `{ "success": false, "error": "Internal server error" }` |

### 4.3 Track Service View

**Endpoint:** `POST /api/services/:id/view`

**Description:** Increment service view count

**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "message": "View tracked"
}
```

### 4.4 Search Services

**Endpoint:** `GET /api/services/search/:query`

**Description:** Search services by query string

**Authentication:** Not required

**Query Parameters:** (Same as products)

---

## 5. Category Endpoints

### 5.1 Get All Categories

**Endpoint:** `GET /api/categories`

**Description:** Get all categories

**Authentication:** Not required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by type: `PRODUCT` or `SERVICE` |

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Category Name",
      "description": "Category description",
      "type": "PRODUCT",
      "isActive": true
    }
  ]
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `500` | `{ "success": false, "error": "Internal server error" }` |

**Example Implementation:**

```typescript
async function getCategories(type?: 'PRODUCT' | 'SERVICE') {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  
  const response = await fetch(`${API_BASE_URL}/categories?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch categories');
  }
  
  return data.data;
}
```

### 5.2 Get Product Categories

**Endpoint:** `GET /api/categories/products`

**Description:** Get all product categories

**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "data": [ ... ]
}
```

### 5.3 Get Service Categories

**Endpoint:** `GET /api/categories/services`

**Description:** Get all service categories

**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "data": [ ... ]
}
```

### 5.4 Get Category by ID

**Endpoint:** `GET /api/categories/:id`

**Description:** Get single category details

**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Category Name",
    ...
  }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `404` | `{ "success": false, "error": "Category not found" }` |
| `500` | `{ "success": false, "error": "Internal server error" }` |

---

## 6. Quick Rating Endpoints

### 6.1 Get Product Rating Stats

**Endpoint:** `GET /api/quick-ratings/product/:productId`

**Description:** Get aggregated rating statistics for a product

**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "averageRating": 3.5,
    "totalRatings": 100,
    "ratingDistribution": {
      "1": 10,
      "2": 20,
      "3": 30,
      "4": 25,
      "5": 15
    },
    "lastUpdate": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `500` | `{ "success": false, "error": "Internal server error" }` |

### 6.2 Get Service Rating Stats

**Endpoint:** `GET /api/quick-ratings/service/:serviceId`

**Description:** Get aggregated rating statistics for a service

**Authentication:** Not required

**Success Response (200):** (Same format as product)

### 6.3 Submit Quick Rating

**Endpoint:** `POST /api/quick-ratings`

**Description:** Submit or update a quick rating (1-5 scale)

**Authentication:** Required

**Request Body:**
```json
{
  "itemId": "uuid",
  "itemType": "product", // or "service"
  "rating": 4 // 1-5
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Rating submitted successfully",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "itemId": "uuid",
    "itemType": "product",
    "rating": 4,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `400` | `{ "success": false, "error": "itemId, itemType, and rating are required" }` |
| `400` | `{ "success": false, "error": "Rating must be between 1 and 5" }` |
| `401` | `{ "success": false, "error": "Unauthorized" }` |
| `429` | `{ "success": false, "error": "You can only update your rating once every 24 hours", "code": "RATE_LIMIT_EXCEEDED" }` |
| `500` | `{ "success": false, "error": "Internal server error" }` |

**Example Implementation:**

```typescript
async function submitRating(
  token: string,
  itemId: string,
  itemType: 'product' | 'service',
  rating: number
) {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }
  
  const response = await fetch(`${API_BASE_URL}/quick-ratings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ itemId, itemType, rating }),
  });
  
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    if (response.status === 429) {
      throw new Error('You can only update your rating once every 24 hours');
    }
    throw new Error(data.error || 'Failed to submit rating');
  }
  
  return data.data;
}
```

### 6.4 Get User's Rating for Item

**Endpoint:** `GET /api/quick-ratings/user/:itemId`

**Description:** Get authenticated user's rating for a specific item

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "hasRated": true,
    "rating": {
      "id": "uuid",
      "rating": 4,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `401` | `{ "success": false, "error": "Unauthorized" }` |
| `500` | `{ "success": false, "error": "Internal server error" }` |

### 6.5 Get User's All Ratings

**Endpoint:** `GET /api/quick-ratings/user/me/all`

**Description:** Get all ratings submitted by authenticated user

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "itemId": "uuid",
      "itemType": "product",
      "rating": 4,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 7. Review Endpoints

### 7.1 Get All Reviews

**Endpoint:** `GET /api/reviews`

**Description:** Get paginated list of reviews

**Authentication:** Not required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `itemType` | string | Filter by `product` or `service` |

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "itemId": "uuid",
      "itemType": "product",
      "userId": "uuid",
      "user": { ... },
      "rating": 4,
      "comment": "Great product!",
      "sentiment": "positive",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { ... }
}
```

### 7.2 Get Review by ID

**Endpoint:** `GET /api/reviews/:id`

**Description:** Get single review details

**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `404` | `{ "success": false, "error": "Review not found" }` |

### 7.3 Get Product Reviews

**Endpoint:** `GET /api/reviews/product/:productId`

**Description:** Get all reviews for a product

**Authentication:** Not required

**Query Parameters:** `page`, `limit`, `sortBy`, `sortOrder`

**Success Response (200):**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": { ... }
}
```

### 7.4 Get Service Reviews

**Endpoint:** `GET /api/reviews/service/:serviceId`

**Description:** Get all reviews for a service

**Authentication:** Not required

**Success Response (200):** (Same format as product)

### 7.5 Get Review Stats

**Endpoint:** `GET /api/reviews/stats/:itemType/:itemId`

**Description:** Get aggregated review statistics

**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalReviews": 100,
    "averageRating": 3.5,
    "ratingDistribution": {
      "1": 10,
      "2": 20,
      "3": 30,
      "4": 25,
      "5": 15
    },
    "sentimentDistribution": {
      "positive": 60,
      "neutral": 20,
      "negative": 20
    }
  }
}
```

### 7.6 Create Review

**Endpoint:** `POST /api/reviews`

**Description:** Create a new review

**Authentication:** Required

**Request Body:**
```json
{
  "itemId": "uuid",
  "itemType": "product", // or "service"
  "rating": 4, // 1-5
  "comment": "Great product!",
  "sentiment": "positive" // "positive", "neutral", "negative"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Review created successfully",
  "data": { ... }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `400` | `{ "success": false, "error": "itemId, itemType, and rating are required" }` |
| `400` | `{ "success": false, "error": "Rating must be between 1 and 5" }` |
| `401` | `{ "success": false, "error": "Unauthorized" }` |
| `500` | `{ "success": false, "error": "Internal server error" }` |

### 7.7 Update Review

**Endpoint:** `PUT /api/reviews/:id`

**Description:** Update own review

**Authentication:** Required

**Request Body:**
```json
{
  "rating": 5,
  "comment": "Updated comment",
  "sentiment": "positive"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Review updated successfully",
  "data": { ... }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `400` | `{ "success": false, "error": "Validation error" }` |
| `401` | `{ "success": false, "error": "Unauthorized" }` |
| `403` | `{ "success": false, "error": "You can only update your own reviews" }` |
| `404` | `{ "success": false, "error": "Review not found" }` |

### 7.8 Delete Review

**Endpoint:** `DELETE /api/reviews/:id`

**Description:** Delete own review

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `401` | `{ "success": false, "error": "Unauthorized" }` |
| `403` | `{ "success": false, "error": "You can only delete your own reviews" }` |
| `404` | `{ "success": false, "error": "Review not found" }` |

### 7.9 Get User's Reviews

**Endpoint:** `GET /api/reviews/user/me`

**Description:** Get all reviews by authenticated user

**Authentication:** Required

**Query Parameters:** `page`, `limit`, `itemType`

**Success Response (200):**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": { ... }
}
```

### 7.10 Check User's Review

**Endpoint:** `GET /api/reviews/check/:itemType/:itemId`

**Description:** Check if user has reviewed an item

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "hasReviewed": true,
    "review": { ... } // null if not reviewed
  }
}
```

---

## 8. Comment Endpoints

### 8.1 Get Product Comments

**Endpoint:** `GET /api/comments/product/:productId`

**Description:** Get paginated comments for a product

**Authentication:** Not required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `sortBy` | string | Sort field |
| `sortOrder` | string | `asc` or `desc` |
| `hasReplies` | boolean | Filter comments with replies |
| `search` | string | Search in comments |

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "itemId": "uuid",
      "itemType": "product",
      "userId": "uuid",
      "user": {
        "id": "uuid",
        "displayName": "John",
        "profileImage": "https://..."
      },
      "text": "Great product!",
      "parentId": null,
      "replyCount": 5,
      "agreeCount": 10,
      "disagreeCount": 2,
      "isEdited": false,
      "isDeleted": false,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { ... }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `500` | `{ "success": false, "error": "Internal server error" }` |

### 8.2 Get Service Comments

**Endpoint:** `GET /api/comments/service/:serviceId`

**Description:** Get paginated comments for a service

**Authentication:** Not required

**Success Response (200):** (Same format as product)

### 8.3 Get Comment by ID

**Endpoint:** `GET /api/comments/:id`

**Description:** Get single comment details

**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `404` | `{ "success": false, "error": "Comment not found" }` |

### 8.4 Get Comment Replies

**Endpoint:** `GET /api/comments/:id/replies`

**Description:** Get replies to a comment

**Authentication:** Not required

**Query Parameters:** `page`, `limit`, `sortBy`, `sortOrder`

**Success Response (200):**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": { ... }
}
```

### 8.5 Create Comment

**Endpoint:** `POST /api/comments`

**Description:** Create a new comment

**Authentication:** Required

**Request Body:**
```json
{
  "itemId": "uuid",
  "itemType": "product", // or "service"
  "text": "This is a great product!",
  "parentId": null // null for root comment, comment ID for reply
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Comment created successfully",
  "data": { ... }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `400` | `{ "success": false, "error": "itemId, itemType, and text are required" }` |
| `400` | `{ "success": false, "error": "Comment text cannot exceed 500 characters" }` |
| `401` | `{ "success": false, "error": "Unauthorized" }` |
| `500` | `{ "success": false, "error": "Internal server error" }` |

**Example Implementation:**

```typescript
async function createComment(
  token: string,
  itemId: string,
  itemType: 'product' | 'service',
  text: string,
  parentId?: string
) {
  if (text.length > 500) {
    throw new Error('Comment text cannot exceed 500 characters');
  }
  
  const response = await fetch(`${API_BASE_URL}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      itemId,
      itemType,
      text,
      parentId: parentId || null,
    }),
  });
  
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to create comment');
  }
  
  return data.data;
}
```

### 8.6 Update Comment

**Endpoint:** `PUT /api/comments/:id`

**Description:** Update own comment (within 5 minutes)

**Authentication:** Required

**Request Body:**
```json
{
  "text": "Updated comment text"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Comment updated successfully",
  "data": { ... }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `400` | `{ "success": false, "error": "Comment text is required" }` |
| `400` | `{ "success": false, "error": "Comments can only be edited within 5 minutes of creation" }` |
| `401` | `{ "success": false, "error": "Unauthorized" }` |
| `403` | `{ "success": false, "error": "You can only edit your own comments" }` |
| `404` | `{ "success": false, "error": "Comment not found" }` |

### 8.7 Delete Comment

**Endpoint:** `DELETE /api/comments/:id`

**Description:** Delete own comment (soft delete)

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `401` | `{ "success": false, "error": "Unauthorized" }` |
| `403` | `{ "success": false, "error": "You can only delete your own comments" }` |
| `404` | `{ "success": false, "error": "Comment not found" }` |

### 8.8 React to Comment (Agree/Disagree)

**Endpoint:** `POST /api/comments/:id/react`

**Description:** Add or update reaction to a comment

**Authentication:** Required

**Request Body:**
```json
{
  "reactionType": "agree" // or "disagree"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Reaction added successfully",
  "data": {
    "agreeCount": 10,
    "disagreeCount": 2,
    "userReaction": "agree"
  }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `400` | `{ "success": false, "error": "reactionType must be 'agree' or 'disagree'" }` |
| `401` | `{ "success": false, "error": "Unauthorized" }` |
| `404` | `{ "success": false, "error": "Comment not found" }` |

### 8.9 Remove Comment Reaction

**Endpoint:** `DELETE /api/comments/:id/react`

**Description:** Remove reaction from a comment

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Reaction removed successfully",
  "data": {
    "agreeCount": 9,
    "disagreeCount": 2,
    "userReaction": null
  }
}
```

### 8.10 Get User's Reaction

**Endpoint:** `GET /api/comments/:id/reaction`

**Description:** Get authenticated user's reaction to a comment

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "reactionType": "agree" // or "disagree" or null
  }
}
```

### 8.11 Report Comment

**Endpoint:** `POST /api/comments/:id/report`

**Description:** Report a comment for moderation

**Authentication:** Required

**Request Body:**
```json
{
  "reason": "Spam" // or "Inappropriate", "Harassment", etc.
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Comment reported successfully"
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `400` | `{ "success": false, "error": "Reason is required" }` |
| `401` | `{ "success": false, "error": "Unauthorized" }` |
| `404` | `{ "success": false, "error": "Comment not found" }` |

---

## 9. Favorite Endpoints

### 9.1 Get User's Favorites

**Endpoint:** `GET /api/favorites`

**Description:** Get authenticated user's favorites

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `itemType` | string | Filter by `product` or `service` |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "itemId": "uuid",
      "itemType": "product",
      "item": { ... }, // Product or Service object
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { ... }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `401` | `{ "success": false, "error": "Unauthorized" }` |
| `500` | `{ "success": false, "error": "Internal server error" }` |

### 9.2 Check if Item is Favorited

**Endpoint:** `GET /api/favorites/check/:itemId`

**Description:** Check if item is in user's favorites

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "isFavorited": true
  }
}
```

### 9.3 Add to Favorites

**Endpoint:** `POST /api/favorites`

**Description:** Add item to favorites

**Authentication:** Required

**Request Body:**
```json
{
  "itemId": "uuid",
  "itemType": "product" // or "service"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Added to favorites",
  "data": { ... }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `400` | `{ "success": false, "error": "itemId and itemType are required" }` |
| `401` | `{ "success": false, "error": "Unauthorized" }` |
| `409` | `{ "success": false, "error": "Item already in favorites" }` |
| `500` | `{ "success": false, "error": "Internal server error" }` |

**Example Implementation:**

```typescript
async function addToFavorites(
  token: string,
  itemId: string,
  itemType: 'product' | 'service'
) {
  const response = await fetch(`${API_BASE_URL}/favorites`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ itemId, itemType }),
  });
  
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    if (response.status === 409) {
      throw new Error('Item already in favorites');
    }
    throw new Error(data.error || 'Failed to add to favorites');
  }
  
  return data.data;
}
```

### 9.4 Toggle Favorite

**Endpoint:** `POST /api/favorites/toggle`

**Description:** Toggle favorite status (add if not favorited, remove if favorited)

**Authentication:** Required

**Request Body:**
```json
{
  "itemId": "uuid",
  "itemType": "product"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Added to favorites", // or "Removed from favorites"
  "data": {
    "isFavorited": true,
    "favorite": { ... } // null if removed
  }
}
```

### 9.5 Remove from Favorites

**Endpoint:** `DELETE /api/favorites/:itemId`

**Description:** Remove item from favorites

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Removed from favorites"
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `401` | `{ "success": false, "error": "Unauthorized" }` |
| `404` | `{ "success": false, "error": "Favorite not found" }` |

### 9.6 Get Favorite Count

**Endpoint:** `GET /api/favorites/count`

**Description:** Get total count of user's favorites

**Authentication:** Required

**Query Parameters:** `itemType` (optional)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "count": 25
  }
}
```

---

## 10. Business Endpoints

### 10.1 Get All Businesses

**Endpoint:** `GET /api/businesses`

**Description:** Get paginated list of businesses

**Authentication:** Not required

**Query Parameters:** `page`, `limit`, `search`, `isVerified`

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Business Name",
      "description": "Business description",
      "email": "business@example.com",
      "phoneNumber": "+1234567890",
      "location": "City, Country",
      "isVerified": true,
      "totalProducts": 10,
      "totalServices": 5,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { ... }
}
```

### 10.2 Get Business by ID

**Endpoint:** `GET /api/businesses/:id`

**Description:** Get single business details

**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Responses:**

| Status | Error Response |
|--------|----------------|
| `404` | `{ "success": false, "error": "Business not found" }` |

### 10.3 Get Business Products

**Endpoint:** `GET /api/businesses/:id/products`

**Description:** Get all products for a business

**Authentication:** Not required

**Query Parameters:** `page`, `limit`

**Success Response (200):**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": { ... }
}
```

### 10.4 Get Business Services

**Endpoint:** `GET /api/businesses/:id/services`

**Description:** Get all services for a business

**Authentication:** Not required

**Success Response (200):** (Same format as products)

---

## 11. Analytics Endpoints

### 11.1 Get Overview Analytics

**Endpoint:** `GET /api/analytics/overview`

**Description:** Get platform overview statistics

**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1000,
    "totalProducts": 500,
    "totalServices": 300,
    "totalReviews": 2000,
    "totalComments": 1500
  }
}
```

### 11.2 Get User Analytics

**Endpoint:** `GET /api/analytics/users`

**Description:** Get user-related analytics

**Authentication:** Not required

**Query Parameters:** `period` (e.g., `7d`, `30d`, `1y`)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1000,
    "newUsers": 50,
    "activeUsers": 200,
    "growthRate": 5.2
  }
}
```

### 11.3 Get Product Analytics

**Endpoint:** `GET /api/analytics/products`

**Description:** Get product-related analytics

**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalProducts": 500,
    "activeProducts": 450,
    "averageRating": 3.5,
    "totalViews": 10000
  }
}
```

### 11.4 Get Service Analytics

**Endpoint:** `GET /api/analytics/services`

**Description:** Get service-related analytics

**Authentication:** Not required

**Success Response (200):** (Similar format to products)

### 11.5 Get Review Analytics

**Endpoint:** `GET /api/analytics/reviews`

**Description:** Get review-related analytics

**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalReviews": 2000,
    "averageRating": 3.8,
    "positiveReviews": 1200,
    "negativeReviews": 200
  }
}
```

### 11.6 Get Comment Analytics

**Endpoint:** `GET /api/analytics/comments`

**Description:** Get comment-related analytics

**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalComments": 1500,
    "totalReplies": 500,
    "averageRepliesPerComment": 0.33
  }
}
```

---

## 🔧 Common Implementation Patterns

### API Client Class

```typescript
class TuChongaAPI {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific status codes
        if (response.status === 401) {
          this.clearToken();
          throw new Error('Session expired. Please login again.');
        }

        return {
          success: false,
          error: data.error || 'An error occurred',
        };
      }

      return {
        success: data.success ?? true,
        data: data.data,
        error: data.error,
      };
    } catch (error: any) {
      if (error.message.includes('Network')) {
        return {
          success: false,
          error: 'No internet connection',
        };
      }

      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  }

  // Authentication
  async login(email: string, password: string) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (result.success && result.data?.token) {
      this.setToken(result.data.token);
    }
    return result;
  }

  async verifyToken() {
    return this.request('/auth/verify', { method: 'GET' });
  }

  // Products
  async getProducts(filters?: any) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return this.request(`/products?${params}`);
  }

  async getProductById(id: string) {
    return this.request(`/products/${id}`);
  }

  // Quick Ratings
  async submitRating(itemId: string, itemType: string, rating: number) {
    return this.request('/quick-ratings', {
      method: 'POST',
      body: JSON.stringify({ itemId, itemType, rating }),
    });
  }

  // Comments
  async createComment(itemId: string, itemType: string, text: string, parentId?: string) {
    return this.request('/comments', {
      method: 'POST',
      body: JSON.stringify({ itemId, itemType, text, parentId }),
    });
  }

  // Favorites
  async toggleFavorite(itemId: string, itemType: string) {
    return this.request('/favorites/toggle', {
      method: 'POST',
      body: JSON.stringify({ itemId, itemType }),
    });
  }
}

// Usage
const api = new TuChongaAPI('https://tuchonga-admin-production.up.railway.app/api');
```

### Error Handling Hook (React Native)

```typescript
import { useState, useCallback } from 'react';

export function useApiCall<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (apiCall: () => Promise<{ success: boolean; data?: T; error?: string }>) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();

      if (result.success && result.data) {
        setData(result.data);
        return result.data;
      } else {
        const errorMessage = result.error || 'An error occurred';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error, data };
}

// Usage
function ProductList() {
  const { execute, loading, error, data } = useApiCall<Product[]>();

  const loadProducts = async () => {
    try {
      await execute(() => api.getProducts());
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return null;

  return <ProductList items={data} />;
}
```

---

## 📝 Best Practices

1. **Always handle errors gracefully** - Show user-friendly messages
2. **Implement retry logic** for transient errors (500, network failures)
3. **Cache responses** when appropriate to reduce API calls
4. **Show loading states** during API calls
5. **Validate input** before making API calls
6. **Handle token expiration** - Refresh or redirect to login
7. **Log errors** for debugging (without exposing sensitive data)
8. **Use pagination** for large lists
9. **Debounce search queries** to reduce API calls
10. **Handle offline scenarios** - Cache data and sync when online

---

## 🔄 Migration from Firebase

If migrating from Firebase Firestore, refer to the endpoint mappings in `MASTER_API_DESIGN.md` for equivalent API endpoints.

---

**Last Updated:** 2024-12-29  
**API Version:** 1.0.0  
**Base URL:** `https://tuchonga-admin-production.up.railway.app/api`

