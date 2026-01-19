import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import clientPromise from "@/lib/mongodb"

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export interface Product {
  id: string
  name: string
  price: number
  productId: string
  quantity: number
  image?: string // Image URL or base64 data URL
  // Allow additional fields from MongoDB that may not be in the interface
  [key: string]: any
}

// Fallback in-memory storage (only used if MongoDB is not configured)
// Note: This won't persist across serverless function restarts on Vercel
// IMPORTANT: Data will be lost on redeploy if MongoDB is not configured
const productsStore: Record<string, Product[]> = {}

// Helper function to check if MongoDB is configured
function isMongoDBConfigured(): boolean {
  return !!process.env.MONGODB_URI
}

// Helper function to normalize and validate product data from MongoDB
// This ensures backward compatibility when schema changes are made
function normalizeProduct(p: any): Product {
  return {
    id: p.id || p._id?.toString() || Date.now().toString(),
    name: p.name || '',
    price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
    productId: p.productId || '',
    quantity: typeof p.quantity === 'number' ? p.quantity : parseInt(p.quantity) || 0,
    image: p.image || undefined,
    // Preserve any additional fields from MongoDB (for future schema extensions)
    ...Object.fromEntries(
      Object.entries(p).filter(([key]) => 
        !['id', '_id', 'name', 'price', 'productId', 'quantity', 'image'].includes(key)
      )
    )
  }
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
          const rawProducts = (userProduct?.products || []) as any[]
          
          // Normalize products: ensure all required fields exist with defaults if missing
          // This makes the data resilient to schema changes - old data still works
          const products: Product[] = rawProducts.map(normalizeProduct)
          
          console.log(`[GET] MongoDB fetch for ${userEmail}: Found ${products.length} products`)
          
          // Return existing data with no-cache headers
          return NextResponse.json(
            { products },
            {
              headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store',
              },
            }
          )
        }
      } catch (error: any) {
        console.error("[GET] MongoDB error, falling back to in-memory:", error.message || error)
        if (error.message?.includes('MongoParseError') || error.message?.includes('Protocol and host')) {
          console.error("[GET] Connection string error - check if password contains @ symbol and needs URL encoding")
        }
        // Fall through to in-memory storage only if MongoDB fails
      }
    }

    console.log(`[GET] MongoDB not configured - using in-memory storage for ${userEmail}`)

    // Fallback to in-memory storage (WARNING: data lost on redeploy)
    // This should only be used if MongoDB is not configured
    const products = productsStore[userEmail] || []
    return NextResponse.json(
      { products },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error("[GET] Error fetching products:", error)
    // On error, return empty array - don't crash the app
    // But log the error so we know data fetch failed
    return NextResponse.json(
      { products: [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      }
    )
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
          
          // Safety check: If trying to save empty array, check if there's existing data
          // This prevents accidental data loss during initial load race conditions
          if (products.length === 0) {
            const existing = await collection.findOne({ userEmail })
            if (existing && existing.products && Array.isArray(existing.products) && existing.products.length > 0) {
              // Don't overwrite existing data with empty array - return existing data instead
              console.log(`Prevented overwriting ${existing.products.length} products with empty array for user ${userEmail}`)
              return NextResponse.json({ 
                success: true, 
                products: existing.products,
                message: "Preserved existing data" 
              })
            }
          }
          
          // CRITICAL: Use upsert to preserve data integrity
          // - If document exists: Update it with new products
          // - If document doesn't exist: Create new document with products
          // - userEmail is the unique key - ensures each user's data is separate
          // - This operation is atomic and safe across deployments
          const result = await collection.updateOne(
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
          
          console.log(`[POST] MongoDB save for ${userEmail}: ${result.modifiedCount} modified, ${result.upsertedCount} inserted, ${products.length} products saved`)
          
          // Return success - data is now safely stored in MongoDB
          // This data will survive all future code updates and deployments
          return NextResponse.json(
            { success: true, products, saved: true, storage: 'mongodb' },
            {
              headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
              },
            }
          )
        }
      } catch (error: any) {
        console.error("[POST] MongoDB error, falling back to in-memory:", error.message || error)
        if (error.message?.includes('MongoParseError') || error.message?.includes('Protocol and host')) {
          console.error("[POST] Connection string error - check if password contains @ symbol and needs URL encoding")
        }
        // If MongoDB fails, log error but still try in-memory fallback
        // However, this means data won't persist across deployments
      }
    }

    // Fallback to in-memory storage (WARNING: data lost on redeploy)
    // Only used if MongoDB is not configured or MongoDB connection fails
    console.log(`[POST] Using in-memory storage for ${userEmail} (MongoDB not configured or failed)`)
    productsStore[userEmail] = products
    return NextResponse.json(
      { success: true, products, saved: true, storage: 'memory', warning: 'Data will be lost on server restart' },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      }
    )
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
