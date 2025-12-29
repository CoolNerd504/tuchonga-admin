# 🐛 Railway Troubleshooting Guide

## "Application failed to respond" Error

This error means Railway can't reach your application. Common causes:

### 1. Server Not Listening on 0.0.0.0

**Problem:** Server only listens on localhost, Railway can't reach it.

**Fix:** Ensure server listens on `0.0.0.0`:
```typescript
app.listen(PORT, '0.0.0.0', () => {
  // ...
});
```

✅ **Fixed in:** `api/server.ts`

---

### 2. Wrong Start Command

**Problem:** Railway uses wrong start command.

**Fix:** Check Railway service settings:
- **Start Command:** `npm run start`
- Should point to: `node dist-api/server.js`

✅ **Fixed in:** `package.json` - `"start"` script now runs API server

---

### 3. Build Failed

**Problem:** Build command failed, no server to run.

**Check Logs For:**
- TypeScript compilation errors
- Missing dependencies
- Prisma generation errors
- Migration failures

**Fix:** 
1. Check Railway build logs
2. Verify build command: `npm install && npm run prisma:generate && npm run build && npm run build:api && npm run prisma:deploy`

---

### 4. Missing Environment Variables

**Problem:** App crashes on startup due to missing env vars.

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Must be set in production
- `NODE_ENV=production`
- `ALLOWED_ORIGINS` - Your Railway domain
- `VITE_API_URL` - Your Railway domain (for build)

**Fix:** Add all variables in Railway Dashboard → Variables

---

### 5. Port Configuration

**Problem:** PORT not set correctly.

**Fix:** Railway sets PORT automatically, but ensure:
```typescript
const PORT = Number(process.env.PORT) || 3001;
```

✅ **Fixed in:** `api/server.ts`

---

### 6. Database Connection Failed

**Problem:** Can't connect to PostgreSQL.

**Check:**
- `DATABASE_URL` is correct
- PostgreSQL service is running
- Connection string format is correct

**Fix:**
1. Verify DATABASE_URL in Railway
2. Test connection: `railway run npx prisma db pull`

---

## 🔍 How to Debug

### Step 1: Check Railway Logs

1. Go to Railway Dashboard
2. Click on your service
3. Click "Logs" tab
4. Look for:
   - Error messages
   - "Server running" messages
   - Prisma errors
   - Missing module errors

### Step 2: Check Build Logs

Look for:
- ✅ `Prisma Client generated`
- ✅ `Build completed`
- ✅ `Migrations applied`
- ❌ Any error messages

### Step 3: Test Locally with Production Settings

```bash
# Set production environment
export NODE_ENV=production
export DATABASE_URL="your-railway-db-url"
export JWT_SECRET="your-secret"
export ALLOWED_ORIGINS="https://tuchonga-admin-production.up.railway.app"
export PORT=3001

# Build
npm run build
npm run build:api
npm run prisma:generate

# Start
npm run start
```

### Step 4: Check Health Endpoint

Once running, test:
```bash
curl http://localhost:3001/health
```

Should return:
```json
{"status":"ok","timestamp":"..."}
```

---

## ✅ Quick Fixes

### Fix 1: Update Start Command in Railway

1. Railway Dashboard → Service → Settings
2. Set **Start Command:** `npm run start`
3. Redeploy

### Fix 2: Verify Environment Variables

1. Railway Dashboard → Service → Variables
2. Ensure all required variables are set
3. Check for typos

### Fix 3: Rebuild

1. Railway Dashboard → Service
2. Click "Redeploy"
3. Watch build logs

---

## 📋 Common Error Messages

### "Cannot find module"
- **Cause:** Build failed or dependencies missing
- **Fix:** Check build logs, ensure `npm install` runs

### "JWT_SECRET must be set"
- **Cause:** Missing JWT_SECRET env var
- **Fix:** Add `JWT_SECRET` in Railway Variables

### "Database connection failed"
- **Cause:** Wrong DATABASE_URL or DB not accessible
- **Fix:** Verify DATABASE_URL, check PostgreSQL service

### "Port already in use"
- **Cause:** Multiple instances running
- **Fix:** Railway handles this, but check for duplicate services

### "Prisma Client not generated"
- **Cause:** `prisma:generate` didn't run
- **Fix:** Add to build command: `npm run prisma:generate`

---

## 🚀 Current Configuration

**Railway Config:** `railway.json`
- Build: `npm install && npm run prisma:generate && npm run build && npm run build:api && npm run prisma:deploy`
- Start: `npm run start` (runs `node dist-api/server.js`)

**Server Config:**
- Listens on: `0.0.0.0:PORT`
- Health check: `/health`
- Serves frontend: `/` (in production)

---

## 📞 Still Having Issues?

1. **Check Railway Logs** - Most errors show here
2. **Verify Build Command** - Must include all steps
3. **Verify Start Command** - Must run compiled server
4. **Check Environment Variables** - All required vars set
5. **Test Locally** - Reproduce with production settings

---

**Last Updated:** 2024-12-29

