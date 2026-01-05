# 📱 Mobile App Update Guide - Authentication & Profile

## 🎯 Overview

This guide provides step-by-step instructions for updating your mobile app to work with the new backend API structure. It covers authentication flow, token management, and profile completion.

---

## 📋 Table of Contents

1. [Authentication Flow](#authentication-flow)
2. [Token Management](#token-management)
3. [Complete Profile Implementation](#complete-profile-implementation)
4. [API Client Setup](#api-client-setup)
5. [Error Handling](#error-handling)
6. [Code Examples](#code-examples)
7. [Migration Checklist](#migration-checklist)

---

## 🔄 Authentication Flow

### New Flow Overview

```
1. User signs up/logs in on Firebase
   ↓
2. Get Firebase ID token
   ↓
3. Exchange Firebase token for JWT (optional but recommended)
   OR use Firebase token directly
   ↓
4. Store JWT token (if exchanged)
   ↓
5. Use JWT or Firebase token for API calls
```

### Two Supported Flows

#### Flow 1: Token Exchange (Recommended) ✅

**Best for:** Better session management, longer-lived tokens

```
Firebase Auth → Get Firebase Token → Exchange for JWT → Store JWT → Use JWT
```

#### Flow 2: Direct Firebase Token (Fallback) ✅

**Best for:** Quick setup, when JWT exchange fails

```
Firebase Auth → Get Firebase Token → Use Firebase Token directly
```

---

## 🔑 Token Management

### Token Types

| Token Type | Source | Expiration | Usage |
|------------|--------|------------|-------|
| **Firebase ID Token** | Firebase Auth | 1 hour | Initial auth, user creation |
| **JWT Token** | Backend API | 7 days | All API calls (after exchange) |

### Token Storage

**Recommended:** Use secure storage (React Native SecureStore, Expo SecureStore)

```typescript
import * as SecureStore from 'expo-secure-store';

// Store token
await SecureStore.setItemAsync('auth_token', jwtToken);

// Get token
const token = await SecureStore.getItemAsync('auth_token');

// Remove token (logout)
await SecureStore.deleteItemAsync('auth_token');
```

### Token Refresh Strategy

1. **JWT Token (7 days):**
   - Refresh before expiration
   - Use `/api/auth/verify` to check validity
   - Re-exchange Firebase token if JWT expires

2. **Firebase Token (1 hour):**
   - Auto-refreshed by Firebase SDK
   - Call `user.getIdToken(true)` to force refresh

---

## 🔐 Authentication Implementation

### Step 1: Firebase Authentication

```typescript
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth();

// Sign up
const userCredential = await createUserWithEmailAndPassword(auth, email, password);
const firebaseUser = userCredential.user;

// Sign in
const userCredential = await signInWithEmailAndPassword(auth, email, password);
const firebaseUser = userCredential.user;

// Get Firebase ID token
const firebaseToken = await firebaseUser.getIdToken();
```

### Step 2: Exchange Firebase Token for JWT (Recommended)

```typescript
async function exchangeFirebaseTokenForJWT(firebaseToken: string): Promise<{
  token: string;
  data: UserData;
}> {
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-api.com/api';
  
  const response = await fetch(`${API_BASE_URL}/auth/firebase-token`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firebaseToken}`,
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to exchange token');
  }

  // Store JWT token
  await SecureStore.setItemAsync('auth_token', result.token);
  
  // Store user data
  await SecureStore.setItemAsync('user_data', JSON.stringify(result.data));

  return {
    token: result.token,
    data: result.data,
  };
}
```

### Step 3: Complete Authentication Flow

```typescript
async function handleFirebaseAuth(firebaseUser: User) {
  try {
    // Get Firebase token
    const firebaseToken = await firebaseUser.getIdToken();
    
    // Exchange for JWT (recommended)
    try {
      const { token, data } = await exchangeFirebaseTokenForJWT(firebaseToken);
      console.log('✅ JWT token obtained:', token);
      console.log('✅ User data:', data);
      
      // Check if profile needs completion
      if (!data.hasCompletedProfile) {
        // Navigate to profile completion screen
        navigateToProfileCompletion();
      } else {
        // Navigate to main app
        navigateToMainApp();
      }
    } catch (error) {
      // Fallback: Use Firebase token directly
      console.warn('JWT exchange failed, using Firebase token:', error);
      await SecureStore.setItemAsync('firebase_token', firebaseToken);
      
      // Check user exists via API
      const userData = await getUserProfile(firebaseToken);
      if (!userData?.hasCompletedProfile) {
        navigateToProfileCompletion();
      } else {
        navigateToMainApp();
      }
    }
  } catch (error) {
    console.error('Authentication error:', error);
    showError('Authentication failed. Please try again.');
  }
}
```

---

## 👤 Complete Profile Implementation

### Endpoint Details

**Endpoint:** `POST /api/auth/firebase-token`  
**Authentication:** Firebase ID token (Bearer token)  
**Purpose:** Create user in backend and get JWT token

**Endpoint:** `POST /api/users/me/complete-profile`  
**Authentication:** Firebase ID token OR JWT token  
**Purpose:** Complete user profile (creates user if doesn't exist)

### Complete Profile Request Structure

```typescript
interface CompleteProfileData {
  fullName: string;        // REQUIRED
  displayName?: string;     // Optional (defaults to fullName)
  phoneNumber?: string;    // Optional
  profileImage?: string;   // Optional (URL)
  location?: string;       // Optional
  gender?: string;         // Optional ("male" | "female" | "other")
}
```

### Complete Profile Implementation

```typescript
async function completeProfile(profileData: CompleteProfileData): Promise<UserData> {
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-api.com/api';
  
  // Try to get JWT token first, fallback to Firebase token
  let token = await SecureStore.getItemAsync('auth_token');
  
  if (!token) {
    // Fallback to Firebase token
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }
    token = await user.getIdToken();
  }

  const response = await fetch(`${API_BASE_URL}/users/me/complete-profile`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fullName: profileData.fullName,
      displayName: profileData.displayName || profileData.fullName,
      phoneNumber: profileData.phoneNumber,
      profileImage: profileData.profileImage,
      location: profileData.location,
      gender: profileData.gender,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    // Handle specific errors
    if (response.status === 400) {
      throw new Error(result.error || 'Invalid profile data');
    }
    if (response.status === 401) {
      // Token expired, try to refresh
      await handleTokenRefresh();
      // Retry the request
      return completeProfile(profileData);
    }
    throw new Error(result.error || 'Failed to complete profile');
  }

  // Update stored user data
  await SecureStore.setItemAsync('user_data', JSON.stringify(result.data));

  return result.data;
}
```

### Expected Response Structure

```typescript
interface UserData {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  fullName: string | null;
  displayName: string | null;
  profileImage: string | null;
  location: string | null;
  gender: string | null;
  hasCompletedProfile: boolean;
  role: string;
  createdAt: string;  // ISO 8601 date string
  updatedAt: string;  // ISO 8601 date string
}
```

---

## 🔧 API Client Setup

### Recommended API Client Structure

```typescript
// apiClient.ts
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-api.com/api';

class ApiClient {
  private async getAuthToken(): Promise<string> {
    // Try JWT first
    let token = await SecureStore.getItemAsync('auth_token');
    
    if (!token) {
      // Fallback to Firebase token
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }
      token = await user.getIdToken();
    }
    
    return token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle token expiration
        if (response.status === 401) {
          // Clear invalid token
          await SecureStore.deleteItemAsync('auth_token');
          throw new Error('Session expired. Please login again.');
        }
        
        return {
          success: false,
          error: result.error || 'An error occurred',
        };
      }

      return {
        success: result.success ?? true,
        data: result.data,
        error: result.error,
      };
    } catch (error: any) {
      if (error.message.includes('Network')) {
        return {
          success: false,
          error: 'No internet connection',
        };
      }
      
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  }

  // Authentication methods
  async exchangeFirebaseToken(firebaseToken: string) {
    const response = await fetch(`${API_BASE_URL}/auth/firebase-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to exchange token');
    }

    await SecureStore.setItemAsync('auth_token', result.token);
    return result;
  }

  // User methods
  async getCurrentUser() {
    return this.request<UserData>('/users/me');
  }

  async updateProfile(data: Partial<UserData>) {
    return this.request<UserData>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async completeProfile(data: CompleteProfileData) {
    return this.request<UserData>('/users/me/complete-profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();
```

---

## ⚠️ Error Handling

### Error Response Structure

All error responses follow this format:

```typescript
{
  success: false,
  error: "Error message describing what went wrong",
  code?: "ERROR_CODE"  // Optional error code
}
```

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `AUTH_TOKEN_REQUIRED` | No token provided | Redirect to login |
| `AUTH_INVALID_TOKEN` | Token is invalid | Clear token, redirect to login |
| `AUTH_TOKEN_EXPIRED` | Token expired | Refresh token or re-authenticate |
| `INVALID_FIREBASE_TOKEN` | Firebase token invalid | Get new Firebase token |
| `ACCOUNT_DEACTIVATED` | Account is deactivated | Show message, contact support |

### Error Handler Implementation

```typescript
function handleApiError(error: any, response?: Response) {
  if (!response) {
    // Network error
    if (error.message?.includes('Network') || error.message?.includes('fetch')) {
      return {
        message: 'No internet connection. Please check your network.',
        action: 'retry',
      };
    }
    return {
      message: error.message || 'An unexpected error occurred',
      action: 'retry',
    };
  }

  const status = response.status;
  const errorData = error;

  switch (status) {
    case 400:
      return {
        message: errorData.error || 'Invalid request. Please check your input.',
        action: 'fix',
      };
    
    case 401:
      // Token expired or invalid
      SecureStore.deleteItemAsync('auth_token');
      return {
        message: 'Session expired. Please login again.',
        action: 'login',
      };
    
    case 403:
      return {
        message: errorData.error || 'You don\'t have permission to perform this action.',
        action: 'contact',
      };
    
    case 404:
      return {
        message: errorData.error || 'Resource not found.',
        action: 'navigate',
      };
    
    case 429:
      return {
        message: 'Too many requests. Please try again later.',
        action: 'wait',
      };
    
    case 500:
      return {
        message: 'Server error. Please try again later.',
        action: 'retry',
      };
    
    default:
      return {
        message: errorData.error || 'An error occurred',
        action: 'retry',
      };
  }
}
```

---

## 📝 Code Examples

### Complete Authentication Hook

```typescript
// useAuth.ts
import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from './apiClient';

interface AuthState {
  user: User | null;
  apiUser: UserData | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    apiUser: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get Firebase token
          const firebaseToken = await firebaseUser.getIdToken();
          
          // Try to exchange for JWT
          try {
            const { token, data } = await apiClient.exchangeFirebaseToken(firebaseToken);
            setState({
              user: firebaseUser,
              apiUser: data,
              loading: false,
              error: null,
            });
          } catch (error) {
            // Fallback: Use Firebase token, get user from API
            const userResult = await apiClient.getCurrentUser();
            setState({
              user: firebaseUser,
              apiUser: userResult.data || null,
              loading: false,
              error: null,
            });
          }
        } catch (error: any) {
          setState({
            user: firebaseUser,
            apiUser: null,
            loading: false,
            error: error.message,
          });
        }
      } else {
        // User signed out
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('user_data');
        setState({
          user: null,
          apiUser: null,
          loading: false,
          error: null,
        });
      }
    });

    return unsubscribe;
  }, []);

  return state;
}
```

### Complete Profile Screen Example

```typescript
// CompleteProfileScreen.tsx
import { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { apiClient } from '../api/apiClient';
import { useAuth } from '../hooks/useAuth';

export function CompleteProfileScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    displayName: '',
    phoneNumber: '',
    location: '',
    gender: '',
  });

  const handleSubmit = async () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.completeProfile({
        fullName: formData.fullName,
        displayName: formData.displayName || formData.fullName,
        phoneNumber: formData.phoneNumber,
        location: formData.location,
        gender: formData.gender,
      });

      if (result.success && result.data) {
        Alert.alert('Success', 'Profile completed successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('Main') },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to complete profile');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Text>Complete Your Profile</Text>
      
      <TextInput
        placeholder="Full Name *"
        value={formData.fullName}
        onChangeText={(text) => setFormData({ ...formData, fullName: text })}
      />
      
      <TextInput
        placeholder="Display Name"
        value={formData.displayName}
        onChangeText={(text) => setFormData({ ...formData, displayName: text })}
      />
      
      <TextInput
        placeholder="Phone Number"
        value={formData.phoneNumber}
        onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
      />
      
      <TextInput
        placeholder="Location"
        value={formData.location}
        onChangeText={(text) => setFormData({ ...formData, location: text })}
      />
      
      <Button
        title={loading ? 'Saving...' : 'Complete Profile'}
        onPress={handleSubmit}
        disabled={loading || !formData.fullName.trim()}
      />
    </View>
  );
}
```

---

## ✅ Migration Checklist

### Before Migration

- [ ] Review current authentication implementation
- [ ] Identify all places where Firebase tokens are used
- [ ] Document current user data structure
- [ ] Backup current code

### During Migration

- [ ] Update API base URL configuration
- [ ] Implement Firebase token exchange endpoint
- [ ] Update authentication flow to use JWT tokens
- [ ] Update complete profile endpoint call
- [ ] Update all API calls to use new token system
- [ ] Implement error handling for token expiration
- [ ] Add fallback to Firebase tokens if JWT fails
- [ ] Update user data storage structure

### After Migration

- [ ] Test Firebase signup flow
- [ ] Test Firebase login flow
- [ ] Test token exchange
- [ ] Test complete profile
- [ ] Test token expiration handling
- [ ] Test offline scenarios
- [ ] Test error cases
- [ ] Verify user data structure matches backend

---

## 🔄 Migration Steps

### Step 1: Update API Configuration

```typescript
// config.ts
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://your-api.com/api',
  TIMEOUT: 30000,
};
```

### Step 2: Update Authentication Service

Replace your current auth service with the new implementation that:
- Exchanges Firebase tokens for JWT
- Falls back to Firebase tokens if needed
- Handles token refresh

### Step 3: Update Profile Completion

Update your profile completion screen to:
- Use the new endpoint structure
- Handle the new response format
- Support both JWT and Firebase tokens

### Step 4: Update All API Calls

Ensure all API calls:
- Use the new API client
- Handle token expiration
- Include proper error handling

---

## 📊 Response Structure Comparison

### Old Structure (if applicable)
```typescript
// Old response (example)
{
  user: { ... },
  token: "..."
}
```

### New Structure
```typescript
// New response
{
  success: true,
  token: "...",  // Only in /auth/firebase-token
  data: {
    id: "...",
    email: "...",
    // ... user fields
  }
}
```

---

## 🧪 Testing Guide

### Test Case 1: New User Signup

1. Sign up with Firebase
2. Call `/api/auth/firebase-token`
3. Verify JWT token received
4. Call `/api/users/me/complete-profile`
5. Verify user created in backend
6. Verify `hasCompletedProfile: true`

### Test Case 2: Existing User Login

1. Login with Firebase
2. Call `/api/auth/firebase-token`
3. Verify JWT token received
4. Call `/api/users/me`
5. Verify user data returned

### Test Case 3: Profile Completion

1. Login with Firebase
2. Call `/api/users/me/complete-profile` with Firebase token
3. Verify user created/updated
4. Verify profile data saved

### Test Case 4: Token Expiration

1. Use expired JWT token
2. Verify 401 error received
3. Verify automatic token refresh
4. Verify request retry succeeds

---

## 🔗 Related Documentation

- `BACKEND_SETUP_CONFIRMATION_GUIDE.md` - Backend requirements
- `MOBILE_API_GUIDE.md` - Full API documentation
- `VERIFICATION_GUIDE.md` - Testing and verification
- `FIREBASE_JWT_IMPLEMENTATION.md` - Backend implementation details

---

## 📞 Support

If you encounter issues:

1. Check `VERIFICATION_GUIDE.md` for testing steps
2. Review error messages in API responses
3. Check server logs for backend errors
4. Verify environment variables are set correctly
5. Ensure Firebase project matches backend configuration

---

**Last Updated:** 2024-12-29  
**API Version:** 1.0.0  
**Backend Status:** ✅ Ready for Mobile Integration

