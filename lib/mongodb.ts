import { MongoClient } from 'mongodb'

// MongoDB connection (optional - falls back to in-memory if not configured)
let clientPromise: Promise<MongoClient> | null = null

if (process.env.MONGODB_URI) {
  const uri: string = process.env.MONGODB_URI
  let client: MongoClient

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>
    }
    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri)
      globalWithMongo._mongoClientPromise = client.connect()
    }
    clientPromise = globalWithMongo._mongoClientPromise
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri)
    clientPromise = client.connect()
  }
}

export default clientPromise
