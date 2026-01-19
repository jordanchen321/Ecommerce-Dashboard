# Firebase Firestore Setup Guide

This project uses **Firebase Firestore** for persistent data storage. Follow these steps to set it up.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select an existing project
3. Follow the setup wizard:
   - Enter a project name
   - Enable/disable Google Analytics (optional)
   - Click **"Create project"**

## Step 2: Create a Service Account

1. In your Firebase project, go to **Project Settings** (gear icon)
2. Click on the **"Service accounts"** tab
3. Click **"Generate new private key"**
4. A JSON file will download - **keep this file safe!** It contains your credentials

## Step 3: Extract Environment Variables

From the downloaded JSON file, you need these three values:

```json
{
  "project_id": "your-project-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
}
```

## Step 4: Set Up Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll set up security rules)
4. Select a location (choose closest to your users)
5. Click **"Enable"**

## Step 5: Set Up Firestore Security Rules

1. Go to **Firestore Database** → **Rules** tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && 
        request.auth.token.email == resource.data.gmail;
    }
  }
}
```

**Note:** For development/testing, you can use more permissive rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if true; // Allow all (development only!)
    }
  }
}
```

3. Click **"Publish"**

## Step 6: Add Environment Variables to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these three variables:

### FIREBASE_PROJECT_ID
- **Key:** `FIREBASE_PROJECT_ID`
- **Value:** Your project ID from the JSON file (e.g., `my-project-12345`)
- **Environment:** Select all (Production, Preview, Development)

### FIREBASE_PRIVATE_KEY
- **Key:** `FIREBASE_PRIVATE_KEY`
- **Value:** The entire private key from the JSON file, **including the `\n` characters**
  - It should look like: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n`
  - **Important:** Keep the `\n` characters - they are required!
- **Environment:** Select all (Production, Preview, Development)

### FIREBASE_CLIENT_EMAIL
- **Key:** `FIREBASE_CLIENT_EMAIL`
- **Value:** The client email from the JSON file (e.g., `firebase-adminsdk-xxxxx@my-project.iam.gserviceaccount.com`)
- **Environment:** Select all (Production, Preview, Development)

5. Click **"Save"** for each variable

## Step 7: Add Environment Variables Locally

Create or update `.env.local` in your project root:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Also keep your NextAuth variables
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Important:** 
- Wrap `FIREBASE_PRIVATE_KEY` in quotes if it contains special characters
- Keep the `\n` characters in the private key

## Step 8: Redeploy on Vercel

After adding environment variables:

1. Go to **Deployments** tab
2. Click **"..."** on the latest deployment
3. Select **"Redeploy"**
4. Wait for deployment to complete

## Step 9: Verify It's Working

1. Visit your Vercel site: `https://your-site.vercel.app/api/diagnostics`
2. Check that `FIREBASE_CONFIGURED.set` is `true`
3. Sign in to your app and add a product
4. Check browser console - you should see:
   ```
   [Frontend] ✓ Successfully saved X products to Firestore
   ```
5. Check Firebase Console → Firestore Database → `users` collection
   - You should see a document with your email (sanitized as document ID)
   - The document should have: `gmail`, `products`, `columnConfigs`, `updatedAt`

## Troubleshooting

### "Firebase not configured" warning

- Check that all three environment variables are set in Vercel
- Verify `FIREBASE_PRIVATE_KEY` includes `\n` characters
- Make sure you redeployed after adding variables
- Visit `/api/diagnostics` to see which variables are missing

### "Permission denied" error

- Check Firestore security rules allow writes
- Verify the service account has proper permissions
- For testing, use permissive rules (see Step 5)

### Data not persisting

- Check Vercel Function Logs for errors
- Verify Firestore security rules
- Check that the document ID format is correct (email sanitized)

## Data Structure

Firestore stores data in the `users` collection:

```
users/
  {sanitized-email}/
    gmail: "user@example.com"
    products: [...]
    columnConfigs: [...] | null
    updatedAt: Timestamp
```

The document ID is the user's email with special characters replaced by underscores (e.g., `user_example_com`).

## Security Notes

- **Never commit** the service account JSON file to Git
- Keep your private key secure
- Use proper Firestore security rules in production
- The service account has admin access - protect it like a password

## Need Help?

- Check `/api/diagnostics` endpoint for configuration status
- Review Vercel Function Logs for detailed error messages
- Firebase Console → Firestore → Data tab to see stored documents
