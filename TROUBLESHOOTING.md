# 🔴 Data Loss After Updates - Troubleshooting Guide

## Why Data Disappears After Updates

**The root cause:** If MongoDB is not configured in Vercel, your data is stored in **in-memory** (temporary) storage. This gets **cleared on every redeploy**.

## Quick Diagnosis

### Check Your Vercel Logs

1. Go to your Vercel project dashboard
2. Click on **Deployments** → Click the latest deployment
3. Click **Logs** tab
4. Look for these messages:

**If MongoDB is NOT configured, you'll see:**
```
[GET] MongoDB not configured (MONGODB_URI not set) - using in-memory storage
[GET] WARNING: Data will be LOST on redeploy without MongoDB
```

**If MongoDB IS configured but has issues:**
```
MongoDB error in GET: [error details]
Falling back to in-memory storage - DATA WILL BE LOST ON REDEPLOY
```

**If MongoDB is working correctly:**
```
[GET] Loaded X products for user your@email.com from MongoDB
```

## Solution: Set Up MongoDB

### Step 1: Check if MONGODB_URI is Set

1. Go to Vercel → Your Project → **Settings** → **Environment Variables**
2. Look for `MONGODB_URI`
3. If it's missing → You need to set up MongoDB (see Step 2)
4. If it exists → Check the value is correct (format: `mongodb+srv://...`)

### Step 2: Set Up MongoDB (If Not Done Yet)

See `MONGODB_SETUP.md` for detailed instructions, or:

1. Create MongoDB Atlas account: https://www.mongodb.com/cloud/atlas/register
2. Create a free M0 cluster
3. Get connection string (Connect → Drivers → Copy)
4. Add `MONGODB_URI` to Vercel environment variables
5. Redeploy

### Step 3: Verify Your Data Still Exists

**Good News:** If you had data before and MongoDB was never configured, the data was in-memory and is likely lost.

**However, if MongoDB WAS configured but data disappeared:**
1. Check MongoDB Atlas dashboard
2. Go to your cluster → Collections
3. Look for `ecommerce_dashboard` database → `products` collection
4. Your data should still be there!

## Recovery Steps (If Data Should Still Exist)

### Check MongoDB Atlas Directly

1. Log into MongoDB Atlas
2. Click **"Browse Collections"** on your cluster
3. Navigate to: `ecommerce_dashboard` → `products`
4. Look for documents with your email address

**If data exists in MongoDB but not loading:**
- Check Vercel logs for connection errors
- Verify `MONGODB_URI` format is correct
- Check MongoDB Network Access allows Vercel IPs

### Check Vercel Environment Variables

1. Go to Vercel → Settings → Environment Variables
2. Verify `MONGODB_URI` is:
   - Present
   - Has correct value (starts with `mongodb+srv://`)
   - Enabled for **Production** environment
3. **After adding/updating** → **Redeploy** the project

## Prevention: Always Use MongoDB

**Without MongoDB:**
- ❌ Data lost on every redeploy
- ❌ Data lost on server restart
- ❌ Data lost on cold start
- ❌ No cross-device sync

**With MongoDB:**
- ✅ Data persists across ALL deployments
- ✅ Data survives server restarts
- ✅ Data syncs across devices
- ✅ Data survives code updates

## Code Update Safety

The latest update (adding image support) is **100% backward compatible**:
- The `image` field is optional (`image?: string`)
- Products without images still work perfectly
- Existing products will load normally (they just won't have images)

**The data loss is NOT caused by the code update** - it's caused by missing MongoDB configuration.

## Immediate Action Required

1. **Check Vercel Logs** to confirm MongoDB status
2. **Set up MongoDB** if not already configured (see `MONGODB_SETUP.md`)
3. **Verify** data is loading from MongoDB (check logs after redeploy)

Once MongoDB is properly configured, **all future updates will preserve your data**.
