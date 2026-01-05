# 🚂 Railway Firebase Setup Guide

## 🚨 Current Error
```
Firebase authentication is not configured on the server. Please contact support.
```

This means `FIREBASE_SERVICE_ACCOUNT_KEY` is either:
- ❌ Not set in Railway Variables
- ❌ Set but has wrong format (single `\n` instead of `\\n`)
- ❌ JSON parsing failed

---

## ✅ Fix Steps

### Step 1: Get Your Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file

### Step 2: Prepare the Key for Railway

**Important:** Railway needs the JSON as a **single-line string** with **double backslashes** (`\\n`) in the `private_key` field.

#### Option A: Manual Fix (Recommended)

1. Open the downloaded JSON file
2. Find the `private_key` field
3. Replace all `\n` with `\\n` (single → double backslash)
4. Copy the entire JSON (should be one line)

**Example:**
```json
// Before (from downloaded file)
"private_key": "-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"

// After (for Railway)
"private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEv...\\n-----END PRIVATE KEY-----\\n"
```

#### Option B: Use a Script

```bash
# On your local machine
node -e "
const fs = require('fs');
const key = JSON.parse(fs.readFileSync('path/to/serviceAccountKey.json', 'utf8'));
key.private_key = key.private_key.replace(/\\n/g, '\\\\n');
console.log(JSON.stringify(key));
" > railway-key.json
```

Then copy the contents of `railway-key.json` (should be one line).

### Step 3: Add to Railway Variables

1. Go to [Railway Dashboard](https://railway.app/)
2. Select your project
3. Select your service (the one running the API)
4. Go to **Variables** tab
5. Click **+ New Variable**
6. Set:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT_KEY`
   - **Value:** Paste the entire JSON string (one line, with `\\n`)
7. Click **Add**

**Important:** 
- ✅ Use double backslash: `\\n`
- ✅ Keep it as one line
- ✅ Include the entire JSON object

### Step 4: Redeploy

After adding the variable:
1. Railway will automatically redeploy
2. OR manually trigger a redeploy:
   - Go to **Deployments**
   - Click **Redeploy** on the latest deployment

### Step 5: Verify

#### Check Railway Logs

1. Go to Railway → Your Service → **Deployments**
2. Click on the latest deployment
3. Look for:
   ```
   ✅ Firebase Admin SDK initialized successfully
   ```

If you see:
```
❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY
```
or
```
⚠️ Firebase Admin SDK not initialized
```

Then the format is wrong - check the `\\n` issue.

#### Test the Status Endpoint

```bash
curl https://tuchonga-admin-production.up.railway.app/api/auth/firebase-status
```

Should return:
```json
{
  "firebaseAdminInitialized": true,
  "hasServiceAccountKey": true,
  "message": "✅ Firebase Admin SDK is initialized and ready"
}
```

---

## 🔍 Troubleshooting

### Issue 1: Still Getting "Not Configured" Error

**Check Railway Logs:**
1. Go to Railway → Deployments → Latest
2. Look for Firebase initialization messages
3. Check for JSON parsing errors

**Common Errors:**
- `Unexpected token` → JSON format issue
- `Missing required fields` → Incomplete JSON
- `Private key format incorrect` → `\n` vs `\\n` issue

### Issue 2: JSON Parsing Error

**Symptoms:**
- Logs show: `❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY`
- Status endpoint shows: `firebaseAdminInitialized: false`

**Fix:**
1. Verify the JSON is valid (use a JSON validator)
2. Check that `\\n` (double backslash) is used in `private_key`
3. Ensure it's a single line (no actual line breaks)
4. Make sure all quotes are properly escaped

### Issue 3: Variable Not Found

**Symptoms:**
- Logs show: `⚠️ Firebase Admin SDK not initialized`
- Status endpoint shows: `hasServiceAccountKey: false`

**Fix:**
1. Verify variable name is exactly: `FIREBASE_SERVICE_ACCOUNT_KEY`
2. Check it's set in the correct service/environment
3. Redeploy after adding the variable

---

## 📋 Quick Checklist

- [ ] Firebase service account key downloaded
- [ ] `private_key` field has `\\n` (double backslash) not `\n`
- [ ] JSON is a single line (no actual newlines)
- [ ] Variable `FIREBASE_SERVICE_ACCOUNT_KEY` added to Railway
- [ ] Service redeployed
- [ ] Logs show: `✅ Firebase Admin SDK initialized successfully`
- [ ] Status endpoint returns: `firebaseAdminInitialized: true`

---

## 🆘 Still Not Working?

1. **Check Railway Logs** - Look for detailed error messages
2. **Test Locally First** - Set in `.env` and test locally
3. **Use Validation Script** - Run `node scripts/validate-firebase-env.js` locally
4. **Check Variable Format** - Ensure it's exactly as shown in `FIREBASE_ENV_STRUCTURE.md`

---

**Last Updated:** 2024-12-29

