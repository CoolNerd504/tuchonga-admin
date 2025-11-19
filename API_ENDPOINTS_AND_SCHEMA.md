# TuChonga Mobile - API Endpoints & Schema Summary

## 🔥 Firebase Configuration

**Project**: `tuchonga-bf6af` (React Native Firebase Modular SDK)
- **Auth**: Firebase Authentication
- **Database**: Cloud Firestore
- **Storage**: Firebase Storage

---

## 📊 Firebase Collections Structure

### Core Collections
1. **`users`** - User profiles and authentication data
2. **`products`** - Product listings
3. **`services`** - Service listings
4. **`categories`** - Product and service categories
5. **`reviews`** - Legacy review system (sentiment-based)
6. **`quickRatings`** - Quick emoji ratings (1-4 scale)
7. **`surveyResponses`** - Comprehensive survey responses
8. **`surveyTemplates`** - Survey question templates
9. **`comments`** - Comment system with threading
10. **`commentReactions`** - Comment agree/disagree reactions
11. **`commentReports`** - Comment moderation reports
12. **`favorites`** - User favorites (products & services)
13. **`userRatingHistory`** - User rating history tracking
14. **`businessOwners`** - Business owner profiles

---

## 🔐 Authentication Endpoints

### Phone Authentication
- **`sendPhoneVerification(phoneNumber: string)`**
  - Sends OTP via SMS
  - Returns: `ConfirmationResult` object
  - Collection: Firebase Auth

- **`confirmPhoneVerification(confirmation, code: string)`**
  - Verifies OTP code
  - Creates/updates user document in Firestore
  - Returns: `User` object
  - Collection: `users/{uid}`

### Email Authentication
- **`signUpWithEmail(email: string, password: string)`**
  - Creates new user account
  - Sends email verification
  - Collection: Firebase Auth + `users/{uid}`

- **`signInWithEmail(email: string, password: string)`**
  - Signs in existing user
  - Collection: Firebase Auth

- **`resetPassword(email: string)`**
  - Sends password reset email
  - Collection: Firebase Auth

### User Management
- **`createOrUpdateUserDocument(user: User)`**
  - Creates/updates user in Firestore
  - Collection: `users/{uid}`
  - Schema: See User Schema below

- **`getUserDocument(uid: string)`**
  - Fetches user profile
  - Collection: `users/{uid}`

- **`updateUserProfile(user, profileData)`**
  - Updates user display name and email
  - Collections: Firebase Auth + `users/{uid}`

- **`signOut()`**
  - Signs out current user

- **`onAuthStateChanged(callback)`**
  - Observes authentication state changes

---

## 📦 Product Endpoints

### Fetch Products
- **`fetchAllProducts(options?)`**
  - Fetches paginated products
  - Collection: `products`
  - Query: `where('isActive', '==', true)`
  - Optional filters: `categoryFilter`, `limit`, `lastVisible`
  - Returns: `{ products, lastVisible, hasMore }`

- **`fetchProductDetails(id: string)`**
  - Fetches single product by ID
  - Collection: `products/{id}`
  - Returns: `Product | null`

- **`fetchProductsByCategory(category: string)`**
  - Fetches products filtered by category
  - Collection: `products`
  - Query: `where('category', 'array-contains', category)`

### Create/Update Products
- **`createProduct(data: CreateProductData, onProgress?)`**
  - Creates new product with image uploads
  - Collections: `products` + Firebase Storage
  - Uploads images to: `products/{filename}`
  - Returns: Product document ID

- **`uploadImageToStorage(imageUri, type, onProgress?)`**
  - Uploads single image to Firebase Storage
  - Path: `{type}s/{filename}`

- **`uploadMultipleImages(imageUris, type, onProgress?)`**
  - Uploads multiple images with progress tracking

### Search Products
- **`searchProducts(searchQuery: string)`**
  - Client-side search (name, description)
  - Collection: `products`
  - Returns: Filtered `Product[]`

---

## ⚡ Service Endpoints

