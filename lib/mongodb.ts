import { MongoClient } from 'mongodb'

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

// Log MongoDB configuration status (only in development to help debug)
if (process.env.NODE_ENV === 'development') {
  if (uri) {
    // Mask password in logs for security
    const maskedUri = uri.replace(/:([^:@]+)@/, ':****@')
    console.log('[MongoDB] ✓ MONGODB_URI is configured:', maskedUri)
  } else {
    console.warn('[MongoDB] ⚠ MONGODB_URI is NOT configured - data will be saved to memory only')
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
        console.log('[MongoDB] Initializing MongoDB client connection (production)...')
        const client = new MongoClient(mongoUri, options)
        clientPromise = client.connect()
          .then((connectedClient) => {
            console.log('[MongoDB] ✓✓✓ Successfully connected to MongoDB!')
            return connectedClient
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
  console.warn('[MongoDB] ⚠ MONGODB_URI environment variable is not set')
  console.warn('[MongoDB] MongoDB will not be available - data will be saved to memory only')
}

// Export a module-scoped promise. By doing this in a
// separate module, the client can be shared across functions.
// Returns null if MONGODB_URI is not configured (app will use in-memory fallback)
export default clientPromise
