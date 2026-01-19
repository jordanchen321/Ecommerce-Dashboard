# Syncing Vercel Environment Variables to Local

This guide shows you how to sync your Vercel environment variables to your local `.env.local` file.

## Quick Method (Recommended)

After logging into Vercel CLI once, you can use the npm script:

```bash
npm run env:pull
```

Or directly:
```bash
vercel env pull .env.local
```

## Step-by-Step Setup

### 1. Install Vercel CLI (if not already installed)
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```
This will open your browser for authentication. Follow the prompts.

### 3. Link Your Project (if not already linked)
```bash
vercel link
```
Select your project from the list when prompted.

### 4. Pull Environment Variables
```bash
vercel env pull .env.local
```

This will:
- Download all environment variables from your Vercel project
- Update your `.env.local` file
- Preserve existing local variables if they're not in Vercel
- Add comments showing which environment each variable belongs to (Production, Preview, Development)

## What Gets Synced

The `vercel env pull` command will sync:
- `NEXTAUTH_URL` (from Vercel - will be your production URL)
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MONGODB_URI`

## Important Notes

1. **NEXTAUTH_URL**: After syncing, you may need to update this back to `http://localhost:3000` for local development, or use environment-specific values.

2. **Local Override**: If you need different values locally (e.g., different MongoDB connection for testing), you can manually edit `.env.local` after pulling.

3. **Security**: Never commit `.env.local` to git. It's already in `.gitignore`.

## Verification

After pulling, verify the sync worked:

```bash
# Check your .env.local file
cat .env.local
```

Or on Windows PowerShell:
```powershell
Get-Content .env.local
```

## Troubleshooting

### "No existing credentials found"
Run `vercel login` first to authenticate.

### "No project found"
Run `vercel link` to link your local project to Vercel.

### Variables not showing up
- Make sure the variables are set in Vercel dashboard
- Check that you've selected the correct environment (Production/Preview/Development)
- Try pulling again: `vercel env pull .env.local --force`

## Using Vercel MongoDB Integration

If you set up MongoDB using Vercel's integration (recommended in the tutorial):
- The `MONGODB_URI` will be automatically added to Vercel
- Use `vercel env pull` to get it locally
- No manual copying needed!

## Best Practice

Create a workflow:
1. Set up environment variables in Vercel dashboard first
2. Pull them locally using `npm run env:pull`
3. Restart your dev server to load new variables

This ensures your local and production environments stay in sync.
