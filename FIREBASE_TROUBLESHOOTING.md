# 🔧 Firebase Admin SDK Troubleshooting Guide

## 🚨 Error: "Firebase Admin SDK not initialized"

### What This Means

The backend cannot verify Firebase tokens because `FIREBASE_SERVICE_ACCOUNT_KEY` is not configured.

### Quick Fix

**For Local Development:**

1. Get Firebase Service Account Key:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Settings → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

2. Add to `.env` file:
   ```bash
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id",...}'
   ```
   (Paste the entire JSON as a single line)

3. Restart your server:
   ```bash
   npm run dev:api
   ```

4. Check logs for:
   ```
   ✅ Firebase Admin SDK initialized successfully
   ```

**For Railway (Production):**

1. Go to Railway → Your Service → Variables
2. Add new variable:
   - **Key:** `FIREBASE_SERVICE_ACCOUNT_KEY`
   - **Value:** Paste the entire JSON from the downloaded file
3. Redeploy your service
4. Check deployment logs for initialization message

---

## ✅ Verification Steps

### Step 1: Check Environment Variable

**Local:**
```bash
# Check if variable is set
echo $FIREBASE_SERVICE_ACCOUNT_KEY | head -c 50

# Or check .env file
grep FIREBASE_SERVICE_ACCOUNT_KEY .env
```

**Railway:**
1. Go to Railway → Variables
2. Verify `FIREBASE_SERVICE_ACCOUNT_KEY` exists
3. Check that the value is valid JSON

### Step 2: Check Server Logs

**Look for one of these messages:**

✅ **Success:**
```
✅ Firebase Admin SDK initialized successfully
```

❌ **Warning (not configured):**
```
⚠️ Firebase Admin SDK not initialized - Firebase token auth will not work
   Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
```

❌ **Error (parsing failed):**
```
❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: [error details]
```

### Step 3: Test Firebase Token Endpoint

```bash
curl -X POST http://localhost:3001/api/auth/firebase-token \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Success:**
```json
{
  "success": true,
  "token": "jwt-token...",
  "data": { ... }
}
```

**If you get:**
```json
{
  "success": false,
  "error": "Firebase authentication is not configured on the server...",
  "code": "FIREBASE_NOT_CONFIGURED"
}
```

Then Firebase Admin SDK is not initialized.

---

## 🔍 Common Issues

### Issue 1: Environment Variable Not Set

**Symptoms:**
- Error: "Firebase Admin SDK not initialized"
- Server logs show warning message

**Solution:**
1. Add `FIREBASE_SERVICE_ACCOUNT_KEY` to `.env` (local) or Railway Variables (production)
2. Restart server/redeploy

### Issue 2: Invalid JSON Format

**Symptoms:**
- Error: "Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY"
- Server logs show parsing error

**Solution:**
1. Verify JSON is valid (use JSON validator)
2. Ensure entire JSON is on one line for `.env`
3. Check for escaped quotes: `\"` not `"`
4. Preserve `\n` characters in `private_key` field

### Issue 3: Wrong Project

**Symptoms:**
- Firebase Admin initializes but token verification fails
- Error: "Invalid Firebase token"

**Solution:**
1. Verify Firebase project ID matches
2. Ensure service account has proper permissions
3. Check if token is from correct Firebase project

### Issue 4: Token Expired

**Symptoms:**
- Error: "Firebase token has expired"
- Works initially, fails after 1 hour

**Solution:**
- Firebase tokens expire after 1 hour
- Refresh token: `await user.getIdToken(true)`
- Or exchange for JWT token (valid 7 days)

---

## 🛠️ Debugging Commands

### Check Firebase Admin Initialization

```bash
# Start server and watch logs
npm run dev:api

# Look for initialization message in first few lines
```

### Test Environment Variable

```bash
# Test JSON parsing (Node.js)
node -e "const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY; if (key) { try { JSON.parse(key); console.log('✅ Valid JSON'); } catch(e) { console.log('❌ Invalid JSON:', e.message); } } else { console.log('❌ Not set'); }"
```

### Verify Firebase Project

```bash
# Check if project ID matches
node -e "const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY; if (key) { const parsed = JSON.parse(key); console.log('Project ID:', parsed.project_id); }"
```

---

## 📋 Setup Checklist

### Local Development

- [ ] Firebase project created
- [ ] Service account key downloaded
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` added to `.env`
- [ ] JSON format is valid (single line)
- [ ] Server restarted
- [ ] Logs show "✅ Firebase Admin SDK initialized successfully"
- [ ] Test endpoint works

### Production (Railway)

- [ ] Firebase project created
- [ ] Service account key downloaded
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` added to Railway Variables
- [ ] Service redeployed
- [ ] Deployment logs show initialization success
- [ ] Test endpoint works in production

---

## 🔄 Alternative: Use Individual Variables

If single JSON string doesn't work, use individual variables:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**Note:** The code supports both methods automatically.

---

## 📞 Getting Help

If issues persist:

1. **Check Server Logs:**
   - Look for initialization messages
   - Check for parsing errors
   - Verify environment variable is loaded

2. **Verify JSON Format:**
   - Use online JSON validator
   - Ensure proper escaping
   - Check for hidden characters

3. **Test Firebase Connection:**
   - Verify Firebase project is active
   - Check service account permissions
   - Ensure project ID matches

4. **Check Documentation:**
   - `FIREBASE_SERVICE_ACCOUNT_SETUP.md` - Detailed setup guide
   - `VERIFICATION_GUIDE.md` - Testing procedures
   - `FIREBASE_JWT_IMPLEMENTATION.md` - Implementation details

---

## 🎯 Quick Reference

### Error Messages

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Firebase Admin SDK not initialized" | Environment variable not set | Add `FIREBASE_SERVICE_ACCOUNT_KEY` |
| "Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY" | Invalid JSON format | Fix JSON format, validate |
| "Invalid Firebase token" | Token expired or wrong project | Refresh token or check project |
| "Firebase authentication is not configured" | SDK not initialized | Configure environment variable |

### Status Indicators

- ✅ `✅ Firebase Admin SDK initialized successfully` - Working
- ⚠️ `⚠️ Firebase Admin SDK not initialized` - Not configured
- ❌ `❌ Failed to parse` - Invalid JSON format
- ❌ `❌ Failed to initialize` - Other error (check logs)

---

**Last Updated:** 2024-12-29

