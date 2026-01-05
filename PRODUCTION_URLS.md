# 🌐 Production URLs Reference

## Base URLs

### Production API
```
https://tuchonga-admin-production.up.railway.app/api
```

### Local Development
```
http://localhost:3001/api
```

---

## 🔍 Firebase Status Endpoint

### Production
```bash
curl https://tuchonga-admin-production.up.railway.app/api/auth/firebase-status
```

### Local
```bash
curl http://localhost:3001/api/auth/firebase-status
```

---

## 📋 Common Endpoints

### Authentication
- **Firebase Status:** `GET /api/auth/firebase-status`
- **Firebase Token Exchange:** `POST /api/auth/firebase-token`
- **Login:** `POST /api/auth/login`
- **Verify Token:** `GET /api/auth/verify`

### User Management
- **Complete Profile:** `POST /api/users/me/complete-profile`
- **Get Profile:** `GET /api/users/me`
- **Update Profile:** `PUT /api/users/me`

---

## 🧪 Quick Test Commands

### Test Firebase Status (Production)
```bash
curl https://tuchonga-admin-production.up.railway.app/api/auth/firebase-status
```

### Test Firebase Status (Local)
```bash
curl http://localhost:3001/api/auth/firebase-status
```

### Expected Response (Success)
```json
{
  "firebaseAdminInitialized": true,
  "hasServiceAccountKey": true,
  "serviceAccountKeyLength": 1234,
  "message": "✅ Firebase Admin SDK is initialized and ready"
}
```

### Expected Response (Not Initialized)
```json
{
  "firebaseAdminInitialized": false,
  "hasServiceAccountKey": true,
  "serviceAccountKeyLength": 1234,
  "message": "❌ Firebase Admin SDK is NOT initialized",
  "troubleshooting": {
    "commonIssues": [
      "FIREBASE_SERVICE_ACCOUNT_KEY not set in .env file",
      "JSON parsing error (check for single \\n instead of \\\\n in private_key)",
      "Invalid JSON format in FIREBASE_SERVICE_ACCOUNT_KEY",
      "Missing required fields in service account JSON"
    ],
    "fixGuide": "See FIX_NEWLINE_FORMAT.md for help with newline format issues"
  }
}
```

---

## 🔗 Full URL Examples

### Production
- Firebase Status: `https://tuchonga-admin-production.up.railway.app/api/auth/firebase-status`
- Firebase Token: `https://tuchonga-admin-production.up.railway.app/api/auth/firebase-token`
- User Profile: `https://tuchonga-admin-production.up.railway.app/api/users/me`

### Local
- Firebase Status: `http://localhost:3001/api/auth/firebase-status`
- Firebase Token: `http://localhost:3001/api/auth/firebase-token`
- User Profile: `http://localhost:3001/api/users/me`

---

**Last Updated:** 2024-12-29

