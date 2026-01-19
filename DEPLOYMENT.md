# Post-Deployment Setup Guide

After deploying your Ecommerce Dashboard, follow these steps to make it fully functional.

## Step 1: Get Your Deployment URL

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Click on your **Ecommerce-Dashboard** project
3. Copy your deployment URL (e.g., `https://ecommerce-dashboard-xyz.vercel.app`)

## Step 2: Configure Environment Variables in Vercel

1. In your Vercel project, go to **Settings** → **Environment Variables**
2. Add the following 4 variables:

### Required Environment Variables:

```
NEXTAUTH_URL=https://your-project-name.vercel.app
```

Replace `your-project-name.vercel.app` with your actual Vercel URL.

```
NEXTAUTH_SECRET=your-secret-key-here
```

Generate a secret key:
- **Windows PowerShell**: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))`
- **Or use an online generator**: https://generate-secret.vercel.app/32

```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Use the same Client ID and Secret from your `.env.local` file.

3. **Important**: After adding all variables, go to **Deployments** and click **Redeploy** to apply changes.

## Step 3: Update Google OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your **OAuth 2.0 Client ID**
4. Under **Authorized JavaScript origins**, add:
   ```
   https://your-project-name.vercel.app
   ```
   (Replace with your actual Vercel URL)

5. Under **Authorized redirect URIs**, add:
   ```
   https://your-project-name.vercel.app/api/auth/callback/google
   ```
   (Replace with your actual Vercel URL)

6. Click **Save**

## Step 4: Test Your Deployment

1. Visit your Vercel URL (e.g., `https://your-project-name.vercel.app`)
2. Click **"Sign in with Google"**
3. Sign in with your Google account
4. Test adding a product
5. Close the browser and come back - your products should still be there

## Troubleshooting

### Issue: "Error 401: invalid_client" when signing in
- **Solution**: Check that your Google OAuth Client ID and Secret are correctly set in Vercel environment variables
- Verify the redirect URI in Google Console matches your Vercel URL exactly

### Issue: "client_id is required" error
- **Solution**: Make sure all environment variables are set in Vercel and you've redeployed after adding them

### Issue: Session not persisting after sign in
- **Solution**: Verify `NEXTAUTH_URL` matches your production URL exactly (including https://)
- Check that `NEXTAUTH_SECRET` is set and not empty

### Issue: Products not saving
- **Solution**: Products are saved in localStorage, which is browser-specific. They won't sync across devices or browsers, but will persist in the same browser.

## Quick Checklist

- [ ] Deployment URL copied
- [ ] `NEXTAUTH_URL` set in Vercel (with your Vercel URL)
- [ ] `NEXTAUTH_SECRET` set in Vercel
- [ ] `GOOGLE_CLIENT_ID` set in Vercel
- [ ] `GOOGLE_CLIENT_SECRET` set in Vercel
- [ ] Redeployed after setting environment variables
- [ ] Google OAuth authorized origins updated with Vercel URL
- [ ] Google OAuth redirect URIs updated with Vercel URL
- [ ] Tested sign in with Google
- [ ] Tested adding products
- [ ] Verified products persist after refresh

Once all steps are complete, your Ecommerce Dashboard will be fully functional at your Vercel URL! 🎉