### Fetch Services
- **`fetchAllServices(options?)`**
  - Fetches paginated services
  - Collection: `services`
  - Query: `where('isActive', '==', true)`
  - Optional filters: `categoryFilter`, `limit`, `lastVisible`
  - Returns: `{ services, lastVisible, hasMore }`

- **`fetchServiceDetails(id: string)`**
  - Fetches single service by ID
  - Collection: `services/{id}`
  - Returns: `Service | null`

- **`fetchServicesByCategory(category: string)`**
  - Fetches services filtered by category
  - Collection: `services`
  - Query: `where('category', 'array-contains', category)`

### Create/Update Services
- **`createService(data: CreateProductData, onProgress?)`**
  - Creates new service with image uploads
  - Collections: `services` + Firebase Storage
  - Uploads images to: `services/{filename}`
  - Returns: Service document ID

### Search Services
- **`searchServices(searchQuery: string)`**
  - Client-side search (name, description, location)
  - Collection: `services`
  - Returns: Filtered `Service[]`

---

## ⭐ Rating & Review Endpoints

### Quick Ratings (Emoji System - 1-4 Scale)
- **`submitQuickRating(userId, productId, itemType, rating: 1-4)`**
  - Submits quick emoji rating
  - Collection: `quickRatings`
  - Document ID: `{userId}-{productId}`
  - Updates product/service review counts
  - 24-hour cooldown between updates
  - Returns: `boolean`

- **`fetchUserQuickRating(userId, productId)`**
  - Gets user's current rating for item
  - Collection: `quickRatings/{userId}-{productId}`
  - Returns: `{ hasRated, currentRating, canRateToday, sentiment, lastRated }`

- **`fetchQuickRatingStats(productId, itemType)`**
  - Gets aggregated rating statistics
  - Collection: `{itemType}s/{productId}`
  - Returns: `{ averageRating, totalRatings, ratingDistribution, lastUpdate }`

- **`fetchProductRatings(productId)`**
  - Gets all ratings for a product
  - Collection: `quickRatings`
  - Query: `where('product_id', '==', productId)`

- **`fetchRatingsBySentiment(productId, sentiment)`**
  - Filters ratings by sentiment
  - Collection: `quickRatings`
  - Query: `where('product_id', '==', productId), where('sentiment', '==', sentiment)`

- **`getProductReviewCounts(productId, itemType)`**
  - Gets review count breakdown
  - Collection: `{itemType}s/{productId}`
  - Returns: `{ total_reviews, positive_reviews, neutral_reviews, negative_reviews }`

### Legacy Reviews (Sentiment-Based)
- **`fetchProductReviews(productId)`**
  - Fetches sentiment-based reviews
  - Collection: `reviews`
  - Query: `where('product_id', '==', productId)`
  - Returns: `Review[]`

- **`submitProductReview(productId, userId, sentiment, text?)`**
  - Submits sentiment review
  - Collection: `reviews`
  - Sentiments: "It's bad", "Dont mind it", "Its Good", "Would recommend"
  - Maintains sentiment history

- **`getUserProductReview(productId, userId)`**
  - Gets user's review for product
  - Collection: `reviews`
  - Query: `where('product_id', '==', productId), where('userId', '==', userId)`

- **`calculateWeightedRating(reviews)`**
  - Calculates weighted average from sentiment reviews
  - Weights: "It's bad"=1, "Dont mind it"=2, "Its Good"=3, "Would recommend"=4

- **`calculateSentimentDistribution(reviews)`**
  - Calculates percentage distribution of sentiments

---

## 💬 Comment Endpoints

### Fetch Comments
- **`fetchComments(itemId, itemType, filters?, pageSize?, lastDoc?)`**
  - Fetches paginated comments for product/service
  - Collection: `comments`
  - Query: `where('itemId', '==', itemId), where('itemType', '==', itemType), where('isDeleted', '==', false), where('parentId', '==', null)`
  - Sorting: `newest`, `oldest`, `most_agreed`, `most_disagreed`, `most_replies`
  - Returns: `{ comments, lastDocument, hasMore }`

