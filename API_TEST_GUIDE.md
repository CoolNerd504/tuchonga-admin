# API Test Guide - TuChonga Admin App

This document provides a comprehensive test guide for all API endpoints, ordered by dependency. Each test includes form field mappings, expected requests/responses, and validation rules.

## Table of Contents

1. [Super Admin Setup](#1-super-admin-setup)
2. [Admin Authentication](#2-admin-authentication)
3. [Staff/Admin Management](#3-staffadmin-management)
4. [Category Management](#4-category-management)
5. [Business Management](#5-business-management)
6. [Product Management](#6-product-management)
7. [Service Management](#7-service-management)
8. [User Management](#8-user-management)
9. [Analytics](#9-analytics)

---

## 1. Super Admin Setup

**Dependencies:** None (First endpoint to test)

### 1.1 Check Super Admin Exists

**Endpoint:** `GET /api/admin/setup/check`

**Form:** `src/sections/admin/setup/super-admin-setup-view.tsx`

**Request:**
```http
GET /api/admin/setup/check
```

**Expected Response:**
```json
{
  "superAdminExists": false
}
```

**Test Cases:**
- ✅ Should return `false` if no super admin exists
- ✅ Should return `true` if super admin exists
- ✅ Should handle API server not running gracefully

---

### 1.2 Create Super Admin

**Endpoint:** `POST /api/admin/setup/super-admin`

**Form:** `src/sections/admin/setup/super-admin-setup-view.tsx`

**Form Fields:**
- `firstname` (required) → Maps to `firstname` + combined into `fullName`
- `lastname` (required) → Maps to `lastname` + combined into `fullName`
- `email` (required) → Maps to `email`
- `password` (required, min 8 chars) → Maps to `password`
- `confirmPassword` (required, must match) → Not sent to API (client-side validation)
- `phoneNumber` (optional) → Maps to `phoneNumber`

**Request:**
```http
POST /api/admin/setup/super-admin
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123",
  "firstname": "John",
  "lastname": "Doe",
  "phoneNumber": "+1234567890"
}
```

**Expected Response (201):**
```json
{
  "message": "Super admin created successfully",
  "admin": {
    "id": "uuid",
    "email": "admin@example.com",
    "fullName": "John Doe",
    "role": "super_admin"
  }
}
```

**Validation Rules:**
- ✅ Email and password required
- ✅ First name and last name required
- ✅ Password must be at least 8 characters
- ✅ Email must be valid format
- ✅ Cannot create if super admin already exists (400)

**Test Cases:**
- ✅ Create super admin with all fields
- ✅ Create super admin without phone number
- ✅ Fail with missing email
- ✅ Fail with missing password
- ✅ Fail with password < 8 characters
- ✅ Fail with invalid email format
- ✅ Fail if super admin already exists
- ✅ Verify `fullName` is correctly combined from `firstname` and `lastname`

---

## 2. Admin Authentication

**Dependencies:** Super Admin Setup

### 2.1 Login

**Endpoint:** `POST /api/auth/login`

**Form:** `src/sections/auth/sign-in-view.tsx`

**Form Fields:**
- `email` (required) → Maps to `email`
- `password` (required) → Maps to `password`

**Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Expected Response (200):**
```json
{
  "token": "jwt_token_here",
  "admin": {
    "id": "uuid",
    "email": "admin@example.com",
    "fullName": "John Doe",
    "firstname": "John",
    "lastname": "Doe",
    "displayName": null,
    "role": "super_admin",
    "profileImage": null
  }
}
```

**Validation Rules:**
- ✅ Email and password required
- ✅ Invalid credentials return 401
- ✅ Account locked returns 403
- ✅ Token expires in 7 days

**Test Cases:**
- ✅ Login with valid credentials
- ✅ Fail with invalid email
- ✅ Fail with invalid password
- ✅ Fail with missing email
- ✅ Fail with missing password
- ✅ Verify token is stored in localStorage
- ✅ Verify admin data is stored in localStorage

---

### 2.2 Verify Token

**Endpoint:** `GET /api/auth/verify`

**Request:**
```http
GET /api/auth/verify
Authorization: Bearer <token>
```

**Expected Response (200):**
```json
{
  "admin": {
    "id": "uuid",
    "email": "admin@example.com",
    "fullName": "John Doe",
    "firstname": "John",
    "lastname": "Doe",
    "displayName": null,
    "role": "super_admin",
    "profileImage": null
  }
}
```

**Test Cases:**
- ✅ Verify valid token
- ✅ Fail with invalid token (401)
- ✅ Fail with missing token (401)
- ✅ Fail with expired token (401)

---

## 3. Staff/Admin Management

**Dependencies:** Admin Login (Super Admin role required for creation)

### 3.1 Get All Admins

**Endpoint:** `GET /api/admin`

**Form:** `src/sections/staff/view/staff-view.tsx` (displays list)

**Request:**
```http
GET /api/admin
Authorization: Bearer <token>
```

**Query Parameters:**
- `role` (optional): Filter by role
- `isActive` (optional): Filter by active status
- `limit` (optional): Pagination limit
- `offset` (optional): Pagination offset

**Expected Response (200):**
```json
[
  {
    "id": "uuid",
    "email": "admin@example.com",
    "fullName": "John Doe",
    "firstname": "John",
    "lastname": "Doe",
    "phoneNumber": "+1234567890",
    "role": "super_admin",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

**Test Cases:**
- ✅ Get all admins
- ✅ Filter by role
- ✅ Filter by isActive
- ✅ Pagination works
- ✅ Requires authentication

---

### 3.2 Create Admin/Staff

**Endpoint:** `POST /api/admin`

**Form:** `src/sections/staff/view/staff-view.tsx`

**Form Fields:**
- `email` (required) → Maps to `email`
- `password` (required, min 8 chars) → Maps to `password`
- `firstname` (required) → Maps to `firstname` + combined into `fullName`
- `lastname` (required) → Maps to `lastname` + combined into `fullName`
- `role` (required) → Maps to `role` (super_admin, admin, moderator, staff)
- `mobile` (optional) → Maps to `phoneNumber`

**⚠️ ISSUE FOUND:** Form sends `fullName` but endpoint expects `firstname` and `lastname` separately. Form correctly combines them.

**Request:**
```http
POST /api/admin
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "staff@example.com",
  "password": "password123",
  "firstname": "Jane",
  "lastname": "Smith",
  "role": "admin",
  "phoneNumber": "+1234567890"
}
```

**Expected Response (201):**
```json
{
  "message": "Admin created successfully",
  "admin": {
    "id": "uuid",
    "email": "staff@example.com",
    "fullName": "Jane Smith",
    "role": "admin"
  }
}
```

**Validation Rules:**
- ✅ Requires super admin role
- ✅ Email, password, firstname, lastname, role required
- ✅ Password must be at least 8 characters
- ✅ Valid email format
- ✅ Role must be one of: super_admin, admin, moderator, staff

**Test Cases:**
- ✅ Create admin with all fields
- ✅ Create admin without phone number
- ✅ Fail with missing required fields
- ✅ Fail with invalid role
- ✅ Fail with password < 8 characters
- ✅ Fail without super admin role
- ✅ Verify `fullName` is correctly combined

---

### 3.3 Update Admin

**Endpoint:** `PUT /api/admin/:id`

**Form:** `src/sections/admin/view/admin-view.tsx`

**Request:**
```http
PUT /api/admin/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "updated@example.com",
  "fullName": "Jane Updated",
  "phoneNumber": "+1234567890",
  "role": "admin"
}
```

**Validation Rules:**
- ✅ Super admin can update any admin
- ✅ Admin can only update themselves
- ✅ Only super admin can change roles

**Test Cases:**
- ✅ Super admin updates another admin
- ✅ Admin updates themselves
- ✅ Admin cannot update other admins
- ✅ Admin cannot change roles (only super admin can)

---

### 3.4 Delete Admin

**Endpoint:** `DELETE /api/admin/:id`

**Validation Rules:**
- ✅ Requires super admin role
- ✅ Cannot delete yourself

**Test Cases:**
- ✅ Super admin deletes another admin
- ✅ Fail to delete yourself
- ✅ Fail without super admin role

---

## 4. Category Management

**Dependencies:** Admin Login

### 4.1 Get All Categories

**Endpoint:** `GET /api/categories`

**Form:** `src/sections/category/view/categories-view.tsx`

**Query Parameters:**
- `type` (optional): PRODUCT or SERVICE
- `search` (optional): Search term
- `page` (optional): Page number
- `limit` (optional): Items per page

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Electronics",
      "description": "Electronic products",
      "type": "PRODUCT",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 20
  }
}
```

**Test Cases:**
- ✅ Get all categories
- ✅ Filter by type (PRODUCT)
- ✅ Filter by type (SERVICE)
- ✅ Search categories
- ✅ Pagination works

---

### 4.2 Create Category

**Endpoint:** `POST /api/categories`

**Form:** `src/sections/category/view/categories-view.tsx`

**Form Fields:**
- `name` (required) → Maps to `name`
- `description` (optional) → Maps to `description`
- `type` (required) → Maps to `type` (product/service, converted to PRODUCT/SERVICE)

**Request:**
```http
POST /api/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Electronics",
  "description": "Electronic products and gadgets",
  "type": "PRODUCT"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "id": "uuid",
    "name": "Electronics",
    "description": "Electronic products and gadgets",
    "type": "PRODUCT",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Validation Rules:**
- ✅ Name and type required
- ✅ Type must be PRODUCT or SERVICE
- ✅ Name must be unique

**Test Cases:**
- ✅ Create product category
- ✅ Create service category
- ✅ Create category without description
- ✅ Fail with missing name
- ✅ Fail with missing type
- ✅ Fail with duplicate name
- ✅ Verify type is converted to uppercase

---

### 4.3 Update Category

**Endpoint:** `PUT /api/categories/:id`

**Form:** `src/sections/category/view/categories-view.tsx`

**Request:**
```http
PUT /api/categories/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Electronics",
  "description": "Updated description",
  "type": "PRODUCT"
}
```

**Test Cases:**
- ✅ Update category name
- ✅ Update category description
- ✅ Update category type
- ✅ Fail with invalid category ID

---

### 4.4 Delete Category

**Endpoint:** `DELETE /api/categories/:id`

**Validation Rules:**
- ✅ Requires admin authentication
- ✅ May fail if category is in use by products/services

**Test Cases:**
- ✅ Delete unused category
- ✅ Fail if category is in use (foreign key constraint)

---

## 5. Business Management

**Dependencies:** Admin Login

### 5.1 Get All Businesses

**Endpoint:** `GET /api/businesses`

**Query Parameters:**
- `search` (optional)
- `isVerified` (optional)
- `status` (optional)
- `page` (optional)
- `limit` (optional)

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Business Name",
      "businessEmail": "business@example.com",
      "businessPhone": "+1234567890",
      "location": "City, Country",
      "logo": "https://...",
      "pocFirstname": "John",
      "pocLastname": "Doe",
      "pocPhone": "+1234567890",
      "isVerified": false,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 20
  }
}
```

**Test Cases:**
- ✅ Get all businesses
- ✅ Filter by search
- ✅ Filter by isVerified
- ✅ Pagination works

---

### 5.2 Create Business

**Endpoint:** `POST /api/businesses`

**Form Fields:**
- `name` (required) → Maps to `name`
- `businessEmail` (optional) → Maps to `businessEmail`
- `businessPhone` (optional) → Maps to `businessPhone`
- `location` (optional) → Maps to `location`
- `logo` (optional) → Maps to `logo`
- `pocFirstname` (optional) → Maps to `pocFirstname`
- `pocLastname` (optional) → Maps to `pocLastname`
- `pocPhone` (optional) → Maps to `pocPhone`

**Request:**
```http
POST /api/businesses
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Business",
  "businessEmail": "business@example.com",
  "businessPhone": "+1234567890",
  "location": "City, Country",
  "logo": "https://...",
  "pocFirstname": "John",
  "pocLastname": "Doe",
  "pocPhone": "+1234567890"
}
```

**Validation Rules:**
- ✅ Name required
- ✅ Requires admin authentication

**Test Cases:**
- ✅ Create business with all fields
- ✅ Create business with only name
- ✅ Fail with missing name
- ✅ Requires authentication

---

## 6. Product Management

**Dependencies:** Admin Login, Categories (for categoryIds)

### 6.1 Get All Products

**Endpoint:** `GET /api/products`

**Form:** `src/sections/product/view/products-view.tsx`

**Query Parameters:**
- `search` (optional)
- `categories` (optional, comma-separated)
- `businessId` (optional)
- `isActive` (optional)
- `page` (optional)
- `limit` (optional)
- `sortBy` (optional)
- `sortOrder` (optional)

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "productName": "Product Name",
      "description": "Product description",
      "mainImage": "https://...",
      "additionalImages": [],
      "categoryIds": ["category-uuid-1", "category-uuid-2"],
      "businessId": "business-uuid",
      "productOwner": "business-uuid",
      "isActive": true,
      "totalViews": 0,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 20
  }
}
```

**Test Cases:**
- ✅ Get all products
- ✅ Filter by categories
- ✅ Filter by businessId
- ✅ Filter by isActive
- ✅ Search products
- ✅ Pagination works
- ✅ Sorting works

---

### 6.2 Create Product

**Endpoint:** `POST /api/products`

**Form:** `src/sections/product/view/products-view.tsx`

**Form Fields:**
- `product_name` (required) → Maps to `productName`
- `description` (optional) → Maps to `description`
- `category` (required, array of IDs) → Maps to `categoryIds` ✅ **FIXED: Now uses IDs**
- `productOwner` (optional) → Maps to `businessId` and `productOwner`
- `isActive` (optional, default true) → Maps to `isActive`
- `productThumbnailFile` (optional) → Uploaded to Firebase, URL maps to `mainImage`

**⚠️ IMPORTANT:** Categories must be **IDs**, not names. Form was fixed to use IDs.

**Request:**
```http
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "productName": "New Product",
  "description": "Product description",
  "mainImage": "https://firebase-storage-url/...",
  "additionalImages": [],
  "categoryIds": ["category-uuid-1", "category-uuid-2"],
  "businessId": "business-uuid",
  "productOwner": "business-uuid",
  "isActive": true
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "uuid",
    "productName": "New Product",
    "description": "Product description",
    "mainImage": "https://...",
    "categoryIds": ["category-uuid-1", "category-uuid-2"],
    "businessId": "business-uuid",
    "isActive": true
  }
}
```

**Validation Rules:**
- ✅ Product name required
- ✅ Category IDs must exist in database
- ✅ Business ID must exist if provided
- ✅ Requires authentication (admin or business owner)

**Test Cases:**
- ✅ Create product with all fields
- ✅ Create product without business (SetLater)
- ✅ Create product with categories (using IDs)
- ✅ Fail with missing product name
- ✅ Fail with invalid category IDs (P2003 error)
- ✅ Fail with invalid business ID
- ✅ Fail with duplicate product name
- ✅ Verify categories are validated before creation
- ✅ Verify business is validated before creation

---

### 6.3 Update Product

**Endpoint:** `PUT /api/products/:id`

**Request:**
```http
PUT /api/products/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "productName": "Updated Product",
  "description": "Updated description",
  "categoryIds": ["new-category-uuid"],
  "isActive": false
}
```

**Test Cases:**
- ✅ Update product name
- ✅ Update product description
- ✅ Update categories
- ✅ Update isActive status
- ✅ Fail with invalid category IDs

---

### 6.4 Delete Product

**Endpoint:** `DELETE /api/products/:id`

**Validation Rules:**
- ✅ Requires admin authentication
- ✅ Soft delete (sets isActive to false)

**Test Cases:**
- ✅ Delete product (admin only)
- ✅ Fail without admin role

---

## 7. Service Management

**Dependencies:** Admin Login, Categories (for categoryIds)

### 7.1 Get All Services

**Endpoint:** `GET /api/services`

**Form:** `src/sections/service/view/services-view.tsx`

**Query Parameters:** Same as products

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "serviceName": "Service Name",
      "description": "Service description",
      "mainImage": "https://...",
      "categoryIds": ["category-uuid-1"],
      "businessId": "business-uuid",
      "isActive": true
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 20
  }
}
```

**Test Cases:**
- ✅ Get all services
- ✅ Filter by categories
- ✅ Filter by businessId
- ✅ Search services

---

### 7.2 Create Service

**Endpoint:** `POST /api/services`

**Form:** `src/sections/service/view/services-view.tsx`

**Form Fields:**
- `service_name` (required) → Maps to `serviceName`
- `description` (optional) → Maps to `description`
- `category` (required, array of IDs) → Maps to `categoryIds` ✅ **FIXED: Now uses IDs**
- `service_owner` (optional) → Maps to `businessId` and `serviceOwner`
- `serviceThumbnailFile` (optional) → Uploaded to Firebase, URL maps to `mainImage`

**⚠️ IMPORTANT:** Categories must be **IDs**, not names. Form was fixed to use IDs.

**Request:**
```http
POST /api/services
Authorization: Bearer <token>
Content-Type: application/json

{
  "serviceName": "New Service",
  "description": "Service description",
  "mainImage": "https://firebase-storage-url/...",
  "additionalImages": [],
  "categoryIds": ["category-uuid-1"],
  "businessId": "business-uuid",
  "serviceOwner": "business-uuid",
  "isActive": true
}
```

**Validation Rules:**
- ✅ Service name required
- ✅ Category IDs must exist
- ✅ Business ID must exist if provided

**Test Cases:**
- ✅ Create service with all fields
- ✅ Create service without business
- ✅ Fail with invalid category IDs
- ✅ Fail with invalid business ID

---

## 8. User Management

**Dependencies:** Admin Login

### 8.1 Get All Users

**Endpoint:** `GET /api/users`

**Form:** `src/sections/user/view/user-view.tsx`

**Query Parameters:**
- `search` (optional)
- `role` (optional)
- `isActive` (optional)
- `hasCompletedProfile` (optional)
- `page` (optional)
- `limit` (optional)

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "User Name",
      "firstname": "User",
      "lastname": "Name",
      "displayName": "User Name",
      "phoneNumber": "+1234567890",
      "mobile": "+1234567890",
      "location": "City, Country",
      "profileImage": "https://...",
      "gender": "male",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 20
  }
}
```

**Test Cases:**
- ✅ Get all users
- ✅ Filter by search
- ✅ Filter by role
- ✅ Filter by isActive
- ✅ Filter by hasCompletedProfile
- ✅ Pagination works

---

### 8.2 Update User

**Endpoint:** `PUT /api/users/:id`

**Form:** `src/sections/user/view/user-view.tsx`

**Form Fields:**
- `email` (optional) → Maps to `email`
- `fullName` (optional) → Maps to `fullName`
- `firstname` (optional) → Maps to `firstname`
- `lastname` (optional) → Maps to `lastname`
- `displayName` (optional) → Maps to `displayName`
- `phoneNumber` (optional) → Maps to `phoneNumber`
- `mobile` (optional) → Maps to `mobile`
- `location` (optional) → Maps to `location`
- `profileImage` (optional) → Maps to `profileImage`
- `gender` (optional) → Maps to `gender` ✅ **Recently added**

**Request:**
```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "Updated Name",
  "phoneNumber": "+1234567890",
  "location": "New City",
  "gender": "female"
}
```

**Validation Rules:**
- ✅ Requires admin authentication
- ✅ All fields optional

**Test Cases:**
- ✅ Update user profile
- ✅ Update gender field
- ✅ Update location
- ✅ Requires authentication

---

## 9. Analytics

**Dependencies:** Admin Login, Products, Services, Users

### 9.1 Get Overview Analytics

**Endpoint:** `GET /api/analytics/overview`

**Form:** `src/sections/overview/view/overview-analytics-view.tsx`

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 100,
    "totalProducts": 50,
    "totalServices": 30,
    "totalBusinesses": 10,
    "totalCategories": 20,
    "totalReviews": 200,
    "totalComments": 150
  }
}
```

