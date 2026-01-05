# Sentiment Breakdown Guide - Mobile Implementation

## Overview

This guide explains how to utilize the sentiment breakdown feature in the product and service details endpoints to display individual review votes in a bar graph on the mobile app.

## Endpoints

### Products
**GET** `/api/products/:id`

### Services
**GET** `/api/services/:id`

### Query Parameters (Same for both Products and Services)

- `includeReviews` (optional, default: `false`): Set to `'true'` to receive all reviews in the response
- `includeComments` (optional, default: `true`): Include comments in response
- `commentsLimit` (optional, default: `20`): Limit for comments pagination
- `commentsPage` (optional, default: `1`): Page number for comments

**Note:** Both endpoints return the same response structure and sentiment breakdown format.

## Response Structure

### Sentiment Breakdown Data

The endpoint returns sentiment breakdown in multiple places for easy access:

#### 1. Root Level Fields

```json
{
  "success": true,
  "data": {
    "sentimentBreakdown": {
      "Would recommend": 5,
      "Its Good": 3,
      "Dont mind it": 2,
      "It's bad": 1
    },
    "positive_reviews": 8,    // Would recommend + Its Good
    "neutral_reviews": 2,     // Dont mind it
    "negative_reviews": 1,    // It's bad
    "total_reviews": 11
  }
}
```

#### 2. Review Stats Object

```json
{
  "success": true,
  "data": {
    "reviewStats": {
      "totalReviews": 11,
      "totalSentimentReviews": 11,
      "positiveReviews": 8,
      "neutralReviews": 2,
      "negativeReviews": 1,
      "sentimentDistribution": {
        "Would recommend": 5,
        "Its Good": 3,
        "Dont mind it": 2,
        "It's bad": 1
      },
      "sentimentBreakdown": {
        "Would recommend": 5,
        "Its Good": 3,
        "Dont mind it": 2,
        "It's bad": 1
      }
    }
  }
}
```

#### 3. Reviews Array

```json
{
  "success": true,
  "data": {
    "reviews": {
      "items": [
        {
          "id": "review-1",
          "sentiment": "WOULD_RECOMMEND",
          "text": "Great product!",
          "createdAt": "2025-01-01T00:00:00Z",
          "user": {
            "id": "user-1",
            "fullName": "John Doe",
            "displayName": "John",
            "profileImage": "https://..."
          }
        },
        // ... more reviews
      ],
      "total": 11,
      "hasMore": false,
      "allReviews": [...]  // Only if includeReviews=true
    }
  }
}
```

## Data Priority System

The endpoint calculates sentiment breakdown using the following priority:

1. **Priority 1**: Calculate from actual `reviews` array (individual votes) ✅ **Primary Source**
2. **Priority 2**: Fallback to `reviewStats.distribution` if reviews array is empty
3. **Priority 3**: Fallback to `quickRatingStats.distribution` (not currently used)

## Sentiment Categorization

### Individual Sentiments

- **"Would recommend"**: Reviews with `sentiment: "WOULD_RECOMMEND"`
- **"Its Good"**: Reviews with `sentiment: "ITS_GOOD"`
- **"Dont mind it"**: Reviews with `sentiment: "DONT_MIND_IT"`
- **"It's bad"**: Reviews with `sentiment: "ITS_BAD"`

### Aggregated Sentiments

- **Positive**: Sum of "Would recommend" + "Its Good"
- **Neutral**: "Dont mind it"
- **Negative**: "It's bad"

## Mobile Implementation

### Step 1: Fetch Product Details

