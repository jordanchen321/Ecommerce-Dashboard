# 🔴 URGENT: MongoDB Setup Required to Prevent Data Loss

## Problem
**Your data disappears on every Vercel redeploy because MongoDB is not configured.**

When `MONGODB_URI` is not set in Vercel environment variables, the app uses in-memory storage which gets **cleared on every redeploy**.

## Solution: Set Up MongoDB Atlas (FREE)

### Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for a free account (or sign in if you have one)
3. Create a **FREE** M0 cluster (takes ~5 minutes)

### Step 2: Get Your Connection String
1. In MongoDB Atlas, click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Select **Node.js** and **version 5.5 or later**
4. Copy the connection string (looks like this):
   ```
   mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/
   ```

### Step 3: Configure Your Database
1. **Replace `<password>`** with your actual MongoDB Atlas database password
2. **Add database name** at the end (optional but recommended):
   ```
   mongodb+srv://username:yourpassword@cluster0.xxxxx.mongodb.net/ecommerce_dashboard
   ```

### Step 4: Configure Network Access
1. In MongoDB Atlas, go to **Network Access** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for simplicity) or add Vercel's IPs
4. Click **"Confirm"**

### Step 5: Add Environment Variable to Vercel
1. Go to your Vercel project: [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your **Ecommerce-Dashboard** project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Add:
   - **Name**: `MONGODB_URI`
   - **Value**: Your connection string from Step 3
     ```
     mongodb+srv://username:yourpassword@cluster0.xxxxx.mongodb.net/ecommerce_dashboard
     ```
   - **Environment**: Select all (Production, Preview, Development)
6. Click **"Save"**

### Step 6: Redeploy
1. After adding `MONGODB_URI`, go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete

### Step 7: Verify It's Working
1. After redeploy, add a product to your dashboard
2. Check Vercel logs (Deployments → click deployment → Logs)
3. You should see: `[POST] Saved X products for user ... to MongoDB`
4. If you see warnings about "MongoDB not configured", check your `MONGODB_URI` value

## ✅ Success Checklist
- [ ] MongoDB Atlas account created
- [ ] M0 cluster created (free tier)
- [ ] Connection string copied
- [ ] `<password>` replaced in connection string
- [ ] Network access configured (Allow from anywhere)
- [ ] `MONGODB_URI` added to Vercel environment variables
- [ ] Vercel project redeployed
- [ ] Logs show "Saved X products ... to MongoDB" (not "in-memory")

## 🔍 Troubleshooting

### Data Still Disappears After Setup
1. **Check Vercel Logs**: Go to Deployments → Latest → Logs
   - Look for: `[GET] MongoDB not configured` or `[POST] MongoDB not configured`
   - If you see these, `MONGODB_URI` is not set correctly

2. **Verify Environment Variable**:
   - Go to Vercel → Settings → Environment Variables
   - Confirm `MONGODB_URI` exists and has the correct value
   - Make sure it's enabled for **Production** environment

3. **Test Connection String**:
   - Copy your `MONGODB_URI` from Vercel
   - Try connecting with MongoDB Compass (desktop app) to verify it works

4. **Check MongoDB Atlas**:
   - Verify your cluster is running (status should be green)
   - Check Network Access allows your IP
   - Verify database user has read/write permissions

### Still Having Issues?
- Check Vercel logs for detailed error messages
- Make sure connection string has no extra spaces or quotes
- Verify MongoDB cluster is not paused (free tier pauses after 1 week of inactivity)

## 📊 After Setup
Once MongoDB is configured:
- ✅ Data persists across all deployments
- ✅ Data syncs across all devices
- ✅ Data survives server restarts
- ✅ Code updates never affect user data

**Your data is now safely stored in MongoDB Atlas cloud database!**