- **`fetchCommentReplies(parentCommentId, pageSize?, lastDoc?)`**
  - Fetches replies to a comment
  - Collection: `comments`
  - Query: `where('parentId', '==', parentCommentId)`
  - Returns: `{ replies, lastDocument, hasMore }`

### Submit Comments
- **`submitComment(itemId, itemType, userId, userName, text, userAvatar?)`**
  - Creates new root comment
  - Collection: `comments`
  - Max length: 500 characters
  - Returns: `Comment`

- **`submitReply(parentCommentId, userId, userName, text, userAvatar?)`**
  - Creates reply to existing comment
  - Collection: `comments`
  - Max depth: 2 levels
  - Updates parent `replyCount`
  - Returns: `Comment`

### Comment Actions
- **`toggleCommentReaction(commentId, userId, reactionType)`**
  - Toggles agree/disagree reaction
  - Collections: `commentReactions` + `comments`
  - Document ID: `{userId}-{commentId}`
  - Updates `agreeCount` and `disagreeCount`
  - Returns: `{ agreeCount, disagreeCount, userReaction }`

- **`getUserCommentReaction(commentId, userId)`**
  - Gets user's reaction to comment
  - Collection: `commentReactions/{userId}-{commentId}`
  - Returns: `'agree' | 'disagree' | null`

- **`editComment(commentId, userId, newText)`**
  - Edits comment (within 5 minutes)
  - Collection: `comments/{commentId}`
  - Sets `isEdited: true`, `editedAt: timestamp`

- **`deleteComment(commentId, userId)`**
  - Soft deletes comment
  - Collection: `comments/{commentId}`
  - Sets `isDeleted: true`, `text: '[Comment deleted]'`

- **`reportComment(commentId, userId, reason)`**
  - Reports comment for moderation
  - Collections: `comments/{commentId}` + `commentReports`
  - Sets `isReported: true`

- **`getCommentStats(itemId, itemType)`**
  - Gets comment statistics
  - Collection: `comments`
  - Returns: `CommentStats`

---

## 📋 Survey Endpoints

### Survey Management
- **`getSurveyTemplateForItem(itemType)`**
  - Gets survey template (product or service)
  - Returns: `SurveyTemplate`

- **`submitSurveyResponse(productId, itemType, responses, completionTimeSeconds)`**
  - Submits comprehensive survey
  - Collections: `surveyResponses` + `userRatingHistory` + `{itemType}s/{productId}`
  - Validates responses against template
  - 24-hour cooldown per product
  - Updates survey statistics on product/service
  - Returns: `boolean`

- **`getUserSurveyResponse(productId)`**
  - Gets user's existing survey response
  - Collection: `surveyResponses`
  - Query: `where('userId', '==', userId), where('productId', '==', productId), where('isComplete', '==', true)`
  - Returns: `SurveyResponse | null`

- **`canUserTakeSurveyToday(productId)`**
  - Checks if user can take survey (24-hour limit)
  - Collection: `userRatingHistory/{userId}-{productId}`
  - Returns: `boolean`

- **`getUserSurveyStatus(productId)`**
  - Gets user's survey status
  - Returns: `{ hasCompleted, lastSurveyDate, canTakeToday, existingResponse }`

- **`getSurveyAnalytics(productId)`**
  - Gets survey analytics for product/service
  - Collection: `surveyResponses`
  - Returns: `SurveyAnalytics`

---

## ❤️ Favorites Endpoints

- **`addToFavorites(userId, itemId, itemType, itemName, itemImage?)`**
  - Adds item to favorites
  - Collection: `favorites`
  - Document ID: `{userId}_{itemType}_{itemId}`
  - Returns: `boolean`

- **`removeFromFavorites(userId, itemId, itemType)`**
  - Removes item from favorites
  - Collection: `favorites/{userId}_{itemType}_{itemId}`
  - Returns: `boolean`

- **`isInFavorites(userId, itemId, itemType)`**
  - Checks if item is favorited
  - Collection: `favorites`
  - Query: `where('userId', '==', userId), where('itemId', '==', itemId), where('itemType', '==', itemType)`
  - Returns: `boolean`