```typescript
// React Native / TypeScript Example
import { apiGet } from './api';

interface SentimentBreakdown {
  "Would recommend": number;
  "Its Good": number;
  "Dont mind it": number;
  "It's bad": number;
}

interface ProductDetails {
  id: string;
  productName: string;
  sentimentBreakdown: SentimentBreakdown;
  reviewStats: {
    totalReviews: number;
    positiveReviews: number;
    neutralReviews: number;
    negativeReviews: number;
    sentimentBreakdown: SentimentBreakdown;
  };
  reviews: {
    items: Array<{
      id: string;
      sentiment: string;
      text?: string;
      createdAt: string;
      user: {
        id: string;
        fullName: string;
        displayName: string;
        profileImage?: string;
      };
    }>;
    total: number;
    hasMore: boolean;
  };
}

interface ServiceDetails {
  id: string;
  serviceName: string;
  sentimentBreakdown: SentimentBreakdown;
  reviewStats: {
    totalReviews: number;
    positiveReviews: number;
    neutralReviews: number;
    negativeReviews: number;
    sentimentBreakdown: SentimentBreakdown;
  };
  reviews: {
    items: Array<{
      id: string;
      sentiment: string;
      text?: string;
      createdAt: string;
      user: {
        id: string;
        fullName: string;
        displayName: string;
        profileImage?: string;
      };
    }>;
    total: number;
    hasMore: boolean;
  };
}

async function fetchProductDetails(productId: string, includeAllReviews = false) {
  try {
    const response = await apiGet<{ success: boolean; data: ProductDetails }>(
      `/api/products/${productId}?includeReviews=${includeAllReviews}`
    );
    
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to fetch product details');
  } catch (error) {
    console.error('Error fetching product details:', error);
    throw error;
  }
}

async function fetchServiceDetails(serviceId: string, includeAllReviews = false) {
  try {
    const response = await apiGet<{ success: boolean; data: ServiceDetails }>(
      `/api/services/${serviceId}?includeReviews=${includeAllReviews}`
    );
    
    if (response.success) {
      return response.data;
    }
    throw new Error('Failed to fetch service details');
  } catch (error) {
    console.error('Error fetching service details:', error);
    throw error;
  }
}

// Generic function that works for both products and services
async function fetchItemDetails(
  itemId: string, 
  itemType: 'product' | 'service', 
  includeAllReviews = false
) {
  const endpoint = itemType === 'product' ? 'products' : 'services';
  try {
    const response = await apiGet<{ success: boolean; data: ProductDetails | ServiceDetails }>(
      `/api/${endpoint}/${itemId}?includeReviews=${includeAllReviews}`
    );
    
    if (response.success) {
      return response.data;
    }
    throw new Error(`Failed to fetch ${itemType} details`);
  } catch (error) {
    console.error(`Error fetching ${itemType} details:`, error);
    throw error;
  }
}
```

### Step 2: Extract Sentiment Breakdown

```typescript
function getSentimentBreakdown(
  item: ProductDetails | ServiceDetails
): SentimentBreakdown {
  // Priority 1: Use sentimentBreakdown from reviewStats (calculated from reviews array)
  if (item.reviewStats?.sentimentBreakdown) {
    return item.reviewStats.sentimentBreakdown;
  }
  
  // Priority 2: Use root level sentimentBreakdown
  if (item.sentimentBreakdown) {
    return item.sentimentBreakdown;
  }
  
  // Priority 3: Fallback to sentimentDistribution
  if (item.reviewStats?.sentimentDistribution) {
    return item.reviewStats.sentimentDistribution;
  }
  
  // Default empty breakdown
  return {
    "Would recommend": 0,
    "Its Good": 0,
    "Dont mind it": 0,
    "It's bad": 0,
  };
}
```

### Step 3: Calculate Aggregated Sentiments

```typescript
interface AggregatedSentiments {
  positive: number;
  neutral: number;
  negative: number;
}

function calculateAggregatedSentiments(breakdown: SentimentBreakdown): AggregatedSentiments {
  return {
    positive: breakdown["Would recommend"] + breakdown["Its Good"],
    neutral: breakdown["Dont mind it"],
    negative: breakdown["It's bad"],
  };
}
```

### Step 4: Display Bar Graph

#### React Native Example with react-native-chart-kit

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

interface SentimentBarGraphProps {
  sentimentBreakdown: SentimentBreakdown;
  totalReviews: number;
}

