# 🚀 Quick MongoDB Setup Guide - 10 Minutes

**This is why your data keeps disappearing!** Without MongoDB, data is stored in-memory and gets cleared on every redeploy.

## Step-by-Step Setup (Takes ~10 minutes)

### Step 1: Create MongoDB Atlas Account (2 min)

1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Click **"Sign Up"** (or "Try Free" if you have an account)
3. Fill out the form:
   - Email
   - Password
   - First/Last name
   - Company (optional - can put "Personal")
   - Choose "Build applications" as your goal
4. Click **"Get started free"**
5. Verify your email if needed

### Step 2: Create Free Cluster (3 min)

1. After signing in, you'll see the **"Deploy a cloud database"** screen
2. Select **"M0 FREE"** cluster (FREE tier - no credit card needed)
3. Choose a **Cloud Provider** (AWS, Google Cloud, or Azure - doesn't matter)
4. Choose a **Region** (pick one close to you, e.g., `us-east-1`)
5. Click **"Create"** (or "Create Deployment")
6. Wait 3-5 minutes for cluster to be created (you'll see "Your cluster is being created")

### Step 3: Create Database User (1 min)

While cluster is creating:

1. You'll see a popup for **"Create Database User"**
2. Choose **"Username and Password"**
3. Create a username (e.g., `admin` or your name)
4. Create a password (SAVE THIS - you'll need it!)
5. Click **"Create Database User"**
   - ⚠️ **IMPORTANT:** Save your password somewhere - you won't see it again!

### Step 4: Configure Network Access (1 min)

1. You'll see a popup for **"Network Access"**
2. Click **"Add My Current IP Address"** OR
3. Click **"Allow Access from Anywhere"** (easier, less secure but fine for development)
   - For "Allow from Anywhere", enter: `0.0.0.0/0`
4. Click **"Finish and Close"**

### Step 5: Get Connection String (2 min)

1. Once cluster is ready (green status), click **"Connect"** button on your cluster
2. Choose **"Drivers"** (or "Connect your application")
3. Select:
   - **Driver**: `Node.js`
   - **Version**: `5.5 or later` (or latest)
4. You'll see a connection string like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/
   ```
5. Click **"Copy"** to copy the connection string

### Step 6: Update Connection String (1 min)

1. Take the connection string you copied
2. **Replace `<username>`** with your database username (from Step 3)
3. **Replace `<password>`** with your database password (from Step 3)
4. **Add database name** at the end (before the `?` or `&`):
   ```
   mongodb+srv://yourusername:yourpassword@cluster0.xxxxx.mongodb.net/ecommerce_dashboard
   ```
   - Example: `mongodb+srv://admin:mypassword123@cluster0.abc123.mongodb.net/ecommerce_dashboard`

### Step 7: Add to Vercel (1 min)

1. Go to: https://vercel.com/dashboard
2. Click on your **Ecommerce-Dashboard** project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Fill in:
   - **Name**: `MONGODB_URI`
   - **Value**: Your connection string from Step 6 (the full string with username, password, and database name)
   - **Environment**: Select all three:
     - ✅ Production
     - ✅ Preview  
     - ✅ Development
6. Click **"Save"**

### Step 8: Redeploy (1 min)

1. After saving `MONGODB_URI`, go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete (2-3 minutes)

## ✅ Verify It's Working

After redeploy:

1. Go to your website and sign in
2. Add a test product
3. Check **Vercel Logs**:
   - Go to **Deployments** → Latest → **Logs**
   - Look for: `[POST] Saved 1 products for user ... to MongoDB`
   - You should see "MongoDB" in the log, NOT "in-memory"

**If you see:**
- ✅ `[POST] Saved X products ... to MongoDB` → **SUCCESS!** Data will now persist
- ❌ `MongoDB not configured` → `MONGODB_URI` isn't set in Vercel (go back to Step 7)
- ❌ `MongoDB error` → Connection string might be wrong (check username/password)

## 🎉 Done!

Once you see "Saved ... to MongoDB" in the logs, your data will:
- ✅ Persist across all deployments
- ✅ Survive server restarts
- ✅ Sync across devices
- ✅ Never be lost again!

## ⚠️ Common Issues

### "Connection timeout" or "Server selection failed"
- **Fix**: Check MongoDB Atlas → Network Access → Make sure your IP or `0.0.0.0/0` is allowed

### "Authentication failed"
- **Fix**: Double-check username and password in connection string

### "Invalid connection string"
- **Fix**: Make sure connection string starts with `mongodb+srv://` or `mongodb://`
- Make sure there are no extra spaces or quotes

### "MONGODB_URI not set" after adding it
- **Fix**: After adding environment variable, you MUST redeploy (Step 8)

## 📞 Need Help?

Check these files:
- `MONGODB_SETUP.md` - Detailed setup guide
- `TROUBLESHOOTING.md` - Common issues and fixes

Your data will persist once MongoDB is set up! 🚀
