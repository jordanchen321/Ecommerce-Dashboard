# MongoDB Data Storage Diagnostics

## Problem: Data Not Being Added to ecommerce-dashboard Database

If data is not appearing in MongoDB Compass, follow these steps:

## Step 1: Check Environment Variables

### Local Development
1. Open `.env.local` in your project root
2. Verify `MONGODB_URI` is set:
   ```
   MONGODB_URI=mongodb+srv://jordan:Cyx821892@cluster0.zuhp1pk.mongodb.net/ecommerce_dashboard?retryWrites=true&w=majority
   ```
3. **Restart your dev server** after changing `.env.local`

### Vercel Deployment
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify `MONGODB_URI` is set for **Production, Preview, and Development**
3. **Redeploy** after adding/changing environment variables

## Step 2: Check Server Logs

### Local Development
Look for these log messages in your terminal:

**✅ Good Signs:**
```
[MongoDB] ✓ MONGODB_URI is configured
[MongoDB] ✓✓✓ Successfully connected to MongoDB!
[POST] ✓ MongoDB client obtained successfully
[POST] ✓ Collection accessible - current document count: X
[POST] MongoDB update result: modified=1 or upsertedCount=1
[POST] ✓ Document found in database after save
```

**❌ Bad Signs:**
```
[MongoDB] ⚠ MONGODB_URI is NOT configured
[POST] ⚠⚠⚠ Using in-memory storage
[POST] ❌ MongoDB operation failed
[POST] ❌❌❌ CRITICAL ERROR: Document NOT FOUND after save!
```

### Vercel Deployment
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on latest deployment → **Functions** tab
3. Look for the same log messages above

## Step 3: Verify Database Name

The code uses database name: `ecommerce_dashboard`

**Check your connection string:**
- Should end with: `...mongodb.net/ecommerce_dashboard?retryWrites=true&w=majority`
- The `/ecommerce_dashboard` part specifies the database name
- If missing, MongoDB will use the default database

## Step 4: Check MongoDB Atlas Network Access

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Select your cluster
3. Click **Network Access** (left sidebar)
4. Verify your IP is allowed (or `0.0.0.0/0` for all IPs)
5. **Wait 1-2 minutes** after changing network access

## Step 5: Verify Collection Name

The code uses collection name: `products`

**In MongoDB Compass:**
1. Connect to your cluster
2. Select database: `ecommerce_dashboard`
3. Look for collection: `products`
4. Documents should have structure:
   ```json
   {
     "gmail": "user@email.com",
     "products": [...],
     "columnConfigs": [...],
     "updatedAt": ISODate("...")
   }
   ```

## Step 6: Test the Connection

Run this test script to verify MongoDB connection:

```bash
node scripts/test-mongodb.js
```

This will:
- Test the connection
- List databases
- Count documents in the `products` collection
- Show sample documents

## Step 7: Common Issues & Fixes

### Issue: "MongoDB not configured" warning
**Fix:**
- Check `.env.local` exists and has `MONGODB_URI`
- Restart dev server: `npm run dev`
- For Vercel: Add `MONGODB_URI` in environment variables and redeploy

### Issue: "Connection timeout"
**Fix:**
- Check MongoDB Atlas Network Access allows your IP
- Wait 1-2 minutes after changing network access
- Check firewall settings

### Issue: "Authentication failed"
**Fix:**
- Verify username and password in connection string
- If password has `@`, encode it as `%40`
- Check MongoDB Atlas user has read/write permissions

### Issue: "Document NOT FOUND after save"
**Fix:**
- Check server logs for actual error messages
- Verify database name matches: `ecommerce_dashboard`
- Verify collection name matches: `products`
- Check if upsert operation succeeded (look for `upsertedCount: 1`)

### Issue: Data appears in logs but not in MongoDB Compass
**Fix:**
- Refresh MongoDB Compass (click refresh button)
- Verify you're connected to the correct cluster
- Verify you're looking at database: `ecommerce_dashboard`
- Verify you're looking at collection: `products`
- Check if document has `gmail` field (not `userEmail`)

## Step 8: Manual Verification

1. **Add a product** in your app
2. **Check server logs** for save confirmation
3. **Open MongoDB Compass**
4. **Connect** to your cluster
5. **Navigate** to: `ecommerce_dashboard` → `products`
6. **Look for document** with your email in `gmail` field
7. **Verify** it has `products` array with your product

## Still Not Working?

1. **Check all server logs** (both local terminal and Vercel function logs)
2. **Copy error messages** exactly as they appear
3. **Verify**:
   - MONGODB_URI is set correctly
   - Database name is `ecommerce_dashboard`
   - Collection name is `products`
   - Network access is allowed in MongoDB Atlas
   - Server was restarted/redeployed after environment variable changes
