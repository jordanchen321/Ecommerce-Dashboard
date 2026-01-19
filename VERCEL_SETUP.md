# Vercel Deployment Setup Guide

## Step 1: Add Environment Variables in Vercel Dashboard

1. Go to your Vercel project: https://vercel.com/dashboard
2. Click on your **Ecommerce-Dashboard** project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables (one by one):

### Required Environment Variables:

#### 1. NEXTAUTH_URL
- **Key:** `NEXTAUTH_URL`
- **Value:** `https://your-project-name.vercel.app` (replace with your actual Vercel URL)
- **Environment:** Production, Preview, Development (select all)

#### 2. NEXTAUTH_SECRET
- **Key:** `NEXTAUTH_SECRET`
- **Value:** Generate one with: `openssl rand -base64 32` (or use the one from your local `.env.local`)
- **Environment:** Production, Preview, Development (select all)

#### 3. GOOGLE_CLIENT_ID
- **Key:** `GOOGLE_CLIENT_ID`
- **Value:** Your Google OAuth Client ID (from Google Cloud Console)
- **Environment:** Production, Preview, Development (select all)

#### 4. GOOGLE_CLIENT_SECRET
- **Key:** `GOOGLE_CLIENT_SECRET`
- **Value:** Your Google OAuth Client Secret (from Google Cloud Console)
- **Environment:** Production, Preview, Development (select all)

#### 5. MONGODB_URI ⭐ (IMPORTANT FOR DATA PERSISTENCE)
- **Key:** `MONGODB_URI`
- **Value:** `mongodb+srv://jordan:Cyx821892@cluster0.zuhp1pk.mongodb.net/ecommerce_dashboard?retryWrites=true&w=majority`
- **Environment:** Production, Preview, Development (select all)

## Step 2: Update Google OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Add to **Authorized JavaScript origins:**
   - `https://your-project-name.vercel.app`
5. Add to **Authorized redirect URIs:**
   - `https://your-project-name.vercel.app/api/auth/callback/google`

## Step 3: Redeploy Your Project

After adding all environment variables:

1. Go to your Vercel project dashboard
2. Click on the **Deployments** tab
3. Click the **"..."** menu on the latest deployment
4. Select **"Redeploy"**
5. Make sure **"Use existing Build Cache"** is checked (optional)
6. Click **"Redeploy"**

## Step 4: Verify MongoDB Connection

After deployment, check the Vercel function logs:

1. Go to your project → **Deployments** → Click on the latest deployment
2. Click **"Functions"** tab
3. Look for logs showing:
   - `[MongoDB] ✓ MONGODB_URI is configured`
   - `[MongoDB] ✓✓✓ Successfully connected to MongoDB!`

## Quick Setup Script

You can also use the Vercel CLI to set environment variables:

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login

# Link your project (if not already linked)
vercel link

# Set environment variables
vercel env add NEXTAUTH_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add MONGODB_URI production
```

## Important Notes

- **MONGODB_URI**: Make sure to include the database name (`/ecommerce_dashboard`) in the connection string
- **Password Encoding**: If your MongoDB password contains special characters like `@`, encode them:
  - `@` = `%40`
  - `#` = `%23`
  - `%` = `%25`
- **Environment Scope**: Make sure to select **Production, Preview, and Development** for all variables
- **Redeploy Required**: After adding/changing environment variables, you MUST redeploy for changes to take effect

## Troubleshooting

### Data not saving to MongoDB on Vercel
- Check Vercel function logs for MongoDB connection errors
- Verify `MONGODB_URI` is set correctly in Vercel dashboard
- Make sure MongoDB Atlas Network Access allows Vercel's IP ranges (or use `0.0.0.0/0` for development)

### Authentication not working
- Verify `NEXTAUTH_URL` matches your Vercel deployment URL exactly
- Check Google OAuth redirect URIs include your Vercel URL
- Ensure `NEXTAUTH_SECRET` is set and matches between environments

### Environment variables not loading
- Redeploy after adding variables
- Check that variables are set for the correct environment (Production/Preview/Development)
- Verify variable names match exactly (case-sensitive)
