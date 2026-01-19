# Quick Fix: "MongoDB not configured" on Vercel

## The Problem
You're seeing this warning in the browser console:
```
[Frontend] ⚠ Products saved to memory only (MongoDB not configured)
```

This means **MONGODB_URI is not set in your Vercel environment variables**.

## The Solution (3 Steps)

### Step 1: Add MONGODB_URI to Vercel

1. Go to: https://vercel.com/dashboard
2. Click on your **Ecommerce-Dashboard** project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Enter:
   - **Key:** `MONGODB_URI`
   - **Value:** `mongodb+srv://jordan:Cyx821892@cluster0.zuhp1pk.mongodb.net/ecommerce_dashboard?retryWrites=true&w=majority`
   - **Environment:** Select **ALL THREE** (Production, Preview, Development)
6. Click **"Save"**

### Step 2: Redeploy (CRITICAL!)

**You MUST redeploy after adding environment variables:**

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Select **"Redeploy"**
4. Wait for deployment to complete (1-2 minutes)

### Step 3: Verify It's Working

After redeployment:

1. **Open your Vercel site** and sign in
2. **Add a product**
3. **Check browser console** - you should see:
   ```
   [Frontend] ✓ Successfully saved X products to MongoDB
   ```
   (NOT the "memory only" warning)

4. **Check Vercel Function Logs:**
   - Go to **Deployments** → Latest → **Functions** tab
   - Look for: `[POST] ✓ MongoDB client obtained successfully`
   - Look for: `[POST] 💾 Saving to MongoDB for your-email@gmail.com`

## Why This Happens

On Vercel, environment variables are **NOT** automatically available. You must:
1. ✅ Add them in the Vercel dashboard
2. ✅ Redeploy after adding them

The code checks for `process.env.MONGODB_URI` - if it's not set, it falls back to in-memory storage (which is lost on server restart).

## Still Seeing the Warning?

1. **Double-check** MONGODB_URI is set in Vercel (Settings → Environment Variables)
2. **Verify** it's set for **Production, Preview, AND Development**
3. **Make sure** you redeployed after adding it
4. **Check** Vercel function logs for MongoDB connection errors

## Test After Fix

1. Add a product on your Vercel site
2. Run: `node scripts/test-mongodb.js` (locally)
3. You should see your document in MongoDB Compass:
   - Database: `ecommerce_dashboard`
   - Collection: `products`
   - Document with `gmail` field = your email
