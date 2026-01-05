# Mobile UI Data Mapping - Reviews & Ratings Screen

## Overview

This document maps the API response data to the mobile UI components shown in the reviews and ratings screen.

## API Endpoint

**GET** `/api/products/:id` or `/api/services/:id`

## UI Component Mapping

### 1. User's Rating Section (Top)

**UI Elements:**
- Heading: "What's your take?"
- Previous rating text: "You last said 'Dont mind it'"
- Rating buttons: "It's bad", "Don't mind it", "It's good", "Would recommend"
- Countdown banner: "You can update your rating in: 16h 17m 43s"

**API Response Fields:**

```json
{
  "userRating": {
    "hasRated": true,
    "rating": 2,  // 1=It's bad, 2=Don't mind it, 3=It's good, 4=Would recommend
    "sentiment": "Dont mind it",  // ✅ For "You last said..." text
    "canUpdate": false,  // ✅ Controls if buttons are enabled
    "hoursUntilUpdate": 16.295,  // ✅ Raw hours
    "countdownTimer": "16h 17m 43s",  // ✅ Formatted countdown string
    "lastUpdated": "2025-01-05T00:00:00Z"
  }
}
```

**Usage:**
```typescript
// Display previous rating
const previousRatingText = `You last said '${data.userRating.sentiment}'`;

// Display countdown timer
const countdownText = data.userRating.countdownTimer; // "16h 17m 43s"

// Enable/disable rating buttons
const buttonsEnabled = data.userRating.canUpdate;
```

---

### 2. Reviews Summary Table (Middle)

**UI Elements:**
- Total reviews: "3 Reviews"
- Breakdown table with progress bars:
  - "Would recommend": 0% (0)
  - "Its Good": 0% (0)
  - "Dont mind it": 0% (0)
  - "It's bad": 0% (0)

**API Response Fields:**

```json
{
  "total_reviews": 3,  // ✅ For "3 Reviews" heading
  "reviewStats": {
    "totalReviews": 3,
    "sentimentBreakdown": {
      "Would recommend": 0,  // ✅ Count for progress bar
      "Its Good": 0,  // ✅ Count for progress bar
      "Dont mind it": 0,  // ✅ Count for progress bar
      "It's bad": 0  // ✅ Count for progress bar
    },
    "sentimentPercentages": {
      "Would recommend": 0,  // ✅ Percentage for progress bar (0-100)
      "Its Good": 0,  // ✅ Percentage for progress bar
      "Dont mind it": 0,  // ✅ Percentage for progress bar
      "It's bad": 0  // ✅ Percentage for progress bar
    }
  }
}
```

**Usage:**
```typescript
// Display total reviews
const totalReviews = data.total_reviews; // 3

// Display breakdown table
const breakdown = data.reviewStats.sentimentBreakdown;
const percentages = data.reviewStats.sentimentPercentages;

// Example: "Would recommend" row
const wouldRecommendCount = breakdown["Would recommend"]; // 0
const wouldRecommendPercent = percentages["Would recommend"]; // 0

// Progress bar width = wouldRecommendPercent%
```

---

### 3. Aggregated Sentiment Summary (Bottom)

**UI Elements:**
- Three large buttons:
  - "0 Positive" (green)
  - "0 Neutral" (yellow)
  - "0 Negative" (red)

**API Response Fields:**

```json
{
  "positive_reviews": 0,  // ✅ Sum of "Would recommend" + "Its Good"
  "neutral_reviews": 0,  // ✅ "Dont mind it" count
  "negative_reviews": 0,  // ✅ "It's bad" count
  "reviewStats": {
    "positiveReviews": 0,  // ✅ Alternative field
    "neutralReviews": 0,  // ✅ Alternative field
    "negativeReviews": 0  // ✅ Alternative field
  }
}
```

**Usage:**
```typescript
// Display aggregated counts
const positiveCount = data.positive_reviews; // 0
const neutralCount = data.neutral_reviews; // 0
const negativeCount = data.negative_reviews; // 0

// Display in buttons
// "0 Positive", "0 Neutral", "0 Negative"
```

---

## Complete API Response Structure

```json
{
  "success": true,
  "data": {
    // Basic Info
    "id": "product-id",
    "productName": "Product Name",
    "total_reviews": 3,
    
    // User Rating (Top Section)
    "userRating": {
      "hasRated": true,
      "rating": 2,
      "sentiment": "Dont mind it",
      "canUpdate": false,
      "hoursUntilUpdate": 16.295,
      "countdownTimer": "16h 17m 43s",
      "lastUpdated": "2025-01-05T00:00:00Z"
    },
    
    // Review Stats (Middle Section)
    "reviewStats": {
      "totalReviews": 3,
      "sentimentBreakdown": {
        "Would recommend": 0,
        "Its Good": 0,
        "Dont mind it": 0,
        "It's bad": 0
      },
      "sentimentPercentages": {
        "Would recommend": 0,
        "Its Good": 0,
        "Dont mind it": 0,
        "It's bad": 0
      }
    },
    
    // Aggregated Sentiment (Bottom Section)
    "positive_reviews": 0,
    "neutral_reviews": 0,
    "negative_reviews": 0,
    
    // Alternative fields (same data)
    "sentimentBreakdown": {
      "Would recommend": 0,
      "Its Good": 0,
      "Dont mind it": 0,
      "It's bad": 0
    },
    "sentimentPercentages": {
      "Would recommend": 0,
      "Its Good": 0,
      "Dont mind it": 0,
      "It's bad": 0
    }
  }
}
```

