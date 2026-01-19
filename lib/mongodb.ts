import { MongoClient } from 'mongodb'
import { attachDatabasePool } from '@vercel/functions'

const uri = process.env.MONGODB_URI

let clientPromise: Promise<MongoClient> | null = null

if (uri) {
  const client = new MongoClient(uri)
  attachDatabasePool(client)

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>
    }

    if (!globalWithMongo._mongoClientPromise) {
      globalWithMongo._mongoClientPromise = client.connect()
    }
    clientPromise = globalWithMongo._mongoClientPromise
  } else {
    // In production mode, it's best to not use a global variable.
    clientPromise = client.connect()
  }
}

// Export a module-scoped promise. By doing this in a
// separate module, the client can be shared across functions.
// Returns null if MONGODB_URI is not configured
export default clientPromise
