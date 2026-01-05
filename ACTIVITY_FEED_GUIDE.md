# Activity Feed System - Home Page Newsfeed

## Overview

The activity feed system provides a dynamic newsfeed of engaging interactions on products and services, designed to drive user engagement and keep users informed about trending content, sentiment changes, and community activity.

## Endpoint

**`GET /api/activity-feed`**

**Authentication:** Optional (JWT token - no user-specific data yet, but ready for future personalization)

**Query Parameters:**
- `itemType` (string, optional) - Filter by `PRODUCT` or `SERVICE`
- `activityTypes` (string, optional) - Comma-separated list of activity types to include
- `limit` (number, optional) - Items per page (default: `50`)
- `page` (number, optional) - Page number (default: `1`)

## Activity Types

### 1. 🔥 Review Streaks (Positive)
**Type:** `REVIEW_STREAK_POSITIVE`

**Description:** Highlights products/services with consecutive positive reviews (3+ in a row).

**Example:**
```json
{
  "type": "REVIEW_STREAK_POSITIVE",
  "title": "🔥 5 Positive Reviews in a Row!",
  "description": "Product Name is getting consistent positive feedback!",
  "metadata": {
    "streakCount": 5
  }
}
```

**Engagement Driver:** Creates FOMO and social proof - users want to check out items with positive momentum.

---

### 2. ⚠️ Review Streaks (Negative)
**Type:** `REVIEW_STREAK_NEGATIVE`

**Description:** Alerts users to items with consecutive negative reviews (3+ in a row).

**Example:**
```json
{
  "type": "REVIEW_STREAK_NEGATIVE",
  "title": "⚠️ 3 Negative Reviews in a Row",
  "description": "Product Name needs attention - multiple negative reviews",
  "metadata": {
    "streakCount": 3
  }
}
```

**Engagement Driver:** Creates urgency and awareness - users want to see what's wrong or help improve the situation.

---

### 3. 📈 Trending Up
**Type:** `TRENDING_UP`

**Description:** Items with rapidly improving sentiment (15+ point increase in last 7 days vs previous period).

**Example:**
```json
{
  "type": "TRENDING_UP",
  "title": "📈 Sentiment Improving Rapidly!",
  "description": "Product Name is gaining positive momentum!",
  "metadata": {
    "sentimentChange": 25
  }
}
```

**Engagement Driver:** Highlights rising stars - users want to discover products before they become mainstream.

---

### 4. 📉 Trending Down
**Type:** `TRENDING_DOWN`

**Description:** Items with rapidly declining sentiment (15+ point decrease).

**Example:**
```json
{
  "type": "TRENDING_DOWN",
  "title": "📉 Sentiment Declining",
  "description": "Product Name sentiment is dropping",
  "metadata": {
    "sentimentChange": -20
  }
}
```

**Engagement Driver:** Creates awareness and discussion - users want to understand what changed.

---

### 5. ✨ New Products
**Type:** `NEW_PRODUCT`

**Description:** Recently added products (within last 3 days).