---

## React Native Implementation Example

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ReviewsScreenProps {
  productData: any; // From API response
}

export function ReviewsScreen({ productData }: ReviewsScreenProps) {
  const { userRating, reviewStats, total_reviews, positive_reviews, neutral_reviews, negative_reviews } = productData;

  return (
    <View style={styles.container}>
      {/* Top Section - User's Rating */}
      <View style={styles.userRatingSection}>
        <Text style={styles.heading}>What's your take?</Text>
        {userRating.hasRated && (
          <Text style={styles.previousRating}>
            You last said '{userRating.sentiment}'
          </Text>
        )}
        
        {/* Rating Buttons */}
        <View style={styles.ratingButtons}>
          {/* It's bad, Don't mind it, It's good, Would recommend */}
        </View>
        
        {!userRating.canUpdate && (
          <View style={styles.countdownBanner}>
            <Text>You can update your rating in:</Text>
            <Text style={styles.countdownText}>
              {userRating.countdownTimer}
            </Text>
          </View>
        )}
      </View>

      {/* Middle Section - Reviews Breakdown */}
      <View style={styles.reviewsSection}>
        <Text style={styles.reviewsHeading}>
          {total_reviews} Reviews
        </Text>
        
        {Object.entries(reviewStats.sentimentBreakdown).map(([sentiment, count]) => (
          <View key={sentiment} style={styles.breakdownRow}>
            <Text style={styles.sentimentLabel}>{sentiment}</Text>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar,
                  { width: `${reviewStats.sentimentPercentages[sentiment]}%` }
                ]} 
              />
            </View>
            <Text style={styles.percentageText}>
              {reviewStats.sentimentPercentages[sentiment]}% ({count})
            </Text>
          </View>
        ))}
      </View>

      {/* Bottom Section - Aggregated Sentiment */}
      <View style={styles.aggregatedSection}>
        <View style={[styles.sentimentButton, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.sentimentNumber}>{positive_reviews}</Text>
          <Text style={styles.sentimentLabel}>Positive</Text>
        </View>
        <View style={[styles.sentimentButton, { backgroundColor: '#FFC107' }]}>
          <Text style={styles.sentimentNumber}>{neutral_reviews}</Text>
          <Text style={styles.sentimentLabel}>Neutral</Text>
        </View>
        <View style={[styles.sentimentButton, { backgroundColor: '#F44336' }]}>
          <Text style={styles.sentimentNumber}>{negative_reviews}</Text>
          <Text style={styles.sentimentLabel}>Negative</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  userRatingSection: {
    marginBottom: 24,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 8,
  },
  previousRating: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  countdownBanner: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginTop: 4,
  },
  reviewsSection: {
    marginBottom: 24,
  },
  reviewsHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sentimentLabel: {
    width: 120,
    fontSize: 14,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  percentageText: {
    width: 60,
    fontSize: 12,
    textAlign: 'right',
  },
  aggregatedSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sentimentButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  sentimentNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default ReviewsScreen;
```

---

## Data Availability Checklist

✅ **User's Previous Rating**: `userRating.sentiment`  
✅ **Countdown Timer**: `userRating.countdownTimer` (formatted as "16h 17m 43s")  
✅ **Can Update Status**: `userRating.canUpdate`  
✅ **Total Reviews**: `total_reviews` or `reviewStats.totalReviews`  
✅ **Individual Sentiment Counts**: `reviewStats.sentimentBreakdown`  
✅ **Sentiment Percentages**: `reviewStats.sentimentPercentages` (for progress bars)  
✅ **Aggregated Counts**: `positive_reviews`, `neutral_reviews`, `negative_reviews`  

---

## Notes

1. **Countdown Timer**: The API now provides a pre-formatted string (`countdownTimer`) in "Xh Ym Zs" format, so the mobile app doesn't need to calculate it.

2. **Percentages**: The API calculates percentages automatically, so progress bars can use `sentimentPercentages` directly without calculation.

3. **Both Endpoints**: The same structure is available for both `/api/products/:id` and `/api/services/:id`.

4. **Real-time Data**: All counts are calculated from the actual reviews array, ensuring accuracy.

5. **Fallback Values**: If reviews array is empty, the API falls back to `reviewStats.distribution` for backward compatibility.

