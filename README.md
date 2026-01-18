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
