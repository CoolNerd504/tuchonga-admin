# Prisma Setup Guide

## ✅ Current Status

- ✅ Prisma schema exists at `prisma/schema.prisma`
- ✅ Prisma scripts are in `package.json`
- ✅ Prisma service file created at `src/services/prismaService.ts`
- ⏳ Need to install Prisma packages
- ⏳ Need to set up database connection

---

## Step 1: Install Prisma Packages

Run these commands in your terminal:

```bash
# Install Prisma Client
yarn add prisma @prisma/client

# Install TypeScript dependencies (if not already installed)
yarn add -D typescript ts-node @types/node
```

**Note:** If you encounter permission errors, try:
```bash
# Clear yarn cache
yarn cache clean

# Or use npm instead
npm install prisma @prisma/client
npm install -D typescript ts-node @types/node
```

---

## Step 2: Set Up Database

### Option A: Local PostgreSQL (Development)

```bash
# Install PostgreSQL (macOS)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb tuchonga

# Or using psql
psql postgres
CREATE DATABASE tuchonga;
\q
```

### Option B: Railway PostgreSQL (Recommended for Production)

1. Sign up at [Railway.app](https://railway.app)
2. Create a new project
3. Click "New" → "Database" → "Add PostgreSQL"
4. Copy the connection string (DATABASE_URL)
5. It will look like: `postgresql://postgres:password@host:port/railway`

---

## Step 3: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env

# Or create manually
touch .env
```

Add your database URL to `.env`:

```env
# For local development
DATABASE_URL="postgresql://username:password@localhost:5432/tuchonga"

# For Railway (use the connection string from Railway dashboard)
DATABASE_URL="postgresql://postgres:password@host:port/railway?sslmode=require"
```

**Important:** The `.env` file is already in `.gitignore`, so it won't be committed to git.

---

## Step 4: Generate Prisma Client

```bash
# Generate Prisma Client
npx prisma generate
```

This creates the Prisma Client based on your schema.

---

## Step 5: Create Database Schema

```bash
# Create initial migration (creates all tables)
npx prisma migrate dev --name init
```

This will:
- Create all tables in your database
- Generate migration files
- Apply the migration

**Note:** This creates an **empty database** - no data migration yet!

---

## Step 6: Verify Setup

### Option A: Prisma Studio (Visual Database Browser)

```bash
npx prisma studio
```

This opens a web interface at `http://localhost:5555` where you can:
- View all tables
- See the empty database structure
- Manually add test data if needed

### Option B: Check via Command Line

```bash
# Check if Prisma Client is generated
ls -la node_modules/.prisma/client

# Test database connection
npx prisma db pull
```

---

## Step 7: Test Prisma Service

Create a test file to verify Prisma is working:

```typescript
// test-prisma.ts
import { prisma } from './src/services/prismaService';

async function test() {
  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Prisma connected successfully!');
    
    // Test query (should return empty array)
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

test();
```

Run it:
```bash
npx ts-node test-prisma.ts
```

---

## Step 8: Update Application Code

Now you can start using Prisma in your application. See `INFRASTRUCTURE_FIRST_MIGRATION.md` for examples of:
- Creating service files
- Updating components to use Prisma
- Replacing Firebase calls

---

## Common Commands

```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Create a new migration
npx prisma migrate dev --name migration_name

# View database in browser
npx prisma studio

# Reset database (⚠️ deletes all data!)
npx prisma migrate reset

# Apply migrations in production
npx prisma migrate deploy
```

---

## Troubleshooting

### Error: "Can't reach database server"

- Check your `DATABASE_URL` in `.env`
- Verify PostgreSQL is running: `brew services list` (macOS)
- Test connection: `psql $DATABASE_URL`

### Error: "Prisma Client not generated"

```bash
npx prisma generate
```

### Error: "Module not found: @prisma/client"

```bash
yarn add @prisma/client
# or
npm install @prisma/client
```

### Error: "Migration failed"

```bash
# Reset and try again (⚠️ deletes data!)
npx prisma migrate reset

# Or manually fix the migration
npx prisma migrate dev
```

---

## Next Steps

1. ✅ Install Prisma packages
2. ✅ Set up database (local or Railway)
3. ✅ Configure `.env` file
4. ✅ Generate Prisma Client
5. ✅ Create database schema
6. ✅ Verify setup with Prisma Studio
7. ⏳ Update application code to use Prisma
8. ⏳ Deploy to Railway
9. ⏳ Migrate data later (separate task)

---

## Railway Deployment

Once your local setup works:

1. **Add PostgreSQL to Railway:**
   - Railway dashboard → Your project → "New" → "Database" → "PostgreSQL"
   - Copy the `DATABASE_URL`

2. **Set Environment Variables:**
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

**Ready to start?** Begin with Step 1 above!

