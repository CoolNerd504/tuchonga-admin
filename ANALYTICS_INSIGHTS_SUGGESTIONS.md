# Analytics & Insights Suggestions
## Based on Existing Firebase Schema

This document outlines analytics and insights that can be derived from the current data structure **without requiring new collections or data points**.

---

## 📊 **Product & Service Analytics**

### 1. **Performance Metrics**  
- **View-to-Review Ratio**: `total_views / total_reviews` - Engagement quality indicator
- **View-to-Comment Ratio**: `total_views / comments.length` - Community engagement
- **Review-to-Comment Ratio**: `total_reviews / comments.length` - Discussion activity
- **Conversion Rate**: `(total_reviews + comments.length) / total_views` - Overall engagement rate

### 2. **Rating Quality Metrics**
- **Average Quick Rating**: From `quickRating.average` field
- **Rating Distribution**: From `quickRating.distribution` (1-4 scale breakdown)
- **Survey vs Quick Rating Comparison**: Compare `surveyRating.average` vs `quickRating.average`
- **Rating Consistency**: Standard deviation across rating types
- **Rating Trends**: Track `quickRating.lastUpdate` and `surveyRating.lastUpdate` timestamps

### 3. **Category Performance**
- **Top Categories by Views**: Aggregate `total_views` by `category[]`
- **Top Categories by Reviews**: Aggregate `total_reviews` by `category[]`
- **Category Engagement Rate**: `(total_reviews + comments.length) / total_views` per category
- **Category Rating Averages**: Average `quickRating.average` per category
- **Most Active Categories**: Count products/services per category

### 4. **Temporal Analytics**
- **Growth Trends**: Use `createdAt` to show new products/services over time
- **Update Frequency**: Track `updatedAt` vs `createdAt` to identify stale content
- **Seasonal Patterns**: Group by month from `createdAt`/`updatedAt`
- **Recent Activity**: Items updated in last 7/30/90 days

---

## ⭐ **Review & Rating Analytics**

### 5. **Sentiment Analysis**
- **Sentiment Distribution**: Count by sentiment from `reviews.sentiment`
  - "Would recommend" (Positive)
  - "Its Good" (Positive)
  - "Dont mind it" (Neutral)
  - "It's bad" (Negative)
- **Sentiment Trends Over Time**: Group reviews by `timestamp` and sentiment
- **Sentiment Change History**: Analyze `sentimentHistory[]` to track user opinion changes
- **Positive vs Negative Ratio**: `positive_reviews / negative_reviews`
- **Neutral Review Percentage**: `neutral_reviews / total_reviews`

### 6. **Review Quality Metrics**
- **Reviews with Text**: Count reviews where `text` or `reviewText` exists
- **Average Review Length**: Calculate from `text` and `reviewText` fields
- **Review Response Rate**: Reviews that have comments (join with comments collection)
- **Review Recency**: Time since last review (`timestamp`)

### 7. **Rating System Comparison**
- **Quick Rating vs Survey Rating**: Compare `quickRatings.rating` (1-4) vs `surveyResponses.overallRating` (1-5)
- **Rating System Adoption**: Count users using quick ratings vs surveys
- **Rating Update Frequency**: From `userRatingHistory.quickRating.canUpdateAfter` and `updatedAt`
- **Rating History Trends**: Analyze `sentimentHistory[]` in quickRatings and reviews

---

## 💬 **Comment Analytics**

### 8. **Engagement Metrics**
- **Total Comments**: Count from `comments` collection
- **Comments per Product/Service**: Aggregate by `itemId` and `itemType`
- **Average Comments per Item**: `total_comments / total_items`
- **Comment Thread Depth**: Analyze `depth` field (0, 1, 2)
- **Reply Rate**: `comments with depth > 0 / root comments`

### 9. **Comment Quality & Moderation**
- **Agree/Disagree Ratio**: `agreeCount / disagreeCount` per comment
- **Most Agreed Comments**: Sort by `agreeCount`
- **Most Disagreed Comments**: Sort by `disagreeCount`
- **Most Discussed**: Sort by `replyCount`
- **Edited Comments Rate**: `comments where isEdited = true / total_comments`
- **Reported Comments**: Count `isReported = true`
- **Deleted Comments**: Count `isDeleted = true`
- **Moderation Rate**: `(reported + deleted) / total_comments`

