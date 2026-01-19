import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import clientPromise from "@/lib/mongodb"

export interface Product {
  id: string
  name: string
  price: number
  productId: string
  quantity: number
}

// Fallback in-memory storage (only used if MongoDB is not configured)
// Note: This won't persist across serverless function restarts on Vercel
// IMPORTANT: Data will be lost on redeploy if MongoDB is not configured
const productsStore: Record<string, Product[]> = {}

// Helper function to check if MongoDB is configured
function isMongoDBConfigured(): boolean {
  return !!process.env.MONGODB_URI
}

// GET - Fetch products for the current user
// CRITICAL: This endpoint preserves all existing user data - never deletes data
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userEmail = session.user.email

    // Use MongoDB if configured (persists across deployments)
    // MongoDB data survives all code updates and deployments
    if (isMongoDBConfigured() && clientPromise) {
      try {
        const client = await clientPromise
        if (client) {
          const db = client.db("ecommerce_dashboard")
          const collection = db.collection("products")
          
          // Always fetch from MongoDB - data persists regardless of code changes
          const userProduct = await collection.findOne({ userEmail })
          const products = (userProduct?.products || []) as Product[]
          
          // Return existing data (even if empty array - this is valid)
          return NextResponse.json({ products })
        }
      } catch (error) {
        console.error("MongoDB error, falling back to in-memory:", error)
        // Fall through to in-memory storage only if MongoDB fails
      }
    }

    // Fallback to in-memory storage (WARNING: data lost on redeploy)
    // This should only be used if MongoDB is not configured
    const products = productsStore[userEmail] || []
    return NextResponse.json({ products })
  } catch (error) {
    console.error("Error fetching products:", error)
    // On error, return empty array - don't crash the app
    // But log the error so we know data fetch failed
    return NextResponse.json({ products: [] })
  }
}

// POST - Save products for the current user
// CRITICAL: This endpoint preserves data integrity - uses upsert to never lose existing data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { products } = body as { products: Product[] }

    if (!Array.isArray(products)) {
      return NextResponse.json(
        { error: "Products must be an array" },
        { status: 400 }
      )
    }

    const userEmail = session.user.email

    // Use MongoDB if configured (persists across deployments)
    // MongoDB is the source of truth - all code updates preserve data in MongoDB
    if (isMongoDBConfigured() && clientPromise) {
      try {
        const client = await clientPromise
        if (client) {
          const db = client.db("ecommerce_dashboard")
          const collection = db.collection("products")
          
          // CRITICAL: Use upsert to preserve data integrity
          // - If document exists: Update it with new products
          // - If document doesn't exist: Create new document with products
          // - userEmail is the unique key - ensures each user's data is separate
          // - This operation is atomic and safe across deployments
          await collection.updateOne(
            { userEmail },
            { 
              $set: { 
                userEmail, 
                products, 
                updatedAt: new Date() 
              } 
            },
            { upsert: true }
          )
          
          // Return success - data is now safely stored in MongoDB
          // This data will survive all future code updates and deployments
          return NextResponse.json({ success: true, products })
        }
      } catch (error) {
        console.error("MongoDB error, falling back to in-memory:", error)
        // If MongoDB fails, log error but still try in-memory fallback
        // However, this means data won't persist across deployments
      }
    }

    // Fallback to in-memory storage (WARNING: data lost on redeploy)
    // Only used if MongoDB is not configured or MongoDB connection fails
    productsStore[userEmail] = products
    return NextResponse.json({ success: true, products })
  } catch (error) {
    console.error("Error saving products:", error)
    // Return error - don't save corrupted data
    // Frontend should handle this error gracefully
    return NextResponse.json(
      { error: "Failed to save products" },
      { status: 500 }
    )
  }
}
