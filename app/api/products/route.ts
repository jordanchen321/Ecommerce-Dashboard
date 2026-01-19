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
  type?: 'text' | 'number' | 'currency' | 'date' | 'image' | 'formula'
  formula?: string // Formula expression for calculated columns
}

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export interface Product {
  id: string
  name: string
  price: number
  priceSet?: boolean
  productId: string
  quantity: number
  quantitySet?: boolean
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
  const parsedPrice = typeof p.price === 'number' ? p.price : parseFloat(p.price)
  const parsedQuantity = typeof p.quantity === 'number' ? p.quantity : parseInt(p.quantity)

  const priceIsValid = typeof parsedPrice === 'number' && !isNaN(parsedPrice)
  const qtyIsValid = typeof parsedQuantity === 'number' && !isNaN(parsedQuantity)

  return {
    id: p.id || p._id?.toString() || Date.now().toString(),
    name: p.name || '',
    price: priceIsValid ? parsedPrice : 0,
    priceSet: typeof p.priceSet === 'boolean' ? p.priceSet : priceIsValid,
    productId: p.productId || '',
    quantity: qtyIsValid ? parsedQuantity : 0,
    quantitySet: typeof p.quantitySet === 'boolean' ? p.quantitySet : qtyIsValid,
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
    console.log(`[GET] MongoDB check: configured=${mongoConfigured}, clientPromise=${!!clientPromise}`)

    // Try MongoDB first if configured
    if (mongoConfigured && clientPromise) {
      try {
        console.log(`[GET] Attempting to connect to MongoDB...`)
        const client = await clientPromise
        if (client) {
          console.log(`[GET] ✓ MongoDB client obtained successfully`)
          
          const db = client.db("ecommerce_dashboard")
          const collection = db.collection("products")
          
          // Always fetch from MongoDB - data persists regardless of code changes
          // Document structure: { gmail, products, columnConfigs, updatedAt }
          // Support both old (userEmail, columnConfig) and new (gmail, columnConfigs) field names for migration
          let userProduct = await collection.findOne({ gmail: userEmail })
          if (!userProduct) {
            // Try old field name for backward compatibility
            userProduct = await collection.findOne({ userEmail })
            if (userProduct) {
              // Migrate old document to new structure
              console.log(`[GET] Migrating document from old structure (userEmail) to new structure (gmail)`)
              await collection.updateOne(
                { userEmail },
                { 
                  $set: { 
                    gmail: userEmail,
                    columnConfigs: userProduct.columnConfig || null
                  },
                  $unset: { userEmail: "", columnConfig: "" }
                }
              )
              userProduct = await collection.findOne({ gmail: userEmail })
            }
          }
          
          const rawProducts = (userProduct?.products || []) as any[]
          
          // Normalize products: ensure all required fields exist with defaults if missing
          // This makes the data resilient to schema changes - old data still works
          const products: Product[] = rawProducts.map(normalizeProduct)
          
          // Log products (same pattern as columns)
          if (products.length > 0) {
            console.log(`[GET] ✓ Loaded ${products.length} products from MongoDB for ${userEmail} (persistent across devices)`)
          } else {
            console.log(`[GET] No products found in MongoDB for ${userEmail}, returning empty array (will be saved on first product added)`)
          }
          
          // Log if document exists but has no products (potential data loss indicator)
          if (userProduct && (!userProduct.products || !Array.isArray(userProduct.products) || userProduct.products.length === 0)) {
            console.warn(`[GET] ⚠ User document exists for ${userEmail} but products array is empty or missing`)
            console.warn(`[GET] Document keys:`, Object.keys(userProduct))
          }
          
          // Also fetch column configuration if it exists (same pattern as products)
          // Column config is stored per user and persists across all devices
          // CRITICAL: Return empty array if it exists (even if empty) to preserve deletions
          // Support both old (columnConfig) and new (columnConfigs) field names
          const columnConfig = Array.isArray(userProduct?.columnConfigs) 
            ? userProduct.columnConfigs 
            : (Array.isArray(userProduct?.columnConfig) 
              ? userProduct.columnConfig 
              : (userProduct?.columnConfigs !== undefined || userProduct?.columnConfig !== undefined 
                ? (userProduct?.columnConfigs || userProduct?.columnConfig || null) 
                : null))
          
          if (Array.isArray(columnConfig)) {
            if (columnConfig.length > 0) {
              console.log(`[GET] ✓ Loaded ${columnConfig.length} column configurations from MongoDB for ${userEmail} (persistent across devices)`)
            } else {
              console.log(`[GET] ✓ Loaded empty column config from MongoDB for ${userEmail} (user deleted all columns - preserving deletion)`)
            }
          } else {
            console.log(`[GET] No column config found in MongoDB for ${userEmail}, will use defaults (will be saved on first change)`)
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
        console.error("[GET] ❌ MongoDB operation failed, falling back to in-memory storage")
        console.error("[GET] Error details:", error.message || error)
        if (error.message?.includes('MongoParseError') || error.message?.includes('Protocol and host')) {
          console.error("[GET] Connection string error - check if password contains @ symbol and needs URL encoding")
        }
        if (error.message?.includes('authentication failed')) {
          console.error("[GET] Authentication failed - check MongoDB username and password")
        }
        if (error.message?.includes('timeout')) {
          console.error("[GET] Connection timeout - check network/firewall settings")
        }
        // Fall through to in-memory fallback
      }
    } else {
      if (!mongoConfigured) {
        console.warn(`[GET] ⚠ MongoDB not configured - MONGODB_URI environment variable not found`)
        console.warn(`[GET] Check: 1) .env.local exists, 2) MONGODB_URI is set, 3) Dev server was restarted`)
      }
      if (mongoConfigured && !clientPromise) {
        console.warn(`[GET] ⚠ MongoDB clientPromise is null - connection may have failed during initialization`)
        console.warn(`[GET] Falling back to in-memory storage`)
      }
    }

    // Fallback to in-memory storage (WARNING: data lost on redeploy)
    // Used when MongoDB is not configured OR when MongoDB fails
    console.warn(`[GET] ⚠ Using in-memory storage for ${userEmail} (MongoDB unavailable or not configured)`)
    const products = productsStore[userEmail] || []
    const columnConfig = columnConfigStore[userEmail] || null
    
    // Ensure consistent response format
    const normalizedProducts = Array.isArray(products) ? products.map(normalizeProduct) : []
    
    console.log(`[GET] Using in-memory storage for ${userEmail}: ${normalizedProducts.length} products`)
    
    return NextResponse.json(
      { 
        products: normalizedProducts, 
        columnConfig: Array.isArray(columnConfig) ? columnConfig : null 
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error("[GET] Error fetching products:", error)
    // On error, return empty array with consistent format - don't crash the app
    // But log the error so we know data fetch failed
    return NextResponse.json(
      { products: [], columnConfig: null },
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
    const hasClientPromise = !!clientPromise
    console.log(`[POST] MongoDB check: configured=${mongoConfigured}, clientPromise=${hasClientPromise}`)
    console.log(`[POST] MONGODB_URI exists: ${!!process.env.MONGODB_URI}`)
    if (process.env.MONGODB_URI) {
      const maskedUri = process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@')
      console.log(`[POST] MONGODB_URI: ${maskedUri.substring(0, 50)}...`)
    }
    
    // Try MongoDB first if configured
    if (mongoConfigured && clientPromise) {
      try {
        console.log(`[POST] Attempting to connect to MongoDB...`)
        const client = await clientPromise
        if (client) {
          console.log(`[POST] ✓ MongoDB client obtained successfully`)
          
          const db = client.db("ecommerce_dashboard")
          const collection = db.collection("products")
          
          // Allow empty arrays - users may legitimately delete all products
          // The frontend already has protection against accidental empty saves during initial load
          if (products.length === 0) {
            console.log(`[POST] Saving empty products array for user ${userEmail} (user deleted all products)`)
          }
          
          // CRITICAL: Use upsert to preserve data integrity
          // - If document exists: Update it with new products
          // - If document doesn't exist: Create new document with products
          // - gmail is the unique key - ensures each user's data is separate
          // - This operation is atomic and safe across deployments
          // Document structure: { gmail, products, columnConfigs, updatedAt }
          
          // Check for existing document with new structure (gmail) or old structure (userEmail)
          let existingDoc = await collection.findOne({ gmail: userEmail })
          if (!existingDoc) {
            existingDoc = await collection.findOne({ userEmail })
            if (existingDoc) {
              // Migrate old document to new structure
              console.log(`[POST] Migrating document from old structure (userEmail, columnConfig) to new structure (gmail, columnConfigs)`)
              await collection.updateOne(
                { userEmail },
                { 
                  $set: { 
                    gmail: userEmail,
                    columnConfigs: existingDoc.columnConfig || null
                  },
                  $unset: { userEmail: "", columnConfig: "" }
                }
              )
              existingDoc = await collection.findOne({ gmail: userEmail })
            }
          }
          
          // Log before save for debugging
          const beforeCount = existingDoc?.products?.length || 0
          
          // Get existing columnConfigs (support both old and new field names)
          const existingColumnConfigs = Array.isArray(existingDoc?.columnConfigs) 
            ? existingDoc.columnConfigs 
            : (Array.isArray(existingDoc?.columnConfig) ? existingDoc.columnConfig : null)
          
          // Build update object - save products (always) and columnConfigs (if provided or exists)
          // Document structure: { gmail: "user@email.com", products: [...], columnConfigs: [...] | null, updatedAt: Date }
          const updateData: any = {
            gmail: userEmail,
            products,
            updatedAt: new Date()
          }
          
          // CRITICAL: Save columnConfigs EXACTLY like products - ALWAYS ensure it's in the document
          // MongoDB document MUST have: gmail, products, columnConfigs
          if (columnConfig !== undefined) {
            // ALWAYS save when provided - same unconditional save as products
            updateData.columnConfigs = columnConfig
            if (Array.isArray(columnConfig)) {
              const customCols = columnConfig.filter((c: ColumnConfig) => c.isCustom)
              console.log(`[POST] 💾 SAVING column configuration to MongoDB for ${userEmail}: ${columnConfig.length} total columns (${customCols.length} custom)`)
              if (customCols.length > 0) {
                console.log(`[POST] Custom columns being saved:`, customCols.map((c: ColumnConfig) => `${c.field} (${c.label})`).join(', '))
              }
            } else {
              console.log(`[POST] ⚠ Column config is not an array:`, typeof columnConfig, columnConfig)
            }
          } else if (existingColumnConfigs !== null && existingColumnConfigs !== undefined) {
            // Not provided - preserve existing (same as products preservation logic)
            updateData.columnConfigs = existingColumnConfigs
            console.log(`[POST] Preserving existing column configuration: ${Array.isArray(existingColumnConfigs) ? existingColumnConfigs.length : 'invalid'} columns`)
          } else {
            // No columnConfigs provided and none exists - set to null to ensure field exists in document
            updateData.columnConfigs = null
            console.log(`[POST] No columnConfigs provided and none exists - setting to null (will use defaults on next load)`)
          }
          
          // VERIFY: Ensure columnConfigs is in updateData before saving
          // The MongoDB document structure should ALWAYS have: { gmail, products, columnConfigs }
          if (!('columnConfigs' in updateData)) {
            console.error(`[POST] ❌❌❌ CRITICAL ERROR: columnConfigs is NOT in updateData!`)
            updateData.columnConfigs = null // Force include it
          }
          
          // Save to MongoDB using upsert - EXACT same pattern as products
          // Document structure: { gmail, products, columnConfigs, updatedAt }
          // ALL THREE fields (gmail, products, columnConfigs) must be saved
          console.log(`[POST] 💾 Saving to MongoDB for ${userEmail}`)
          console.log(`[POST] Document structure being saved:`)
          console.log(`[POST]   - gmail: "${updateData.gmail}"`)
          console.log(`[POST]   - products: ${updateData.products.length} items`)
          console.log(`[POST]   - columnConfigs: ${updateData.columnConfigs ? (Array.isArray(updateData.columnConfigs) ? `${updateData.columnConfigs.length} columns` : 'invalid type') : 'not included (will preserve existing or be missing)'}`)
          console.log(`[POST]   - updatedAt: ${updateData.updatedAt}`)
          
          // Save with upsert - use gmail as the key
          // Also remove old fields if they exist (migration cleanup)
          const result = await collection.updateOne(
            { gmail: userEmail },
            { 
              $set: updateData,
              $unset: { userEmail: "", columnConfig: "" } // Remove old field names if they exist
            },
            { upsert: true }
          )
          
          console.log(`[POST] MongoDB update result for ${userEmail}: modified=${result.modifiedCount}, inserted=${result.upsertedCount}`)
          
          // DOUBLE-CHECK: If columnConfig was provided, verify it was saved
          // If not saved in main update, force save it separately
          if (columnConfig !== undefined && Array.isArray(columnConfig)) {
            // Verify it was actually saved
            const verifyDoc = await collection.findOne({ gmail: userEmail })
            const verifyColumnConfigs = verifyDoc?.columnConfigs
            if (!verifyColumnConfigs || JSON.stringify(verifyColumnConfigs) !== JSON.stringify(columnConfig)) {
              console.log(`[POST] ⚠ ColumnConfigs verification failed - force saving separately...`)
              const forceResult = await collection.updateOne(
                { gmail: userEmail },
                { $set: { columnConfigs: columnConfig } },
                { upsert: true }
              )
              console.log(`[POST] Force save result: modified=${forceResult.modifiedCount}, inserted=${forceResult.upsertedCount}`)
              
              // Verify again
              const finalVerify = await collection.findOne({ gmail: userEmail })
              const finalColumnConfigs = finalVerify?.columnConfigs
              if (Array.isArray(finalColumnConfigs) && JSON.stringify(finalColumnConfigs) === JSON.stringify(columnConfig)) {
                console.log(`[POST] ✓✓✓ ColumnConfigs successfully force-saved and verified`)
              } else {
                console.error(`[POST] ❌❌❌ ColumnConfigs force save FAILED`)
              }
            }
          }
          
          // Verify data was saved correctly - ensure ALL THREE fields are in MongoDB
          // Document structure: { gmail, products, columnConfigs, updatedAt }
          const afterSave = await collection.findOne({ gmail: userEmail })
          const afterCount = afterSave?.products?.length || 0
          const savedColumnConfigs = afterSave?.columnConfigs || null
          const savedGmail = afterSave?.gmail || null
          
          console.log(`[POST] MongoDB save for ${userEmail}: ${result.modifiedCount} modified, ${result.upsertedCount} inserted`)
          console.log(`[POST] Products: ${products.length} saved, verified: ${afterCount} in DB`)
          
          // Verify complete document structure - all three fields should be present
          console.log(`[POST] 📋 MongoDB Document Structure Verification:`)
          console.log(`[POST]   ✓ gmail: ${savedGmail ? `"${savedGmail}"` : '❌ MISSING'}`)
          console.log(`[POST]   ✓ products: ${afterSave?.products ? `${afterCount} items` : '❌ MISSING'}`)
          console.log(`[POST]   ✓ columnConfigs: ${savedColumnConfigs ? (Array.isArray(savedColumnConfigs) ? `${savedColumnConfigs.length} columns` : 'invalid type') : '❌ MISSING'}`)
          console.log(`[POST]   ✓ updatedAt: ${afterSave?.updatedAt ? 'present' : 'missing'}`)
          
          // If any critical field is missing, log error
          if (!savedGmail || !afterSave?.products || savedColumnConfigs === null) {
            console.error(`[POST] ❌❌❌ CRITICAL: Document structure incomplete!`)
            console.error(`[POST] Missing fields:`, {
              gmail: !savedGmail,
              products: !afterSave?.products,
              columnConfigs: savedColumnConfigs === null
            })
          } else {
            console.log(`[POST] ✓✓✓ Document structure complete - all fields present in MongoDB`)
          }
          
          // Verify column configuration was saved (same verification as products)
          if (columnConfig !== undefined) {
            if (Array.isArray(columnConfig)) {
              if (Array.isArray(savedColumnConfigs)) {
                const columnConfigSaved = JSON.stringify(savedColumnConfigs) === JSON.stringify(columnConfig)
                if (columnConfigSaved) {
                  const customCols = columnConfig.filter((c: ColumnConfig) => c.isCustom)
                  console.log(`[POST] ✓✓✓ Column configuration VERIFIED in MongoDB for ${userEmail}: ${columnConfig.length} total columns (${customCols.length} custom)`)
                  if (customCols.length > 0) {
                    console.log(`[POST] ✓✓✓ Custom columns successfully persisted:`, customCols.map((c: ColumnConfig) => `${c.field} (${c.label})`).join(', '))
                  }
                } else {
                  console.error(`[POST] ❌❌❌ Column configuration VERIFICATION FAILED for ${userEmail}`)
                  console.error(`[POST] Expected: ${columnConfig.length} columns, Saved: ${savedColumnConfigs.length} columns`)
                  const expectedFields = columnConfig.map((c: ColumnConfig) => c.field).sort()
                  const savedFields = savedColumnConfigs.map((c: ColumnConfig) => c.field).sort()
                  console.error(`[POST] Expected fields:`, expectedFields)
                  console.error(`[POST] Saved fields:`, savedFields)
                  // Try to save again as fallback
                  console.log(`[POST] Attempting to re-save column configuration...`)
                  await collection.updateOne(
                    { gmail: userEmail },
                    { $set: { columnConfigs: columnConfig } },
                    { upsert: true }
                  )
                  const retrySave = await collection.findOne({ gmail: userEmail })
                  const retryColumnConfigs = retrySave?.columnConfigs
                  if (Array.isArray(retryColumnConfigs) && JSON.stringify(retryColumnConfigs) === JSON.stringify(columnConfig)) {
                    console.log(`[POST] ✓ Retry save successful`)
                  } else {
                    console.error(`[POST] ❌ Retry save also failed`)
                  }
                }
              } else {
                console.error(`[POST] ❌❌❌ Column config NOT SAVED - Expected array in DB, got:`, typeof savedColumnConfigs, savedColumnConfigs)
                // Force save it
                console.log(`[POST] Force saving column configuration...`)
                await collection.updateOne(
                  { gmail: userEmail },
                  { $set: { columnConfigs: columnConfig } },
                  { upsert: true }
                )
              }
            } else {
              console.warn(`[POST] ⚠ Column config provided but not an array:`, typeof columnConfig)
            }
          } else {
            console.log(`[POST] Column config not provided - preserved existing: ${Array.isArray(savedColumnConfigs) ? savedColumnConfigs.length : 'none'}`)
          }
          
          // Alert if data count decreased unexpectedly (potential data loss)
          if (beforeCount > 0 && afterCount < beforeCount && products.length < beforeCount) {
            console.error(`[POST] ⚠ WARNING: Data count decreased from ${beforeCount} to ${afterCount} products for user ${userEmail}`)
          }
          
          // Return success - data is now safely stored in MongoDB
          // Document structure verified: { gmail, products, columnConfigs, updatedAt }
          // ALL THREE fields are guaranteed to be in MongoDB
          const responseData = {
            success: true,
            products,
            saved: true,
            storage: 'mongodb',
            columnConfig: savedColumnConfigs || columnConfig || null, // Return saved config
            documentStructure: {
              gmail: savedGmail || userEmail,
              productsCount: afterCount,
              columnConfigCount: Array.isArray(savedColumnConfigs) ? savedColumnConfigs.length : (savedColumnConfigs ? 'invalid' : 0),
              hasAllFields: !!(savedGmail && afterSave?.products && savedColumnConfigs !== null)
            }
          }
          
          console.log(`[POST] ✓✓✓ Returning success response with complete document structure:`)
          console.log(`[POST]   - gmail: "${responseData.documentStructure.gmail}"`)
          console.log(`[POST]   - products: ${responseData.documentStructure.productsCount} items`)
          console.log(`[POST]   - columnConfigs: ${responseData.documentStructure.columnConfigCount} columns`)
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
        console.error("[POST] ❌ MongoDB operation failed, falling back to in-memory storage")
        console.error("[POST] Error type:", error.constructor?.name || typeof error)
        console.error("[POST] Error message:", error.message || String(error))
        console.error("[POST] Error stack:", error.stack)
        if (error.message?.includes('MongoParseError') || error.message?.includes('Protocol and host')) {
          console.error("[POST] Connection string error - check if password contains @ symbol and needs URL encoding")
        }
        if (error.message?.includes('authentication failed')) {
          console.error("[POST] Authentication failed - check MongoDB username and password")
        }
        if (error.message?.includes('timeout')) {
          console.error("[POST] Connection timeout - check network/firewall settings")
          console.error("[POST] On Vercel: Make sure MongoDB Atlas Network Access allows all IPs (0.0.0.0/0) or Vercel IP ranges")
        }
        if (error.message?.includes('ENOTFOUND') || error.message?.includes('getaddrinfo')) {
          console.error("[POST] DNS resolution failed - check cluster hostname in MONGODB_URI")
        }
        // Fall through to in-memory fallback
      }
    } else {
      if (!mongoConfigured) {
        console.warn(`[POST] ⚠ MongoDB not configured - MONGODB_URI environment variable not found`)
        console.warn(`[POST] Check: 1) .env.local exists, 2) MONGODB_URI is set, 3) Dev server was restarted`)
      }
      if (mongoConfigured && !clientPromise) {
        console.warn(`[POST] ⚠ MongoDB clientPromise is null - connection may have failed during initialization`)
        console.warn(`[POST] Falling back to in-memory storage`)
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
