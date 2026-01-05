# Favorites Tracking Endpoint - Sentiment Trends

## Overview

The favorites tracking endpoint (`GET /api/favorites/tracking`) returns all products and services a user has marked as favorites, along with sentiment tracking data that shows whether sentiment is improving, declining, or stable over time.

## Endpoint

**`GET /api/favorites/tracking`**

**Authentication:** Required (JWT token)

**Query Parameters:**
- `itemType` (string, optional) - Filter by `PRODUCT` or `SERVICE`
- `page` (number, optional) - Page number (default: `1`)
- `limit` (number, optional) - Items per page (default: `100`)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

## Response Structure

```json
{
  "success": true,
  "data": [
    {
      "id": "favorite-id",
      "itemId": "product-or-service-id",
      "itemType": "PRODUCT",
      "favoritedAt": "2024-01-01T12:00:00.000Z",
      "daysSinceFavorited": 30,
      "item": {
        "id": "product-id",
        "productName": "Product Name",
        "description": "Product description",
        "mainImage": "https://...",
        "productOwner": "Business Name",
        "quickRatingAvg": 3.8,
        "quickRatingTotal": 150,
        "totalReviews": 100,
        "positiveReviews": 60,
        "neutralReviews": 20,
        "negativeReviews": 20,
        "categories": [
          {
            "category": {
              "id": "category-id",
              "name": "Category Name"
            }
          }
        ],
        "name": "Product Name"
      },
      "sentiment": {
        "current": {
          "score": 75,
          "positive": 60,
          "neutral": 20,
          "negative": 20,
          "total": 100,
          "averageRating": 3.8,
          "totalRatings": 150
        },
        "recent": {
          "score": 80,
          "total": 25
        },
        "older": {
          "score": 70,
          "total": 75
        },
        "trend": "improving",
        "trendDifference": 10
      }
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 100,
    "totalPages": 1
  }
}
```

## Sentiment Score Calculation

The sentiment score is calculated on a 0-100 scale where:
- **100** = All positive reviews
- **50** = All neutral reviews
- **0** = All negative reviews

**Formula:**
```
Score = ((positive * 2 + neutral) / (total * 2)) * 100
```

This gives positive reviews double weight compared to neutral reviews.

For quick ratings (1-5 scale), the score is calculated as:
```
Score = ((averageRating - 1) / 4) * 100
```

## Trend Calculation

The trend is determined by comparing sentiment scores from:
- **Recent reviews**: Reviews from the last 30 days
- **Older reviews**: Reviews older than 30 days

**Trend Logic:**
- **Improving**: Recent score > Older score by 5+ points
- **Declining**: Recent score < Older score by 5+ points
- **Stable**: Difference is less than 5 points

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Favorite record ID |
| `itemId` | string | Product or Service ID |
| `itemType` | string | `PRODUCT` or `SERVICE` |
| `favoritedAt` | datetime | When the item was favorited |
| `daysSinceFavorited` | number | Days since favorited |
| `item` | object | Product or service details |
| `sentiment.current` | object | Current sentiment statistics |
| `sentiment.current.score` | number | Current sentiment score (0-100) |
| `sentiment.current.positive` | number | Positive review count |
| `sentiment.current.neutral` | number | Neutral review count |
| `sentiment.current.negative` | number | Negative review count |
| `sentiment.current.total` | number | Total review count |
| `sentiment.current.averageRating` | number | Average quick rating (1-5) |
| `sentiment.current.totalRatings` | number | Total quick rating count |
| `sentiment.recent` | object | Recent reviews (last 30 days) |
| `sentiment.recent.score` | number | Recent sentiment score |
| `sentiment.recent.total` | number | Recent review count |
| `sentiment.older` | object | Older reviews (>30 days) |
| `sentiment.older.score` | number | Older sentiment score |
| `sentiment.older.total` | number | Older review count |
| `sentiment.trend` | string | `improving`, `declining`, or `stable` |
| `sentiment.trendDifference` | number | Absolute difference between recent and older scores |

## Usage Examples

