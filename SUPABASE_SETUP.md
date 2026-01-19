# 🚀 Supabase Setup Guide - Cross-Device Data Access

## Why Supabase?

Supabase is a modern, open-source alternative to Firebase/MongoDB. It uses PostgreSQL and provides:
- ✅ Free tier with generous limits
- ✅ Simple setup (5 minutes)
- ✅ Cross-device data sync
- ✅ No complex connection strings
- ✅ Built-in authentication (we'll use it for data storage only)

## Step-by-Step Setup

### Step 1: Create Supabase Account (2 min)

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign up"**
3. Sign up with GitHub (easiest) or email
4. Create a new organization (or use existing)

### Step 2: Create a New Project (2 min)

1. Click **"New Project"**
2. Fill in:
   - **Name**: `ecommerce-dashboard` (or any name)
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose closest to you
3. Click **"Create new project"**
4. Wait 2-3 minutes for project to be created

### Step 3: Get Your API Keys (1 min)

1. Once project is ready, go to **Settings** (gear icon) → **API**
2. You'll see:
   - **Project URL**: Copy this (looks like `https://xxxxx.supabase.co`)
   - **Service Role Key**: Click "Reveal" and copy this (starts with `eyJ...`)

### Step 4: Create Database Table (2 min)

1. Go to **Table Editor** (left sidebar)
2. Click **"New Table"**
3. Name: `products`
4. Add columns:
   - `user_email` (type: `text`, Primary Key: ✅, Unique: ✅)
   - `products` (type: `jsonb`)
   - `updated_at` (type: `timestamptz`, Default: `now()`)
5. Click **"Save"**

### Step 5: Set Row Level Security (RLS) (1 min)

1. Go to **Authentication** → **Policies**
2. Click on `products` table
3. Click **"New Policy"**
4. Choose **"Enable RLS"** (Row Level Security)
5. Create policy:
   - **Policy name**: `Users can only access their own products`
   - **Allowed operation**: `SELECT, INSERT, UPDATE`
   - **Policy definition**: 
     ```sql
     (auth.email() = user_email)
     ```
6. Click **"Save"**

### Step 6: Add Environment Variables to Vercel (1 min)

1. Go to Vercel → Your Project → **Settings** → **Environment Variables**
2. Add these two variables:

   **Variable 1:**
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: Your Project URL from Step 3
   - **Environment**: All (Production, Preview, Development)

   **Variable 2:**
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: Your Service Role Key from Step 3
   - **Environment**: All (Production, Preview, Development)

3. Click **"Save"** for each

### Step 7: Redeploy (1 min)

1. Go to **Deployments** → Latest deployment
2. Click **"..."** → **"Redeploy"**
3. Wait for deployment to complete

## ✅ Verify It's Working

After redeploy:
1. Sign in to your website
2. Add a product
3. Check Supabase Dashboard → **Table Editor** → `products` table
4. You should see a row with your email and products data

## 🎉 Done!

Your data will now:
- ✅ Sync across all devices
- ✅ Persist across deployments
- ✅ Survive server restarts
- ✅ Be accessible from anywhere

## 📋 Local Development

For local development, add to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 🔍 Troubleshooting

### "Missing Supabase environment variables"
- Check that both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel
- Make sure they're enabled for Production environment
- Redeploy after adding variables

### "Database query failed"
- Check Supabase Dashboard → Table Editor → Make sure `products` table exists
- Verify RLS policies are set correctly
- Check Supabase logs (Dashboard → Logs)

### Data not syncing
- Verify environment variables are correct
- Check Supabase Dashboard to see if data is being saved
- Check browser console for errors

## 💡 Benefits Over MongoDB

- Simpler setup (no connection strings to format)
- Better free tier
- SQL-based (easier to query)
- Built-in dashboard
- Real-time capabilities (if needed later)