export function SentimentBarGraph({ 
  sentimentBreakdown, 
  totalReviews 
}: SentimentBarGraphProps) {
  const screenWidth = Dimensions.get('window').width;
  
  // Prepare data for bar chart
  const chartData = {
    labels: ['Would\nRecommend', 'Its Good', "Don't\nMind It", "It's Bad"],
    datasets: [
      {
        data: [
          sentimentBreakdown["Would recommend"],
          sentimentBreakdown["Its Good"],
          sentimentBreakdown["Dont mind it"],
          sentimentBreakdown["It's bad"],
        ],
      },
    ],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
    },
    barPercentage: 0.7,
  };

  // Color mapping for each sentiment
  const getBarColor = (index: number) => {
    const colors = ['#4CAF50', '#8BC34A', '#FFC107', '#F44336'];
    return colors[index] || '#9E9E9E';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Review Sentiment Breakdown</Text>
      <Text style={styles.subtitle}>{totalReviews} Total Reviews</Text>
      
      <BarChart
        data={chartData}
        width={screenWidth - 40}
        height={220}
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={{
          ...chartConfig,
          barColors: [
            getBarColor(0), // Would recommend - Green
            getBarColor(1), // Its Good - Light Green
            getBarColor(2), // Dont mind it - Yellow
            getBarColor(3), // It's bad - Red
          ],
        }}
        style={styles.chart}
        showValuesOnTopOfBars
        fromZero
      />
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>
            Would Recommend ({sentimentBreakdown["Would recommend"]})
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#8BC34A' }]} />
          <Text style={styles.legendText}>
            Its Good ({sentimentBreakdown["Its Good"]})
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#FFC107' }]} />
          <Text style={styles.legendText}>
            Dont Mind It ({sentimentBreakdown["Dont mind it"]})
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
          <Text style={styles.legendText}>
            It's Bad ({sentimentBreakdown["It's bad"]})
          </Text>
        </View>
      </View>
      
      {/* Aggregated Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: '#4CAF50' }]}>Positive</Text>
          <Text style={styles.summaryValue}>
            {sentimentBreakdown["Would recommend"] + sentimentBreakdown["Its Good"]}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: '#FFC107' }]}>Neutral</Text>
          <Text style={styles.summaryValue}>
            {sentimentBreakdown["Dont mind it"]}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: '#F44336' }]}>Negative</Text>
          <Text style={styles.summaryValue}>
            {sentimentBreakdown["It's bad"]}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legend: {
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#333',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
});
```

### Step 5: Complete Component Example

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { SentimentBarGraph } from './SentimentBarGraph';

// Generic component that works for both products and services
interface ItemDetailsScreenProps {
  itemId: string;
  itemType: 'product' | 'service';
}

export function ItemDetailsScreen({ itemId, itemType }: ItemDetailsScreenProps) {
  const [item, setItem] = useState<ProductDetails | ServiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadItemDetails();
  }, [itemId, itemType]);

  async function loadItemDetails() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchItemDetails(itemId, itemType, false);
      setItem(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${itemType}`);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || `${itemType} not found`}</Text>
      </View>
    );
  }

  const sentimentBreakdown = getSentimentBreakdown(item);
  const aggregated = calculateAggregatedSentiments(sentimentBreakdown);
  const itemName = 'productName' in item ? item.productName : item.serviceName;

  return (
    <ScrollView style={styles.container}>
      {/* Item Header */}
      <View style={styles.header}>
        <Text style={styles.itemName}>{itemName}</Text>
        <Text style={styles.reviewCount}>
          {item.reviewStats.totalReviews} Reviews
        </Text>
      </View>

      {/* Sentiment Bar Graph */}
      <SentimentBarGraph
        sentimentBreakdown={sentimentBreakdown}
        totalReviews={product.reviewStats.totalReviews}
      />

      {/* Aggregated Sentiment Summary */}
      <View style={styles.aggregatedContainer}>
        <Text style={styles.aggregatedTitle}>Overall Sentiment</Text>
        <View style={styles.aggregatedRow}>
          <View style={[styles.aggregatedBox, { backgroundColor: '#E8F5E9' }]}>
            <Text style={[styles.aggregatedNumber, { color: '#4CAF50' }]}>
              {aggregated.positive}
            </Text>
            <Text style={styles.aggregatedLabel}>Positive</Text>
          </View>
          <View style={[styles.aggregatedBox, { backgroundColor: '#FFF9C4' }]}>
            <Text style={[styles.aggregatedNumber, { color: '#FFC107' }]}>
              {aggregated.neutral}
            </Text>
            <Text style={styles.aggregatedLabel}>Neutral</Text>
          </View>
          <View style={[styles.aggregatedBox, { backgroundColor: '#FFEBEE' }]}>
            <Text style={[styles.aggregatedNumber, { color: '#F44336' }]}>
              {aggregated.negative}
            </Text>
            <Text style={styles.aggregatedLabel}>Negative</Text>
          </View>
        </View>
      </View>

      {/* Individual Reviews List */}
      {item.reviews.items.length > 0 && (
        <View style={styles.reviewsContainer}>
          <Text style={styles.reviewsTitle}>Recent Reviews</Text>
          {item.reviews.items.map((review) => (
            <View key={review.id} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewUser}>{review.user.displayName}</Text>
                <Text style={styles.reviewSentiment}>
                  {getSentimentLabel(review.sentiment)}
                </Text>
              </View>
              {review.text && (
                <Text style={styles.reviewText}>{review.text}</Text>
              )}
              <Text style={styles.reviewDate}>
                {new Date(review.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function getSentimentLabel(sentiment: string): string {
  const labels: Record<string, string> = {
    WOULD_RECOMMEND: 'Would Recommend',
    ITS_GOOD: 'Its Good',
    DONT_MIND_IT: "Don't Mind It",
    ITS_BAD: "It's Bad",
  };
  return labels[sentiment] || sentiment;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  itemName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: '#666',
  },
  aggregatedContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aggregatedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  aggregatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  aggregatedBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  aggregatedNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  aggregatedLabel: {
    fontSize: 12,
    color: '#666',
  },
  reviewsContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  reviewItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reviewSentiment: {
    fontSize: 12,
    color: '#666',
  },
  reviewText: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
});
```

## API Usage Examples

### Basic Request

```typescript
// Get product details with default settings
const product = await fetchProductDetails('product-id-123');

// Get service details with default settings
const service = await fetchServiceDetails('service-id-123');

// Generic function for both
const item = await fetchItemDetails('item-id-123', 'product'); // or 'service'
```

### Request with All Reviews

```typescript
// Get product details with all reviews included
const product = await fetchProductDetails('product-id-123', true);

// Get service details with all reviews included
const service = await fetchServiceDetails('service-id-123', true);

// Generic function
const item = await fetchItemDetails('item-id-123', 'service', true);
```

### Direct API Call

```typescript
// Product API Call
const productResponse = await fetch(
  'https://api.example.com/api/products/product-id-123?includeReviews=true',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }
);
const productData = await productResponse.json();
const productSentimentBreakdown = productData.data.sentimentBreakdown;

// Service API Call
const serviceResponse = await fetch(
  'https://api.example.com/api/services/service-id-123?includeReviews=true',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }
);
const serviceData = await serviceResponse.json();
const serviceSentimentBreakdown = serviceData.data.sentimentBreakdown;
```

## Data Flow

```
1. Mobile App requests product/service details
   ↓
2. API fetches all reviews (up to 1000)
   ↓
3. API calculates sentiment breakdown from reviews array
   ↓
4. API returns:
   - sentimentBreakdown (individual counts)
   - reviewStats (aggregated counts)
   - reviews.items (first 10 for display)
   ↓
5. Mobile App displays:
   - Bar graph with individual sentiment counts
   - Aggregated positive/neutral/negative summary
   - List of individual reviews
```

**Note:** The same flow applies to both products and services endpoints.

## Key Points

1. **Always Use Reviews Array**: The sentiment breakdown is calculated from the actual reviews array, ensuring accuracy.

2. **Individual vs Aggregated**: 
   - Individual: Shows each sentiment type separately (4 bars)
   - Aggregated: Groups into Positive/Neutral/Negative (3 categories)

3. **Real-time Accuracy**: Since breakdown is calculated from reviews array, it reflects the current state of all reviews.

4. **Performance**: The API fetches up to 1000 reviews for calculation but only returns first 10 for display by default. Use `includeReviews=true` to get all reviews if needed.

5. **Fallback System**: If reviews array is empty, the system falls back to `reviewStats.distribution` for backward compatibility.

## Color Recommendations

- **"Would recommend"**: Green (#4CAF50)
- **"Its Good"**: Light Green (#8BC34A)
- **"Dont mind it"**: Yellow/Amber (#FFC107)
- **"It's bad"**: Red (#F44336)

## Testing

### Test Cases

1. **Product/Service with 3 reviews**:
   - Should show exact counts for each sentiment
   - Bar graph should reflect individual votes

2. **Product/Service with no reviews**:
   - Should show all zeros
   - Should handle gracefully without errors

3. **Product/Service with mixed sentiments**:
   - Should correctly categorize each review
   - Aggregated counts should sum correctly

4. **Product/Service with many reviews**:
   - Should calculate breakdown from all reviews
   - Should display first 10 in list

5. **Both Products and Services**:
   - Should work identically for both item types
   - Same response structure and calculation logic

## Troubleshooting

### Issue: Sentiment breakdown shows zeros

**Solution**: Check if `includeReviews` parameter is being sent. The breakdown is calculated from reviews, so if reviews aren't fetched, it may fall back to distribution.

### Issue: Counts don't match reviews array

**Solution**: Ensure you're using `sentimentBreakdown` from `reviewStats` object, which is calculated from the reviews array.

### Issue: Bar graph not displaying

**Solution**: 
1. Verify chart library is installed (`react-native-chart-kit` or similar)
2. Check that data array has valid numbers
3. Ensure chart width fits screen dimensions

## Additional Resources

- See `PRODUCT_DETAILS_ENDPOINT.md` for complete product endpoint documentation
- See `MOBILE_IMPLEMENTATION_GUIDE.md` for general mobile API usage
- See `REVIEW_RESPONSE_PAYLOAD.md` for review submission details

## Summary

Both **Products** (`/api/products/:id`) and **Services** (`/api/services/:id`) endpoints now support:

✅ Sentiment breakdown calculated from actual reviews array  
✅ Individual vote counting for bar graph display  
✅ Aggregated sentiment counts (Positive/Neutral/Negative)  
✅ Same response structure and data format  
✅ Complete review and comment integration  

The implementation is identical for both item types, making it easy to create reusable components that work for both products and services.

