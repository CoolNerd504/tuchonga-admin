# 🔐 Firebase Service Account Key Structure Guide

## ✅ Correct .env Format

### Option 1: Single JSON String (Recommended)

```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\\n","client_email":"firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project-id.iam.gserviceaccount.com"}'
```

### Option 2: Individual Variables (Alternative)

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

---

## 📋 Required Fields

The JSON must contain these fields:

| Field | Required | Example |
|-------|----------|---------|
| `type` | ✅ Yes | `"service_account"` |
| `project_id` | ✅ Yes | `"your-project-id"` |
| `private_key_id` | ✅ Yes | `"abc123def456..."` |
| `private_key` | ✅ Yes | `"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"` |
| `client_email` | ✅ Yes | `"firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"` |
| `client_id` | ✅ Yes | `"123456789012345678901"` |
| `auth_uri` | ✅ Yes | `"https://accounts.google.com/o/oauth2/auth"` |
| `token_uri` | ✅ Yes | `"https://oauth2.googleapis.com/token"` |
| `auth_provider_x509_cert_url` | ✅ Yes | `"https://www.googleapis.com/oauth2/v1/certs"` |
| `client_x509_cert_url` | ✅ Yes | `"https://www.googleapis.com/robot/v1/metadata/x509/..."` |

---

## ⚠️ Important Formatting Rules

### 1. Use Single Quotes

```bash
# ✅ Correct
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# ❌ Wrong
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### 2. Keep on One Line

```bash
# ✅ Correct (single line)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...",...}'

# ❌ Wrong (multi-line)
FIREBASE_SERVICE_ACCOUNT_KEY='{
  "type": "service_account",
  ...
}'
```

### 3. Preserve `\\n` (DOUBLE BACKSLASH) in Private Key

**CRITICAL:** The `private_key` field must have `\\n` (TWO backslashes + n) for line breaks in the `.env` file:

```bash
# ✅ Correct (TWO backslashes: \\n)
"private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEv...\\n-----END PRIVATE KEY-----\\n"

# ❌ Wrong (ONE backslash: \n - this breaks JSON)
"private_key":"-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"

# ❌ Wrong (actual newlines)
"private_key":"-----BEGIN PRIVATE KEY-----
MIIEv...
-----END PRIVATE KEY-----
"
```

**Why?** In `.env` files:
- `\n` (single backslash) = Treated as actual newline (breaks JSON)
- `\\n` (double backslash) = Escaped, becomes `\n` in the JSON string (correct)

### 4. Escape Quotes Inside JSON

If your JSON contains quotes, they should be escaped:

```bash
# ✅ Correct (quotes are part of JSON, not shell)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# The single quotes protect the entire JSON string
```

---

## 🔍 Validation Checklist

Your `.env` file should have:

- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` starts with single quote `'`
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` ends with single quote `'`
- [ ] Entire JSON is on one line
- [ ] JSON starts with `{` and ends with `}`
- [ ] All required fields are present
- [ ] `private_key` contains `\\n` (backslash-n) characters
- [ ] No actual line breaks in the JSON string

---

## 🧪 How to Verify

### Method 1: Check Server Logs

Start your server and look for:

```
✅ Firebase Admin SDK initialized successfully
```

If you see:
```
⚠️ Firebase Admin SDK not initialized
```

Then check your `.env` format.

### Method 2: Test JSON Parsing

```bash
# In Node.js
node -e "const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY; if (key) { try { JSON.parse(key); console.log('✅ Valid JSON'); } catch(e) { console.log('❌ Invalid:', e.message); } }"
```

### Method 3: Check Required Fields

```bash
node -e "const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY; if (key) { const parsed = JSON.parse(key); const required = ['type', 'project_id', 'private_key', 'client_email']; const missing = required.filter(f => !parsed[f]); console.log(missing.length ? '❌ Missing: ' + missing.join(', ') : '✅ All fields present'); }"
```

---

## 📝 Example Structure (Template)

```bash
# .env file
FIREBASE_SERVICE_ACCOUNT_KEY='{
  "type": "service_account",
  "project_id": "YOUR_PROJECT_ID",
  "private_key_id": "YOUR_PRIVATE_KEY_ID",
  "private_key": "-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY_CONTENT\\n-----END PRIVATE KEY-----\\n",
  "client_email": "firebase-adminsdk-xxxxx@YOUR_PROJECT_ID.iam.gserviceaccount.com",
  "client_id": "YOUR_CLIENT_ID",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40YOUR_PROJECT_ID.iam.gserviceaccount.com"
}'
```

**Note:** In actual `.env` file, this must be on ONE line with single quotes around it.

---

## 🚨 Common Mistakes

### Mistake 1: Missing Quotes

```bash
# ❌ Wrong
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# ✅ Correct
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

### Mistake 2: Using Double Quotes

```bash
# ❌ Wrong (double quotes can cause issues with JSON quotes)
FIREBASE_SERVICE_ACCOUNT_KEY="{"type":"service_account",...}"

# ✅ Correct
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

### Mistake 3: Actual Newlines in Private Key

```bash
# ❌ Wrong (actual line breaks)
"private_key":"-----BEGIN PRIVATE KEY-----
MIIEv...
-----END PRIVATE KEY-----"

# ✅ Correct (escaped newlines)
"private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEv...\\n-----END PRIVATE KEY-----\\n"
```

### Mistake 4: Multi-line JSON

```bash
# ❌ Wrong
FIREBASE_SERVICE_ACCOUNT_KEY='{
  "type": "service_account",
  ...
}'

# ✅ Correct (single line)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

---

## 🔄 Converting from Downloaded JSON File

If you downloaded a JSON file from Firebase:

1. **Open the file** (e.g., `your-project-firebase-adminsdk-xxxxx.json`)

2. **Copy the entire contents**

3. **Convert to single line:**
   - Remove all actual line breaks
   - Keep `\n` in the `private_key` field (should already be there)
   - Ensure it's valid JSON

4. **Wrap in single quotes:**
   ```bash
   FIREBASE_SERVICE_ACCOUNT_KEY='[paste JSON here]'
   ```

5. **Add to `.env` file**

---

## ✅ Verification Steps

After setting up:

1. **Check variable is loaded:**
   ```bash
   # Should show the JSON (first 50 chars)
   echo $FIREBASE_SERVICE_ACCOUNT_KEY | head -c 50
   ```

2. **Start server:**
   ```bash
   npm run dev:api
   ```

3. **Check logs for:**
   ```
   ✅ Firebase Admin SDK initialized successfully
   ```

4. **If you see warnings:**
   - Check JSON format
   - Verify all required fields
   - Ensure single quotes are used
   - Check for parsing errors in logs

---

## 📞 Still Having Issues?

1. **Check server logs** for specific error messages
2. **Validate JSON** using an online JSON validator
3. **Check** `FIREBASE_TROUBLESHOOTING.md` for detailed solutions
4. **Verify** the downloaded JSON file is complete and valid

---

**Last Updated:** 2024-12-29

