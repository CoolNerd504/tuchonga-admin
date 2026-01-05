# 🔥 Firebase Service Account Key Setup

## 📋 What is FIREBASE_SERVICE_ACCOUNT_KEY?

It's a JSON object containing credentials for Firebase Admin SDK to verify Firebase ID tokens and access Firebase services from your backend.

---

## 🔍 How to Get the Service Account Key

### Step 1: Go to Firebase Console

1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create one if you don't have it)

### Step 2: Navigate to Service Accounts

1. Click the **⚙️ Settings** icon (gear) in the top left
2. Select **Project Settings**
3. Go to the **Service Accounts** tab

### Step 3: Generate Private Key

1. Scroll down to the **"Generate new private key"** section
2. Click **"Generate new private key"** button
3. A confirmation dialog will appear - click **"Generate key"**
4. A JSON file will be downloaded (e.g., `your-project-id-firebase-adminsdk-xxxxx.json`)

---

## 📄 What the JSON File Looks Like

The downloaded file contains something like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123def456...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project-id.iam.gserviceaccount.com"
}
```

---

## 🔧 How to Set FIREBASE_SERVICE_ACCOUNT_KEY

### Option 1: Single-Line JSON String (Recommended)

Convert the entire JSON to a single-line string and set it as an environment variable.

**For Local Development (.env file):**

```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com","client_id":"123456789012345678901","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project-id.iam.gserviceaccount.com"}'
```

**Important Notes:**
- Keep the entire JSON on one line
- Preserve all `\n` characters in the `private_key` field
- Use single quotes to wrap the entire JSON string
- Don't add extra spaces or line breaks

### Option 2: Individual Environment Variables (Alternative)

Instead of one JSON string, you can set individual variables:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

**Note:** The code supports both methods, but Option 1 (single JSON) is recommended.

---

## 🚀 Setting in Railway (Production)

### Method 1: Copy-Paste JSON (Easiest)

1. Open the downloaded JSON file
2. Copy the entire contents
3. Go to Railway → Your Project → Variables
4. Add new variable:
   - **Key:** `FIREBASE_SERVICE_ACCOUNT_KEY`
   - **Value:** Paste the entire JSON (keep it as one line, or Railway will handle it)
5. Click **Add**

**Railway will automatically:**
- Handle multi-line JSON
- Escape special characters
- Store it securely

### Method 2: Convert to Single Line First

If Railway requires single-line format:

1. Open the JSON file
2. Remove all line breaks and extra spaces
3. Keep `\n` in the `private_key` field
4. Paste as the value

**Quick conversion command (if you have the file):**
```bash
# On Mac/Linux
cat your-project-firebase-adminsdk.json | jq -c . > service-account-single-line.json

# Or manually remove line breaks in a text editor
```

---

## ✅ Verification

After setting the environment variable, your backend should log:

```
✅ Firebase Admin SDK initialized successfully
```

If you see:
```
⚠️ Firebase Admin SDK not initialized - Firebase token auth will not work
```

Then the environment variable is not set correctly.

---

## 🔒 Security Best Practices

### ✅ DO:
- Store the key securely in environment variables
- Never commit the JSON file to git
- Use Railway's encrypted environment variables
- Rotate keys periodically
- Restrict service account permissions in Firebase Console

### ❌ DON'T:
- Commit the JSON file to version control
- Share the key publicly
- Hardcode it in your source code
- Use the same key for multiple projects

---

## 📝 Example .env File

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"tuchonga-bf6af","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@tuchonga-bf6af.iam.gserviceaccount.com","client_id":"123456789012345678901","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40tuchonga-bf6af.iam.gserviceaccount.com"}'
```

---

## 🧪 Testing

After setting up, test with:

```bash
# Check if Firebase Admin is initialized
curl http://localhost:3001/api/auth/firebase-token \
  -H "Authorization: Bearer <firebase-id-token>"
```

If it works, you'll get a JWT token back. If not, check the logs for initialization errors.

---

## 🔗 Related Documentation

- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Service Account Keys](https://cloud.google.com/iam/docs/service-accounts)
- `FIREBASE_JWT_IMPLEMENTATION.md` - Implementation details
- `MOBILE_COMPATIBILITY_CHECK.md` - Mobile app integration

---

## ❓ Troubleshooting

### Issue: "Firebase Admin SDK not initialized"

**Solutions:**
1. Check if `FIREBASE_SERVICE_ACCOUNT_KEY` is set: `echo $FIREBASE_SERVICE_ACCOUNT_KEY`
2. Verify JSON format is valid (no extra quotes, proper escaping)
3. Ensure `private_key` has `\n` characters preserved
4. Check Railway logs for parsing errors

### Issue: "Invalid Firebase token"

**Solutions:**
1. Verify the service account has proper permissions
2. Check if Firebase project ID matches
3. Ensure token hasn't expired (Firebase tokens expire after 1 hour)

### Issue: JSON parsing error

**Solutions:**
1. Ensure entire JSON is on one line (for .env)
2. Check for escaped quotes: `\"` not `"`
3. Verify `private_key` has proper `\n` line breaks
4. Use a JSON validator to check format

---

**Last Updated:** 2024-12-29

