# 🚂 Railway Deployment Setup

## Your Railway Domain

**Production Domain:** `tuchonga-admin-production.up.railway.app`

---

## 🏗️ Deployment Architecture

You have two options:

### Option 1: Single Service (Recommended for Start)

Deploy both frontend and API in one Railway service:

1. **Create New Service** in Railway
2. **Connect GitHub Repository**
3. **Configure Build:**

```bash
# Build Command
npm install && npm run build && npm run build:api && npm run prisma:generate && npm run prisma:deploy

# Start Command
npm run start:api
```

4. **Environment Variables:**

```env
DATABASE_URL="postgresql://..."  # From Railway PostgreSQL service
JWT_SECRET="your-strong-secret-here"  # Generate: openssl rand -base64 32
NODE_ENV="production"
ALLOWED_ORIGINS="https://tuchonga-admin-production.up.railway.app"
VITE_API_URL="https://tuchonga-admin-production.up.railway.app"
PORT=3001  # Railway sets this automatically
```

5. **Serve Frontend:**

Since Railway runs the API server, you'll need to serve the frontend from the API server. Update `api/server.ts` to serve static files:

```typescript
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ... existing code ...

// Serve static files from dist folder (frontend)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  // Serve index.html for all routes (SPA routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}
```

### Option 2: Separate Services (Better for Scaling)

**API Service:**
- Domain: `tuchonga-admin-production.up.railway.app` (or create separate API service)
- Build: `npm install && npm run build:api && npm run prisma:generate && npm run prisma:deploy`
- Start: `npm run start:api`
- Env vars:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `NODE_ENV=production`
  - `ALLOWED_ORIGINS=https://your-frontend-domain.com`
  - `PORT` (auto-set by Railway)

**Frontend Service:**
- Create separate service or use Railway static hosting
- Build: `npm run build`
- Env vars:
  - `VITE_API_URL=https://tuchonga-admin-production.up.railway.app`

---

## 🔧 Environment Variables Setup

### In Railway Dashboard:

1. Go to your service → **Variables** tab
2. Add these variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | From Railway PostgreSQL service |
| `JWT_SECRET` | `[generate]` | Use: `openssl rand -base64 32` |
| `NODE_ENV` | `production` | Required |
| `ALLOWED_ORIGINS` | `https://tuchonga-admin-production.up.railway.app` | Your Railway domain |
| `VITE_API_URL` | `https://tuchonga-admin-production.up.railway.app` | For frontend build |
| `PORT` | `3001` | Railway sets automatically, but good to specify |

### Generate JWT Secret:

```bash
openssl rand -base64 32
```

---

## 📦 Build Configuration

### Railway will automatically:

1. Install dependencies: `npm install`
2. Run your build command
3. Start your service with the start command

### Recommended Build Command:

```bash
npm install && npm run prisma:generate && npm run build && npm run build:api && npm run prisma:deploy
```

This ensures:
- ✅ Dependencies installed
- ✅ Prisma Client generated
- ✅ Frontend built
- ✅ API built
- ✅ Database migrations applied

---

## 🔍 Health Check

Railway will check: `https://tuchonga-admin-production.up.railway.app/health`

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-12-29T..."
}
```

---

## 🚀 Deployment Steps

1. **Create PostgreSQL Service:**
   - Railway Dashboard → New → Database → PostgreSQL
   - Copy the `DATABASE_URL` from Variables tab

2. **Create App Service:**
   - Railway Dashboard → New → GitHub Repo
   - Select your repository
   - Railway will auto-detect Node.js

3. **Configure Environment Variables:**
   - Add all variables from the table above
   - Make sure `JWT_SECRET` is strong and random

4. **Set Build & Start Commands:**
   - Build: `npm install && npm run prisma:generate && npm run build && npm run build:api && npm run prisma:deploy`
   - Start: `npm run start:api`

5. **Deploy:**
   - Railway will automatically deploy on push to main branch
   - Or click "Deploy" in Railway dashboard

6. **Verify:**
   - Check health endpoint: `https://tuchonga-admin-production.up.railway.app/health`
   - Visit your domain and test super admin setup

---

## 🔒 Security Checklist

- [ ] `JWT_SECRET` is set and strong (32+ characters)
- [ ] `DATABASE_URL` uses SSL (Railway provides this)
- [ ] `ALLOWED_ORIGINS` matches your domain
- [ ] `NODE_ENV=production` is set
- [ ] HTTPS is enabled (Railway does this automatically)
- [ ] Database credentials are secure (Railway manages this)

---

## 🐛 Troubleshooting

### Service Won't Start

1. **Check Logs:**
   - Railway Dashboard → Service → Logs
   - Look for Prisma errors, missing env vars

2. **Verify Environment Variables:**
   - All required vars are set
   - `DATABASE_URL` is correct
   - `JWT_SECRET` is set

3. **Check Database Connection:**
   - Verify PostgreSQL service is running
   - Check `DATABASE_URL` format

### Frontend Can't Connect to API

1. **Check `VITE_API_URL`:**
   - Must be set at build time
   - Must match your Railway domain
   - Must use HTTPS

2. **Check CORS:**
   - `ALLOWED_ORIGINS` must include your frontend domain
   - Check browser console for CORS errors

### Database Migration Issues

1. **Run migrations manually:**
   ```bash
   railway run npm run prisma:deploy
   ```

2. **Check migration status:**
   ```bash
   railway run npx prisma migrate status
   ```

---

## 📝 Quick Reference

**Your Domain:** `https://tuchonga-admin-production.up.railway.app`

**Health Check:** `https://tuchonga-admin-production.up.railway.app/health`

**API Endpoints:**
- Setup check: `https://tuchonga-admin-production.up.railway.app/api/admin/setup/check`
- Create super admin: `https://tuchonga-admin-production.up.railway.app/api/admin/setup/super-admin`
- Login: `https://tuchonga-admin-production.up.railway.app/api/auth/login`

---

## ✅ Post-Deployment

1. Visit: `https://tuchonga-admin-production.up.railway.app/setup`
2. Create your super admin account
3. Sign in and verify everything works
4. Test admin management at `/admin`

---

**Last Updated:** 2024-12-29