**Example:**
```json
{
  "type": "NEW_PRODUCT",
  "title": "✨ New Product Added!",
  "description": "Product Name is now available",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Engagement Driver:** Discovery - users want to be first to review new items.

---

### 6. ✨ New Services
**Type:** `NEW_SERVICE`

**Description:** Recently added services (within last 3 days).

**Example:**
```json
{
  "type": "NEW_SERVICE",
  "title": "✨ New Service Added!",
  "description": "Service Name is now available",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Engagement Driver:** Discovery - users want to explore new offerings.

---

### 7. 🔥 High Engagement
**Type:** `HIGH_ENGAGEMENT`

**Description:** Items with high combined activity (reviews + comments) in last 7 days.

**Example:**
```json
{
  "type": "HIGH_ENGAGEMENT",
  "title": "🔥 High Engagement!",
  "description": "Product Name is getting lots of attention",
  "metadata": {
    "engagementScore": 15,
    "reviewCount": 10,
    "commentCount": 10
  }
}
```

**Engagement Driver:** Social proof - users want to join active discussions.

---

### 8. ⚡ Controversial Items
**Type:** `CONTROVERSIAL`

**Description:** Items with mixed opinions (both significant positive and negative reviews >20% each).

**Example:**
```json
{
  "type": "CONTROVERSIAL",
  "title": "⚡ Mixed Opinions",
  "description": "Product Name has divided opinions",
  "metadata": {
    "positiveRatio": 45,
    "negativeRatio": 35
  }
}
```

**Engagement Driver:** Curiosity and debate - users want to see both sides and form their own opinion.

---

### 9. 🌟 Rising Stars
**Type:** `RISING_STAR`

**Description:** Newer items with improving sentiment (similar to trending up but for newer items).

**Example:**
```json
{
  "type": "RISING_STAR",
  "title": "🌟 Rising Star!",
  "description": "Product Name is gaining traction",
  "metadata": {
    "sentimentChange": 20
  }
}
```

**Engagement Driver:** Early discovery - users want to find hidden gems.

---

### 10. 🎯 Rating Milestones
**Type:** `RATING_MILESTONE`

**Description:** Items that reached significant rating milestones (50, 100, 250, 500, 1000).

**Example:**
```json
{
  "type": "RATING_MILESTONE",
  "title": "🎯 100 Ratings Milestone!",
  "description": "Product Name reached 100 ratings!",
  "metadata": {
    "ratingCount": 100
  }
}
```

**Engagement Driver:** Achievement recognition - users want to contribute to milestones.

---

### 11. 📊 Activity Spikes
**Type:** `ACTIVITY_SPIKE`

**Description:** Items with sudden surge in activity (reviews/comments).

**Example:**
```json
{
  "type": "ACTIVITY_SPIKE",
  "title": "📊 Activity Surge!",
  "description": "Product Name is experiencing high activity",
  "metadata": {
    "engagementScore": 20
  }
}
```

**Engagement Driver:** FOMO - users want to see what's happening right now.

---

### 12. 💬 Most Discussed
**Type:** `MOST_DISCUSSED`

**Description:** Items with high comment activity (10+ comments in last 7 days).

**Example:**
```json
{
  "type": "MOST_DISCUSSED",
  "title": "💬 Hot Discussion!",
  "description": "Product Name is generating lots of discussion",
  "metadata": {
    "commentCount": 25
  }
}
```

**Engagement Driver:** Community engagement - users want to join active conversations.

---

### 13. 🔄 Sentiment Swings
**Type:** `SENTIMENT_SWING`

**Description:** Items with dramatic sentiment changes (extreme improvements or declines).

**Example:**
```json
{
  "type": "SENTIMENT_SWING",
  "title": "🔄 Major Sentiment Change!",
  "description": "Product Name sentiment shifted dramatically",
  "metadata": {
    "sentimentChange": 30
  }
}
```

**Engagement Driver:** Drama and curiosity - users want to understand what caused the change.

---

## Complete Response Structure

```json
{
  "success": true,
  "data": [
    {
      "id": "activity-id",
      "type": "REVIEW_STREAK_POSITIVE",
      "title": "🔥 5 Positive Reviews in a Row!",
      "description": "Product Name is getting consistent positive feedback!",
      "itemId": "product-id",
      "itemType": "PRODUCT",
      "itemName": "Product Name",
      "itemImage": "https://...",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "metadata": {
        "streakCount": 5
      },
      "priority": 100
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

## Priority System

Activities are sorted by:
1. **Priority** (0-100, higher = more important)
2. **Timestamp** (newer first)

Priority calculation examples:
- Review streaks: `streakCount * 10 + (positive ? 50 : 40)`
- Trending items: `Math.abs(sentimentChange) * 2 + 60`
- High engagement: `engagementScore * 5`
- Milestones: `milestone / 10`

## Usage Examples

### Basic Feed

```typescript
const fetchActivityFeed = async () => {
  const response = await fetch(`${API_BASE_URL}/activity-feed?limit=20`);
  const data = await response.json();
  return data.data;
};
```

### Filter by Item Type

```typescript
const fetchProductActivities = async () => {
  const response = await fetch(
    `${API_BASE_URL}/activity-feed?itemType=PRODUCT&limit=30`
  );
  const data = await response.json();
  return data.data;
};
```

### Filter by Activity Types

```typescript
const fetchStreaksOnly = async () => {
  const response = await fetch(
    `${API_BASE_URL}/activity-feed?activityTypes=REVIEW_STREAK_POSITIVE,REVIEW_STREAK_NEGATIVE`
  );
  const data = await response.json();
  return data.data;
};
```

### React Native Implementation

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const ActivityFeedScreen = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const data = await fetchActivityFeed();
      setActivities(data);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      REVIEW_STREAK_POSITIVE: '🔥',
      REVIEW_STREAK_NEGATIVE: '⚠️',
      TRENDING_UP: '📈',
      TRENDING_DOWN: '📉',
      NEW_PRODUCT: '✨',
      NEW_SERVICE: '✨',
      HIGH_ENGAGEMENT: '🔥',
      CONTROVERSIAL: '⚡',
      RISING_STAR: '🌟',
      RATING_MILESTONE: '🎯',
      ACTIVITY_SPIKE: '📊',
      MOST_DISCUSSED: '💬',
      SENTIMENT_SWING: '🔄',
    };
    return icons[type] || '📌';
  };

  const getActivityColor = (type: string) => {
    if (type.includes('POSITIVE') || type.includes('UP') || type === 'RISING_STAR') {
      return '#4CAF50';
    }
    if (type.includes('NEGATIVE') || type.includes('DOWN')) {
      return '#FF6B6B';
    }
    if (type === 'CONTROVERSIAL') {
      return '#FF9800';
    }
    return '#FF8C42';
  };

  const handleActivityPress = (activity: any) => {
    if (activity.itemType === 'PRODUCT') {
      navigation.navigate('ProductDetail', { productId: activity.itemId });
    } else {
      navigation.navigate('ServiceDetail', { serviceId: activity.itemId });
    }
  };

  const renderActivity = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={styles.activityCard}
        onPress={() => handleActivityPress(item)}
      >
        <View style={styles.activityHeader}>
          <Text style={styles.activityIcon}>{getActivityIcon(item.type)}</Text>
          <View style={styles.activityContent}>
            <Text style={[styles.activityTitle, { color: getActivityColor(item.type) }]}>
              {item.title}
            </Text>
            <Text style={styles.activityDescription}>{item.description}</Text>
            <Text style={styles.activityTime}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
          </View>
        </View>
        {item.itemImage && (
          <Image source={{ uri: item.itemImage }} style={styles.itemImage} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadActivities}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Activity Feed</Text>
            <Text style={styles.headerSubtitle}>What's happening in the community</Text>
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
  header: {
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  activityCard: {
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
  activityHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  activityIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  itemImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 8,
  },
});

export default ActivityFeedScreen;
```

## Engagement Strategies

### 1. **Streak Notifications**
- Push notifications when items hit 5+ positive reviews in a row
- Creates urgency and FOMO

### 2. **Trending Alerts**
- Highlight items with rapid sentiment improvement
- "Hot right now" section

### 3. **Controversy Discussions**
- Encourage users to review controversial items
- "Help decide" call-to-action

### 4. **Milestone Celebrations**
- Celebrate when items hit rating milestones
- "Be part of history" messaging

### 5. **Activity Spikes**
- Show what's happening right now
- Real-time activity feed

### 6. **Discovery Focus**
- Highlight new products/services
- "Be the first to review" messaging

## Performance Notes

1. **Caching**: Consider caching activity feed for 5-10 minutes
2. **Pagination**: Use pagination for better performance
3. **Background Updates**: Update feed in background while user scrolls
4. **Priority Sorting**: High-priority items shown first

## Future Enhancements

1. **Personalization**: Filter activities based on user interests
2. **Real-time Updates**: WebSocket support for live activity
3. **Activity Filters**: Allow users to filter by activity type
4. **User Activity**: Include user's own activity in feed
5. **Following**: Follow specific products/services for updates

---

**Last Updated:** 2024-12-29

