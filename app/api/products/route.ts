import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import clientPromise from "@/lib/mongodb"

// Column configuration type (matches frontend)
interface ColumnConfig {
  id: string
  field: string
  label: string
  visible: boolean
  isCustom: boolean
  type?: 'text' | 'number' | 'currency' | 'date' | 'image'
}

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
          // Verify connection is still alive
          try {
            await client.db("admin").command({ ping: 1 })
          } catch (pingError) {
            console.error("[GET] MongoDB connection health check failed:", pingError)
            throw new Error("MongoDB connection is not healthy")
          }
          
          const db = client.db("ecommerce_dashboard")
          const collection = db.collection("products")
          
          // Always fetch from MongoDB - data persists regardless of code changes
          const userProduct = await collection.findOne({ userEmail })
          const rawProducts = (userProduct?.products || []) as any[]
          
          // Normalize products: ensure all required fields exist with defaults if missing
          // This makes the data resilient to schema changes - old data still works
          const products: Product[] = rawProducts.map(normalizeProduct)
          
          console.log(`[GET] MongoDB fetch for ${userEmail}: Found ${products.length} products`)
          
          // Log if document exists but has no products (potential data loss indicator)
          if (userProduct && (!userProduct.products || !Array.isArray(userProduct.products) || userProduct.products.length === 0)) {
            console.warn(`[GET] ⚠ User document exists for ${userEmail} but products array is empty or missing`)
            console.warn(`[GET] Document keys:`, Object.keys(userProduct))
          }
          
          // Also fetch column configuration if it exists
          // Column config is stored per user and persists across all devices
          const columnConfig = userProduct?.columnConfig || null
          
          if (columnConfig) {
            console.log(`[GET] Loaded column configuration for ${userEmail}: ${Array.isArray(columnConfig) ? columnConfig.length : 'invalid'} columns`)
          }
          
          // Return existing data with no-cache headers
          return NextResponse.json(
            { products, columnConfig },
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
        console.error("[GET] Error stack:", error.stack)
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
    const { products, columnConfig } = body as { products: Product[], columnConfig?: ColumnConfig[] | null }
    
    // Log what we received
    console.log(`[POST] Received request: ${products.length} products, columnConfig: ${columnConfig !== undefined ? (Array.isArray(columnConfig) ? `${columnConfig.length} columns` : typeof columnConfig) : 'not provided'}`)

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
          // Verify connection is still alive before operations
          try {
            await client.db("admin").command({ ping: 1 })
          } catch (pingError) {
            console.error("[POST] MongoDB connection health check failed:", pingError)
            throw new Error("MongoDB connection is not healthy")
          }
          
          const db = client.db("ecommerce_dashboard")
          const collection = db.collection("products")
          
          // CRITICAL Safety check: If trying to save empty array, check if there's existing data
          // This prevents accidental data loss during initial load race conditions or connection issues
          if (products.length === 0) {
            const existing = await collection.findOne({ userEmail })
            if (existing && existing.products && Array.isArray(existing.products) && existing.products.length > 0) {
              // Don't overwrite existing data with empty array - return existing data instead
              console.log(`[POST] ⚠ SAFETY CHECK: Prevented overwriting ${existing.products.length} products with empty array for user ${userEmail}`)
              console.log(`[POST] This indicates a potential race condition - frontend tried to save empty array when data exists in database`)
              return NextResponse.json({ 
                success: true, 
                products: existing.products,
                message: "Preserved existing data",
                warning: "Empty array was rejected - existing data preserved"
              })
            } else {
              // No existing data - allow empty array (user has no products yet)
              console.log(`[POST] Allowing empty array save for user ${userEmail} (no existing data found)`)
            }
          }
          
          // CRITICAL: Use upsert to preserve data integrity
          // - If document exists: Update it with new products
          // - If document doesn't exist: Create new document with products
          // - userEmail is the unique key - ensures each user's data is separate
          // - This operation is atomic and safe across deployments
          
          // Log before save for debugging
          const beforeSave = await collection.findOne({ userEmail })
          const beforeCount = beforeSave?.products?.length || 0
          
          // Build update object - save both products and columnConfig to MongoDB
          // Same pattern as products: always save what's provided, preserve what exists if not provided
          const existingDoc = await collection.findOne({ userEmail })
          const existingColumnConfig = existingDoc?.columnConfig || null
          
          const updateData: any = {
            userEmail,
            products,
            updatedAt: new Date()
          }
          
          // CRITICAL: Save columnConfig the same way as products - always save if provided
          // This ensures custom columns are persisted to MongoDB across all devices
          // Same pattern: if provided, save it; if not provided, preserve existing
          if (columnConfig !== undefined) {
            // Save columnConfig exactly as provided (same pattern as products)
            // Even if it's an empty array, save it to MongoDB
            updateData.columnConfig = columnConfig
            if (Array.isArray(columnConfig)) {
              const customCols = columnConfig.filter((c: ColumnConfig) => c.isCustom)
              console.log(`[POST] 💾 Saving column configuration to MongoDB: ${columnConfig.length} total columns (${customCols.length} custom)`)
              if (customCols.length > 0) {
                console.log(`[POST] Custom columns being saved:`, customCols.map((c: ColumnConfig) => ({ field: c.field, label: c.label, type: c.type })))
              } else {
                console.log(`[POST] No custom columns in this save (only core columns)`)
              }
            } else {
              console.log(`[POST] ⚠ Column config is not an array:`, typeof columnConfig, columnConfig)
            }
          } else {
            // If columnConfig not provided in request, preserve existing (same as products logic)
            if (existingColumnConfig) {
              updateData.columnConfig = existingColumnConfig
              console.log(`[POST] Preserving existing column configuration: ${Array.isArray(existingColumnConfig) ? existingColumnConfig.length : 'invalid'} columns`)
            } else {
              console.log(`[POST] No columnConfig in request and none exists - will use defaults on next load`)
            }
          }
          
          // Save to MongoDB using upsert (same pattern as products)
          // This ensures both products and columnConfig are persisted
          const result = await collection.updateOne(
            { userEmail },
            { 
              $set: updateData
            },
            { upsert: true }
          )
          
          // Verify data was saved correctly (same verification pattern as products)
          const afterSave = await collection.findOne({ userEmail })
          const afterCount = afterSave?.products?.length || 0
          const savedColumnConfig = afterSave?.columnConfig || null
          
          console.log(`[POST] MongoDB save for ${userEmail}: ${result.modifiedCount} modified, ${result.upsertedCount} inserted`)
          console.log(`[POST] Products: ${products.length} saved, verified: ${afterCount} in DB`)
          
          // Verify column configuration was saved (same verification as products)
          if (columnConfig !== undefined) {
            if (Array.isArray(columnConfig) && Array.isArray(savedColumnConfig)) {
              const columnConfigSaved = JSON.stringify(savedColumnConfig) === JSON.stringify(columnConfig)
              if (columnConfigSaved) {
                const customCols = columnConfig.filter((c: ColumnConfig) => c.isCustom)
                console.log(`[POST] ✓ Column configuration verified in MongoDB: ${columnConfig.length} total columns (${customCols.length} custom)`)
                if (customCols.length > 0) {
                  console.log(`[POST] ✓ Custom columns persisted:`, customCols.map((c: ColumnConfig) => c.field))
                }
              } else {
                console.warn(`[POST] ⚠ Column configuration verification failed`)
                console.warn(`[POST] Expected: ${columnConfig.length} columns, Saved: ${savedColumnConfig.length} columns`)
                const expectedFields = columnConfig.map((c: ColumnConfig) => c.field).sort()
                const savedFields = savedColumnConfig.map((c: ColumnConfig) => c.field).sort()
                console.warn(`[POST] Expected fields:`, expectedFields)
                console.warn(`[POST] Saved fields:`, savedFields)
              }
            } else {
              console.warn(`[POST] ⚠ Column config type mismatch - Expected array, got:`, typeof savedColumnConfig)
            }
          } else {
            console.log(`[POST] Column config not provided in request - preserved existing: ${Array.isArray(savedColumnConfig) ? savedColumnConfig.length : 'none'}`)
          }
          
          // Alert if data count decreased unexpectedly (potential data loss)
          if (beforeCount > 0 && afterCount < beforeCount && products.length < beforeCount) {
            console.error(`[POST] ⚠ WARNING: Data count decreased from ${beforeCount} to ${afterCount} products for user ${userEmail}`)
          }
          
          // Return success - data is now safely stored in MongoDB
          // This data will survive all future code updates and deployments
          return NextResponse.json(
            { 
              success: true, 
              products, 
              saved: true, 
              storage: 'mongodb',
              columnConfig: savedColumnConfig || columnConfig // Return saved config
            },
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
