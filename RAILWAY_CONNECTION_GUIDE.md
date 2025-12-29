# Railway Database Connection Guide

## Issue: Internal vs Public Connection String

The connection string you have uses `postgres.railway.internal`, which only works **inside Railway's network**. For local development, you need the **public connection string**.

---

## How to Get the Public Connection String

### Method 1: Railway Dashboard (Recommended)

1. **Go to Railway Dashboard**: [railway.app](https://railway.app)
2. **Select your project**
3. **Click on the PostgreSQL service**
4. **Go to the "Variables" tab**
5. **Look for `DATABASE_URL`** or `POSTGRES_URL`
6. **Copy the connection string**

The public connection string should look like:
```
postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
```

**Note:** The host should be something like `containers-us-west-xxx.railway.app` (NOT `postgres.railway.internal`)

---

### Method 2: Railway CLI

```bash
# Install Railway CLI (if not installed)
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Get the connection string
railway variables
```

---

### Method 3: Check Connection Tab

1. In Railway dashboard, click on PostgreSQL service
2. Go to **"Connect"** or **"Connection"** tab
3. Look for **"Public Network"** connection string
4. Copy that connection string

---

## Update .env File

Once you have the public connection string, update your `.env` file:

```bash
# Public connection string (for local development)
DATABASE_URL="postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway?sslmode=require"
```

**Important:** 
- The host should be a public domain (not `.internal`)
- Add `?sslmode=require` at the end for secure connection
- Keep your password secure (don't commit .env to git)

---

## Verify Connection

After updating `.env`, test the connection:

```bash
# Test connection
npx prisma db pull

# Or create migration
npx prisma migrate dev --name init
```

---

## Alternative: Use Railway Proxy (For Development)

If you can't get the public connection string, you can use Railway's proxy:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link project
railway login
railway link

# Start proxy (runs in background)
railway connect postgres

# This will output a local connection string like:
# postgresql://postgres:password@localhost:5432/railway
```

Then use that local connection string in your `.env` file.

---

## Quick Fix

If you have access to Railway dashboard:

1. **PostgreSQL service** → **Variables tab**
2. Look for connection string with **public domain** (not `.internal`)
3. Copy and paste into `.env` file
4. Make sure it includes `?sslmode=require` at the end

---

**Once you have the correct public connection string, we can proceed with the migration!** 🚀

