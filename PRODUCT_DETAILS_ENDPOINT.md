# Product Details Endpoint - Comprehensive Guide

## Overview

The consolidated product details endpoint (`GET /api/products/:id`) returns all data needed for the mobile app product detail screen in a single request, including ratings, reviews, comments, and user-specific data.

## Endpoint

**`GET /api/products/:id``**

**Authentication:** Optional (JWT token - if provided, includes user-specific data)

**Query Parameters:**
- `includeComments` (boolean) - Include comments with nested replies (default: `true`)
- `includeReviews` (boolean) - Include review items (default: `false`)
- `commentsLimit` (number) - Number of comments per page (default: `20`)
- `commentsPage` (number) - Comments page number (default: `1`)

**Headers (Optional):**
```
Authorization: Bearer <jwt_token>
```

## Complete Response Structure

```json
{
  "success": true,
  "data": {
    // ============================================================================
    // Basic Product Information
    // ============================================================================
    "id": "product-id",
    "product_name": "Product Name",
    "productName": "Product Name",
    "description": "Product description",
    "mainImage": "https://...",
    "additionalImages": ["https://..."],
    "price": null,
    "category": ["Category 1", "Category 2"],
    "productOwner": "Business Name",
    "business": {
      "id": "business-id",
      "name": "Business Name",
      // ... business details
    },
    "isActive": true,
    "isVerified": true,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z",

    // ============================================================================
    // Quick Rating Stats
    // ============================================================================
    "quickRatingStats": {
      "totalRatings": 150,
      "averageRating": 3.8,
      "ratingDistribution": {
        "1": 10,
        "2": 20,
        "3": 30,
        "4": 50,
        "5": 40
      }
    },
    "averageRating": 3.8,
    "totalRatings": 150,

    // ============================================================================
    // User's Quick Rating Status
    // ============================================================================
    "userRating": {
      "hasRated": true,
      "rating": 4,
      "canUpdate": false,
      "hoursUntilUpdate": 12,
      "lastUpdated": "2024-01-01T12:00:00.000Z",
      "sentiment": "Would recommend"
    },

    // ============================================================================
    // Review Stats (Sentiment Distribution)
    // ============================================================================
    "reviewStats": {
      "totalReviews": 100,
      "totalSentimentReviews": 100,
      "positiveReviews": 60,
      "neutralReviews": 20,
      "negativeReviews": 20,
      "sentimentDistribution": {
        "Would recommend": 40,
        "Its Good": 20,
        "Dont mind it": 20,
        "It's bad": 20
      }
    },
    "sentimentDistribution": {
      "Would recommend": 40,
      "Its Good": 20,
      "Dont mind it": 20,
      "It's bad": 20
    },
    "totalSentimentReviews": 100,
    "positive_reviews": 60,
    "neutral_reviews": 20,
    "negative_reviews": 20,
    "total_reviews": 100,

    // ============================================================================
    // User's Review Status
    // ============================================================================
    "userReview": {
      "hasReviewed": true,
      "review": {
        "id": "review-id",
        "sentiment": "WOULD_RECOMMEND",
        "text": "Great product!",
        "createdAt": "2024-01-01T12:00:00.000Z"
      }
    },

    // ============================================================================
    // Favorite Status
    // ============================================================================
    "isFavorite": true,

    // ============================================================================
    // Comments (if includeComments=true)
    // ============================================================================
    "comments": {
      "items": [
        {
          "id": "comment-id",
          "text": "This is a great product!",
          "userId": "user-id",
          "userName": "John Doe",
          "userAvatar": "https://...",
          "agreeCount": 15,
          "disagreeCount": 2,
          "replyCount": 5,
          "createdAt": "2024-01-01T12:00:00.000Z",
          "user": {
            "id": "user-id",
            "fullName": "John Doe",
            "displayName": "John",
            "profileImage": "https://..."
          },
          "userReaction": {
            "hasReacted": true,
            "reactionType": "AGREE"
          },
          "replies": [
            {
              "id": "reply-id",
              "text": "I agree!",
              "parentId": "comment-id",
              "depth": 1,
              "userReaction": {
                "hasReacted": false,
                "reactionType": null
              },
              "replies": [
                {
                  "id": "nested-reply-id",
                  "text": "Me too!",
                  "parentId": "reply-id",
                  "depth": 2,
                  "userReaction": {
                    "hasReacted": true,
                    "reactionType": "AGREE"
                  }
                }
              ]
            }
          ]
        }
      ],
      "total": 50,
      "page": 1,
      "limit": 20,
      "totalPages": 3,
      "hasMore": true
    },
    "commentStats": {
      "totalComments": 50,
      "totalReplies": 25,
      "averageRepliesPerComment": 0.5
    },

    // ============================================================================
    // Reviews (if includeReviews=true)
    // ============================================================================
    "reviews": {
      "items": [
        {
          "id": "review-id",
          "sentiment": "WOULD_RECOMMEND",
          "text": "Great product!",
          "user": {
            "id": "user-id",
            "fullName": "John Doe",
            "displayName": "John"
          },
          "createdAt": "2024-01-01T12:00:00.000Z"
        }
      ],
      "total": 100,
      "hasMore": true
    }
  }
}
```

## Field Mapping for Mobile App

### Product Basic Info
- `product_name` / `productName` → Product name
- `description` → Product description
- `mainImage` → Main product image
- `additionalImages` → Array of additional images
- `category` → Array of category names
- `productOwner` → Business/seller name
- `isVerified` → Verification status

### Rating Data
- `quickRatingStats.averageRating` → Average rating (1-5)
- `quickRatingStats.totalRatings` → Total number of ratings
- `quickRatingStats.ratingDistribution` → Distribution by rating (1-5)
- `userRating.rating` → User's rating (1-5) or null
- `userRating.hasRated` → Whether user has rated
- `userRating.canUpdate` → Whether user can update (24hr check)
- `userRating.sentiment` → User's sentiment string ("Would recommend", etc.)

### Review Data
- `sentimentDistribution` → Counts by sentiment:
  - `"Would recommend"` → Positive (rating 4)
  - `"Its Good"` → Positive (rating 3)
  - `"Dont mind it"` → Neutral (rating 2)
  - `"It's bad"` → Negative (rating 1)
- `totalSentimentReviews` → Total review count
- `positive_reviews` → Positive count
- `neutral_reviews` → Neutral count
- `negative_reviews` → Negative count
- `userReview.hasReviewed` → Whether user has reviewed
- `userReview.review` → User's review object or null

### Comment Data
- `comments.items` → Array of comments with nested replies
- `comments.total` → Total comment count
- `comments.hasMore` → Whether more comments available
- `commentStats.totalComments` → Total comments
- `commentStats.totalReplies` → Total replies
- `commentStats.averageRepliesPerComment` → Average replies per comment
- Each comment includes `userReaction` with `hasReacted` and `reactionType`

### Favorite Status
- `isFavorite` → Whether product is in user's favorites

## Usage Examples

### Basic Request (No Auth)
```typescript
const fetchProductDetails = async (productId: string) => {
  const response = await fetch(`${API_BASE_URL}/products/${productId}?includeComments=true`);
  const data = await response.json();
  return data.data;
};
```

### Authenticated Request (With User Data)
```typescript
const fetchProductDetails = async (productId: string) => {
  const token = await SecureStore.getItemAsync('authToken');
  
  const response = await fetch(
    `${API_BASE_URL}/products/${productId}?includeComments=true&includeReviews=false`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  const data = await response.json();
  return data.data;
};
```

### Using the Response in React Native

```typescript
const ProductDetailScreen = () => {
  const [product, setProduct] = useState(null);
  
  useEffect(() => {
    loadProduct();
  }, []);
  
  const loadProduct = async () => {
    const data = await fetchProductDetails(productId);
    setProduct(data);
  };
  
  // Access data
  const averageRating = product?.quickRatingStats?.averageRating || 0;
  const totalRatings = product?.quickRatingStats?.totalRatings || 0;
  const userRating = product?.userRating?.rating;
  const sentimentDist = product?.sentimentDistribution;
  const comments = product?.comments?.items || [];
  const isFavorite = product?.isFavorite || false;
  
  return (
    <View>
      <Text>{product?.productName}</Text>
      <Text>Rating: {averageRating} ({totalRatings} ratings)</Text>
      {userRating && <Text>Your rating: {userRating}/5</Text>}
      {/* ... rest of UI */}
    </View>
  );
};
```

## Response Fields Summary

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Product ID |
| `productName` | string | Product name |
| `description` | string | Product description |
| `mainImage` | string | Main image URL |
| `additionalImages` | string[] | Additional image URLs |
| `category` | string[] | Category names |
| `productOwner` | string | Business/seller name |
| `isVerified` | boolean | Verification status |
| `quickRatingStats` | object | Quick rating statistics |
| `userRating` | object | User's rating status |
| `sentimentDistribution` | object | Review sentiment counts |
| `reviewStats` | object | Review statistics |
| `userReview` | object | User's review status |
| `isFavorite` | boolean | Favorite status |
| `comments` | object | Comments with nested replies |
| `commentStats` | object | Comment statistics |
| `reviews` | object | Review items (if requested) |

## Performance Notes

1. **Single Request**: All data fetched in one API call, reducing network overhead
2. **Conditional Loading**: Comments and reviews are optional via query parameters
3. **Batch Queries**: User reactions fetched in batches for efficiency
4. **Nested Replies**: Comments include nested replies up to 2 levels deep

## Error Responses

### 404 Not Found
```json
{
  "success": false,
  "error": "Product not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to load product details"
}
```

---

**Last Updated:** 2024-12-29

