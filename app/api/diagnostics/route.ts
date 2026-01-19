import { NextResponse } from "next/server"
import { getMongoDBUriStatus } from "@/lib/mongodb"

// Disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Diagnostic endpoint to check environment variable configuration
 * This helps diagnose why MongoDB might not be working on Vercel
 */
export async function GET() {
  try {
    const mongoUriSet = !!process.env.MONGODB_URI
    const nextAuthUrlSet = !!process.env.NEXTAUTH_URL
    const nextAuthSecretSet = !!process.env.NEXTAUTH_SECRET
    const googleClientIdSet = !!process.env.GOOGLE_CLIENT_ID
    const googleClientSecretSet = !!process.env.GOOGLE_CLIENT_SECRET
    const isVercel = !!process.env.VERCEL

    // Get detailed MongoDB URI status
    const mongoUriStatus = getMongoDBUriStatus()

    // Mask MONGODB_URI for security (show only first 20 chars and last 10 chars)
    let mongoUriPreview = "Not set"
    if (mongoUriSet && process.env.MONGODB_URI) {
      const uri = process.env.MONGODB_URI
      if (uri.length > 30) {
        mongoUriPreview = `${uri.substring(0, 20)}...${uri.substring(uri.length - 10)}`
      } else {
        mongoUriPreview = `${uri.substring(0, 10)}...`
      }
    }

    return NextResponse.json({
      environment: process.env.NODE_ENV || "unknown",
      vercel: isVercel,
      mongodbUriStatus: {
        exists: mongoUriStatus.exists,
        length: mongoUriStatus.length,
        format: mongoUriStatus.format,
        preview: mongoUriStatus.preview,
        clientPromiseExists: mongoUriStatus.clientPromiseExists,
        note: mongoUriSet 
          ? `✓ MongoDB URI is configured (${mongoUriStatus.format}, ${mongoUriStatus.length} chars)` 
          : "❌ MONGODB_URI is NOT set - data will save to memory only"
      },
      environmentVariables: {
        MONGODB_URI: {
          set: mongoUriSet,
          preview: mongoUriPreview,
          length: mongoUriSet ? process.env.MONGODB_URI!.length : 0,
          format: mongoUriStatus.format,
          note: mongoUriSet 
            ? `✓ MongoDB URI is configured (${mongoUriStatus.format}, ${mongoUriStatus.length} chars)` 
            : "❌ MONGODB_URI is NOT set - data will save to memory only"
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
      instructions: !mongoUriSet ? {
        step1: "Go to Vercel Dashboard → Your Project → Settings → Environment Variables",
        step2: "Click 'Add New' and enter: Key: MONGODB_URI, Value: your-mongodb-connection-string",
        step3: "Select ALL environments (Production, Preview, Development)",
        step4: "Click 'Save'",
        step5: "Go to Deployments → Click '...' on latest deployment → Redeploy",
        step6: "Wait for redeployment to complete, then refresh this page"
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