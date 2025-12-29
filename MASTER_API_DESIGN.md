# 🏗️ TuChonga Master API Design

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [User Types & Roles](#user-types--roles)
4. [API Endpoints](#api-endpoints)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)

---

## 🎯 Overview

This document defines the complete API structure for TuChonga, replacing Firebase Firestore queries with PostgreSQL via Prisma ORM.

### Base URLs

| Environment | URL |
|-------------|-----|
| **Development** | `http://localhost:3001/api` |
| **Production** | `https://tuchonga-admin-production.up.railway.app/api` |

### Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

---

## 🔐 Authentication

### Authentication Methods

| User Type | Method | Description |
|-----------|--------|-------------|
| **Mobile Users** | Phone OTP | Firebase Auth (phone) or Prisma OTP |
| **Mobile Users** | Email/Password | Firebase Auth or Prisma Auth |
| **Business Users** | Email/Password | Prisma JWT Auth |
| **Admin Users** | Email/Password | Prisma JWT Auth |

### JWT Token Structure

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "user|business|admin|super_admin",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Authentication Headers

```
Authorization: Bearer <jwt_token>
```

---

## 👥 User Types & Roles

### Mobile Users (role: "user")
- Browse products and services
- Submit reviews and ratings
- Post and react to comments
- Manage favorites
- View and edit profile

### Business Users (role: "business")
- All mobile user permissions
- Manage own products/services
- View analytics for own items
- Respond to reviews/comments

### Admin Users (role: "admin"|"moderator"|"staff")
- View all data
- Moderate content
- Manage users
- View analytics

### Super Admin (role: "super_admin")
- All admin permissions
- Manage other admins
- System configuration

---

## 📡 API Endpoints

### 1. Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user (phone/email) | No |
| POST | `/auth/login` | Login with email/password | No |
| POST | `/auth/phone/send-otp` | Send OTP to phone | No |
| POST | `/auth/phone/verify-otp` | Verify OTP and login | No |
| POST | `/auth/refresh` | Refresh access token | Yes |
| GET | `/auth/verify` | Verify current token | Yes |
| POST | `/auth/logout` | Logout and invalidate token | Yes |
| POST | `/auth/password/forgot` | Request password reset | No |
| POST | `/auth/password/reset` | Reset password with token | No |

---

### 2. Users (`/api/users`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/users/me` | Get current user profile | Yes | All |
| PUT | `/users/me` | Update current user profile | Yes | All |
| GET | `/users/me/analytics` | Get user analytics | Yes | All |
| GET | `/users/:id` | Get user by ID | Yes | Admin |
| GET | `/users` | List all users | Yes | Admin |
| PUT | `/users/:id` | Update user | Yes | Admin |
| DELETE | `/users/:id` | Delete user | Yes | Super Admin |

#### User Profile Fields

```typescript
interface UserProfile {
  id: string;
  email?: string;
  phoneNumber?: string;
  fullName?: string;
  displayName?: string;
  profileImage?: string;
  location?: string;
  hasCompletedProfile: boolean;
  role: string;
  createdAt: Date;
}
```

---

### 3. Products (`/api/products`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/products` | List products (with filters) | No | All |
| GET | `/products/:id` | Get product details | No | All |
| GET | `/products/:id/reviews` | Get product reviews | No | All |
| GET | `/products/:id/comments` | Get product comments | No | All |
| GET | `/products/:id/quick-ratings` | Get quick rating stats | No | All |
| POST | `/products` | Create product | Yes | Business, Admin |
| PUT | `/products/:id` | Update product | Yes | Owner, Admin |
| DELETE | `/products/:id` | Delete product | Yes | Owner, Admin |
| POST | `/products/:id/view` | Track product view | No | All |

#### Product Query Parameters

```
GET /products?
  search=keyword
  &categories=cat1,cat2
  &businessId=uuid
  &sortBy=createdAt|rating|views
  &sortOrder=asc|desc
  &page=1
  &limit=20
  &isActive=true
```

---

### 4. Services (`/api/services`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/services` | List services (with filters) | No | All |
| GET | `/services/:id` | Get service details | No | All |
| GET | `/services/:id/reviews` | Get service reviews | No | All |
| GET | `/services/:id/comments` | Get service comments | No | All |
| GET | `/services/:id/quick-ratings` | Get quick rating stats | No | All |
| POST | `/services` | Create service | Yes | Business, Admin |
| PUT | `/services/:id` | Update service | Yes | Owner, Admin |
| DELETE | `/services/:id` | Delete service | Yes | Owner, Admin |
| POST | `/services/:id/view` | Track service view | No | All |

---

### 5. Categories (`/api/categories`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/categories` | List all categories | No | All |
| GET | `/categories/:id` | Get category details | No | All |
| GET | `/categories/products` | Get product categories | No | All |
| GET | `/categories/services` | Get service categories | No | All |
| POST | `/categories` | Create category | Yes | Admin |
| PUT | `/categories/:id` | Update category | Yes | Admin |
| DELETE | `/categories/:id` | Delete category | Yes | Admin |

---

### 6. Reviews (`/api/reviews`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/reviews` | List reviews (with filters) | No | All |
| GET | `/reviews/:id` | Get review details | No | All |
| GET | `/reviews/user/:userId` | Get user's reviews | Yes | Owner, Admin |
| POST | `/reviews` | Create/update review | Yes | User |
| PUT | `/reviews/:id` | Update review | Yes | Owner |
| DELETE | `/reviews/:id` | Delete review | Yes | Owner, Admin |

#### Review Sentiments

```typescript
enum ReviewSentiment {
  WOULD_RECOMMEND = "Would recommend",
  ITS_GOOD = "Its Good",
  DONT_MIND_IT = "Dont mind it",
  ITS_BAD = "It's bad"
}
```

#### Create Review Request

```json
{
  "productId": "uuid",  // OR serviceId
  "serviceId": "uuid",
  "sentiment": "WOULD_RECOMMEND",
  "text": "Optional review text"
}
```

---

### 7. Quick Ratings (`/api/quick-ratings`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/quick-ratings/product/:productId` | Get product ratings | No | All |
| GET | `/quick-ratings/service/:serviceId` | Get service ratings | No | All |
| GET | `/quick-ratings/user/:userId` | Get user's ratings | Yes | Owner, Admin |
| POST | `/quick-ratings` | Submit quick rating | Yes | User |
| PUT | `/quick-ratings/:id` | Update rating (24hr limit) | Yes | Owner |

#### Quick Rating Request

```json
{
  "itemId": "uuid",
  "itemType": "PRODUCT|SERVICE",
  "rating": 1-5
}
```

---

### 8. Comments (`/api/comments`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/comments/product/:productId` | Get product comments | No | All |
| GET | `/comments/service/:serviceId` | Get service comments | No | All |
| GET | `/comments/:id` | Get comment with replies | No | All |
| GET | `/comments/:id/replies` | Get comment replies | No | All |
| POST | `/comments` | Create comment | Yes | User |
| PUT | `/comments/:id` | Update comment | Yes | Owner |
| DELETE | `/comments/:id` | Delete comment | Yes | Owner, Admin |
| POST | `/comments/:id/react` | React to comment | Yes | User |
| DELETE | `/comments/:id/react` | Remove reaction | Yes | Owner |
| POST | `/comments/:id/report` | Report comment | Yes | User |

#### Comment Query Parameters

```
GET /comments/product/:id?
  sortBy=newest|oldest|most_agreed|most_disagreed|most_replies
  &filter=with_replies
  &search=keyword
  &page=1
  &limit=20
```

#### Create Comment Request

```json
{
  "itemId": "uuid",
  "itemType": "PRODUCT|SERVICE",
  "text": "Comment text",
  "parentId": "uuid"  // Optional, for replies
}
```

---

### 9. Favorites (`/api/favorites`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/favorites` | Get user's favorites | Yes | Owner |
| GET | `/favorites/check/:itemId` | Check if item is favorited | Yes | Owner |
| POST | `/favorites` | Add to favorites | Yes | User |
| DELETE | `/favorites/:itemId` | Remove from favorites | Yes | Owner |

#### Favorite Request

```json
{
  "itemId": "uuid",
  "itemType": "PRODUCT|SERVICE"
}
```

---

### 10. Businesses (`/api/businesses`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/businesses` | List businesses | No | All |
| GET | `/businesses/:id` | Get business details | No | All |
| GET | `/businesses/:id/products` | Get business products | No | All |
| GET | `/businesses/:id/services` | Get business services | No | All |
| POST | `/businesses` | Create business | Yes | Admin |
| PUT | `/businesses/:id` | Update business | Yes | Owner, Admin |
| DELETE | `/businesses/:id` | Delete business | Yes | Admin |

---

### 11. Admin Management (`/api/admin`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/admin/setup/check` | Check if super admin exists | No | - |
| POST | `/admin/setup/super-admin` | Create first super admin | No | - |
| GET | `/admin` | List all admins | Yes | Admin |
| GET | `/admin/:id` | Get admin details | Yes | Admin |
| POST | `/admin` | Create admin | Yes | Super Admin |
| PUT | `/admin/:id` | Update admin | Yes | Admin/Owner |
| DELETE | `/admin/:id` | Delete admin | Yes | Super Admin |
| GET | `/admin/stats/count` | Get admin statistics | Yes | Admin |

---

### 12. Analytics (`/api/analytics`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/analytics/overview` | Dashboard overview stats | Yes | Admin |
| GET | `/analytics/products` | Product analytics | Yes | Admin, Business |
| GET | `/analytics/services` | Service analytics | Yes | Admin, Business |
| GET | `/analytics/users` | User analytics | Yes | Admin |
| GET | `/analytics/reviews` | Review analytics | Yes | Admin |
| GET | `/analytics/trends` | Trend data (charts) | Yes | Admin |

---

### 13. Staff Management (`/api/staff`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/staff` | List all staff | Yes | Admin |
| GET | `/staff/:id` | Get staff details | Yes | Admin |
| POST | `/staff` | Create staff | Yes | Admin |
| PUT | `/staff/:id` | Update staff | Yes | Admin |
| DELETE | `/staff/:id` | Delete staff | Yes | Admin |

---

### 14. Surveys (`/api/surveys`)

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/surveys/templates` | List survey templates | Yes | Admin |
| GET | `/surveys/templates/:id` | Get template details | Yes | Admin |
| POST | `/surveys/templates` | Create template | Yes | Admin |
| PUT | `/surveys/templates/:id` | Update template | Yes | Admin |
| DELETE | `/surveys/templates/:id` | Delete template | Yes | Admin |
| GET | `/surveys/responses` | List survey responses | Yes | Admin |
| POST | `/surveys/responses` | Submit survey response | Yes | User |

---

## 📊 Data Models

### Core Models

```
┌─────────────────────────────────────────────────────────────────┐
│                           User                                   │
├─────────────────────────────────────────────────────────────────┤
│ id, email, phoneNumber, fullName, displayName, profileImage,     │
│ role, hasCompletedProfile, isActive, createdAt, updatedAt        │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────────┐
│   AdminAuth   │    │   Analytics   │    │      Staff        │
└───────────────┘    └───────────────┘    └───────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         Business                                 │
├─────────────────────────────────────────────────────────────────┤
│ id, name, businessEmail, businessPhone, location, logo,          │
│ pocFirstname, pocLastname, isVerified, status, createdAt         │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌───────────────────────┐           ┌───────────────────────┐
│       Product         │           │       Service         │
├───────────────────────┤           ├───────────────────────┤
│ productName, desc,    │           │ serviceName, desc,    │
│ mainImage, images,    │           │ mainImage, images,    │
│ analytics, ratings    │           │ analytics, ratings    │
└───────────────────────┘           └───────────────────────┘
        │                                       │
        ├──── Reviews ────────────────────────┤
        ├──── Comments ───────────────────────┤
        ├──── QuickRatings ───────────────────┤
        └──── Favorites ──────────────────────┘
```

---

## ⚠️ Error Handling

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_INVALID_TOKEN` | 401 | Invalid or expired token |
| `AUTH_TOKEN_REQUIRED` | 401 | No token provided |
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `AUTH_ACCOUNT_LOCKED` | 403 | Too many failed attempts |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `DUPLICATE_ERROR` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Error Response Example

```json
{
  "success": false,
  "error": "Invalid credentials",
  "code": "AUTH_INVALID_CREDENTIALS",
  "details": {
    "field": "email",
    "message": "No account found with this email"
  }
}
```

---

## 🚦 Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Auth endpoints | 5 requests | per minute |
| Public GET | 100 requests | per minute |
| Authenticated GET | 300 requests | per minute |
| POST/PUT/DELETE | 30 requests | per minute |
| Quick ratings | 1 update | per 24 hours |

---

## 📱 Mobile App Migration Map

### Firebase → Prisma Query Mapping

| Firebase Operation | New API Endpoint |
|-------------------|------------------|
| `getDocs(collection(db, 'products'))` | `GET /api/products` |
| `getDoc(doc(db, 'products', id))` | `GET /api/products/:id` |
| `addDoc(collection(db, 'products'))` | `POST /api/products` |
| `updateDoc(doc(db, 'products', id))` | `PUT /api/products/:id` |
| `deleteDoc(doc(db, 'products', id))` | `DELETE /api/products/:id` |
| `onSnapshot(query(...))` | WebSocket or polling |

### Authentication Migration

| Firebase Auth | New API Endpoint |
|--------------|------------------|
| `signInWithPhoneNumber` | `POST /api/auth/phone/send-otp` + `POST /api/auth/phone/verify-otp` |
| `signInWithEmailAndPassword` | `POST /api/auth/login` |
| `createUserWithEmailAndPassword` | `POST /api/auth/register` |
| `signOut` | `POST /api/auth/logout` |
| `onAuthStateChanged` | `GET /api/auth/verify` (on app start) |

---

## 🔄 WebSocket Events (Future)

For real-time updates, implement WebSocket connections:

```javascript
// Connect
ws://api.tuchonga.com/ws?token=<jwt>

// Events
{
  "type": "comment:new",
  "data": { ... }
}

{
  "type": "review:new",
  "data": { ... }
}
```

---

## 📝 Implementation Priority

### Phase 1: Core APIs (High Priority)
1. ✅ Auth (login, register, verify)
2. ✅ Admin management
3. 🔄 Products CRUD
4. 🔄 Services CRUD
5. 🔄 Categories CRUD

### Phase 2: User Engagement (Medium Priority)
6. Reviews (create, read, update)
7. Quick Ratings
8. Comments (with threading)
9. Favorites

### Phase 3: Business Features (Lower Priority)
10. Business management
11. Analytics
12. Staff management
13. Surveys

---

**Last Updated:** 2024-12-29
**Version:** 1.0.0


