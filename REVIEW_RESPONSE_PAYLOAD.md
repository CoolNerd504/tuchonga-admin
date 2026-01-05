# Review Response Payload Documentation

## Overview

After successfully creating or updating a review, the API now returns:
1. **Updated Review Counts** - Total reviews and breakdown by sentiment
2. **Review Category** - Whether the review is positive, neutral, or negative

## Create Review Response

**Endpoint:** `POST /api/reviews`

**Success Response (201):**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "review": {
      "id": "review-id",
      "userId": "user-id",
      "productId": "product-id",
      "serviceId": null,
      "sentiment": "WOULD_RECOMMEND",
      "text": "Great product!",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z",
      "user": {
        "id": "user-id",
        "fullName": "John Doe",
        "displayName": "John",
        "profileImage": "https://..."
      }
    },
    "stats": {
      "totalReviews": 150,
      "positiveReviews": 90,
      "neutralReviews": 30,
      "negativeReviews": 30
    },
    "reviewCategory": "positive"
  }
}
```

## Update Review Response

**Endpoint:** `PUT /api/reviews/:id`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Review updated successfully",
  "data": {
    "review": {
      "id": "review-id",
      "userId": "user-id",
      "productId": "product-id",
      "sentiment": "ITS_BAD",
      "text": "Updated review text",
      "updatedAt": "2024-01-01T13:00:00.000Z",
      "user": {
        "id": "user-id",
        "fullName": "John Doe",
        "displayName": "John"
      }
    },
    "stats": {
      "totalReviews": 150,
      "positiveReviews": 89,
      "neutralReviews": 30,
      "negativeReviews": 31
    },
    "reviewCategory": "negative"
  }
}
```

## Review Category Mapping

The `reviewCategory` field indicates the sentiment category:

| Sentiment Enum | Review Category |
|----------------|-----------------|
| `WOULD_RECOMMEND` | `positive` |
| `ITS_GOOD` | `positive` |
| `DONT_MIND_IT` | `neutral` |
| `ITS_BAD` | `negative` |

## Stats Object

The `stats` object contains updated review counts for the product or service:

```typescript
interface ReviewStats {
  totalReviews: number;      // Total number of reviews
  positiveReviews: number;   // Count of positive reviews (WOULD_RECOMMEND + ITS_GOOD)
  neutralReviews: number;    // Count of neutral reviews (DONT_MIND_IT)
  negativeReviews: number;   // Count of negative reviews (ITS_BAD)
}
```

## Mobile Implementation Example

```typescript
const createReview = async (
  productId: string,
  sentiment: 'WOULD_RECOMMEND' | 'ITS_GOOD' | 'DONT_MIND_IT' | 'ITS_BAD',
  text?: string
) => {
  const token = await SecureStore.getItemAsync('authToken');
  
  const response = await fetch(`${API_BASE_URL}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      productId,
      sentiment,
      text,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create review');
  }
  
  // Access the updated stats and review category
  const { review, stats, reviewCategory } = data.data;
  
  console.log(`Review created: ${reviewCategory}`);
  console.log(`Total reviews: ${stats.totalReviews}`);
  console.log(`Positive: ${stats.positiveReviews}, Neutral: ${stats.neutralReviews}, Negative: ${stats.negativeReviews}`);
  
  return data.data;
};
```

## Usage in UI

```typescript
const handleReviewSubmit = async (sentiment: string, text: string) => {
  try {
    const result = await createReview(productId, sentiment, text);
    
    // Update UI with new stats
    setReviewStats(result.stats);
    
    // Show success message based on category
    const categoryMessages = {
      positive: 'Thank you for your positive review!',
      neutral: 'Thank you for your feedback!',
      negative: 'We appreciate your honest feedback and will work to improve.',
    };
    
    Toast.show({
      type: 'success',
      text1: 'Review Submitted',
      text2: categoryMessages[result.reviewCategory],
    });
    
    // Update review count display
    updateProductStats(result.stats);
    
  } catch (error) {
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: error.message,
    });
  }
};
```

## Important Notes

1. **Stats are Updated Automatically**: The stats are recalculated and returned after each review creation/update.

2. **Review Category**: The `reviewCategory` field is always included in the response, making it easy to determine the sentiment without checking the enum value.

3. **Stats Object**: The `stats` object is always included in create responses. For update responses, it's only included if the sentiment was updated.

4. **Real-time Counts**: The counts reflect the current state after the review operation, including any changes from previous reviews.

---

**Last Updated:** 2024-12-29

