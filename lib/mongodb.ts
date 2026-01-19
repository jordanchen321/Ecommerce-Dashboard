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

// Declare a type for the global object with our MongoDB client
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let clientPromise: Promise<MongoClient> | null = null

if (uri) {
  // TypeScript now knows uri is defined in this block
  const mongoUri: string = uri
  const options = {}

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    // This ensures we don't create multiple connections during development.
    if (!global._mongoClientPromise) {
      const client = new MongoClient(mongoUri, options)
      global._mongoClientPromise = client.connect()
    }
    clientPromise = global._mongoClientPromise
  } else {
    // In production mode, this module will be cached by Node.js
    // Each serverless function invocation will reuse the same client promise
    // This is safe because serverless functions can be reused across requests
    const client = new MongoClient(mongoUri, options)
    clientPromise = client.connect()
  }
}

// Export a module-scoped promise. By doing this in a
// separate module, the client can be shared across functions.
// Returns null if MONGODB_URI is not configured (app will use in-memory fallback)
export default clientPromise
