import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import clientPromise from "@/lib/mongodb"

// Disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userEmail = session.user.email
    const mongoUriConfigured = !!process.env.MONGODB_URI
    
    let mongoConnected = false
    let mongoError: string | null = null
    let productCount = 0
    let lastUpdated: Date | null = null

    if (mongoUriConfigured && clientPromise) {
      try {
        const client = await clientPromise
        if (client) {
          // Test connection
          await client.db("admin").command({ ping: 1 })
          mongoConnected = true

          // Get user's product count (support both old and new schema)
          const db = client.db("ecommerce_dashboard")
          const collection = db.collection("products")
          let userProduct = await collection.findOne({ gmail: userEmail })
          if (!userProduct) {
            // Try old field name for backward compatibility
            userProduct = await collection.findOne({ userEmail })
          }
          
          if (userProduct) {
            productCount = Array.isArray(userProduct.products) ? userProduct.products.length : 0
            lastUpdated = userProduct.updatedAt || null
          }
        }
      } catch (error: any) {
        mongoError = error.message || String(error)
        console.error("[Status] MongoDB connection error:", error)
      }
    }

    return NextResponse.json({
      userEmail,
      mongodb: {
        configured: mongoUriConfigured,
        connected: mongoConnected,
        error: mongoError,
      },
      products: {
        count: productCount,
        lastUpdated,
      },
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    )
  }
}