# 🌍 Environment Configuration Summary

## ✅ Current Setup Status

### Local Development ✅
- ✅ Environment variables via `.env` file
- ✅ API server runs on `http://localhost:3001`
- ✅ Frontend runs on `http://localhost:3039` (or 5173)
- ✅ CORS allows localhost origins
- ✅ Development-friendly error messages
- ✅ Prisma Client generation
- ✅ Hot reload for both frontend and API

### Production ✅
- ✅ Environment-aware CORS configuration
- ✅ Production error handling (no stack traces)
- ✅ JWT_SECRET validation (fails if not set)
- ✅ Graceful shutdown handling
- ✅ Health check endpoint
- ✅ Build scripts for both frontend and API
- ✅ Prisma migration deployment script

---

## 📝 Environment Variables

### Local Development (`.env` file)

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/tuchonga"

# API Server
PORT=3001
JWT_SECRET="dev-secret-key"  # Can use default in dev
NODE_ENV="development"

# Frontend
VITE_API_URL="http://localhost:3001"
```

### Production (Set in hosting platform)

```env
# Database (Railway/PostgreSQL)
DATABASE_URL="postgresql://user:password@host:port/database"

# API Server
PORT=3001  # Railway sets this automatically
JWT_SECRET="strong-random-secret-32-chars-minimum"  # REQUIRED
NODE_ENV="production"  # REQUIRED

# CORS (comma-separated)
ALLOWED_ORIGINS="https://tuchonga-admin-production.up.railway.app"

# Frontend (set at build time)
VITE_API_URL="https://tuchonga-admin-production.up.railway.app"
```

---

## 🔧 Configuration Details

### API Server (`api/server.ts`)

**Local:**
- CORS allows: `localhost:5173`, `localhost:3039`, `localhost:3000`
- Detailed error messages with stack traces
- Default JWT_SECRET allowed (with warning)

**Production:**
- CORS restricted to `ALLOWED_ORIGINS` environment variable
- Error messages hide stack traces
- JWT_SECRET is required (throws error if missing)
- Graceful shutdown on SIGTERM

### Frontend

**Local:**
- Uses `VITE_API_URL` from `.env` or defaults to `http://localhost:3001`
- Development mode with hot reload

**Production:**
- `VITE_API_URL` must be set at build time
- Static files in `dist/` folder
- Served via Vite preview or static hosting

---

## 🚀 Build Commands

### Local Development

```bash
# Start frontend
npm run dev

# Start API server
npm run dev:api

# Start both
npm run dev:all
```

### Production Build

```bash
# Build frontend
npm run build

# Build API server
npm run build:api

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:deploy

# Start API server (production)
npm run start:api
```

---

## 🔒 Security Features

### Local Development
- ⚠️ CORS allows all localhost origins
- ⚠️ Default JWT_SECRET allowed (with warning)
- ✅ Stack traces in errors (helpful for debugging)

### Production
- ✅ CORS restricted to specified origins
- ✅ JWT_SECRET required (no defaults)
- ✅ No stack traces in error responses
- ✅ HTTPS enforced (via hosting platform)
- ✅ Environment variables secured

---

## 📊 Environment Detection

The application automatically detects the environment:

```typescript
// API Server
const isProduction = process.env.NODE_ENV === 'production';

// Frontend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

---

## 🧪 Testing Production Build Locally

1. **Set production environment:**
   ```bash
   export NODE_ENV=production
   export DATABASE_URL="your-production-db-url"
   export JWT_SECRET="your-production-secret"
   export ALLOWED_ORIGINS="http://localhost:5173"
   ```

2. **Build:**
   ```bash
   npm run build
   npm run build:api
   npm run prisma:generate
   ```

3. **Start:**
   ```bash
   npm run start:api  # API server
   npm run start      # Frontend preview
   ```

---

## 📚 Documentation

- **Local Setup**: See `QUICK_START.md`
- **Production Deployment**: See `PRODUCTION_DEPLOYMENT.md`
- **Database Setup**: See `DATABASE_SETUP.md`
- **Railway Setup**: See `RAILWAY_CONNECTION_GUIDE.md`

---

## ✅ Checklist

### Before Deploying to Production

- [ ] `JWT_SECRET` is set and strong (32+ characters)
- [ ] `DATABASE_URL` is configured
- [ ] `ALLOWED_ORIGINS` includes your frontend domain
- [ ] `NODE_ENV=production` is set
- [ ] `VITE_API_URL` points to production API
- [ ] Database migrations are applied
- [ ] Prisma Client is generated
- [ ] Build scripts are tested
- [ ] Health check endpoint works
- [ ] CORS is properly configured

---

**Last Updated:** 2024-12-29

