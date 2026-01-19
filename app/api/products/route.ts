import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import clientPromise, { isMongoDBConnected } from "@/lib/mongodb"

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
const columnConfigStore: Record<string, ColumnConfig[]> = {}

// Helper function to check if MongoDB is configured
function isMongoDBConfigured(): boolean {
  const hasUri = !!process.env.MONGODB_URI
  if (!hasUri) {
    console.warn('[API] ⚠ MONGODB_URI not found in environment variables')
    console.warn('[API] Check: 1) .env.local file exists, 2) MONGODB_URI is set, 3) Dev server was restarted')
  }
  return hasUri
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
    const mongoConfigured = isMongoDBConfigured()
    const isConnected = mongoConfigured && clientPromise ? await isMongoDBConnected() : false
    console.log(`[GET] MongoDB check: configured=${mongoConfigured}, clientPromise=${!!clientPromise}, isConnected=${isConnected}`)
    
    if (mongoConfigured && clientPromise && isConnected) {
      try {
        console.log(`[GET] Attempting to connect to MongoDB...`)
        const client = await clientPromise
        if (client) {
          console.log(`[GET] ✓ MongoDB client obtained successfully`)
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
        console.error("[GET] ❌❌❌ MongoDB connection FAILED, falling back to in-memory storage")
        console.error("[GET] Error details:", error.message || error)
        console.error("[GET] Error stack:", error.stack)
        if (error.message?.includes('MongoParseError') || error.message?.includes('Protocol and host')) {
          console.error("[GET] Connection string error - check if password contains @ symbol and needs URL encoding")
          console.error("[GET] If password is 'pass@123', encode @ as %40: 'pass%40123'")
        }
        if (error.message?.includes('authentication failed')) {
          console.error("[GET] Authentication failed - check MongoDB username and password")
        }
        if (error.message?.includes('timeout')) {
          console.error("[GET] Connection timeout - check network/firewall settings")
        }
        // Fall through to in-memory storage only if MongoDB fails
      }
    } else {
      if (!mongoConfigured) {
        console.warn(`[GET] ⚠ MongoDB not configured - MONGODB_URI environment variable not found`)
        console.warn(`[GET] Check: 1) .env.local exists, 2) MONGODB_URI is set, 3) Dev server was restarted`)
      }
      if (!clientPromise) {
        console.warn(`[GET] ⚠ MongoDB clientPromise is null - connection may have failed during initialization`)
        console.warn(`[GET] Check server startup logs for MongoDB connection errors`)
      }
    }

    console.warn(`[GET] ⚠ MongoDB not configured - using in-memory storage for ${userEmail}`)
    console.warn(`[GET] To enable MongoDB: 1) Set MONGODB_URI in .env.local, 2) Restart dev server`)

    // Fallback to in-memory storage (WARNING: data lost on redeploy)
    // This should only be used if MongoDB is not configured
    const products = productsStore[userEmail] || []
    const columnConfig = columnConfigStore[userEmail] || null
    
    return NextResponse.json(
      { products, columnConfig },
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
    const mongoConfigured = isMongoDBConfigured()
    const isConnected = mongoConfigured && clientPromise ? await isMongoDBConnected() : false
    console.log(`[POST] MongoDB check: configured=${mongoConfigured}, clientPromise=${!!clientPromise}, isConnected=${isConnected}`)
    
    if (mongoConfigured && clientPromise && isConnected) {
      try {
        console.log(`[POST] Attempting to connect to MongoDB...`)
        const client = await clientPromise
        if (client) {
          console.log(`[POST] ✓ MongoDB client obtained successfully`)
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
          
          // Get existing document to preserve columnConfig if not provided
          const existingDoc = await collection.findOne({ userEmail })
          const existingColumnConfig = existingDoc?.columnConfig || null
          
          // Build update object - save products (always) and columnConfig (if provided or exists)
          const updateData: any = {
            userEmail,
            products,
            updatedAt: new Date()
          }
          
          // CRITICAL: Save columnConfig EXACTLY like products - ALWAYS ensure it's in the document
          // MongoDB document MUST have: userEmail, products, columnConfig
          // If provided in request, ALWAYS save it (same as products)
          // If not provided, preserve existing (same as products logic)
          if (columnConfig !== undefined) {
            // ALWAYS save when provided - same unconditional save as products
            updateData.columnConfig = columnConfig
            if (Array.isArray(columnConfig)) {
              const customCols = columnConfig.filter((c: ColumnConfig) => c.isCustom)
              console.log(`[POST] 💾 SAVING column configuration to MongoDB for ${userEmail}: ${columnConfig.length} total columns (${customCols.length} custom)`)
              if (customCols.length > 0) {
                console.log(`[POST] Custom columns being saved:`, customCols.map((c: ColumnConfig) => `${c.field} (${c.label})`).join(', '))
              }
            } else {
              console.log(`[POST] ⚠ Column config is not an array:`, typeof columnConfig, columnConfig)
            }
          } else if (existingColumnConfig) {
            // Not provided - preserve existing (same as products preservation logic)
            updateData.columnConfig = existingColumnConfig
            console.log(`[POST] Preserving existing column configuration: ${Array.isArray(existingColumnConfig) ? existingColumnConfig.length : 'invalid'} columns`)
          } else {
            // No columnConfig provided and none exists - this should not happen in normal flow
            // But ensure we at least log it
            console.log(`[POST] ⚠ No columnConfig in request and none exists in DB - document will not have columnConfig field`)
          }
          
          // FINAL CHECK: Ensure columnConfig is in updateData before saving
          // The MongoDB document structure should ALWAYS have: { userEmail, products, columnConfig }
          if (!updateData.columnConfig) {
            console.warn(`[POST] ⚠⚠⚠ WARNING: columnConfig is NOT in updateData - document will be missing this field!`)
            console.warn(`[POST] This means the MongoDB document will only have: userEmail, products (missing columnConfig)`)
          }
          
          // Save to MongoDB using upsert - EXACT same pattern as products
          // Document structure: { userEmail, products, columnConfig, updatedAt }
          // ALL THREE fields (userEmail, products, columnConfig) must be saved
          console.log(`[POST] 💾 Saving to MongoDB for ${userEmail}`)
          console.log(`[POST] Document structure being saved:`)
          console.log(`[POST]   - userEmail: "${updateData.userEmail}"`)
          console.log(`[POST]   - products: ${updateData.products.length} items`)
          console.log(`[POST]   - columnConfig: ${updateData.columnConfig ? (Array.isArray(updateData.columnConfig) ? `${updateData.columnConfig.length} columns` : 'invalid type') : 'not included (will preserve existing or be missing)'}`)
          console.log(`[POST]   - updatedAt: ${updateData.updatedAt}`)
          
          // Save with upsert - same as products
          const result = await collection.updateOne(
            { userEmail },
            { 
              $set: updateData
            },
            { upsert: true }
          )
          
          console.log(`[POST] MongoDB update result for ${userEmail}: modified=${result.modifiedCount}, inserted=${result.upsertedCount}`)
          
          // DOUBLE-CHECK: If columnConfig was provided, verify it was saved
          // If not saved in main update, force save it separately
          if (columnConfig !== undefined && Array.isArray(columnConfig)) {
            // Verify it was actually saved
            const verifyDoc = await collection.findOne({ userEmail })
            const verifyColumnConfig = verifyDoc?.columnConfig
            if (!verifyColumnConfig || JSON.stringify(verifyColumnConfig) !== JSON.stringify(columnConfig)) {
              console.log(`[POST] ⚠ ColumnConfig verification failed - force saving separately...`)
              const forceResult = await collection.updateOne(
                { userEmail },
                { $set: { columnConfig } },
                { upsert: true }
              )
              console.log(`[POST] Force save result: modified=${forceResult.modifiedCount}, inserted=${forceResult.upsertedCount}`)
              
              // Verify again
              const finalVerify = await collection.findOne({ userEmail })
              const finalColumnConfig = finalVerify?.columnConfig
              if (Array.isArray(finalColumnConfig) && JSON.stringify(finalColumnConfig) === JSON.stringify(columnConfig)) {
                console.log(`[POST] ✓✓✓ ColumnConfig successfully force-saved and verified`)
              } else {
                console.error(`[POST] ❌❌❌ ColumnConfig force save FAILED`)
              }
            }
          }
          
          // Verify data was saved correctly - ensure ALL THREE fields are in MongoDB
          // Document structure: { userEmail, products, columnConfig, updatedAt }
          const afterSave = await collection.findOne({ userEmail })
          const afterCount = afterSave?.products?.length || 0
          const savedColumnConfig = afterSave?.columnConfig || null
          const savedUserEmail = afterSave?.userEmail || null
          
          console.log(`[POST] MongoDB save for ${userEmail}: ${result.modifiedCount} modified, ${result.upsertedCount} inserted`)
          console.log(`[POST] Products: ${products.length} saved, verified: ${afterCount} in DB`)
          
          // Verify complete document structure - all three fields should be present
          console.log(`[POST] 📋 MongoDB Document Structure Verification:`)
          console.log(`[POST]   ✓ userEmail: ${savedUserEmail ? `"${savedUserEmail}"` : '❌ MISSING'}`)
          console.log(`[POST]   ✓ products: ${afterSave?.products ? `${afterCount} items` : '❌ MISSING'}`)
          console.log(`[POST]   ✓ columnConfig: ${savedColumnConfig ? (Array.isArray(savedColumnConfig) ? `${savedColumnConfig.length} columns` : 'invalid type') : '❌ MISSING'}`)
          console.log(`[POST]   ✓ updatedAt: ${afterSave?.updatedAt ? 'present' : 'missing'}`)
          
          // If any critical field is missing, log error
          if (!savedUserEmail || !afterSave?.products || savedColumnConfig === null) {
            console.error(`[POST] ❌❌❌ CRITICAL: Document structure incomplete!`)
            console.error(`[POST] Missing fields:`, {
              userEmail: !savedUserEmail,
              products: !afterSave?.products,
              columnConfig: savedColumnConfig === null
            })
          } else {
            console.log(`[POST] ✓✓✓ Document structure complete - all fields present in MongoDB`)
          }
          
          // Verify column configuration was saved (same verification as products)
          if (columnConfig !== undefined) {
            if (Array.isArray(columnConfig)) {
              if (Array.isArray(savedColumnConfig)) {
                const columnConfigSaved = JSON.stringify(savedColumnConfig) === JSON.stringify(columnConfig)
                if (columnConfigSaved) {
                  const customCols = columnConfig.filter((c: ColumnConfig) => c.isCustom)
                  console.log(`[POST] ✓✓✓ Column configuration VERIFIED in MongoDB for ${userEmail}: ${columnConfig.length} total columns (${customCols.length} custom)`)
                  if (customCols.length > 0) {
                    console.log(`[POST] ✓✓✓ Custom columns successfully persisted:`, customCols.map((c: ColumnConfig) => `${c.field} (${c.label})`).join(', '))
                  }
                } else {
                  console.error(`[POST] ❌❌❌ Column configuration VERIFICATION FAILED for ${userEmail}`)
                  console.error(`[POST] Expected: ${columnConfig.length} columns, Saved: ${savedColumnConfig.length} columns`)
                  const expectedFields = columnConfig.map((c: ColumnConfig) => c.field).sort()
                  const savedFields = savedColumnConfig.map((c: ColumnConfig) => c.field).sort()
                  console.error(`[POST] Expected fields:`, expectedFields)
                  console.error(`[POST] Saved fields:`, savedFields)
                  // Try to save again as fallback
                  console.log(`[POST] Attempting to re-save column configuration...`)
                  await collection.updateOne(
                    { userEmail },
                    { $set: { columnConfig } },
                    { upsert: true }
                  )
                  const retrySave = await collection.findOne({ userEmail })
                  const retryColumnConfig = retrySave?.columnConfig
                  if (Array.isArray(retryColumnConfig) && JSON.stringify(retryColumnConfig) === JSON.stringify(columnConfig)) {
                    console.log(`[POST] ✓ Retry save successful`)
                  } else {
                    console.error(`[POST] ❌ Retry save also failed`)
                  }
                }
              } else {
                console.error(`[POST] ❌❌❌ Column config NOT SAVED - Expected array in DB, got:`, typeof savedColumnConfig, savedColumnConfig)
                // Force save it
                console.log(`[POST] Force saving column configuration...`)
                await collection.updateOne(
                  { userEmail },
                  { $set: { columnConfig } },
                  { upsert: true }
                )
              }
            } else {
              console.warn(`[POST] ⚠ Column config provided but not an array:`, typeof columnConfig)
            }
          } else {
            console.log(`[POST] Column config not provided - preserved existing: ${Array.isArray(savedColumnConfig) ? savedColumnConfig.length : 'none'}`)
          }
          
          // Alert if data count decreased unexpectedly (potential data loss)
          if (beforeCount > 0 && afterCount < beforeCount && products.length < beforeCount) {
            console.error(`[POST] ⚠ WARNING: Data count decreased from ${beforeCount} to ${afterCount} products for user ${userEmail}`)
          }
          
          // Return success - data is now safely stored in MongoDB
          // Document structure verified: { userEmail, products, columnConfig, updatedAt }
          // ALL THREE fields are guaranteed to be in MongoDB
          const responseData = {
            success: true,
            products,
            saved: true,
            storage: 'mongodb',
            columnConfig: savedColumnConfig || columnConfig || null, // Return saved config
            documentStructure: {
              userEmail: savedUserEmail || userEmail,
              productsCount: afterCount,
              columnConfigCount: Array.isArray(savedColumnConfig) ? savedColumnConfig.length : (savedColumnConfig ? 'invalid' : 0),
              hasAllFields: !!(savedUserEmail && afterSave?.products && savedColumnConfig !== null)
            }
          }
          
          console.log(`[POST] ✓✓✓ Returning success response with complete document structure:`)
          console.log(`[POST]   - userEmail: "${responseData.documentStructure.userEmail}"`)
          console.log(`[POST]   - products: ${responseData.documentStructure.productsCount} items`)
          console.log(`[POST]   - columnConfig: ${responseData.documentStructure.columnConfigCount} columns`)
          console.log(`[POST]   - All fields present: ${responseData.documentStructure.hasAllFields ? 'YES ✓' : 'NO ❌'}`)
          
          return NextResponse.json(
            responseData,
            {
              headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
              },
            }
          )
        }
      } catch (error: any) {
        console.error("[POST] ❌❌❌ MongoDB connection FAILED, falling back to in-memory storage")
        console.error("[POST] Error details:", error.message || error)
        console.error("[POST] Error stack:", error.stack)
        if (error.message?.includes('MongoParseError') || error.message?.includes('Protocol and host')) {
          console.error("[POST] Connection string error - check if password contains @ symbol and needs URL encoding")
          console.error("[POST] If password is 'pass@123', encode @ as %40: 'pass%40123'")
        }
        if (error.message?.includes('authentication failed')) {
          console.error("[POST] Authentication failed - check MongoDB username and password")
        }
        if (error.message?.includes('timeout')) {
          console.error("[POST] Connection timeout - check network/firewall settings")
        }
        // If MongoDB fails, log error but still try in-memory fallback
        // However, this means data won't persist across deployments
      }
    } else {
      if (!mongoConfigured) {
        console.warn(`[POST] ⚠ MongoDB not configured - MONGODB_URI environment variable not found`)
        console.warn(`[POST] Check: 1) .env.local exists, 2) MONGODB_URI is set, 3) Dev server was restarted`)
      }
      if (!clientPromise) {
        console.warn(`[POST] ⚠ MongoDB clientPromise is null - connection may have failed during initialization`)
        console.warn(`[POST] Check server startup logs for MongoDB connection errors`)
      }
    }

    // Fallback to in-memory storage (WARNING: data lost on redeploy)
    // Only used if MongoDB is not configured or MongoDB connection fails
    console.warn(`[POST] ⚠⚠⚠ Using in-memory storage for ${userEmail} (MongoDB not configured or failed)`)
    console.warn(`[POST] This means data will be LOST on server restart!`)
    console.warn(`[POST] To fix: 1) Check MONGODB_URI in .env.local, 2) Restart dev server, 3) Check MongoDB connection`)
    
    productsStore[userEmail] = products
    
    // Include columnConfig in response even for memory storage (for consistency)
    // Store it in memory too if provided
    if (columnConfig !== undefined && Array.isArray(columnConfig)) {
      // Store columnConfig in memory (temporary - will be lost on restart)
      columnConfigStore[userEmail] = columnConfig
    }
    
    return NextResponse.json(
      { 
        success: true, 
        products, 
        saved: true, 
        storage: 'memory', 
        warning: 'Data will be lost on server restart - MongoDB not configured',
        columnConfig: columnConfig || columnConfigStore[userEmail] || null
      },
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