### 10. **Comment Activity Trends**
- **Comments Over Time**: Group by `createdAt` timestamp
- **Peak Comment Times**: Analyze `createdAt` by hour/day
- **Comment Velocity**: Comments per day/week/month
- **Active Discussion Periods**: Time between first comment and last reply

---

## 🏢 **Business Owner Analytics**

### 11. **Business Performance**
- **Products per Business**: Count from `businesses.products[]` array
- **Services per Business**: Count from `businesses.services[]` array
- **Total Portfolio Size**: `products.length + services.length`
- **Business Portfolio Value**: Sum of `total_views` for all products/services
- **Business Rating Average**: Average `quickRating.average` across all items
- **Business Review Count**: Sum `total_reviews` across portfolio

### 12. **Business Engagement**
- **Verified vs Unverified**: Compare `isVerified = true` vs `false`
- **Active vs Inactive**: Compare `status = true` vs `false`
- **Business Growth**: Track `products[]` and `services[]` array growth over time
- **Business Location Distribution**: Group by `location` field
- **Top Performing Businesses**: Rank by total views/reviews across portfolio

---

## 👥 **User Analytics**

### 13. **User Activity Metrics**
- **Total Reviews per User**: From `users.totalReviews` field
- **User Engagement Score**: `totalReviews + totalCoSigns + totalFiftyFifty`
- **Most Active Reviewers**: Sort by `totalReviews`
- **User Review Distribution**: How many users have 0, 1-5, 6-10, 10+ reviews
- **User Location Distribution**: Group by `users.location`

### 14. **User Behavior Patterns**
- **Review Frequency**: Time between reviews from `reviews.timestamp`
- **Comment Activity**: Count comments per `userId`
- **Favorite Patterns**: Count favorites per `userId` from `favorites` collection
- **Rating Update Patterns**: From `userRatingHistory` - how often users change ratings
- **Multi-Platform Users**: Users who review both products AND services

---

## 📈 **Trend Analytics**

### 15. **Time-Based Trends**
- **New Items Over Time**: Group `createdAt` by day/week/month
- **Review Activity Trends**: Group `reviews.timestamp` by time period
- **Comment Activity Trends**: Group `comments.createdAt` by time period
- **Rating Trends**: Track rating changes over time from `sentimentHistory[]`
- **Growth Rate**: Month-over-month growth in items, reviews, comments

### 16. **Comparative Analytics**
- **Products vs Services Performance**: Compare average views, reviews, ratings
- **Active vs Inactive Items**: Compare `isActive = true` vs `false` performance
- **Category Comparison**: Compare performance metrics across categories
- **Business Type Performance**: Compare `businessType` (product/service/both)

---

## 🎯 **Engagement Funnels**

### 17. **Engagement Funnel**
- **View → Review**: `total_reviews / total_views`
- **View → Comment**: `comments.length / total_views`
- **Review → Comment**: `comments.length / total_reviews`
- **View → Favorite**: Count favorites / total_views (from favorites collection)

### 18. **User Journey Analytics**
- **First Review Time**: Time from item creation to first review
- **First Comment Time**: Time from item creation to first comment
- **Review to Comment Lag**: Average time between review and related comments
- **Rating Update Patterns**: From `userRatingHistory` - when users update ratings

---

## 📊 **Content Quality Metrics**

### 19. **Content Completeness**
- **Items with Images**: Count items with `mainImage` and `additionalImages.length > 0`
- **Items with Descriptions**: Count items with non-empty `description`
- **Items with Multiple Categories**: Count items with `category.length > 1`
- **Items with Price**: Count items with `price` field

### 20. **Content Freshness**
- **Recently Updated**: Items where `updatedAt` is within last 30 days
- **Stale Content**: Items not updated in 90+ days
- **Update Frequency**: Average time between `createdAt` and `updatedAt`

---

## 🔍 **Search & Discovery Analytics**

### 21. **Category Insights**
- **Most Popular Categories**: Count items per category
- **Category Growth**: New items per category over time
- **Category Performance**: Average views/reviews per category
- **Category Diversity**: Number of unique categories used

### 22. **Content Distribution**
- **Items per Owner**: Distribution of items across business owners
- **Owner Concentration**: Top 10% of owners own X% of items
- **Category Concentration**: Top categories by item count

---

## 💡 **Advanced Insights**

