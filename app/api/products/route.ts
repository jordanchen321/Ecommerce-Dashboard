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
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userEmail = session.user.email

    // Use MongoDB if configured (persists across deployments)
    if (isMongoDBConfigured() && clientPromise) {
      try {
        const client = await clientPromise
        if (client) {
          const db = client.db("ecommerce_dashboard")
          const collection = db.collection("products")
          
          const userProduct = await collection.findOne({ userEmail })
          const products = (userProduct?.products || []) as Product[]
          
          return NextResponse.json({ products })
        }
      } catch (error) {
        console.error("MongoDB error, falling back to in-memory:", error)
        // Fall through to in-memory storage
      }
    }

    // Fallback to in-memory storage (WARNING: data lost on redeploy)
    const products = productsStore[userEmail] || []
    return NextResponse.json({ products })
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ products: [] })
  }
}

// POST - Save products for the current user
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
    if (isMongoDBConfigured() && clientPromise) {
      try {
        const client = await clientPromise
        if (client) {
          const db = client.db("ecommerce_dashboard")
          const collection = db.collection("products")
          
          // Upsert - update if exists, create if not
          // Using userEmail as the key ensures data is tied to the user account
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
          
          return NextResponse.json({ success: true, products })
        }
      } catch (error) {
        console.error("MongoDB error, falling back to in-memory:", error)
        // Fall through to in-memory storage
      }
    }

    // Fallback to in-memory storage (WARNING: data lost on redeploy)
    productsStore[userEmail] = products
    return NextResponse.json({ success: true, products })
  } catch (error) {
    console.error("Error saving products:", error)
    return NextResponse.json(
      { error: "Failed to save products" },
      { status: 500 }
    )
  }
}
