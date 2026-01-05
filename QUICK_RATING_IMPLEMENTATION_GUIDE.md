# Quick Rating Implementation Guide

## Overview

The Quick Rating system allows users to rate products and services using a 1-5 emoji scale. Users can update their ratings after a 24-hour cooldown period, and each update counts as a new vote in community tallies.

## Key Features

1. **24-Hour Cooldown**: Users can only update their rating once every 24 hours
2. **New Vote Tracking**: Updates after 24 hours are counted as new votes in community tallies
3. **Individual Interactions**: Track each user's rating history
4. **Community Tallies**: Aggregate ratings for products/services

## API Endpoint

### Submit/Update Quick Rating

**Endpoint:** `POST /api/quick-ratings`

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "itemId": "product-or-service-id",
  "itemType": "product",  // or "service" (case-insensitive)
  "rating": 4  // 1-5
}
```

**Success Response (201 for new, 200 for update):**
```json
{
  "success": true,
  "message": "Rating submitted successfully",
  "data": {
    "id": "rating-id",
    "userId": "user-id",
    "itemId": "product-or-service-id",
    "itemType": "PRODUCT",
    "rating": 4,
    "isNewRating": true,
    "isUpdate": false,
    "canUpdateIn": 24,
    "nextUpdateTime": "2024-01-02T12:00:00.000Z",
    "lastUpdated": "2024-01-01T12:00:00.000Z",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**Error Responses:**

1. **Rate Limit Exceeded (429):**
```json
{
  "success": false,
  "error": "You can only update your rating once every 24 hours. Time remaining: 12 hours (720 minutes)",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 86400
}
```

2. **Validation Error (400):**
```json
{
  "success": false,
  "error": "Invalid request data. Please check itemType (must be \"product\" or \"service\") and rating (must be 1-5)",
  "code": "VALIDATION_ERROR"
}
```

## Implementation Scenarios

### Scenario 1: First-Time Rating

**User Action:** User rates a product for the first time

**Flow:**
1. User submits rating (e.g., rating: 4)
2. System creates new `QuickRating` record
3. `isNewRating: true`, `isUpdate: false`
4. Community tallies updated immediately
5. `lastUpdated` set to current time
6. User can update after 24 hours

**Response:**
- Status: `201 Created`
- `isNewRating: true`
- `canUpdateIn: 24` hours

### Scenario 2: Update Within 24 Hours (Blocked)

**User Action:** User tries to update rating within 24 hours

**Flow:**
1. User submits new rating
2. System finds existing rating
3. Calculates time since `lastUpdated`
4. If < 24 hours: Returns error with time remaining
5. Rating not updated

**Response:**
- Status: `429 Too Many Requests`
- Error message includes hours/minutes remaining
- `retryAfter: 86400` (24 hours in seconds)

### Scenario 3: Update After 24 Hours (Allowed)

**User Action:** User updates rating after 24-hour cooldown

**Flow:**
1. User submits new rating (e.g., changes from 4 to 5)
2. System finds existing rating
3. Calculates time since `lastUpdated`
4. If >= 24 hours: Updates rating
5. `isNewRating: false`, `isUpdate: true`
6. `lastUpdated` updated to current time
7. Community tallies recalculated (new vote counted)
8. User can update again after another 24 hours

**Response:**
- Status: `200 OK`
- `isNewRating: false`
- `isUpdate: true`
- Message: "Rating updated successfully. Your new vote has been counted in community tallies."

### Scenario 4: Multiple Users Rating Same Item

**User Action:** Multiple users rate the same product/service

**Flow:**
1. Each user creates their own rating record
2. Each rating tracked individually by `userId` + `itemId`
3. Community tallies aggregate all ratings
4. Each user has independent 24-hour cooldown

**Community Tally Calculation:**
- Total ratings count
- Average rating
- Distribution (1-5 star counts)

## Data Structure

### QuickRating Model

```typescript
{
  id: string;
  userId: string;           // User who rated
  itemId: string;           // Product or Service ID
  itemType: 'PRODUCT' | 'SERVICE';  // Enum (uppercase)
  productId: string | null; // Set if itemType is PRODUCT
  serviceId: string | null; // Set if itemType is SERVICE
  rating: number;            // 1-5
  lastUpdated: DateTime;     // Last time user updated (for 24hr check)
  createdAt: DateTime;       // When rating was first created
  updatedAt: DateTime;       // Last modification time
}
```

### Unique Constraint

- `@@unique([userId, itemId])` - One rating per user per item
- This ensures users can only have one rating per product/service
- Updates replace the existing rating after 24 hours

## Individual Interactions

### Get User's Rating for Item

**Endpoint:** `GET /api/quick-ratings/user/:itemId`

**Response:**
```json
{
  "success": true,
  "data": {
    "hasRated": true,
    "rating": {
      "id": "rating-id",
      "userId": "user-id",
      "itemId": "product-id",
      "itemType": "PRODUCT",
      "rating": 4,
      "canUpdate": false,
      "hoursUntilUpdate": 12,
      "lastUpdated": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

### Get All User's Ratings

**Endpoint:** `GET /api/quick-ratings/user/me/all?itemType=product&page=1&limit=20`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "rating-id",
      "itemId": "product-id",
      "itemType": "PRODUCT",
      "rating": 4,
      "product": {
        "id": "product-id",
        "productName": "Product Name",
        "mainImage": "https://..."
      },
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

## Community Tallies

### Get Product Rating Stats

**Endpoint:** `GET /api/quick-ratings/product/:productId`

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "average": 4.2,
    "distribution": {
      "1": 5,
      "2": 10,
      "3": 20,
      "4": 60,
      "5": 55
    }
  }
}
```

### Get Service Rating Stats

**Endpoint:** `GET /api/quick-ratings/service/:serviceId`

**Response:** Same structure as product stats

## Mobile Implementation

### TypeScript Interface

```typescript
interface QuickRatingRequest {
  itemId: string;
  itemType: 'product' | 'service';  // Lowercase, will be converted
  rating: number;  // 1-5
}

interface QuickRatingResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    userId: string;
    itemId: string;
    itemType: 'PRODUCT' | 'SERVICE';
    rating: number;
    isNewRating: boolean;
    isUpdate: boolean;
    canUpdateIn: number;  // Hours
    nextUpdateTime: string;  // ISO date
    lastUpdated: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

### Example Implementation

```typescript
const submitQuickRating = async (
  itemId: string,
  itemType: 'product' | 'service',
  rating: number
): Promise<QuickRatingResponse> => {
  const token = await SecureStore.getItemAsync('authToken');
  
  const response = await fetch(`${API_BASE_URL}/quick-ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      itemId,
      itemType,  // Will be converted to uppercase enum
      rating,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    if (response.status === 429) {
      // Rate limit exceeded
      throw new Error(data.error);
    }
    throw new Error(data.error || 'Failed to submit rating');
  }
  
  return data;
};
```

### Handling Rate Limit

```typescript
try {
  const result = await submitQuickRating(productId, 'product', 4);
  
  if (result.data.isUpdate) {
    Toast.show({
      type: 'success',
      text1: 'Rating Updated',
      text2: 'Your new vote has been counted!',
    });
  } else {
    Toast.show({
      type: 'success',
      text1: 'Rating Submitted',
      text2: 'Thank you for your feedback!',
    });
  }
} catch (error) {
  if (error.message.includes('Time remaining')) {
    // Extract time remaining from error message
    Toast.show({
      type: 'info',
      text1: 'Update Not Available',
      text2: error.message,
      visibilityTime: 5000,
    });
  } else {
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: error.message,
    });
  }
}
```

## Important Notes

1. **Enum Conversion**: The API accepts `itemType` as lowercase string ("product" or "service") and converts it to uppercase enum ("PRODUCT" or "SERVICE")

2. **24-Hour Cooldown**: Based on `lastUpdated` field, not `createdAt`. This means:
   - First rating: Can update after 24 hours
   - After update: Can update again after another 24 hours
   - Each update resets the 24-hour timer

3. **New Vote Counting**: When a user updates after 24 hours, the new rating is counted in community tallies. The old rating is replaced.

4. **Individual Tracking**: Each user's rating history is tracked separately. Users can see:
   - Their current rating for each item
   - When they can update again
   - All their past ratings

5. **Community Aggregation**: Community tallies are automatically updated when:
   - New rating is created
   - Rating is updated (after 24 hours)
   - Rating is deleted

6. **Product/Service ID Mapping**: 
   - If `itemType: "PRODUCT"`, `productId` is set to `itemId`, `serviceId` is null
   - If `itemType: "SERVICE"`, `serviceId` is set to `itemId`, `productId` is null

## Testing Scenarios

1. ✅ First-time rating submission
2. ✅ Update within 24 hours (should fail)
3. ✅ Update after 24 hours (should succeed)
4. ✅ Multiple users rating same item
5. ✅ Get user's rating for item
6. ✅ Get all user's ratings
7. ✅ Get community stats
8. ✅ Invalid itemType (should fail)
9. ✅ Invalid rating (should fail - must be 1-5)
10. ✅ Missing required fields (should fail)

## Error Codes

- `RATE_LIMIT_EXCEEDED` (429): User tried to update within 24 hours
- `VALIDATION_ERROR` (400): Invalid request data
- `INTERNAL_ERROR` (500): Server error

