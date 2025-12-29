# 🚀 Quick Start Guide - Super Admin Setup

## Prerequisites

✅ Prisma setup complete  
✅ Database connected  
✅ All dependencies installed  

---

## Step 1: Start the API Server

Open a terminal and run:

```bash
npm run dev:api
```

You should see:
```
🚀 API Server running on http://localhost:3001
📊 Health check: http://localhost:3001/health
```

**Keep this terminal running!**

---

## Step 2: Start the Frontend

Open another terminal and run:

```bash
npm run dev
```

Or use the combined command (starts both):

```bash
npm run dev:all
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

---

## Step 3: Create Super Admin

1. **Open your browser** and go to: `http://localhost:5173`
2. **You'll be automatically redirected** to `/setup` if super admin doesn't exist
3. **Fill in the form**:
   - Full Name: Your name
   - Email: Your email address
   - Phone Number: (Optional)
   - Password: At least 8 characters
   - Confirm Password: Same as password
4. **Click "Create Super Admin"**
5. **Success!** You'll see a success message

---

## Step 4: Sign In

1. **You'll be redirected** to the sign-in page (or go to `/`)
2. **Enter your credentials**:
   - Email: The email you used in setup
   - Password: The password you created
3. **Click "Sign in"**
4. **You'll be logged in** and redirected to the dashboard

---

## Step 5: Manage Admins

1. **Navigate to Admin Management**:
   - Click on "Admin" in the sidebar, or
   - Go directly to `http://localhost:5173/admin`
2. **Add New Admin**:
   - Click "Add Admin" button
   - Fill in the form
   - Select role (admin, moderator, or staff)
   - Click "Create"
3. **Edit Admin**:
   - Click the edit icon (pencil) on any admin row
   - Update information
   - Leave password blank to keep current password
   - Click "Update"
4. **Delete Admin**:
   - Click the delete icon (trash) on any admin row
   - Confirm deletion
   - Admin will be soft-deleted (isActive = false)

---

## 🎯 What's Working

✅ Super admin setup page  
✅ Admin authentication (Prisma-based)  
✅ Admin management (CRUD operations)  
✅ JWT token-based auth  
✅ Role-based access control  
✅ Existing UI components used  

---

## 🔧 Troubleshooting

### API Server Won't Start

**Error: "Cannot find module"**
```bash
npm install
```

**Error: "Port 3001 already in use"**
```bash
# Kill the process using port 3001
lsof -ti:3001 | xargs kill -9
```

**Error: "Database connection failed"**
- Check your `.env` file has correct `DATABASE_URL`
- Verify Railway database is accessible

### Frontend Won't Connect to API

**Check:**
1. API server is running on port 3001
2. `VITE_API_URL` in `.env` is set to `http://localhost:3001`
3. No CORS errors in browser console

### Can't Create Super Admin

**Check:**
1. API server is running
2. Database connection is working
3. No errors in API server terminal
4. Check browser console for errors

---

## 📝 Environment Variables

Make sure your `.env` file has:

```env
# Database (Railway)
DATABASE_URL="postgresql://postgres:password@maglev.proxy.rlwy.net:11976/railway"

# API Server
PORT=3001
JWT_SECRET="your-secret-key-change-in-production"

# Frontend
VITE_API_URL="http://localhost:3001"
```

---

## 🎉 You're All Set!

Once you've:
1. ✅ Started the API server
2. ✅ Started the frontend
3. ✅ Created super admin
4. ✅ Signed in

You can now:
- Manage admins at `/admin`
- Use all existing features (they still use Firebase for now)
- Gradually migrate other features to Prisma

**Everything is ready to go!** 🚀

