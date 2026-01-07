# User Management Endpoints for Admins

## Overview

Super admins and admins can manage users through the following endpoints. All endpoints require authentication and admin privileges.

## Authorization Rules

- **Admin** (`admin` role): Can deactivate/delete/reactivate regular users
- **Super Admin** (`super_admin` role): Can manage all users including other admins
- **Protection**: Users cannot deactivate/delete their own account
- **Admin Protection**: Only super admins can manage admin accounts

---

## Endpoints

### 1. Deactivate User

**Endpoint:** `POST /api/users/:id/deactivate`  
**Auth:** `verifyToken` + `verifyAdmin`  
**Description:** Deactivates a user by setting `isActive: false`

**Rules:**
- Cannot deactivate yourself
- Regular admins cannot deactivate other admins/super admins
- Only super admins can deactivate admin accounts

**Request:**
```bash
POST /api/users/{userId}/deactivate
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "data": {
    "userId": "user-id",
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `400`: Cannot deactivate your own account
- `403`: Only super admins can deactivate admin accounts
- `404`: User not found

---

### 2. Reactivate User

**Endpoint:** `POST /api/users/:id/reactivate`  
**Auth:** `verifyToken` + `verifyAdmin`  
**Description:** Reactivates a user by setting `isActive: true`

**Rules:**
- Regular admins cannot reactivate admin accounts
- Only super admins can reactivate admin accounts

**Request:**
```bash
POST /api/users/{userId}/reactivate
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "User reactivated successfully",
  "data": {
    "userId": "user-id",
    "email": "user@example.com"
  }
}
```

---

### 3. Delete User (Soft Delete)

**Endpoint:** `DELETE /api/users/:id`  
**Auth:** `verifyToken` + `verifyAdmin`  
**Description:** Soft deletes a user by deactivating them (sets `isActive: false`)

**Rules:**
- Cannot delete yourself
- Regular admins cannot delete admin accounts
- Only super admins can delete admin accounts
- This is a soft delete (user is deactivated, not removed from database)

**Request:**
```bash
DELETE /api/users/{userId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully (deactivated)",
  "data": {
    "userId": "user-id",
    "email": "user@example.com"
  }
}
```

---

### 4. Hard Delete User (Permanent)

**Endpoint:** `DELETE /api/users/:id/hard`  
**Auth:** `verifyToken` + `verifySuperAdmin`  
**Description:** Permanently deletes a user from the database

**Rules:**
- **Super admin only**
- Cannot delete yourself
- Cannot delete other super admins
- This permanently removes the user from the database (use with caution)

**Request:**
```bash
DELETE /api/users/{userId}/hard
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "User permanently deleted successfully",
  "data": {
    "userId": "user-id",
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `400`: Cannot delete your own account
- `403`: Cannot delete other super admin accounts
- `404`: User not found

---

## Usage Examples

### Deactivate a Regular User (Admin)
```bash
curl -X POST https://api.example.com/api/users/user-123/deactivate \
  -H "Authorization: Bearer {admin-token}"
```

### Delete a User (Soft Delete - Admin)
```bash
curl -X DELETE https://api.example.com/api/users/user-123 \
  -H "Authorization: Bearer {admin-token}"
```

### Permanently Delete a User (Super Admin Only)
```bash
curl -X DELETE https://api.example.com/api/users/user-123/hard \
  -H "Authorization: Bearer {super-admin-token}"
```

### Reactivate a User
```bash
curl -X POST https://api.example.com/api/users/user-123/reactivate \
  -H "Authorization: Bearer {admin-token}"
```

---

## Frontend Integration

### React Example

```typescript
// Deactivate user
const deactivateUser = async (userId: string) => {
  try {
    const response = await fetch(`/api/users/${userId}/deactivate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('User deactivated:', data.data);
    }
  } catch (error) {
    console.error('Error deactivating user:', error);
  }
};

// Delete user (soft delete)
const deleteUser = async (userId: string) => {
  try {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('User deleted:', data.data);
    }
  } catch (error) {
    console.error('Error deleting user:', error);
  }
};

// Hard delete (super admin only)
const hardDeleteUser = async (userId: string) => {
  if (!confirm('Are you sure you want to permanently delete this user? This cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/users/${userId}/hard`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('User permanently deleted:', data.data);
    }
  } catch (error) {
    console.error('Error hard deleting user:', error);
  }
};
```

---

## Security Notes

1. **Self-Protection**: Users cannot delete/deactivate themselves
2. **Admin Protection**: Regular admins cannot manage other admin accounts
3. **Super Admin Protection**: Super admins cannot delete other super admins
4. **Soft Delete Default**: Regular delete is a soft delete (deactivation) to preserve data
5. **Hard Delete Warning**: Hard delete permanently removes user data - use with extreme caution

---

## Related Endpoints

- `GET /api/users` - List all users (admin only)
- `GET /api/users/:id` - Get user details (admin only)
- `PUT /api/users/:id` - Update user (admin only)