- **`getUserFavorites(userId)`**
  - Gets all user favorites
  - Collection: `favorites`
  - Query: `where('userId', '==', userId)`
  - Returns: `Favorite[]`

- **`getUserFavoritesByType(userId, itemType)`**
  - Gets favorites filtered by type
  - Collection: `favorites`
  - Query: `where('userId', '==', userId), where('itemType', '==', itemType)`
  - Returns: `Favorite[]`

- **`toggleFavorite(userId, itemId, itemType, itemName, itemImage?)`**
  - Toggles favorite status
  - Returns: `boolean`

- **`getFavoriteCount(itemId, itemType)`**
  - Gets total favorite count for item
  - Collection: `favorites`
  - Query: `where('itemId', '==', itemId), where('itemType', '==', itemType)`
  - Returns: `number`

---

## 📂 Category Endpoints

- **`fetchAllCategories()`**
  - Fetches all categories
  - Collection: `categories`
  - Query: `orderBy('name', 'asc')`
  - Returns: `Category[]`

- **`fetchCategoriesByType(type)`**
  - Fetches categories by type (product/service)
  - Collection: `categories`
  - Query: `where('type', '==', type), orderBy('name', 'asc')`
  - Returns: `Category[]`

- **`fetchCategoryById(categoryId)`**
  - Fetches single category
  - Collection: `categories/{categoryId}`
  - Returns: `Category | null`

- **`fetchProductsByCategory(categoryName)`**
  - Fetches products in category
  - Collection: `products`
  - Query: `where('category', 'array-contains', categoryName), where('isActive', '==', true)`

- **`fetchServicesByCategory(categoryName)`**
  - Fetches services in category
  - Collection: `services`
  - Query: `where('category', 'array-contains', categoryName), where('isActive', '==', true)`

---

## 🔍 Search Endpoints

### Search Functions (Client-Side)
- **`searchProducts(products, query, selectedCategory?)`**
  - Client-side product search
  - Searches: name, description, category, owner
  - Returns: Filtered `Product[]`

- **`searchServices(services, query, selectedCategory?)`**
  - Client-side service search
  - Searches: name, description, category, owner, location
  - Returns: Filtered `Service[]`

### Search History (AsyncStorage)
- **`saveSearchHistory(query, type)`**
  - Saves search to local history
  - Storage: AsyncStorage
  - Max: 10 recent searches

- **`getSearchHistory()`**
  - Gets search history
  - Returns: `SearchHistory[]`

- **`clearSearchHistory()`**
  - Clears all search history

- **`getSearchSuggestions(query, products, services, type?)`**
  - Generates search suggestions
  - Based on history and item names/categories
  - Returns: `string[]` (max 5)

- **`getPopularSearches(type?)`**
  - Gets most frequent searches
  - Returns: `string[]` (top 5)

---

## 🏢 Business Owner Endpoints

- **`fetchAllBusinessOwners()`**
  - Fetches all business owners
  - Collection: `businessOwners`
  - Query: `orderBy('displayName', 'asc')`
  - Returns: `BusinessOwner[]`

- **`fetchBusinessOwners(limitCount?)`**
  - Fetches limited business owners
  - Collection: `businessOwners`
  - Query: `orderBy('displayName', 'asc'), limit(limitCount)`
  - Returns: `BusinessOwner[]`

- **`fetchVerifiedBusinessOwners(limitCount?)`**
  - Fetches verified business owners only
  - Collection: `businessOwners`
  - Query: `where('isVerified', '==', true), orderBy('displayName', 'asc'), limit(limitCount)`
  - Returns: `BusinessOwner[]`

- **`fetchBusinessOwnersByType(businessType, limitCount?)`**
  - Fetches by business type
  - Collection: `businessOwners`
  - Query: `where('businessType', '==', businessType), orderBy('displayName', 'asc'), limit(limitCount)`
  - Returns: `BusinessOwner[]`

---

## 📋 Schema Definitions