**Test Cases:**
- ✅ Get overview analytics
- ✅ Returns 0 for empty data
- ✅ Requires authentication

---

### 9.2 Get Product Trends

**Endpoint:** `GET /api/analytics/products/trends`

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "monthlyAdds": [0, 5, 10, 15],
    "totalViews": 1000,
    "averageViews": 20,
    "zeroViewCount": 5,
    "topViewed": [
      {
        "id": "uuid",
        "productName": "Product Name",
        "totalViews": 100
      }
    ]
  }
}
```

**Test Cases:**
- ✅ Get product trends
- ✅ Returns empty arrays for no data
- ✅ Calculates averages correctly

---

### 9.3 Get Service Trends

**Endpoint:** `GET /api/analytics/services/trends`

**Similar to product trends**

**Test Cases:**
- ✅ Get service trends
- ✅ Returns empty arrays for no data

---

## Test Execution Order

Follow this order to test all endpoints:

1. **Super Admin Setup** (No dependencies)
   - Check super admin exists
   - Create super admin

2. **Admin Authentication** (Depends on super admin)
   - Login
   - Verify token

3. **Staff/Admin Management** (Depends on login)
   - Get all admins
   - Create admin/staff
   - Update admin
   - Delete admin

4. **Category Management** (Depends on login)
   - Get all categories
   - Create category (PRODUCT)
   - Create category (SERVICE)
   - Update category
   - Delete category

5. **Business Management** (Depends on login)
   - Get all businesses
   - Create business
   - Update business
   - Verify business

6. **Product Management** (Depends on categories, optionally businesses)
   - Get all products
   - Create product (with category IDs)
   - Create product (with business)
   - Update product
   - Delete product

7. **Service Management** (Depends on categories, optionally businesses)
   - Get all services
   - Create service (with category IDs) ✅ **Fixed: Now uses IDs**
   - Update service
   - Delete service

8. **User Management** (Depends on login)
   - Get all users
   - Update user
   - Deactivate user

9. **Analytics** (Depends on all above)
   - Get overview analytics
   - Get product trends
   - Get service trends

---

## Known Issues

1. ✅ **Services Form Category Selection:** Fixed - Now uses category IDs instead of names (aligned with products form).
2. **Staff Form:** Sends `fullName` but correctly combines `firstname` and `lastname` - this is fine as endpoint accepts both.

---

## Testing Tools

### Manual Testing
- Use browser DevTools Network tab
- Use Postman/Insomnia
- Use curl commands

### Automated Testing
- Consider adding Jest/Supertest tests
- Consider adding Playwright/Cypress E2E tests

---

## Environment Variables Required

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing
- `VITE_FIREBASE_API_KEY`: Firebase API key (for storage)
- `VITE_FIREBASE_PROJECT_ID`: Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET`: Firebase storage bucket
- `PORT`: API server port (default: 3001)

---

## Notes

- All timestamps are in ISO 8601 format
- All UUIDs are standard UUID v4
- Image uploads use Firebase Storage
- Authentication uses JWT tokens
- All soft deletes set `isActive` to false
- Foreign key constraints are enforced at database level

