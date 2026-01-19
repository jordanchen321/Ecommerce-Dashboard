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

// MongoDB is optional - app will fall back to in-memory storage if not configured
// Only throw error if explicitly trying to use MongoDB features
// This allows the app to work locally without MongoDB for basic testing

const options = {}

// Declare a type for the global object with our MongoDB client
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  // This ensures we don't create multiple connections during development.
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  // In production mode, this module will be cached by Node.js
  // Each serverless function invocation will reuse the same client promise
  // This is safe because serverless functions can be reused across requests
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

// Export a module-scoped promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise
