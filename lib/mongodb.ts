import { MongoClient, ServerApiVersion } from 'mongodb'

/**
 * MongoDB connection management for serverless environments (Vercel)
 * 
 * This follows best practices for serverless functions:
 * 1. Creates a single cached client promise at module scope
 * 2. Leverages Node.js module caching to reuse connections across serverless invocations
 * 3. In development, uses global variable to survive HMR (Hot Module Replacement)
 * 4. In production, module-level caching ensures connection reuse in serverless functions
 * 
 * This prevents connection exhaustion in serverless environments where each
 * function invocation would otherwise create a new database connection.
 */

const uri = process.env.MONGODB_URI

// Log MongoDB configuration status (both development and production for Vercel debugging)
const isVercel = !!process.env.VERCEL
const isProduction = process.env.NODE_ENV === 'production'

if (uri) {
  // Mask password in logs for security
  const maskedUri = uri.replace(/:([^:@]+)@/, ':****@')
  const uriLength = uri.length
  const uriPrefix = uri.substring(0, Math.min(20, uri.length))
  const uriSuffix = uri.length > 30 ? uri.substring(uri.length - 10) : ''
  
  console.log('[MongoDB] ✓ MONGODB_URI is configured')
  console.log(`[MongoDB]   - Environment: ${isVercel ? 'Vercel (Production)' : isProduction ? 'Production' : 'Development'}`)
  console.log(`[MongoDB]   - URI length: ${uriLength} characters`)
  console.log(`[MongoDB]   - URI preview: ${maskedUri.substring(0, Math.min(50, maskedUri.length))}${maskedUri.length > 50 ? '...' : ''}`)
  console.log(`[MongoDB]   - Starts with: ${uri.startsWith('mongodb://') ? 'mongodb://' : uri.startsWith('mongodb+srv://') ? 'mongodb+srv://' : 'INVALID'}`)
  
  // Verify URI format
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    console.error('[MongoDB] ❌ Invalid URI format - must start with mongodb:// or mongodb+srv://')
  } else {
    console.log('[MongoDB] ✓ URI format is valid')
  }
} else {
  console.warn('[MongoDB] ⚠ MONGODB_URI is NOT configured - data will be saved to memory only')
  console.warn(`[MongoDB]   - Environment: ${isVercel ? 'Vercel (Production)' : isProduction ? 'Production' : 'Development'}`)
  console.warn(`[MongoDB]   - VERCEL env var: ${isVercel ? 'present' : 'not present'}`)
  console.warn(`[MongoDB]   - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`)
  
  if (isVercel) {
    console.warn('[MongoDB] To fix on Vercel:')
    console.warn('[MongoDB] 1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables')
    console.warn('[MongoDB] 2. Add MONGODB_URI with your MongoDB connection string')
    console.warn('[MongoDB] 3. Select ALL environments (Production, Preview, Development)')
    console.warn('[MongoDB] 4. Click Save')
    console.warn('[MongoDB] 5. Redeploy: Deployments → ... → Redeploy')
  } else {
    console.warn('[MongoDB] To enable MongoDB:')
    console.warn('[MongoDB] 1. Add MONGODB_URI to your .env.local file')
    console.warn('[MongoDB] 2. Restart your dev server (npm run dev)')
  }
}

// Declare a type for the global object with our MongoDB client
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let clientPromise: Promise<MongoClient> | null = null

if (uri) {
  try {
    // TypeScript now knows uri is defined in this block
    const mongoUri: string = uri
    
    // Basic validation of MongoDB URI format
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      console.error('[MongoDB] ❌ Invalid connection string format. Must start with mongodb:// or mongodb+srv://')
      clientPromise = null
    } else {
      const options = {
        // Connection pool options for serverless
        maxPoolSize: 10,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 10000, // Increased timeout for initial connection
        connectTimeoutMS: 10000,
        // Use Stable API version for better compatibility and future-proofing
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
      }

      if (process.env.NODE_ENV === 'development') {
        // In development mode, use a global variable so that the value
        // is preserved across module reloads caused by HMR (Hot Module Replacement).
        // This ensures we don't create multiple connections during development.
        if (!global._mongoClientPromise) {
          console.log('[MongoDB] Initializing MongoDB client connection...')
          const client = new MongoClient(mongoUri, options)
          global._mongoClientPromise = client.connect()
            .then((connectedClient) => {
              console.log('[MongoDB] ✓✓✓ Successfully connected to MongoDB!')
              // Test the connection with a ping
              return connectedClient.db("admin").command({ ping: 1 })
                .then(() => {
                  console.log('[MongoDB] ✓ Connection verified with ping')
                  return connectedClient
                })
                .catch((pingError) => {
                  console.warn('[MongoDB] ⚠ Ping failed but client connected:', pingError)
                  return connectedClient
                })
            })
            .catch((error: unknown) => {
              const errorMessage = error instanceof Error ? error.message : String(error)
              console.error('[MongoDB] ❌ Connection error:', errorMessage)
              if (errorMessage.includes('authentication failed')) {
                console.error('[MongoDB] Authentication failed - check username and password in connection string')
              } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
                console.error('[MongoDB] DNS resolution failed - check cluster hostname')
              } else if (errorMessage.includes('timeout')) {
                console.error('[MongoDB] Connection timeout - check network/firewall settings')
              } else if (errorMessage.includes('MongoParseError') || errorMessage.includes('Protocol and host')) {
                console.error('[MongoDB] Connection string parsing error - check if password contains special characters')
                console.error('[MongoDB] Special characters must be URL encoded: @ = %40, # = %23, % = %25')
              }
              throw error
            })
        }
        clientPromise = global._mongoClientPromise
      } else {
        // In production mode, this module will be cached by Node.js
        // Each serverless function invocation will reuse the same client promise
        // This is safe because serverless functions can be reused across requests
        console.log('[MongoDB] Initializing MongoDB client connection (production/Vercel)...')
        console.log(`[MongoDB]   - Running on Vercel: ${isVercel}`)
        console.log(`[MongoDB]   - MONGODB_URI length: ${mongoUri.length} characters`)
        console.log(`[MongoDB]   - URI format: ${mongoUri.startsWith('mongodb+srv://') ? 'mongodb+srv:// (Atlas)' : 'mongodb:// (Standard)'}`)
        
        const client = new MongoClient(mongoUri, options)
        clientPromise = client.connect()
          .then((connectedClient) => {
            console.log('[MongoDB] ✓✓✓ Successfully connected to MongoDB!')
            console.log(`[MongoDB]   - Connection established from: ${isVercel ? 'Vercel serverless function' : 'production server'}`)
            return connectedClient
          })
          .catch((error: unknown) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('[MongoDB] ❌ Connection error:', errorMessage)
            console.error(`[MongoDB]   - Error occurred on: ${isVercel ? 'Vercel' : 'production server'}`)
            if (errorMessage.includes('authentication failed')) {
              console.error('[MongoDB] Authentication failed - check username and password in connection string')
              console.error('[MongoDB] Verify MONGODB_URI in Vercel environment variables')
            } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
              console.error('[MongoDB] DNS resolution failed - check cluster hostname')
              console.error('[MongoDB] Verify the cluster hostname in MONGODB_URI is correct')
            } else if (errorMessage.includes('timeout')) {
              console.error('[MongoDB] Connection timeout - check network/firewall settings')
              if (isVercel) {
                console.error('[MongoDB] On Vercel: Make sure MongoDB Atlas Network Access allows all IPs (0.0.0.0/0)')
              }
            } else if (errorMessage.includes('MongoParseError') || errorMessage.includes('Protocol and host')) {
              console.error('[MongoDB] Connection string parsing error - check if password contains special characters')
              console.error('[MongoDB] Special characters must be URL encoded: @ = %40, # = %23, % = %25')
            }
            throw error
          })
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[MongoDB] ❌ Failed to initialize client:', errorMessage)
    if (errorMessage.includes('Protocol and host list are required')) {
      console.error('[MongoDB] Connection string parsing error - check if password contains @ symbol')
      console.error('[MongoDB] If password is "password@123", encode it as "password%40123"')
    }
    clientPromise = null
  }
} else {
  const isVercel = !!process.env.VERCEL
  console.warn('[MongoDB] ⚠ MONGODB_URI environment variable is not set')
  console.warn(`[MongoDB]   - Environment: ${isVercel ? 'Vercel' : process.env.NODE_ENV || 'unknown'}`)
  console.warn('[MongoDB] MongoDB will not be available - data will be saved to memory only')
  
  // Additional debugging info for Vercel
  if (isVercel) {
    console.warn('[MongoDB] ⚠ VERCEL environment detected but MONGODB_URI is missing')
    console.warn('[MongoDB] Check Vercel Dashboard → Settings → Environment Variables')
    console.warn('[MongoDB] Make sure MONGODB_URI is set for Production, Preview, AND Development')
  }
}

// Helper function to check if the client promise is actually usable
// This helps detect if the promise was rejected during initialization
export async function isMongoDBConnected(): Promise<boolean> {
  if (!clientPromise) {
    console.log('[MongoDB] clientPromise is null - MongoDB not configured or initialization failed')
    return false
  }
  try {
    const client = await clientPromise
    if (!client) {
      console.log('[MongoDB] Client is null after awaiting promise')
      return false
    }
    // Try a simple ping to verify connection is alive
    await client.db("admin").command({ ping: 1 })
    console.log('[MongoDB] ✓ Connection verified - MongoDB is connected and working')
    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[MongoDB] ❌ Connection check failed:', errorMessage)
    if (errorMessage.includes('authentication failed')) {
      console.error('[MongoDB] Authentication failed - check username and password in MONGODB_URI')
    } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
      console.error('[MongoDB] DNS resolution failed - check cluster hostname in MONGODB_URI')
    } else if (errorMessage.includes('timeout')) {
      console.error('[MongoDB] Connection timeout - check network/firewall settings')
    } else if (errorMessage.includes('MongoParseError') || errorMessage.includes('Protocol and host')) {
      console.error('[MongoDB] Connection string parsing error - check if password contains special characters')
      console.error('[MongoDB] Special characters must be URL encoded: @ = %40, # = %23, % = %25')
    }
    return false
  }
}

// Helper function to get MongoDB URI status (for diagnostics)
export function getMongoDBUriStatus() {
  const uri = process.env.MONGODB_URI
  const isVercel = !!process.env.VERCEL
  
  return {
    exists: !!uri,
    length: uri ? uri.length : 0,
    format: uri 
      ? (uri.startsWith('mongodb+srv://') ? 'mongodb+srv://' : uri.startsWith('mongodb://') ? 'mongodb://' : 'invalid')
      : 'not set',
    preview: uri 
      ? uri.replace(/:([^:@]+)@/, ':****@').substring(0, Math.min(50, uri.length))
      : 'not set',
    environment: isVercel ? 'Vercel' : (process.env.NODE_ENV || 'unknown'),
    clientPromiseExists: !!clientPromise,
  }
}

// Export a module-scoped promise. By doing this in a
// separate module, the client can be shared across functions.
// Returns null if MONGODB_URI is not configured (app will use in-memory fallback)
export default clientPromise
