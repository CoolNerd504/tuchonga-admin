# User Profile Object Structure

This document defines the complete user profile structure stored in Firebase Firestore `users` collection.

## Profile Object Schema

```typescript
interface UserProfile {
  // Basic Authentication Info
  uid: string;                    // Firebase Auth UID (document ID)
  email: string | null;           // User email
  phoneNumber: string | null;     // User phone number
  
  // Profile Information
  fullName: string | null;        // User's full legal name
  displayName: string | null;     // User's display name (username/handle)
  profileImage: string | null;    // URL to profile image/avatar
  
  // Profile Completion Status
  hasCompletedProfile: boolean;   // Whether user has completed profile setup
  profileCompletedAt: Date | null; // Timestamp when profile was completed
  
  // Analytics - Reviews
  analytics: {
    reviews: {
      totalReviews: number;                    // Total number of reviews submitted
      productReviews: number;                  // Number of product reviews
      serviceReviews: number;                  // Number of service reviews
      reviewHistory: string[];                // Array of review IDs
      lastReviewAt: Date | null;              // Timestamp of last review
      sentimentBreakdown: {                   // Breakdown by sentiment
        positive: number;                      // "Would recommend" + "Its Good"
        neutral: number;                       // "Don't mind it"
        negative: number;                      // "It's bad"
      };
    };
    
    // Analytics - Comments
    comments: {
      totalComments: number;                   // Total number of comments submitted
      productComments: number;                 // Number of comments on products
      serviceComments: number;                 // Number of comments on services
      commentHistory: string[];                // Array of comment IDs
      lastCommentAt: Date | null;              // Timestamp of last comment
      totalReplies: number;                    // Total replies to user's comments
      totalAgrees: number;                     // Total agrees on user's comments
      totalDisagrees: number;                  // Total disagrees on user's comments
    };
    
    // Legacy Analytics (for backward compatibility)
    totalReviews: number;                      // Legacy: total reviews
    totalCoSigns: number;                      // Legacy: total co-signs
    totalFiftyFifty: number;                   // Legacy: total 50/50 votes
  };
  
  // Timestamps
  createdAt: Date;                            // Account creation timestamp
  updatedAt: Date;                            // Last update timestamp
}
```

## Example Profile Object

```json
{
  "uid": "abc123xyz789",
  "email": "user@example.com",
  "phoneNumber": "+260976820291",
  "fullName": "John Doe",
  "displayName": "johndoe",
  "profileImage": "https://firebasestorage.googleapis.com/.../profile.jpg",
  "hasCompletedProfile": true,
  "profileCompletedAt": "2025-01-15T10:30:00Z",
  "analytics": {
    "reviews": {
      "totalReviews": 15,
      "productReviews": 10,
      "serviceReviews": 5,
      "reviewHistory": ["review1", "review2", "review3"],
      "lastReviewAt": "2025-01-20T14:22:00Z",
      "sentimentBreakdown": {
        "positive": 12,
        "neutral": 2,
        "negative": 1
      }
    },
    "comments": {
      "totalComments": 8,
      "productComments": 5,
      "serviceComments": 3,
      "commentHistory": ["comment1", "comment2", "comment3"],
      "lastCommentAt": "2025-01-19T09:15:00Z",
      "totalReplies": 3,
      "totalAgrees": 12,
      "totalDisagrees": 2
    },
    "totalReviews": 15,
    "totalCoSigns": 0,
    "totalFiftyFifty": 0
  },
  "createdAt": "2025-01-10T08:00:00Z",
  "updatedAt": "2025-01-20T14:22:00Z"
}
```

## Profile Creation Flow

1. **After Firebase Authentication** (Email/Phone):
   - User document is created with minimal data (uid, email/phoneNumber)
   - `hasCompletedProfile: false`
   - Analytics initialized to 0

2. **Profile Completion Screen**:
   - User provides: fullName, displayName, phoneNumber (if not from auth), profileImage
   - `hasCompletedProfile` set to `true`
   - `profileCompletedAt` timestamp set

3. **Analytics Updates**:
   - When user submits a review → update `analytics.reviews`
   - When user submits a comment → update `analytics.comments`
   - Updates happen automatically via service functions

## Analytics Tracking

### Review Analytics
- Tracked when: `submitProductReview()` or `submitServiceReview()` is called
- Updates: `totalReviews`, `productReviews`/`serviceReviews`, `reviewHistory`, `sentimentBreakdown`

### Comment Analytics
- Tracked when: `submitComment()` or `submitReply()` is called
- Updates: `totalComments`, `productComments`/`serviceComments`, `commentHistory`, reaction counts

