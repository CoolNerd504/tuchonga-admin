# 🚨 Quick Fix: Firebase Authentication Error

## Error Message
```
Firebase authentication is not configured on the server. Please contact support.
```

## Root Cause
Your `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env` has **single backslash** `\n` instead of **double backslash** `\\n` in the `private_key` field. This breaks JSON parsing.

---

## ✅ Fix Steps

### 1. Open Your `.env` File

### 2. Find This Line:
```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

### 3. In the `private_key` Field, Replace:
- **Find:** `\n` (single backslash + n)
- **Replace with:** `\\n` (double backslash + n)

### 4. Example Fix

**Before (Wrong):**
```bash
"private_key":"-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```

**After (Correct):**
```bash
"private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEv...\\n-----END PRIVATE KEY-----\\n"
```

**Important:** Replace ALL `\n` in the `private_key` field with `\\n`

---

## 🔍 Verify the Fix

### Option 1: Check Server Logs
After restarting your server, you should see:
```
✅ Firebase Admin SDK initialized successfully
```

### Option 2: Use Status Endpoint
```bash
curl http://localhost:3001/api/auth/firebase-status
```

Should return:
```json
{
  "firebaseAdminInitialized": true,
  "message": "✅ Firebase Admin SDK is initialized and ready"
}
```

### Option 3: Use Validation Script
```bash
node scripts/validate-firebase-env.js
```

---

## 🛠️ After Fixing

1. **Save** the `.env` file
2. **Restart** your server:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev:api
   ```
3. **Check logs** for initialization message
4. **Test** with the mobile app again

---

## 📝 Why This Happens

- **In JSON files:** `\n` is correct (single backslash)
- **In .env files:** `\\n` is required (double backslash)
  - The first `\` escapes the second `\`
  - So `\\n` in `.env` becomes `\n` in the parsed JSON

---

## 🆘 Still Not Working?

1. Check server logs for detailed error messages
2. Run: `node scripts/validate-firebase-env.js`
3. Check: `curl http://localhost:3001/api/auth/firebase-status`
4. See `FIX_NEWLINE_FORMAT.md` for more details

---

**Last Updated:** 2024-12-29

