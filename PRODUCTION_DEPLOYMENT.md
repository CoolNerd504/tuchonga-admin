# 🚀 Production Deployment Guide

This guide covers deploying the TuChonga Admin App to production environments (Railway, Vercel, etc.).

## 📋 Prerequisites

- ✅ Prisma schema and migrations ready
- ✅ Database (PostgreSQL) provisioned
- ✅ Environment variables configured
- ✅ Build scripts tested locally

---

## 🔧 Environment Variables

### Required Variables

Set these in your hosting platform's environment variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# API Server
PORT=3001
JWT_SECRET="jAI+VHucsnFv21nTcvwdc2TCkPjQv5v2Jh8tBugthic=" # Generate with: openssl rand -base64 32
NODE_ENV="production"

# CORS (comma-separated list of allowed origins)
ALLOWED_ORIGINS="https://your-frontend-domain.com,https://admin.yourdomain.com"

# Frontend (for Vite build)
# Use your Railway API service domain
VITE_API_URL="https://tuchonga-admin-production.up.railway.app"
```

### Generating JWT Secret

```bash
openssl rand -base64 32
```

---

## 🏗️ Build Process

### 1. Frontend Build

The frontend is built with Vite:

```bash
npm run build
```

This creates a `dist/` folder with static files ready to deploy.

### 2. API Server Build

The API server needs to be built for production:

```bash
npm run build:api
```

This creates a `dist-api/` folder with compiled JavaScript.

---

## 🚂 Railway Deployment

### Option 1: Separate Services (Recommended)

**Frontend Service:**
1. Connect your GitHub repo
2. Root directory: `/`
3. Build command: `npm run build`
4. Start command: `npm run start` (or use Railway's static site hosting)
5. Environment variables:
   - `VITE_API_URL=https://tuchonga-admin-production.up.railway.app`

**API Service:**
1. Create a new service
2. Root directory: `/`
3. Build command: `npm install && npm run build:api && npm run prisma:generate`
4. Start command: `npm run start:api`
5. Environment variables:
   - `DATABASE_URL` (from Railway PostgreSQL)
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS=https://tuchonga-admin-production.up.railway.app`
   - `PORT` (Railway sets this automatically)

### Option 2: Single Service with Buildpacks

1. Use Node.js buildpack
2. Build command: `npm install && npm run build && npm run build:api && npm run prisma:generate`
3. Start command: `npm run start:api` (API) + serve frontend from `dist/`
4. Set all environment variables

---

## 🔒 Security Checklist

- [ ] `JWT_SECRET` is set and strong (32+ characters)
- [ ] `DATABASE_URL` uses SSL connection
- [ ] `ALLOWED_ORIGINS` is set (not using `*` in production)
- [ ] `NODE_ENV=production` is set
- [ ] `.env` file is NOT committed to git
- [ ] Database credentials are secure
- [ ] HTTPS is enabled for all services
- [ ] CORS is properly configured

---

## 📊 Database Migrations

Run migrations in production:

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:deploy
```

Or add to your build process:

```bash
npm install && npm run prisma:generate && npm run prisma:deploy && npm run build:api
```

---

## 🧪 Testing Production Build Locally

1. **Build everything:**
   ```bash
   npm run build
   npm run build:api
   npm run prisma:generate
   ```

2. **Set production environment:**
   ```bash
   export NODE_ENV=production
   export DATABASE_URL="your-production-db-url"
   export JWT_SECRET="your-production-secret"
   export ALLOWED_ORIGINS="http://localhost:5173"
   ```

3. **Start API server:**
   ```bash
   npm run start:api
   ```

4. **Start frontend preview:**
   ```bash
   npm run start
   ```

---

## 🔍 Health Checks

### API Health Check

```bash
curl https://your-api-domain.com/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Database Connection

The API will fail to start if the database is not accessible. Check logs for:
- `PrismaClientInitializationError`
- Connection timeout errors

---

## 🐛 Troubleshooting

### API Server Won't Start

1. **Check environment variables:**
   ```bash
   echo $DATABASE_URL
   echo $JWT_SECRET
   echo $NODE_ENV
   ```

2. **Check database connection:**
   ```bash
   npx prisma db pull
   ```

3. **Check logs:**
   - Railway: View service logs
   - Look for Prisma errors
   - Check CORS configuration

### Frontend Can't Connect to API

1. **Check `VITE_API_URL`:**
   - Must match your API service URL
   - Must use HTTPS in production
   - Must be set at build time (Vite env vars)

2. **Check CORS:**
   - Verify `ALLOWED_ORIGINS` includes your frontend domain
   - Check browser console for CORS errors

3. **Check API is running:**
   ```bash
   curl https://your-api-domain.com/health
   ```

### Database Migration Issues

1. **Run migrations manually:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Check migration status:**
   ```bash
   npx prisma migrate status
   ```

3. **Reset if needed (⚠️ DESTRUCTIVE):**
   ```bash
   npx prisma migrate reset
   ```

---

## 📝 Railway-Specific Configuration

### `railway.toml` (Optional)

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm run start:api"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### Environment Variables in Railway

1. Go to your service → Variables
2. Add each variable:
   - `DATABASE_URL` (auto-provided if using Railway PostgreSQL)
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS`
   - `VITE_API_URL` (for frontend service)

---

## ✅ Post-Deployment Checklist

- [ ] API health check returns `200 OK`
- [ ] Frontend loads without errors
- [ ] Can create super admin account
- [ ] Can sign in with super admin
- [ ] Admin management page works
- [ ] Database queries work
- [ ] CORS is properly configured
- [ ] HTTPS is enabled
- [ ] Error logs are monitored
- [ ] Database backups are configured

---

## 🔄 Continuous Deployment

### GitHub Actions (Example)

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
      - run: npm run build:api
      - run: npm run prisma:generate
      # Deploy to Railway using Railway CLI or webhook
```

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [Vite Production Build](https://vitejs.dev/guide/build.html)

---

## 🆘 Support

If you encounter issues:

1. Check Railway service logs
2. Verify all environment variables are set
3. Test database connection locally with production URL
4. Check CORS configuration
5. Verify Prisma migrations are applied

---

**Last Updated:** 2024-12-29