### 23. **Sentiment Correlation**
- **Rating vs Comment Sentiment**: Compare review sentiment with comment agree/disagree
- **Quick Rating vs Review Sentiment**: Compare `quickRatings.sentiment` with `reviews.sentiment`
- **Sentiment Consistency**: How often sentiment matches across rating types

### 24. **User Contribution Analysis**
- **Power Users**: Users with high `totalReviews`, `totalCoSigns`, `totalFiftyFifty`
- **Comment Contributors**: Users with most comments
- **Rating Contributors**: Users with most ratings (from quickRatings and reviews)
- **Multi-Item Reviewers**: Users who reviewed multiple products/services

### 25. **Quality Indicators**
- **High Quality Items**: Items with high views, positive reviews, and active comments
- **Low Engagement Items**: Items with low views despite being active
- **Controversial Items**: Items with high disagree counts or mixed sentiments
- **Trending Items**: Items with recent spike in views/reviews/comments

### 26. **Business Intelligence**
- **Portfolio Health**: Business with balanced product/service mix
- **Business Growth Trajectory**: Track `products[]` and `services[]` array growth
- **Location-Based Performance**: Compare performance by `businesses.location`
- **Verification Impact**: Compare verified vs unverified business performance

### 27. **Survey Analytics** (if surveyResponses data exists)
- **Survey Completion Rate**: `isComplete = true / total surveys`
- **Average Completion Time**: From `completionTime` field
- **Survey vs Quick Rating**: Compare `overallRating` with quick ratings
- **Survey Response Patterns**: Analyze `responses` object structure

### 28. **Favorite Analytics**
- **Most Favorited Items**: Count favorites per `itemId`
- **Favorite Categories**: Aggregate favorites by item category
- **User Favorite Patterns**: Most favorited categories per user
- **Favorite to View Ratio**: `favorite_count / total_views`

---

## 📋 **Implementation Priority Suggestions**

### **High Priority (Easy to Implement, High Value)**
1. ✅ View-to-Review Ratio
2. ✅ Sentiment Distribution (already partially implemented)
3. ✅ Category Performance
4. ✅ Top Performing Items (by views/reviews)
5. ✅ Business Portfolio Metrics
6. ✅ Comment Engagement Metrics

### **Medium Priority (Moderate Complexity, Good Value)**
7. ⚠️ Temporal Trends (growth over time)
8. ⚠️ Rating System Comparison
9. ⚠️ Comment Quality Metrics
10. ⚠️ User Activity Patterns

### **Low Priority (Complex, Nice to Have)**
11. 📌 Sentiment Correlation Analysis
12. 📌 Advanced User Journey Analytics
13. 📌 Survey Analytics (if data exists)

---

## 🔧 **Query Examples for Implementation**

### **Get Top Categories by Views**
```javascript
// Query products and services, group by category, sum total_views
const products = await getDocs(collection(firebaseDB, 'products'));
const services = await getDocs(collection(firebaseDB, 'services'));

const categoryViews = {};
[...products.docs, ...services.docs].forEach(doc => {
  const data = doc.data();
  const views = data.total_views || 0;
  data.category?.forEach(cat => {
    categoryViews[cat] = (categoryViews[cat] || 0) + views;
  });
});
```

### **Calculate Engagement Funnel**
```javascript
// For a specific product/service
const item = productData;
const viewToReview = item.total_reviews / item.total_views;
const viewToComment = item.comments?.length / item.total_views;
const reviewToComment = item.comments?.length / item.total_reviews;
```

### **Sentiment Trends Over Time**
```javascript
// Group reviews by month and sentiment
const reviews = await getDocs(query(
  collection(firebaseDB, 'reviews'),
  where('product_id', '==', productId)
));

const monthlySentiment = {};
reviews.docs.forEach(doc => {
  const data = doc.data();
  const month = data.timestamp?.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  const sentiment = data.sentiment;
  if (!monthlySentiment[month]) monthlySentiment[month] = {};
  monthlySentiment[month][sentiment] = (monthlySentiment[month][sentiment] || 0) + 1;
});
```

---

## 📝 **Notes**

- All analytics can be calculated from existing fields
- No new collections or data points required
- Some analytics may require joining multiple collections
- Timestamp-based analytics use `createdAt`, `updatedAt`, `timestamp` fields
- Aggregations can be done client-side or via Cloud Functions for better performance
- Consider caching frequently accessed analytics data

