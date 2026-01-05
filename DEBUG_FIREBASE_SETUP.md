# 🔍 Debug Firebase Admin SDK Setup

## Quick Diagnostic

### Step 1: Check Firebase Admin Status

**Test the diagnostic endpoint:**

```bash
curl http://localhost:3001/api/auth/firebase-status
```

**Or in browser:**
```
http://localhost:3001/api/auth/firebase-status
```

**Expected Response (if working):**
```json
{
  "firebaseAdminInitialized": true,
  "environmentVariable": {
    "exists": true,
    "length": 1500,
    "canParse": true,
    "hasRequiredFields": true
  },
  "message": "✅ Firebase Admin SDK is initialized and ready"
}
```

**If not working, you'll see:**
```json
{
  "firebaseAdminInitialized": false,
  "environmentVariable": {
    "exists": true/false,
    "canParse": true/false,
    "hasRequiredFields": true/false,
    "parseError": "..."
  },
  "troubleshooting": {
    "checkEnvVar": "...",
    "checkParsing": "...",
    "checkFields": "...",
    "action": "..."
  }
}
```

---

## Common Issues & Solutions

### Issue 1: Environment Variable Not Loaded

**Symptoms:**
- `firebase-status` shows `"exists": false`
- Server logs show warning about not initialized

**Solutions:**

1. **Check .env file location:**
   - Should be in project root (same level as `package.json`)
   - Not in `src/` or `api/` directories

2. **Verify dotenv is loading:**
   - Check `api/server.ts` has `dotenv.config()` at the top
   - Should be called before any other imports

3. **Restart server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev:api
   ```

4. **Check variable name:**
   ```bash
   # Should be exactly:
   FIREBASE_SERVICE_ACCOUNT_KEY='...'
   # Not:
   FIREBASE_SERVICE_KEY='...'
   # Not:
   FIREBASE_ADMIN_KEY='...'
   ```

### Issue 2: JSON Parse Error

**Symptoms:**
- `firebase-status` shows `"canParse": false`
- `parseError` shows the error message

**Solutions:**

1. **Validate JSON:**
   ```bash
   node scripts/validate-firebase-env.js
   ```

2. **Check for common issues:**
   - Missing quotes around JSON
   - Actual line breaks instead of `\n`
   - Unescaped quotes inside JSON
   - Trailing commas

3. **Use JSON validator:**
   - Copy the value (without quotes)
   - Paste into https://jsonlint.com/
   - Fix any errors

### Issue 3: Missing Required Fields

**Symptoms:**
- `firebase-status` shows `"hasRequiredFields": false`
- `canParse` is true but initialization fails

**Solutions:**

1. **Check required fields:**
   - `type` (should be "service_account")
   - `project_id`
   - `private_key`
   - `client_email`

2. **Verify structure:**
   ```bash
   node scripts/validate-firebase-env.js
   ```

### Issue 4: Server Not Restarted

**Symptoms:**
- Variable is set correctly
- But server still shows not initialized

**Solution:**
- **Always restart server after changing .env**
- Environment variables are loaded at startup
- Changes to .env require server restart

---

## Step-by-Step Debugging

### 1. Check if Variable is Set

```bash
# In terminal (where server is running)
echo $FIREBASE_SERVICE_ACCOUNT_KEY | head -c 50
```

If nothing shows, variable is not loaded.

### 2. Check Server Logs

When server starts, look for:

**✅ Success:**
```
✅ Firebase Admin SDK initialized successfully
```

**❌ Warning:**
```
⚠️ Firebase Admin SDK not initialized - Firebase token auth will not work
```

**❌ Error:**
```
❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: [error]
```

### 3. Test JSON Parsing

```bash
node -e "require('dotenv').config(); const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY; if (key) { try { JSON.parse(key); console.log('✅ Valid JSON'); } catch(e) { console.log('❌ Invalid:', e.message); } } else { console.log('❌ Not set'); }"
```

### 4. Check Required Fields

```bash
node -e "require('dotenv').config(); const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY; if (key) { const p = JSON.parse(key); const req = ['type', 'project_id', 'private_key', 'client_email']; const missing = req.filter(f => !p[f]); console.log(missing.length ? 'Missing: ' + missing.join(', ') : '✅ All present'); }"
```

---

## For Railway (Production)

### Check Environment Variables

1. Go to Railway → Your Service → Variables
2. Verify `FIREBASE_SERVICE_ACCOUNT_KEY` exists
3. Check the value (should be valid JSON)

### Check Deployment Logs

1. Go to Railway → Deployments
2. Click latest deployment
3. Check Logs tab
4. Look for initialization message

### Common Railway Issues

1. **Variable not set:**
   - Add `FIREBASE_SERVICE_ACCOUNT_KEY` in Variables tab
   - Redeploy

2. **JSON format:**
   - Railway can handle multi-line JSON
   - But single-line is recommended
   - Ensure no extra quotes or escaping issues

3. **Variable not loaded:**
   - Check variable name is exact: `FIREBASE_SERVICE_ACCOUNT_KEY`
   - Redeploy after adding variable

---

## Quick Fix Checklist

- [ ] `.env` file exists in project root
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` is set in `.env`
- [ ] JSON is valid (use validator)
- [ ] All required fields present
- [ ] Single quotes around JSON in `.env`
- [ ] Server restarted after changes
- [ ] Check `http://localhost:3001/api/auth/firebase-status`
- [ ] Check server logs for initialization message

---

## Still Not Working?

1. **Run validation script:**
   ```bash
   node scripts/validate-firebase-env.js
   ```

2. **Check diagnostic endpoint:**
   ```bash
   curl http://localhost:3001/api/auth/firebase-status
   ```

3. **Review server logs** for specific error messages

4. **Check** `FIREBASE_ENV_STRUCTURE.md` for format details

5. **Verify** the downloaded JSON file from Firebase is complete

---

**Last Updated:** 2024-12-29

