# Ecommerce Dashboard

A modern web application for managing products with Google authentication.

## Features

- 🔐 Google OAuth authentication
- ➕ Add products with name, price, product ID, and quantity
- 📊 View all products in a table
- 🔍 Search products by Product ID
- 🗑️ Remove products from the list
- 💾 Products are saved per user in localStorage

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Google OAuth client ID and secret

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

3. Get Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable Google+ API
   - Go to "Credentials" → "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add `http://localhost:3000` to authorized JavaScript origins
   - Add `http://localhost:3000/api/auth/callback/google` to authorized redirect URIs
   - Copy the Client ID and Client Secret to your `.env.local` file

4. Generate a NextAuth secret:
```bash
openssl rand -base64 32
```
Add this to `NEXTAUTH_SECRET` in your `.env.local` file.

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Sign in with your Google account
2. Add products using the form on the left
3. View all products in the table on the right
4. Search for products by Product ID using the search bar
5. Remove products by clicking the "Remove" button

## Deployment

### Deploy to Vercel (Recommended)

1. **Push your code to GitHub** (already done ✅)

2. **Import your project to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account
   - Click "Add New Project"
   - Select your `Ecommerce-Dashboard` repository
   - Click "Import"

3. **Configure Environment Variables:**
   - In the Vercel project settings, go to "Settings" → "Environment Variables"
   - Add the following variables:
     ```
     NEXTAUTH_URL=https://your-project-name.vercel.app
     NEXTAUTH_SECRET=your-secret-key-here (generate with: openssl rand -base64 32)
     GOOGLE_CLIENT_ID=your-google-client-id
     GOOGLE_CLIENT_SECRET=your-google-client-secret
     ```
   - After adding all variables, **redeploy** the project

4. **Update Google OAuth Settings:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to your OAuth 2.0 Client ID
   - Add your Vercel URL to **Authorized JavaScript origins:**
     - `https://your-project-name.vercel.app`
   - Add to **Authorized redirect URIs:**
     - `https://your-project-name.vercel.app/api/auth/callback/google`

5. **Deploy:**
   - Click "Deploy" (or it will auto-deploy after environment variables are set)
   - Your site will be live at `https://your-project-name.vercel.app`

**Important:** The website will only work fully after you set all environment variables in Vercel and update the Google OAuth redirect URLs.

## Technologies Used

- Next.js 14 (App Router)
- React 18
- TypeScript
- NextAuth.js (Google OAuth)
- Tailwind CSS
- localStorage (for data persistence)

## Project Structure

```
├── app/
│   ├── api/auth/[...nextauth]/route.ts  # NextAuth configuration
│   ├── layout.tsx                        # Root layout
│   ├── page.tsx                          # Main dashboard page
│   ├── providers.tsx                     # Session provider
│   └── globals.css                       # Global styles
├── components/
│   ├── ProductForm.tsx                   # Product add form
│   ├── ProductTable.tsx                  # Products table
│   └── SearchBar.tsx                     # Search component
└── package.json                          # Dependencies
```