### Basic Request

```typescript
const fetchFavoritesTracking = async () => {
  const token = await SecureStore.getItemAsync('authToken');
  
  const response = await fetch(`${API_BASE_URL}/favorites/tracking`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const data = await response.json();
  return data.data;
};
```

### Filter by Item Type

```typescript
const fetchProductFavoritesTracking = async () => {
  const token = await SecureStore.getItemAsync('authToken');
  
  const response = await fetch(
    `${API_BASE_URL}/favorites/tracking?itemType=PRODUCT`,
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

### React Native Implementation

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TrackingTab = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const data = await fetchFavoritesTracking();
      setFavorites(data);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <Ionicons name="trending-up" size={20} color="#4CAF50" />;
      case 'declining':
        return <Ionicons name="trending-down" size={20} color="#FF6B6B" />;
      default:
        return <Ionicons name="remove" size={20} color="#666" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '#4CAF50';
      case 'declining':
        return '#FF6B6B';
      default:
        return '#666';
    }
  };

  const renderFavorite = ({ item }: { item: any }) => {
    const { sentiment, item: favoriteItem } = item;
    
    return (
      <View style={styles.favoriteCard}>
        <View style={styles.header}>
          <Text style={styles.itemName}>{favoriteItem.name}</Text>
          {getTrendIcon(sentiment.trend)}
        </View>
        
        <View style={styles.sentimentRow}>
          <View style={styles.sentimentItem}>
            <Text style={styles.sentimentLabel}>Current Score</Text>
            <Text style={styles.sentimentValue}>
              {sentiment.current.score}%
            </Text>
          </View>
          
          <View style={styles.sentimentItem}>
            <Text style={styles.sentimentLabel}>Trend</Text>
            <Text style={[styles.trendText, { color: getTrendColor(sentiment.trend) }]}>
              {sentiment.trend.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <Text style={styles.statText}>
            {sentiment.current.positive} positive
          </Text>
          <Text style={styles.statText}>
            {sentiment.current.neutral} neutral
          </Text>
          <Text style={styles.statText}>
            {sentiment.current.negative} negative
          </Text>
        </View>
        
        <View style={styles.trendDetails}>
          <Text style={styles.trendDetailText}>
            Recent (30d): {sentiment.recent.score}% ({sentiment.recent.total} reviews)
          </Text>
          <Text style={styles.trendDetailText}>
            Older: {sentiment.older.score}% ({sentiment.older.total} reviews)
          </Text>
        </View>
        
        <Text style={styles.daysText}>
          Favorited {item.daysSinceFavorited} days ago
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading favorites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        renderItem={renderFavorite}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No favorites yet</Text>
            <Text style={styles.emptySubtext}>
              Add products or services to your favorites to track their sentiment over time
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  sentimentRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  sentimentItem: {
    alignItems: 'center',
  },
  sentimentLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  sentimentValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF8C42',
  },
  trendText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  trendDetails: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  trendDetailText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  daysText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default TrackingTab;
```

## Sorting Options

You can sort the results on the client side:

```typescript
// Sort by trend (improving first)
const sortedByTrend = favorites.sort((a, b) => {
  const trendOrder = { improving: 0, stable: 1, declining: 2 };
  return trendOrder[a.sentiment.trend] - trendOrder[b.sentiment.trend];
});

// Sort by sentiment score (highest first)
const sortedByScore = favorites.sort(
  (a, b) => b.sentiment.current.score - a.sentiment.current.score
);

// Sort by days since favorited (newest first)
const sortedByDate = favorites.sort(
  (a, b) => b.daysSinceFavorited - a.daysSinceFavorited
);
```

## Performance Notes

1. **Batch Processing**: The endpoint processes all favorites in parallel for efficiency
2. **Caching**: Consider caching results on the client side for better performance
3. **Pagination**: Use pagination for users with many favorites
4. **30-Day Window**: The trend calculation uses a 30-day window for recent vs older reviews

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to load favorites tracking"
}
```

---

**Last Updated:** 2024-12-29

