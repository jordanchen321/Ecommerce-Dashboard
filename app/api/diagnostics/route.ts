import { NextResponse } from "next/server"

// Disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Diagnostic endpoint to check environment variable configuration
 * This helps diagnose why Firebase might not be working on Vercel
 */
export async function GET() {
  try {
    const firebaseProjectIdSet = !!process.env.FIREBASE_PROJECT_ID
    const firebasePrivateKeySet = !!process.env.FIREBASE_PRIVATE_KEY
    const firebaseClientEmailSet = !!process.env.FIREBASE_CLIENT_EMAIL
    const firebaseConfigured = firebaseProjectIdSet && firebasePrivateKeySet && firebaseClientEmailSet
    
    const nextAuthUrlSet = !!process.env.NEXTAUTH_URL
    const nextAuthSecretSet = !!process.env.NEXTAUTH_SECRET
    const googleClientIdSet = !!process.env.GOOGLE_CLIENT_ID
    const googleClientSecretSet = !!process.env.GOOGLE_CLIENT_SECRET

    // Mask Firebase credentials for security
    let firebaseProjectIdPreview = "Not set"
    if (firebaseProjectIdSet && process.env.FIREBASE_PROJECT_ID) {
      const projectId = process.env.FIREBASE_PROJECT_ID
      firebaseProjectIdPreview = projectId.length > 20 ? `${projectId.substring(0, 20)}...` : projectId
    }

    return NextResponse.json({
      environment: process.env.NODE_ENV || "unknown",
      vercel: !!process.env.VERCEL,
      environmentVariables: {
        FIREBASE_PROJECT_ID: {
          set: firebaseProjectIdSet,
          preview: firebaseProjectIdPreview,
          note: firebaseProjectIdSet 
            ? "✓ Firebase Project ID is configured" 
            : "❌ FIREBASE_PROJECT_ID is NOT set"
        },
        FIREBASE_PRIVATE_KEY: {
          set: firebasePrivateKeySet,
          note: firebasePrivateKeySet 
            ? "✓ Firebase Private Key is configured" 
            : "❌ FIREBASE_PRIVATE_KEY is NOT set"
        },
        FIREBASE_CLIENT_EMAIL: {
          set: firebaseClientEmailSet,
          note: firebaseClientEmailSet 
            ? "✓ Firebase Client Email is configured" 
            : "❌ FIREBASE_CLIENT_EMAIL is NOT set"
        },
        FIREBASE_CONFIGURED: {
          set: firebaseConfigured,
          note: firebaseConfigured 
            ? "✓✓✓ All Firebase credentials are set - Firestore should work" 
            : "❌❌❌ Firebase is NOT fully configured - data will save to memory only"
        },
        NEXTAUTH_URL: {
          set: nextAuthUrlSet,
          value: nextAuthUrlSet ? process.env.NEXTAUTH_URL : "Not set"
        },
        NEXTAUTH_SECRET: {
          set: nextAuthSecretSet,
          note: nextAuthSecretSet ? "✓ Set" : "❌ Not set"
        },
        GOOGLE_CLIENT_ID: {
          set: googleClientIdSet,
          note: googleClientIdSet ? "✓ Set" : "❌ Not set"
        },
        GOOGLE_CLIENT_SECRET: {
          set: googleClientSecretSet,
          note: googleClientSecretSet ? "✓ Set" : "❌ Not set"
        },
      },
      instructions: !firebaseConfigured ? {
        step1: "Go to Vercel Dashboard → Your Project → Settings → Environment Variables",
        step2: "Add FIREBASE_PROJECT_ID: Your Firebase project ID",
        step3: "Add FIREBASE_PRIVATE_KEY: Your service account private key (with \\n characters)",
        step4: "Add FIREBASE_CLIENT_EMAIL: Your service account client email",
        step5: "Select ALL environments (Production, Preview, Development)",
        step6: "Click 'Save'",
        step7: "Go to Deployments → Click '...' on latest deployment → Redeploy",
        step8: "Wait for redeployment to complete, then refresh this page"
      } : null,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error.message || "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}