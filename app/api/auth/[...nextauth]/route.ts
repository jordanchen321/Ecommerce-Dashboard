import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// Validate required environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Missing Google OAuth credentials. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.")
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("Missing NEXTAUTH_SECRET. Please set NEXTAUTH_SECRET environment variable.")
}

// Warn if NEXTAUTH_URL is not set (required for OAuth redirects)
if (!process.env.NEXTAUTH_URL) {
  console.warn("⚠️  NEXTAUTH_URL is not set. OAuth redirects may fail. Set NEXTAUTH_URL=http://localhost:3000 in your .env.local file.")
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  pages: {
    signIn: '/',
  },
  callbacks: {
    async session({ session }) {
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
