# Firebase Firestore Schema

This document outlines the complete Firebase Firestore database schema based on the codebase.

## Collections Overview

### 1. **products** Collection
**Access**: Public read, Authenticated write

```typescript
interface Product {
  id: string;                    // Document ID
  product_name: string;           // Product name
  category: string[];             // Array of category names
  description: string;            // Product description
  reviews: number;                // Number of reviews
  positive_reviews: number;        // Count of positive reviews
  total_reviews: number;          // Total review count
  total_views: number;            // View count
  comments: string[];              // Array of comment IDs
  isActive: boolean;               // Active status
  mainImage: string;               // Main product image URL
  additionalImages: string[];      // Array of additional image URLs
  productOwner: string;            // Business owner ID (references businesses collection)
  createdAt?: Timestamp | Date;   // Creation timestamp
  updatedAt?: Timestamp | Date;   // Last update timestamp
}
```

### 2. **services** Collection
**Access**: Public read, Authenticated write

```typescript
interface Service {
  id: string;                      // Document ID
  service_name: string;             // Service name
  category: string[];               // Array of category names
  description: string;              // Service description
  reviews: number;                  // Number of reviews
  positive_reviews: number;         // Count of positive reviews
  total_reviews: number;            // Total review count
  total_views: number;              // View count
  mainImage: string;                // Main service image URL
  additionalImages: string[];       // Array of additional image URLs
  comments: string[];               // Array of comment IDs
  isActive: boolean;                // Active status
  service_owner: string;            // Business owner ID (references businesses collection)
  createdAt?: Timestamp | Date;    // Creation timestamp
  updatedAt?: Timestamp | Date;    // Last update timestamp
}
```

### 3. **categories** Collection
**Access**: Public read, Authenticated write

```typescript
interface Category {
  id: string;                      // Document ID
  name: string;                     // Category name
  description: string;             // Category description
  type: 'product' | 'service';     // Category type
}
```

### 4. **businesses** Collection
**Access**: Authenticated read/write only

```typescript
interface Business {
  id: string;                      // Document ID
  business_email: string;          // Business email
  business_phone: string;           // Business phone number
  isVerified: boolean;             // Verification status
  products: string[];               // Array of product IDs
  services: string[];               // Array of service IDs
  location: string;                 // Business location
  logo: string;                     // Logo image URL
  name: string;                     // Business name
  poc_firstname: string;            // Point of contact first name
  poc_lastname: string;             // Point of contact last name
  poc_phone: string;                // Point of contact phone
  status: boolean;                  // Business status (active/inactive)
}
```

### 5. **users** Collection
**Access**: Authenticated read/write only

```typescript
interface Users {
  id: string;                      // Document ID (matches Firebase Auth UID)
  email: string;                   // User email (can be null)
  isActive: boolean;                // Active status
  firstname: string;                // First name (can be null)
  lastname: string;                 // Last name (can be null)
  location: string;                 // User location (can be null)
  mobile: string;                   // Mobile number (can be null)
}
```

### 6. **staff** Collection
**Access**: Authenticated read/write only

```typescript
interface Staff {
  id: string;                      // Document ID
  email: string;                   // Staff email (used for Firebase Auth)
  password?: string;                // Password (only used when creating, not stored)
  isActive: boolean;                // Active status
  firstname: string;                // First name
  lastname: string;                 // Last name
  role: string;                     // Staff role
  mobile: string;                   // Mobile number
}
```

### 7. **comments** Collection
**Access**: Public read, Authenticated write

```typescript
interface ProductOrServiceComment {
  id: string;                      // Document ID
  parentId: string;                // ID of parent (Product or Service)
  parentType: "Product" | "Service"; // Type of parent entity
  userId: string;                   // User ID who posted the comment
  userName: string;                // User name who posted the comment
  text: string;                    // Comment text/content
  timestamp: Date;                  // When comment was posted
  userSentiment:                   // User's sentiment/agreement level
    | "Disagree" | "neutral" | "Agree"        // For products
    | "Disagree" | "FiftyFifty" | "Agree";    // For services
  sentimentHistory?: UserAgreementLevelHistoryEntry[]; // Sentiment change history
}

interface UserAgreementLevelHistoryEntry {
  userSentiment: "Disagree" | "neutral" | "Agree";
  timestamp: Date;                  // When this sentiment was recorded
}
```

### 8. **reviews** Collection
**Access**: Public read, Authenticated write

```typescript
type Sentiment = "It's bad" | "Dont mind it" | "Its Good" | "Would recommend";

interface Review {
  id: string;                      // Document ID
  product_id?: string;             // ID of the product being reviewed (optional)
  service_id?: string;             // ID of the service being reviewed (optional)
  userId: string;                   // ID of the user who wrote the review
  sentiment: Sentiment;             // Review sentiment
  text?: string;                    // Optional short comment
  reviewText?: string;              // Optional longer review text
  timestamp: Timestamp | Date;      // When review was posted
  sentimentHistory?: ReviewSentimentHistoryEntry[]; // Sentiment change history
}

interface ReviewSentimentHistoryEntry {
  sentiment: "It's bad" | "Dont mind it" | "Its Good" | "Would recommend" | string;
  timestamp: Date;                  // When this sentiment was recorded
}
```

### 9. **favorites** Collection
**Access**: Authenticated read/write only

```typescript
// Structure not fully defined in codebase
// Used for user favorites functionality
```

### 10. **userRatingHistory** Collection
**Access**: Authenticated read/write only

```typescript
// Structure not fully defined in codebase
// Used for tracking user rating history
```

### 11. **quickRatings** Collection
**Access**: Authenticated read/write only

```typescript
// Structure not fully defined in codebase
// Used for quick rating functionality
```

## Relationships

- **Products** → `productOwner` references `businesses.id`
- **Services** → `service_owner` references `businesses.id`
- **Products/Services** → `category` array references `categories.name`
- **Comments** → `parentId` references `products.id` or `services.id`
- **Comments** → `userId` references `users.id`
- **Businesses** → `products` array references `products.id`
- **Businesses** → `services` array references `services.id`

## Security Rules Summary

- **Public Read**: `products`, `services`, `categories`, `reviews`, `comments`
- **Authenticated Write**: All collections require authentication for writes
- **Authenticated Only**: `users`, `businesses`, `staff`, `favorites`, `userRatingHistory`, `quickRatings` require authentication for both read and write

## Notes

- All timestamps are stored as Firestore Timestamps or JavaScript Date objects
- Image URLs are stored as strings (likely Firebase Storage URLs)
- Arrays are used for multi-value fields (categories, images, comments)
- Some fields may be nullable (especially in `users` collection)

