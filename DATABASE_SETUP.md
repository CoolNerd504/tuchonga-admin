# Database Setup Guide

## Current Status

✅ Prisma packages installed  
✅ Prisma Client generated  
⏳ Database connection needed

---

## Option 1: Railway PostgreSQL (Recommended - Cloud)

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create a new project

### Step 2: Add PostgreSQL Database
1. In your Railway project, click **"New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically provision a PostgreSQL database

### Step 3: Get Connection String
1. Click on the PostgreSQL service
2. Go to the **"Variables"** tab
3. Copy the `DATABASE_URL` value
   - It looks like: `postgresql://postgres:password@hostname.railway.app:5432/railway`

### Step 4: Update .env File
```bash
# Update .env file with Railway DATABASE_URL
DATABASE_URL="postgresql://postgres:password@hostname.railway.app:5432/railway?sslmode=require"
```

### Step 5: Run Migration
```bash
npx prisma migrate dev --name init
```

---

## Option 2: Local PostgreSQL (Development)

### Step 1: Install PostgreSQL

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
- Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- Or use [Postgres.app](https://postgresapp.com/)

### Step 2: Create Database

```bash
# Create database
createdb tuchonga

# Or using psql
psql postgres
CREATE DATABASE tuchonga;
\q
```

### Step 3: Update .env File

```bash
# For local development
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/tuchonga"
```

**Default PostgreSQL setup:**
- Username: Your macOS username (or `postgres`)
- Password: Usually empty (or set during installation)
- Port: 5432
- Database: tuchonga

**Example:**
```bash
DATABASE_URL="postgresql://postgres@localhost:5432/tuchonga"
```

### Step 4: Run Migration

```bash
npx prisma migrate dev --name init
```

---

## Quick Setup Script

We've created a setup script to help with local setup:

```bash
# Run the setup script
./setup-database.sh
```

This will:
- Check if PostgreSQL is installed
- Create the database if it doesn't exist
- Provide next steps

---

## Verify Database Connection

### Test Connection

```bash
# Test with Prisma
npx prisma db pull

# Or test with psql
psql $DATABASE_URL
```

### Create Migration

Once connected:

```bash
# Create initial migration (creates all tables)
npx prisma migrate dev --name init
```

This will:
- Create all tables in your database
- Generate migration files in `prisma/migrations/`
- Apply the migration

### View Database

```bash
# Open Prisma Studio (visual database browser)
npx prisma studio
```

This opens at `http://localhost:5555` where you can:
- View all tables
- See the database structure
- Add test data manually

---

## Troubleshooting

### Error: "Can't reach database server"

**Check:**
1. PostgreSQL is running:
   ```bash
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status postgresql
   ```

2. DATABASE_URL is correct in `.env`
3. Database exists:
   ```bash
   psql -l
   ```

### Error: "password authentication failed"

**Solution:**
1. Check your PostgreSQL username/password
2. For local dev, try without password:
   ```bash
   DATABASE_URL="postgresql://postgres@localhost:5432/tuchonga"
   ```
3. Or reset PostgreSQL password:
   ```bash
   psql postgres
   ALTER USER postgres PASSWORD 'newpassword';
   ```

### Error: "database does not exist"

**Solution:**
```bash
createdb tuchonga
```

### Error: "relation already exists"

**Solution:**
The database might already have tables. You can:
1. Reset the database (⚠️ deletes all data):
   ```bash
   npx prisma migrate reset
   ```
2. Or continue with existing tables

---

## Next Steps After Database Setup

1. ✅ Database connected
2. ✅ Migration created
3. ⏳ Create Prisma service files
4. ⏳ Update application code
5. ⏳ Test CRUD operations

---

## Railway Deployment

Once your local setup works:

1. **Add PostgreSQL to Railway** (if not already added)
2. **Set Environment Variable:**
   ```bash
   railway variables set DATABASE_URL="postgresql://..."
   ```
3. **Deploy:**
   ```bash
   railway up
   ```
4. **Run Migrations:**
   ```bash
   railway run npx prisma migrate deploy
   ```

---

**Ready to set up your database?** Choose Option 1 (Railway) or Option 2 (Local) above!

