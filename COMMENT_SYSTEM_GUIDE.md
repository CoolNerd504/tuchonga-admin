# Comment System Implementation Guide

## Overview

The comment system allows users to comment on products and services with full support for:
- **Nested Threading**: Comments can have replies, and replies can have replies (max depth 2)
- **Reactions**: Users can agree (thumbs up) or disagree (thumbs down) with comments
- **User-Specific Data**: When authenticated, each comment includes the user's reaction status

## Features

1. **Threaded Comments**: Support for nested replies up to 2 levels deep
2. **Reactions**: Thumbs up (AGREE) or thumbs down (DISAGREE) on any comment
3. **User Context**: Shows which comments the user has reacted to
4. **Real-time Counts**: Agree/disagree counts are automatically maintained
5. **Reply Tracking**: Reply counts are automatically updated

## API Endpoints

### 1. Get Comments for Product

**Endpoint:** `GET /api/comments/product/:productId`

**Authentication:** Optional (JWT token - if provided, includes user's reactions)

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 20)
- `sortBy` (string) - Sort field: `createdAt`, `agreeCount`, `disagreeCount`, `replyCount` (default: `createdAt`)
- `sortOrder` (string) - `asc` or `desc` (default: `desc`)
- `hasReplies` (boolean) - Filter comments that have replies
- `search` (string) - Search in comment text
- `includeReplies` (boolean) - Include nested replies in response (default: false)

**Headers (Optional):**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "comment-id",
      "itemId": "product-id",
      "itemType": "PRODUCT",
      "userId": "user-id",
      "userName": "John Doe",
      "userAvatar": "https://...",
      "text": "This is a great product!",
      "parentId": null,
      "depth": 0,
      "agreeCount": 15,
      "disagreeCount": 2,
      "replyCount": 5,
      "isEdited": false,
      "isDeleted": false,
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z",
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
          "agreeCount": 3,
          "disagreeCount": 0,
          "replyCount": 1,
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
              "agreeCount": 1,
              "disagreeCount": 0,
              "replyCount": 0,
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
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### 2. Get Comments for Service

**Endpoint:** `GET /api/comments/service/:serviceId`

**Description:** Same as Get Comments for Product, but for services

**Query Parameters:** Same as Get Comments for Product

**Success Response:** Same structure as Get Comments for Product

---

### 3. Get Comment by ID

**Endpoint:** `GET /api/comments/:id`

**Authentication:** Optional (JWT token)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "comment-id",
    "text": "Comment text",
    "agreeCount": 10,
    "disagreeCount": 1,
    "replyCount": 3,
    "userReaction": {
      "hasReacted": true,
      "reactionType": "AGREE"
    },
    // ... other comment fields
  }
}
```

---

### 4. Get Replies for a Comment

**Endpoint:** `GET /api/comments/:id/replies`

**Authentication:** Optional (JWT token)

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 20)
- `sortBy` (string) - Sort field (default: `createdAt`)
- `sortOrder` (string) - `asc` or `desc` (default: `asc`)

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "reply-id",
      "text": "Reply text",
      "parentId": "comment-id",
      "depth": 1,
      "userReaction": {
        "hasReacted": false,
        "reactionType": null
      },
      // ... other fields
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 5. Create Comment

**Endpoint:** `POST /api/comments`

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "itemId": "product-or-service-id",
  "itemType": "product",  // or "service" (case-insensitive, converted to enum)
  "text": "This is my comment",
  "parentId": null  // Optional: for replies, set to parent comment ID
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Comment created successfully",
  "data": {
    "id": "comment-id",
    "itemId": "product-id",
    "itemType": "PRODUCT",
    "text": "This is my comment",
    "parentId": null,
    "depth": 0,
    "agreeCount": 0,
    "disagreeCount": 0,
    "replyCount": 0,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "user": {
      "id": "user-id",
      "fullName": "John Doe",
      "displayName": "John"
    }
  }
}
```

**Creating a Reply:**
```json
{
  "itemId": "product-id",
  "itemType": "product",
  "text": "This is a reply",
  "parentId": "parent-comment-id"  // Set to the comment you're replying to
}
```

---

### 6. Update Comment

**Endpoint:** `PUT /api/comments/:id`

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "text": "Updated comment text"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Comment updated successfully",
  "data": {
    "id": "comment-id",
    "text": "Updated comment text",
    "isEdited": true,
    "editedAt": "2024-01-01T13:00:00.000Z",
    // ... other fields
  }
}
```

---

### 7. Delete Comment

**Endpoint:** `DELETE /api/comments/:id`

**Authentication:** Required (JWT token)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

**Note:** Comments are soft-deleted (`isDeleted: true`). Only the comment owner or admins can delete.

---

### 8. React to Comment (Agree/Disagree)

**Endpoint:** `POST /api/comments/:id/react`

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "reactionType": "AGREE"  // or "DISAGREE"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Reaction created",
  "data": {
    "action": "created",
    "reactionType": "AGREE"
  }
}
```