### User Schema (`users/{uid}`)
```typescript
{
  uid: string;
  phoneNumber: string | null;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  totalReviews: number;
  totalCoSigns: number;
  totalFiftyFifty: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Product Schema (`products/{id}`)
```typescript
{
  id: string;
  product_name: string;
  category: string[];                    // Array of category names
  description: string;
  price?: number;
  
  // Review counts
  reviews: number;                       // Legacy field
  positive_reviews: number;
  neutral_reviews: number;
  negative_reviews: number;
  total_reviews: number;
  total_views: number;
  comments: string[];                    // Legacy comments array
  
  // Quick rating stats
  quickRating?: {
    average: number;
    total: number;
    distribution: { 1: number, 2: number, 3: number, 4: number };
    lastUpdate: Timestamp;
  };
  
  // Survey rating stats
  surveyRating?: {
    average: number;
    total: number;
    distribution: { 1: number, 2: number, 3: number, 4: number, 5: number };
    averageCompletionTime: number;
    lastUpdate: Timestamp;
  };
  
  // Images
  mainImage?: string;                    // Primary image URL
  additionalImages?: string[];           // Additional image URLs
  imageUrl?: string;                     // Legacy field
  
  // Metadata
  isActive: boolean;
  productOwner: string;                  // User ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Service Schema (`services/{id}`)
```typescript
{
  id: string;
  service_name: string;
  category: string[];                   // Array of category names
  description: string;
  price?: number;
  location?: string;
  
  // Review counts (same as Product)
  positive_reviews: number;
  neutral_reviews: number;
  negative_reviews: number;
  total_reviews: number;
  total_views: number;
  comments: string[];
  
  // Quick rating stats (same as Product)
  quickRating?: {
    average: number;
    total: number;
    distribution: { 1: number, 2: number, 3: number, 4: number };
    lastUpdate: Timestamp;
  };
  
  // Survey rating stats (same as Product)
  surveyRating?: {
    average: number;
    total: number;
    distribution: { 1: number, 2: number, 3: number, 4: number, 5: number };
    averageCompletionTime: number;
    lastUpdate: Timestamp;
  };
  
  // Images
  mainImage?: string;
  additionalImages?: string[];
  imageUrl?: string;
  
  // Metadata
  isActive: boolean;
  service_owner: string;                 // User ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Quick Rating Schema (`quickRatings/{userId}-{productId}`)
```typescript
{
  id: string;                            // Document ID: {userId}-{productId}
  product_id: string;
  userId: string;                        // Phone number without +
  sentiment: string;                     // "It's bad" | "Dont mind it" | "Its Good" | "Would recommend"
  rating: number;                        // 1-4
  timestamp: Timestamp;
  source: 'product' | 'service';
  
  // History tracking
  sentimentHistory: Array<{
    sentiment: string;
    rating: number;
    timestamp: Timestamp;
  }>;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  canUpdateAfter: Timestamp;            // 24-hour cooldown
  isActive: boolean;
}
```

### Survey Response Schema (`surveyResponses/{id}`)
```typescript
{
  id: string;
  productId: string;
  userId: string;                        // Phone number without +
  surveyVersion: string;                 // Template version
  responses: Record<string, any>;        // Question ID -> Answer mapping
  overallRating: number;                 // 1-5 (from first question)
  completionTime: number;                // Seconds
  createdAt: Timestamp;
  isComplete: boolean;
  source: 'product-survey' | 'service-survey';
}
```

### Survey Template Schema (`surveyTemplates/{id}`)
```typescript
{
  id: string;
  name: string;
  version: string;
  itemType: 'product' | 'service';
  questions: Array<{
    id: string;
    type: 'emoji-rating' | 'slider' | 'multiple-choice' | 'text-feedback';
    title: string;
    subtitle?: string;
    required: boolean;
    options?: string[];
    min?: number;
    max?: number;
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Comment Schema (`comments/{id}`)
```typescript
{
  id: string;
  itemId: string;                       // Product or Service ID
  itemType: 'product' | 'service';
  userId: string;                        // Phone number without +
  userName: string;
  userAvatar?: string;
  text: string;                          // Max 500 characters
  parentId?: string;                     // For replies, null for root comments
  depth: number;                         // 0 = root, 1-2 = replies
  agreeCount: number;
  disagreeCount: number;
  replyCount: number;
  isEdited: boolean;
  isReported: boolean;
  isDeleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  editedAt?: Timestamp;
}
```

### Comment Reaction Schema (`commentReactions/{userId}-{commentId}`)
```typescript
{
  id: string;                            // Document ID: {userId}-{commentId}
  commentId: string;
  userId: string;
  reactionType: 'agree' | 'disagree';
  createdAt: Timestamp;
}
```

### Favorite Schema (`favorites/{userId}_{itemType}_{itemId}`)
```typescript
{
  id: string;                            // Document ID: {userId}_{itemType}_{itemId}
  userId: string;
  itemId: string;                        // Product or Service ID
  itemType: 'product' | 'service';
  itemName: string;
  itemImage?: string;
  timestamp: Timestamp;
}
```

### Category Schema (`categories/{id}`)
```typescript
{
  id: string;
  name: string;
  description: string;
  type: 'product' | 'service';
  icon?: string;
  isActive?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Business Owner Schema (`businessOwners/{id}`)
```typescript
{
  id: string;
  displayName: string;
  businessName: string;
  email: string;
  phoneNumber: string;
  photoURL?: string;
  bio?: string;
  location?: string;
  businessType: 'product' | 'service' | 'both';
  totalProducts: number;
  totalServices: number;
  totalReviews: number;
  rating: number;
  isVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### User Rating History Schema (`userRatingHistory/{userId}-{productId}`)
```typescript
{
  id: string;                            // Document ID: {userId}-{productId}
  userId: string;
  productId: string;
  
  // Quick rating tracking
  quickRating?: {
    current: number;                     // Current rating (1-4)
    sentimentHistory: Array<{
      sentiment: string;
      rating: number;
      timestamp: Timestamp;
    }>;
    canUpdateAfter: Timestamp;
  };
  
  // Survey rating tracking
  surveyRating?: {
    current: number;                      // Current rating (1-5)
    responses: string[];                  // Array of surveyResponse IDs
    lastSurveyId: string;
    canUpdateAfter: Timestamp;
  };
  
  firstRatedAt: Timestamp;
  lastUpdatedAt: Timestamp;
}
```

### Legacy Review Schema (`reviews/{id}`)
```typescript
{
  id: string;
  product_id: string;
  userId: string;                        // Phone number without +
  sentiment: string;                      // "It's bad" | "Dont mind it" | "Its Good" | "Would recommend"
  text?: string;
  timestamp: Timestamp;
  sentimentHistory: Array<{
    sentiment: string;
    timestamp: Timestamp;
  }>;
}
```

---

## 🔄 Rating System Overview

### Quick Ratings (1-4 Emoji Scale)
- **1**: 😞 "It's bad" (Negative)
- **2**: 😕 "Dont mind it" (Neutral)
- **3**: 😃 "Its Good" (Positive)
- **4**: 😄 "Would recommend" (Positive)

**Cooldown**: 24 hours between updates

### Survey Ratings (1-5 Scale)
- Comprehensive multi-question surveys
- Overall rating calculated from first question
- **Cooldown**: 24 hours per product/service

### Legacy Reviews (Sentiment-Based)
- Text-based reviews with sentiment labels
- Maintains sentiment change history
- Weighted rating calculation

---

## 📝 Notes

1. **Authentication**: Uses React Native Firebase Modular SDK
2. **Pagination**: Most list endpoints support pagination with `lastVisible` cursor
3. **Image Uploads**: Images uploaded to Firebase Storage with progress tracking
4. **Offline Support**: Redux Persist for offline-first architecture
5. **Search**: Currently client-side filtering (consider Algolia for production scale)
6. **Comments**: Threaded comments with max depth of 2 levels
7. **Ratings**: Dual system - quick ratings (1-4) and comprehensive surveys (1-5)
8. **User IDs**: Phone numbers stored without `+` prefix in most collections

---

## 🔗 Related Files

- **Services**: `src/services/*.ts`
- **Types**: `src/types/product.ts`, `src/types/user.ts`
- **Firebase Config**: `src/services/firebase.ts`
- **Redux Slices**: `src/store/slices/*.ts`

