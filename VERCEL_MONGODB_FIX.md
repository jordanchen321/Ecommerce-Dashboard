# Fix: MongoDB Not Saving on Vercel

## Problem
- ✅ Data **loads** from MongoDB (GET works)
- ❌ Data **saves** to memory only (POST fails)
- Warning: "Products saved to memory only (MongoDB not configured)"

## Solution Checklist

### Step 1: Add MONGODB_URI to Vercel Environment Variables

1. Go to: https://vercel.com/dashboard
2. Select your **Ecommerce-Dashboard** project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Enter:
   - **Key:** `MONGODB_URI`
   - **Value:** `mongodb+srv://jordan:Cyx821892@cluster0.zuhp1pk.mongodb.net/ecommerce_dashboard?retryWrites=true&w=majority`
   - **Environment:** Select **ALL** (Production, Preview, Development)
6. Click **"Save"**

### Step 2: Allow Vercel IPs in MongoDB Atlas

**CRITICAL:** MongoDB Atlas blocks connections by default. You must allow Vercel's IP addresses.

1. Go to: https://cloud.mongodb.com/
2. Select your cluster
3. Click **"Network Access"** (left sidebar)
4. Click **"Add IP Address"**
5. Click **"Allow Access from Anywhere"** (or add `0.0.0.0/0`)
   - This allows all IPs (safe for development)
   - For production, you can restrict to Vercel's IP ranges
6. Click **"Confirm"**

**Note:** It may take 1-2 minutes for the change to take effect.

### Step 3: Redeploy on Vercel

**IMPORTANT:** After adding environment variables, you MUST redeploy:

1. Go to your Vercel project → **Deployments**
2. Click the **"..."** menu on the latest deployment
3. Select **"Redeploy"**
4. Wait for deployment to complete

### Step 4: Verify It's Working

After redeployment:

1. Open your Vercel site
2. Sign in and add a product
3. Check the browser console - you should see:
   - `[Frontend] ✓ Successfully saved X products to MongoDB`
   - (NOT the "memory only" warning)

4. Check Vercel Function Logs:
   - Go to **Deployments** → Latest deployment → **Functions** tab
   - Look for: `[POST] ✓ MongoDB client obtained successfully`
   - Look for: `[POST] 💾 Saving to MongoDB for your-email@gmail.com`

## Quick Test

After setup, test by:
1. Adding a product on Vercel
2. Checking MongoDB Compass - you should see a document with your email
3. Refreshing the page - product should still be there

## Common Issues

### "MongoDB not configured" but MONGODB_URI is set
- **Fix:** Redeploy after adding the variable
- **Fix:** Check variable name is exactly `MONGODB_URI` (case-sensitive)

### "Connection timeout" or "ENOTFOUND"
- **Fix:** MongoDB Atlas Network Access - allow `0.0.0.0/0` or Vercel IPs
- **Fix:** Wait 1-2 minutes after changing network access

### "Authentication failed"
- **Fix:** Check username/password in MONGODB_URI
- **Fix:** If password has `@`, encode it as `%40`

### Data loads but doesn't save
- **Fix:** This is your current issue - follow Steps 1-3 above
- **Fix:** Check Vercel function logs for POST endpoint errors