**Behavior:**
- If user hasn't reacted: Creates new reaction
- If user has same reaction: Removes reaction (toggle off)
- If user has different reaction: Updates to new reaction type

---

### 9. Remove Reaction

**Endpoint:** `DELETE /api/comments/:id/react`

**Authentication:** Required (JWT token)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Reaction removed"
}
```

---

### 10. Get User's Reaction

**Endpoint:** `GET /api/comments/:id/reaction`

**Authentication:** Required (JWT token)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "hasReacted": true,
    "reaction": {
      "id": "reaction-id",
      "commentId": "comment-id",
      "userId": "user-id",
      "reactionType": "AGREE",
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

---

## Threading Structure

### Depth Levels

- **Depth 0**: Root comment (direct comment on product/service)
- **Depth 1**: Reply to root comment
- **Depth 2**: Reply to a reply (nested reply)

**Maximum Depth:** 2 levels (prevents infinite nesting)

### Example Thread Structure

```
Product Comment (depth 0)
├── Reply 1 (depth 1)
│   └── Nested Reply (depth 2)
├── Reply 2 (depth 1)
└── Reply 3 (depth 1)
    └── Nested Reply (depth 2)
```

## User Reaction Object

Every comment includes a `userReaction` object when a user is authenticated:

```typescript
interface UserReaction {
  hasReacted: boolean;        // Whether user has reacted
  reactionType: "AGREE" | "DISAGREE" | null;  // User's reaction type
}
```

**When not authenticated:**
```json
{
  "hasReacted": false,
  "reactionType": null
}
```

## Mobile Implementation Examples

### Fetch Comments with Nested Replies

```typescript
const fetchProductComments = async (productId: string, includeReplies = false) => {
  const token = await SecureStore.getItemAsync('authToken');
  
  const queryParams = new URLSearchParams({
    page: '1',
    limit: '20',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    includeReplies: includeReplies.toString(),
  });
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(
    `${API_BASE_URL}/comments/product/${productId}?${queryParams}`,
    { headers }
  );

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch comments');
  }
  
  return data;
};
```

### Create Comment

```typescript
const createComment = async (
  itemId: string,
  itemType: 'product' | 'service',
  text: string,
  parentId?: string
) => {
  const token = await SecureStore.getItemAsync('authToken');
  
  const response = await fetch(`${API_BASE_URL}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      itemId,
      itemType,  // Will be converted to uppercase enum
      text,
      parentId: parentId || null,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create comment');
  }
  
  return data.data;
};
```

### React to Comment

```typescript
const reactToComment = async (
  commentId: string,
  reactionType: 'AGREE' | 'DISAGREE'
) => {
  const token = await SecureStore.getItemAsync('authToken');
  
  const response = await fetch(`${API_BASE_URL}/comments/${commentId}/react`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ reactionType }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to react to comment');
  }
  
  return data;
};
```

### Display Comment with Reactions

```typescript
const CommentCard = ({ comment, onReact, onReply }) => {
  const { userReaction, agreeCount, disagreeCount } = comment;
  
  return (
    <View>
      <Text>{comment.text}</Text>
      <Text>By {comment.userName}</Text>
      
      {/* Reaction Buttons */}
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity
          onPress={() => onReact(comment.id, 'AGREE')}
          style={{
            backgroundColor: userReaction?.reactionType === 'AGREE' ? 'green' : 'gray'
          }}
        >
          <Text>👍 {agreeCount}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => onReact(comment.id, 'DISAGREE')}
          style={{
            backgroundColor: userReaction?.reactionType === 'DISAGREE' ? 'red' : 'gray'
          }}
        >
          <Text>👎 {disagreeCount}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => onReply(comment.id)}>
          <Text>Reply ({comment.replyCount})</Text>
        </TouchableOpacity>
      </View>
      
      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <View style={{ marginLeft: 20 }}>
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              onReact={onReact}
              onReply={onReply}
            />
          ))}
        </View>
      )}
    </View>
  );
};
```

## Important Notes

1. **Enum Conversion**: The API accepts `itemType` as lowercase string ("product" or "service") and converts it to uppercase enum ("PRODUCT" or "SERVICE")

2. **Threading Depth**: Maximum depth is 2 levels. Attempting to reply to a depth 2 comment will result in an error.

3. **Reaction Toggle**: Clicking the same reaction type again removes the reaction. Clicking a different reaction type switches the reaction.

4. **Reply Counts**: Reply counts are automatically maintained. When a reply is created, the parent's `replyCount` increments. When deleted, it decrements.

5. **Soft Delete**: Comments are soft-deleted (`isDeleted: true`), so they don't appear in lists but are preserved in the database.

6. **User Reactions in Lists**: When fetching comments, user reactions are included if the user is authenticated. This allows the UI to highlight which comments the user has reacted to.

7. **Nested Replies**: Use `includeReplies=true` to fetch nested replies in a single request. Otherwise, use the `/replies` endpoint to fetch replies separately.

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "itemId, itemType, and text are required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Not authorized to update this comment"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Comment not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to create comment"
}
```

---

**Last Updated:** 2024-12-29

