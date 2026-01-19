import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import getFirestoreInstance, { isFirebaseConfigured } from "@/lib/firebase"

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
  // Allow additional fields from Firestore that may not be in the interface
  [key: string]: any
}

// Fallback in-memory storage (only used if Firebase is not configured)
// Note: This won't persist across serverless function restarts on Vercel
// IMPORTANT: Data will be lost on redeploy if Firebase is not configured
const productsStore: Record<string, Product[]> = {}
const columnConfigStore: Record<string, ColumnConfig[]> = {}

// Helper function to normalize and validate product data from Firestore
// This ensures backward compatibility when schema changes are made
function normalizeProduct(p: any): Product {
  const parsedPrice = typeof p.price === 'number' ? p.price : parseFloat(p.price)
  const parsedQuantity = typeof p.quantity === 'number' ? p.quantity : parseInt(p.quantity)

  const priceIsValid = typeof parsedPrice === 'number' && !isNaN(parsedPrice)
  const qtyIsValid = typeof parsedQuantity === 'number' && !isNaN(parsedQuantity)

  return {
    id: p.id || Date.now().toString(),
    name: p.name || '',
    price: priceIsValid ? parsedPrice : 0,
    priceSet: typeof p.priceSet === 'boolean' ? p.priceSet : priceIsValid,
    productId: p.productId || '',
    quantity: qtyIsValid ? parsedQuantity : 0,
    quantitySet: typeof p.quantitySet === 'boolean' ? p.quantitySet : qtyIsValid,
    image: p.image || undefined,
    // Preserve any additional fields from Firestore (for future schema extensions)
    ...Object.fromEntries(
      Object.entries(p).filter(([key]) => 
        !['id', 'name', 'price', 'productId', 'quantity', 'image'].includes(key)
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

    // Use Firebase Firestore if configured (persists across deployments)
    // Firestore data survives all code updates and deployments
    const firebaseConfigured = isFirebaseConfigured()
    console.log(`[GET] Firebase check: configured=${firebaseConfigured}`)
    
    // Enhanced logging for Vercel deployment debugging
    if (!firebaseConfigured) {
      console.error(`[GET] ❌❌❌ Firebase is NOT configured!`)
      console.error(`[GET] Required: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL`)
      console.error(`[GET] To fix: Go to Vercel Dashboard → Settings → Environment Variables`)
      console.error(`[GET] Then redeploy: Deployments → ... → Redeploy`)
    }

    // Try Firestore first if configured
    if (firebaseConfigured) {
      try {
        console.log(`[GET] Attempting to connect to Firestore...`)
        const db = getFirestoreInstance()
        if (db) {
          console.log(`[GET] ✓ Firestore instance obtained successfully`)
          
          // Use user email as document ID (sanitized for Firestore)
          // Firestore document IDs cannot contain certain characters, so we'll use a safe format
          const docId = userEmail.replace(/[^a-zA-Z0-9]/g, '_')
          const userDocRef = db.collection('users').doc(docId)
          
          // Fetch user document from Firestore
          const userDoc = await userDocRef.get()
          
          if (userDoc.exists) {
            const userData = userDoc.data()
            
            // Support both old (userEmail, columnConfig) and new (gmail, columnConfigs) field names
            const rawProducts = (userData?.products || userData?.gmail ? userData.products : []) as any[]
            const products: Product[] = rawProducts.map(normalizeProduct)
            
            // Log products
            if (products.length > 0) {
              console.log(`[GET] ✓ Loaded ${products.length} products from Firestore for ${userEmail} (persistent across devices)`)
            } else {
              console.log(`[GET] No products found in Firestore for ${userEmail}, returning empty array (will be saved on first product added)`)
            }
            
            // Get column configuration (support both old and new field names)
            const columnConfig = Array.isArray(userData?.columnConfigs) 
              ? userData.columnConfigs 
              : (Array.isArray(userData?.columnConfig) 
                ? userData.columnConfig 
                : null)
            
            if (Array.isArray(columnConfig)) {
              if (columnConfig.length > 0) {
                console.log(`[GET] ✓ Loaded ${columnConfig.length} column configurations from Firestore for ${userEmail} (persistent across devices)`)
              } else {
                console.log(`[GET] ✓ Loaded empty column config from Firestore for ${userEmail} (user deleted all columns - preserving deletion)`)
              }
            } else {
              console.log(`[GET] No column config found in Firestore for ${userEmail}, will use defaults (will be saved on first change)`)
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
          } else {
            // Document doesn't exist yet - return empty arrays
            console.log(`[GET] No document found in Firestore for ${userEmail}, returning empty arrays (will be created on first save)`)
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
      } catch (error: any) {
        console.error("[GET] ❌ Firestore operation failed, falling back to in-memory storage")
        console.error("[GET] Error details:", error.message || error)
        if (error.message?.includes('permission-denied')) {
          console.error("[GET] Permission denied - check Firestore security rules")
        }
        if (error.message?.includes('not-found')) {
          console.error("[GET] Collection or document not found")
        }
        // Fall through to in-memory fallback
      }
    } else {
      console.warn(`[GET] ⚠ Firebase not configured - Firebase credentials not found`)
      console.warn(`[GET] Check: 1) .env.local exists, 2) Firebase env vars are set, 3) Dev server was restarted`)
    }

    // Fallback to in-memory storage (WARNING: data lost on redeploy)
    // Used when Firebase is not configured OR when Firestore fails
    console.warn(`[GET] ⚠ Using in-memory storage for ${userEmail} (Firebase unavailable or not configured)`)
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
// CRITICAL: This endpoint preserves data integrity - uses set with merge to never lose existing data
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

    // Use Firebase Firestore if configured (persists across deployments)
    // Firestore is the source of truth - all code updates preserve data in Firestore
    const firebaseConfigured = isFirebaseConfigured()
    console.log(`[POST] Firebase check: configured=${firebaseConfigured}`)
    
    // Enhanced logging for Vercel deployment debugging
    if (!firebaseConfigured) {
      console.error(`[POST] ❌❌❌ Firebase is NOT configured!`)
      console.error(`[POST] Current environment: ${process.env.NODE_ENV || 'unknown'}`)
      console.error(`[POST] Running on Vercel: ${!!process.env.VERCEL}`)
      console.error(`[POST] Required: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL`)
      console.error(`[POST] To fix: Go to Vercel Dashboard → Settings → Environment Variables`)
      console.error(`[POST] Then redeploy: Deployments → ... → Redeploy`)
      console.error(`[POST] Visit /api/diagnostics to check environment variable status`)
    } else {
      console.log(`[POST] ✓ Firebase is configured`)
    }
    
    // Try Firestore first if configured
    if (firebaseConfigured) {
      try {
        console.log(`[POST] Attempting to connect to Firestore...`)
        const db = getFirestoreInstance()
        if (db) {
          console.log(`[POST] ✓ Firestore instance obtained successfully`)
          
          // Use user email as document ID (sanitized for Firestore)
          const docId = userEmail.replace(/[^a-zA-Z0-9]/g, '_')
          const userDocRef = db.collection('users').doc(docId)
          
          // Get existing document to preserve any fields we're not updating
          const existingDoc = await userDocRef.get()
          const existingData = existingDoc.exists ? existingDoc.data() : null
          
          // Allow empty arrays - users may legitimately delete all products
          if (products.length === 0) {
            console.log(`[POST] Saving empty products array for user ${userEmail} (user deleted all products)`)
          }
          
          // Build document data - always include gmail, products, columnConfigs, updatedAt
          // Document structure: { gmail, products, columnConfigs, updatedAt }
          const docData: any = {
            gmail: userEmail,
            products,
            updatedAt: new Date(),
          }
          
          // Handle columnConfigs - same logic as products
          if (columnConfig !== undefined) {
            docData.columnConfigs = columnConfig
            if (Array.isArray(columnConfig)) {
              const customCols = columnConfig.filter((c: ColumnConfig) => c.isCustom)
              console.log(`[POST] 💾 SAVING column configuration to Firestore for ${userEmail}: ${columnConfig.length} total columns (${customCols.length} custom)`)
              if (customCols.length > 0) {
                console.log(`[POST] Custom columns being saved:`, customCols.map((c: ColumnConfig) => `${c.field} (${c.label})`).join(', '))
              }
            }
          } else if (existingData?.columnConfigs !== null && existingData?.columnConfigs !== undefined) {
            // Not provided - preserve existing
            docData.columnConfigs = existingData.columnConfigs
            console.log(`[POST] Preserving existing column configuration: ${Array.isArray(existingData.columnConfigs) ? existingData.columnConfigs.length : 'invalid'} columns`)
          } else {
            // No columnConfigs provided and none exists - set to null
            docData.columnConfigs = null
            console.log(`[POST] No columnConfigs provided and none exists - setting to null (will use defaults on next load)`)
          }
          
          // Save to Firestore using set with merge (preserves existing fields, updates specified ones)
          console.log(`[POST] 💾 Saving to Firestore for ${userEmail}`)
          console.log(`[POST] Document structure being saved:`)
          console.log(`[POST]   - gmail: "${docData.gmail}"`)
          console.log(`[POST]   - products: ${docData.products.length} items`)
          console.log(`[POST]   - columnConfigs: ${docData.columnConfigs ? (Array.isArray(docData.columnConfigs) ? `${docData.columnConfigs.length} columns` : 'invalid type') : 'null'}`)
          console.log(`[POST]   - updatedAt: ${docData.updatedAt}`)
          
          await userDocRef.set(docData, { merge: true })
          console.log(`[POST] ✓✓✓ Document saved to Firestore`)
          
          // Verify data was saved correctly
          console.log(`[POST] Verifying saved data in Firestore...`)
          const afterSave = await userDocRef.get()
          
          if (!afterSave.exists) {
            console.error(`[POST] ❌❌❌ CRITICAL ERROR: Document NOT FOUND after save!`)
            console.error(`[POST] Document ID: ${docId}`)
          } else {
            console.log(`[POST] ✓ Document found in Firestore after save`)
            const savedData = afterSave.data()
            const savedGmail = savedData?.gmail || null
            const afterCount = savedData?.products?.length || 0
            const savedColumnConfigs = savedData?.columnConfigs || null
            
            console.log(`[POST] 📋 Firestore Document Structure Verification:`)
            console.log(`[POST]   ✓ gmail: ${savedGmail ? `"${savedGmail}"` : '❌ MISSING'}`)
            console.log(`[POST]   ✓ products: ${savedData?.products ? `${afterCount} items` : '❌ MISSING'}`)
            console.log(`[POST]   ✓ columnConfigs: ${savedColumnConfigs ? (Array.isArray(savedColumnConfigs) ? `${savedColumnConfigs.length} columns` : 'invalid type') : '❌ MISSING'}`)
            console.log(`[POST]   ✓ updatedAt: ${savedData?.updatedAt ? 'present' : 'missing'}`)
            
            // Verify column configuration was saved
            if (columnConfig !== undefined && Array.isArray(columnConfig)) {
              if (Array.isArray(savedColumnConfigs)) {
                const columnConfigSaved = JSON.stringify(savedColumnConfigs) === JSON.stringify(columnConfig)
                if (columnConfigSaved) {
                  const customCols = columnConfig.filter((c: ColumnConfig) => c.isCustom)
                  console.log(`[POST] ✓✓✓ Column configuration VERIFIED in Firestore for ${userEmail}: ${columnConfig.length} total columns (${customCols.length} custom)`)
                } else {
                  console.error(`[POST] ❌❌❌ Column configuration VERIFICATION FAILED for ${userEmail}`)
                }
              }
            }
            
            // Return success - data is now safely stored in Firestore
            const responseData = {
              success: true,
              products,
              saved: true,
              storage: 'firestore',
              columnConfig: savedColumnConfigs || columnConfig || null,
              documentStructure: {
                gmail: savedGmail || userEmail,
                productsCount: afterCount,
                columnConfigCount: Array.isArray(savedColumnConfigs) ? savedColumnConfigs.length : (savedColumnConfigs ? 'invalid' : 0),
                hasAllFields: !!(savedGmail && savedData?.products && savedColumnConfigs !== null)
              }
            }
            
            console.log(`[POST] ✓✓✓ Returning success response with complete document structure`)
            
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
        }
      } catch (error: any) {
        console.error("[POST] ❌ Firestore operation failed, falling back to in-memory storage")
        console.error("[POST] Error type:", error.constructor?.name || typeof error)
        console.error("[POST] Error message:", error.message || String(error))
        console.error("[POST] Error stack:", error.stack)
        if (error.message?.includes('permission-denied')) {
          console.error("[POST] Permission denied - check Firestore security rules allow writes")
        }
        if (error.message?.includes('not-found')) {
          console.error("[POST] Collection or document not found")
        }
        // Fall through to in-memory fallback
      }
    } else {
      console.warn(`[POST] ⚠ Firebase not configured - Firebase credentials not found`)
      console.warn(`[POST] Check: 1) .env.local exists, 2) Firebase env vars are set, 3) Dev server was restarted`)
    }

    // Fallback to in-memory storage (WARNING: data lost on redeploy)
    // Only used if Firebase is not configured or Firestore connection fails
    console.warn(`[POST] ⚠⚠⚠ Using in-memory storage for ${userEmail} (Firebase not configured or failed)`)
    console.warn(`[POST] This means data will be LOST on server restart!`)
    console.warn(`[POST] To fix: 1) Check Firebase env vars in .env.local, 2) Restart dev server, 3) Check Firestore connection`)
    
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
        warning: 'Data will be lost on server restart - Firebase not configured',
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