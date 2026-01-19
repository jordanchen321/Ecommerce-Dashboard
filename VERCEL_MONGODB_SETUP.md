# MongoDB Setup for Vercel - Two Methods

## ✅ Your Code is Already Optimized!

Your `lib/mongodb.ts` already follows serverless best practices:
- ✅ Module-level connection caching
- ✅ Global variable for development (HMR support)
- ✅ Connection pooling configured
- ✅ Proper error handling

You just need to configure MongoDB on Vercel. Here are **two methods**:

---

## Method 1: Vercel MongoDB Integration (EASIEST - Recommended)

The tutorial mentions Vercel has a **MongoDB integration in the marketplace** that automates everything:

### Steps:

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Click on your **Ecommerce-Dashboard** project

2. **Add MongoDB Integration:**
   - Go to **Settings** → **Integrations**
   - Search for **"MongoDB"** in the marketplace
   - Click **"Add Integration"**
   - Connect to your MongoDB Atlas account (or create one)
   - Select your project and cluster (or create new M0 free tier)
   - Vercel will automatically:
     - ✅ Create the database
     - ✅ Set up database users
     - ✅ Configure network access
     - ✅ **Inject MONGODB_URI into your environment variables**

3. **Sync Environment Variables Locally (Optional):**
   ```bash
   # Install Vercel CLI if not already installed
   npm install -g vercel
   
   # Login to Vercel
   vercel login
   
   # Pull environment variables to local .env.local
   vercel env pull .env.local
   ```

4. **Redeploy:**
   - Vercel should auto-redeploy after adding the integration
   - Or manually redeploy: **Deployments** → **"..."** → **"Redeploy"**

### Benefits:
- ✅ Fully automated setup
- ✅ No manual environment variable configuration
- ✅ Network access automatically configured
- ✅ Database users automatically created

---

## Method 2: Manual Setup (Current Approach)

If you prefer manual control or already have a MongoDB Atlas cluster:

### Steps:

1. **Add MONGODB_URI to Vercel:**
   - Go to **Settings** → **Environment Variables**
   - Click **"Add New"**
   - **Key:** `MONGODB_URI`
   - **Value:** `mongodb+srv://jordan:Cyx821892@cluster0.zuhp1pk.mongodb.net/ecommerce_dashboard?retryWrites=true&w=majority`
   - **Environment:** Select **ALL THREE** (Production, Preview, Development)
   - Click **"Save"**

2. **Configure MongoDB Atlas Network Access:**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com/)
   - Select your cluster
   - Click **Network Access** (left sidebar)
   - Click **"Add IP Address"**
   - Click **"Allow Access from Anywhere"** (adds `0.0.0.0/0`)
   - Click **"Confirm"**
   - Wait 1-2 minutes for changes to take effect

3. **Redeploy:**
   - Go to **Deployments** tab
   - Click **"..."** on latest deployment
   - Select **"Redeploy"**

---

## Verification

After setup (either method), verify it's working:

### 1. Check Browser Console
Add a product and look for:
```
[Frontend] ✓ Successfully saved X products to MongoDB
```
(NOT the "memory only" warning)

### 2. Check Vercel Function Logs
- Go to **Deployments** → Latest → **Functions** tab
- Look for:
  ```
  [MongoDB] ✓ MONGODB_URI is configured
  [POST] ✓ MongoDB client obtained successfully
  [POST] 💾 Saving to MongoDB for your-email@gmail.com
  ```

### 3. Test MongoDB Connection
Run locally (after syncing env vars):
```bash
node scripts/test-mongodb.js
```

### 4. Check MongoDB Compass
- Connect to your cluster
- Navigate to: `ecommerce_dashboard` → `products`
- You should see documents with structure:
  ```json
  {
    "gmail": "user@email.com",
    "products": [...],
    "columnConfigs": [...],
    "updatedAt": ISODate("...")
  }
  ```

---

## Why Your Code is Already Optimized

Your `lib/mongodb.ts` implements the **exact pattern** recommended in the tutorial:

### ✅ Connection Caching
```typescript
// Module-level promise - cached across serverless invocations
let clientPromise: Promise<MongoClient> | null = null

// In development: global variable survives HMR
if (!global._mongoClientPromise) {
  global._mongoClientPromise = client.connect()
}
clientPromise = global._mongoClientPromise

// In production: module caching reuses the promise
clientPromise = client.connect()
```

### ✅ Connection Pooling
```typescript
const options = {
  maxPoolSize: 10,        // Limits concurrent connections
  minPoolSize: 1,        // Maintains minimum connections
  maxIdleTimeMS: 30000,   // Closes idle connections
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
}
```

### ✅ Error Handling
- Comprehensive error messages
- Connection verification with ping
- Graceful fallback to in-memory storage

---

## Troubleshooting

### Issue: Still seeing "memory only" warning

**Check:**
1. ✅ MONGODB_URI is set in Vercel (Settings → Environment Variables)
2. ✅ Set for **Production, Preview, AND Development**
3. ✅ Redeployed after adding environment variable
4. ✅ MongoDB Atlas Network Access allows Vercel IPs (or `0.0.0.0/0`)

**Solution:**
- If using Method 1: Check integration status in Vercel
- If using Method 2: Verify environment variable name is exactly `MONGODB_URI` (case-sensitive)

### Issue: Connection timeout

**Solution:**
- Check MongoDB Atlas Network Access
- Wait 1-2 minutes after changing network access
- Verify cluster is running in MongoDB Atlas

### Issue: Authentication failed

**Solution:**
- Verify username/password in connection string
- If password has `@`, encode it as `%40`
- Check MongoDB Atlas user has read/write permissions

---

## Recommendation

**Use Method 1 (Vercel Integration)** if:
- You want the easiest setup
- You don't mind Vercel managing some MongoDB settings
- You're setting up a new project

**Use Method 2 (Manual Setup)** if:
- You already have a MongoDB Atlas cluster
- You want full control over database configuration
- You need specific network/user settings

Both methods work perfectly with your existing optimized code! 🚀
