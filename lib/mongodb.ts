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
 * 
 * TROUBLESHOOTING:
 * See MongoDB Atlas documentation for connection issues:
 * https://www.mongodb.com/docs/atlas/troubleshoot-connection/
 */

/**
 * Special characters that must be URL encoded in MongoDB connection strings
 * Characters: : / ? # [ ] @ ! $ & ' ( ) * , ; = % and space
 */
const SPECIAL_CHARS_TO_ENCODE: Record<string, string> = {
  '@': '%40',
  '#': '%23',
  '%': '%25',
  ':': '%3A',
  '/': '%2F',
  '?': '%3F',
  '[': '%5B',
  ']': '%5D',
  '!': '%21',
  '$': '%24',
  '&': '%27',
  "'": '%27',
  '(': '%28',
  ')': '%29',
  '*': '%2A',
  ',': '%2C',
  ';': '%3B',
  '=': '%3D',
  ' ': '%20',
}

/**
 * Encode special characters in MongoDB connection string password
 * Based on MongoDB Atlas troubleshooting guide for special characters
 */
function encodePassword(password: string): string {
  let encoded = password
  for (const [char, encodedChar] of Object.entries(SPECIAL_CHARS_TO_ENCODE)) {
    encoded = encoded.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), encodedChar)
  }
  return encoded
}

/**
 * Extract and validate MongoDB connection string components
 * Returns diagnostics for troubleshooting
 */
function parseConnectionString(uri: string): {
  isValid: boolean
  format: 'srv' | 'standard' | 'invalid'
  hasAuth: boolean
  hasPassword: boolean
  hostname?: string
  username?: string
  passwordSpecialChars?: string[]
  errors: string[]
  warnings: string[]
} {
  const result = {
    isValid: false,
    format: 'invalid' as 'srv' | 'standard' | 'invalid',
    hasAuth: false,
    hasPassword: false,
    hostname: undefined as string | undefined,
    username: undefined as string | undefined,
    passwordSpecialChars: undefined as string[] | undefined,
    errors: [] as string[],
    warnings: [] as string[],
  }

  if (!uri) {
    result.errors.push('Connection string is empty')
    return result
  }

  // Check format
  if (uri.startsWith('mongodb+srv://')) {
    result.format = 'srv'
  } else if (uri.startsWith('mongodb://')) {
    result.format = 'standard'
  } else {
    result.errors.push('Invalid format - must start with mongodb:// or mongodb+srv://')
    return result
  }

  try {
    // Parse username:password@hostname
    const match = uri.match(/(?:mongodb\+srv?:\/\/)([^:]+):([^@]+)@(.+)/)
    if (match) {
      result.hasAuth = true
      result.username = match[1]
      const password = match[2]
      
      if (password) {
        result.hasPassword = true
        // Check for special characters that need encoding
        const specialCharsFound = Object.keys(SPECIAL_CHARS_TO_ENCODE).filter(
          char => password.includes(char)
        )
        if (specialCharsFound.length > 0) {
          result.passwordSpecialChars = specialCharsFound
          result.warnings.push(
            `Password contains special characters that may need URL encoding: ${specialCharsFound.join(', ')}`
          )
        }
      }
      
      // Extract hostname (before ? or /)
      const hostPart = match[3].split(/[?\/]/)[0]
      result.hostname = hostPart
      
      // Check for SRV connection issues
      if (result.format === 'srv') {
        if (!hostPart.includes('.mongodb.net')) {
          result.warnings.push('SRV connection string hostname should end with .mongodb.net')
        }
      }
    } else {
      result.errors.push('Could not parse username/password from connection string')
    }
    
    result.isValid = result.errors.length === 0
  } catch (error) {
    result.errors.push(`Failed to parse connection string: ${error instanceof Error ? error.message : String(error)}`)
  }

  return result
}

/**
 * Generate detailed troubleshooting steps based on error type
 */
function getTroubleshootingSteps(errorMessage: string, isVercel: boolean): string[] {
  const steps: string[] = []
  const lowerMessage = errorMessage.toLowerCase()

  // Authentication failures
  if (lowerMessage.includes('authentication failed') || lowerMessage.includes('auth failed')) {
    steps.push('🔐 AUTHENTICATION FAILED')
    steps.push('1. Verify username and password in MongoDB Atlas:')
    steps.push('   - Go to Atlas → Database Access → Users')
    steps.push('   - Check username matches connection string')
    steps.push('   - Verify password is correct (check for typos)')
    steps.push('2. Check authSource in connection string:')
    steps.push('   - Default is "admin" for Atlas')
    steps.push('   - Verify authSource matches database user was created in')
    steps.push('3. If password has special characters:')
    steps.push('   - Encode them using URL encoding')
    steps.push('   - Example: @ becomes %40, # becomes %23, % becomes %25')
    steps.push('4. Verify database user has appropriate permissions')
  }

  // DNS resolution failures
  if (lowerMessage.includes('enotfound') || lowerMessage.includes('getaddrinfo') || lowerMessage.includes('dns')) {
    steps.push('🌐 DNS RESOLUTION FAILED')
    steps.push('1. Verify cluster hostname in connection string is correct')
    steps.push('2. Check if cluster is paused or deleted:')
    steps.push('   - Go to Atlas → Clusters')
    steps.push('   - Verify cluster exists and is running')
    steps.push('   - Resume if paused (M0 clusters auto-pause after 30 days)')
    steps.push('3. For SRV connections, verify DNS support:')
    steps.push('   - Your DNS server must support SRV record lookups')
    steps.push('   - Try using Google Public DNS (8.8.8.8) if ISP DNS blocks SRV')
    steps.push('4. Test DNS resolution:')
    if (process.platform === 'win32') {
      steps.push('   - Windows: nslookup -debug -q=SRV _mongodb._tcp.<cluster-hostname>')
    } else {
      steps.push('   - Linux/Mac: dig SRV _mongodb._tcp.<cluster-hostname>')
    }
  }

  // Connection timeouts
  if (lowerMessage.includes('timeout') || lowerMessage.includes('connection refused')) {
    steps.push('⏱️ CONNECTION TIMEOUT')
    steps.push('1. Check IP Access List:')
    steps.push('   - Go to Atlas → Network Access → IP Access List')
    if (isVercel) {
      steps.push('   - Add 0.0.0.0/0 to allow all IPs (or specific Vercel IP ranges)')
    } else {
      steps.push('   - Add your current IP address')
      steps.push('   - Or add 0.0.0.0/0 for development (not recommended for production)')
    }
    steps.push('2. Check firewall settings:')
    steps.push('   - Ensure port 27017 is not blocked')
    steps.push('   - For SRV: verify port is accessible')
    steps.push('3. Test network connectivity:')
    if (process.platform === 'win32') {
      steps.push('   - Windows: Test-NetConnection -Port 27017 -ComputerName <cluster-hostname>')
    } else {
      steps.push('   - Linux/Mac: nc -zv <cluster-hostname> 27017')
    }
    steps.push('4. Check for too many connections:')
    steps.push('   - Close unused connections')
    steps.push('   - Verify maxPoolSize in connection options')
    steps.push('   - Consider scaling cluster tier if needed')
  }

  // Connection string parsing errors
  if (lowerMessage.includes('mongoparseerror') || lowerMessage.includes('protocol and host')) {
    steps.push('📝 CONNECTION STRING PARSING ERROR')
    steps.push('1. Special characters in password must be URL encoded:')
    steps.push('   - @ → %40')
    steps.push('   - # → %23')
    steps.push('   - % → %25')
    steps.push('   - : → %3A')
    steps.push('   - / → %2F')
    steps.push('   - ? → %3F')
    steps.push('   - [ → %5B, ] → %5D')
    steps.push('   - ! → %21, $ → %24, & → %27')
    steps.push('   - ( → %28, ) → %29, * → %2A')
    steps.push('   - , → %2C, ; → %3B, = → %3D')
    steps.push('   - Space → %20')
    steps.push('2. Example: password "p@ssw0rd#123" becomes "p%40ssw0rd%23123"')
    steps.push('3. Use encodeURIComponent() for username and password in Node.js:')
    steps.push('   const username = encodeURIComponent("<username>");')
    steps.push('   const password = encodeURIComponent("<password>");')
  }

  // SRV connection issues
  if (lowerMessage.includes('querySrv') || lowerMessage.includes('ECONNREFUSED') || lowerMessage.includes('srv')) {
    steps.push('🔗 SRV CONNECTION STRING ISSUES')
    steps.push('1. Verify SRV hostname is correct and cluster is not paused')
    steps.push('2. Test SRV DNS resolution:')
    if (process.platform === 'win32') {
      steps.push('   - Windows: nslookup -debug -q=SRV _mongodb._tcp.<cluster-hostname>')
    } else {
      steps.push('   - Linux/Mac: dig SRV _mongodb._tcp.<cluster-hostname>')
    }
    steps.push('3. If SRV fails, try non-SRV connection string (mongodb:// instead of mongodb+srv://)')
    steps.push('4. Check if ISP DNS blocks SRV lookups - switch to Google Public DNS if needed')
  }

  // Generic connection errors
  if (steps.length === 0) {
    steps.push('🔧 GENERAL TROUBLESHOOTING')
    steps.push('1. Verify MONGODB_URI environment variable is set correctly')
    steps.push('2. Check connection string format: mongodb+srv:// or mongodb://')
    steps.push('3. Verify cluster is running in MongoDB Atlas')
    steps.push('4. Check Atlas → Clusters → Status')
    steps.push('5. Review MongoDB Atlas connection troubleshooting guide:')
    steps.push('   https://www.mongodb.com/docs/atlas/troubleshoot-connection/')
  }

  if (isVercel) {
    steps.push('')
    steps.push('📦 VERCEL-SPECIFIC CHECKS:')
    steps.push('1. Verify MONGODB_URI is set in Vercel Dashboard → Settings → Environment Variables')
    steps.push('2. Ensure it\'s set for ALL environments (Production, Preview, Development)')
    steps.push('3. Redeploy after adding/updating environment variables')
    steps.push('4. Check deployment logs for connection errors')
  }

  return steps
}

const uri = process.env.MONGODB_URI

// Log MongoDB configuration status (both development and production for Vercel debugging)
const isVercel = !!process.env.VERCEL
const isProduction = process.env.NODE_ENV === 'production'

if (uri) {
  // Mask password in logs for security
  const maskedUri = uri.replace(/:([^:@]+)@/, ':****@')
  const uriLength = uri.length
  
  // Parse and validate connection string
  const uriDiagnostics = parseConnectionString(uri)
  
  console.log('[MongoDB] ✓ MONGODB_URI is configured')
  console.log(`[MongoDB]   - Environment: ${isVercel ? 'Vercel (Production)' : isProduction ? 'Production' : 'Development'}`)
  console.log(`[MongoDB]   - URI length: ${uriLength} characters`)
  console.log(`[MongoDB]   - URI format: ${uriDiagnostics.format === 'srv' ? 'mongodb+srv:// (Atlas)' : uriDiagnostics.format === 'standard' ? 'mongodb:// (Standard)' : 'INVALID'}`)
  console.log(`[MongoDB]   - URI preview: ${maskedUri.substring(0, Math.min(50, maskedUri.length))}${maskedUri.length > 50 ? '...' : ''}`)
  
  if (uriDiagnostics.hostname) {
    console.log(`[MongoDB]   - Hostname: ${uriDiagnostics.hostname}`)
  }
  
  // Report warnings
  if (uriDiagnostics.warnings.length > 0) {
    console.warn('[MongoDB] ⚠ Connection string warnings:')
    uriDiagnostics.warnings.forEach(warning => {
      console.warn(`[MongoDB]   - ${warning}`)
    })
  }
  
  // Report errors
  if (uriDiagnostics.errors.length > 0) {
    console.error('[MongoDB] ❌ Connection string errors:')
    uriDiagnostics.errors.forEach(error => {
      console.error(`[MongoDB]   - ${error}`)
    })
  }
  
  // Warn about special characters in password
  if (uriDiagnostics.passwordSpecialChars && uriDiagnostics.passwordSpecialChars.length > 0) {
    console.warn('[MongoDB] ⚠ Password contains special characters that may need encoding:')
    console.warn(`[MongoDB]   Special chars found: ${uriDiagnostics.passwordSpecialChars.join(', ')}`)
    console.warn('[MongoDB]   If connection fails, encode these characters in the password')
    console.warn('[MongoDB]   Example: @ becomes %40, # becomes %23, % becomes %25')
  }
  
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
        // maxPoolSize limits connections to prevent "too many open connections" errors
        // Based on MongoDB Atlas connection limits for cluster tiers
        maxPoolSize: 10, // Recommended for serverless - prevents connection exhaustion
        minPoolSize: 1,
        maxIdleTimeMS: 30000, // Close idle connections after 30s
        serverSelectionTimeoutMS: 15000, // Increased timeout for initial connection (was 10s)
        connectTimeoutMS: 15000, // Increased timeout for connection establishment (was 10s)
        socketTimeoutMS: 45000, // Timeout for socket operations
        heartbeatFrequencyMS: 10000, // Check connection health every 10s
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
              
              // Get detailed troubleshooting steps
              const troubleshootingSteps = getTroubleshootingSteps(errorMessage, isVercel)
              if (troubleshootingSteps.length > 0) {
                console.error('[MongoDB] 🔧 Troubleshooting steps:')
                troubleshootingSteps.forEach(step => {
                  console.error(`[MongoDB]   ${step}`)
                })
              }
              
              // Specific error guidance
              if (errorMessage.includes('authentication failed')) {
                console.error('[MongoDB] 💡 Quick fix: Check MongoDB Atlas → Database Access → Users')
                console.error('[MongoDB]   Verify username and password match connection string')
              } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
                console.error('[MongoDB] 💡 Quick fix: Verify cluster is not paused in MongoDB Atlas')
                console.error('[MongoDB]   M0 clusters auto-pause after 30 days of inactivity')
              } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
                console.error('[MongoDB] 💡 Quick fix: Check MongoDB Atlas → Network Access → IP Access List')
                if (isVercel) {
                  console.error('[MongoDB]   Add 0.0.0.0/0 to allow all IPs (or specific Vercel IPs)')
                } else {
                  console.error('[MongoDB]   Add your current IP address to the allowed list')
                }
              } else if (errorMessage.includes('MongoParseError') || errorMessage.includes('Protocol and host')) {
                console.error('[MongoDB] 💡 Quick fix: Encode special characters in password')
                console.error('[MongoDB]   Use encodeURIComponent() for username and password')
                console.error('[MongoDB]   Example: p@ssw0rd#123 → p%40ssw0rd%23123')
              } else if (errorMessage.includes('querySrv') || errorMessage.includes('SRV')) {
                console.error('[MongoDB] 💡 Quick fix: SRV DNS lookup failed')
                console.error('[MongoDB]   Try non-SRV connection string or check DNS settings')
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
            
            // Get detailed troubleshooting steps
            const troubleshootingSteps = getTroubleshootingSteps(errorMessage, isVercel)
            if (troubleshootingSteps.length > 0) {
              console.error('[MongoDB] 🔧 Troubleshooting steps:')
              troubleshootingSteps.forEach(step => {
                console.error(`[MongoDB]   ${step}`)
              })
            }
            
            // Specific error guidance
            if (errorMessage.includes('authentication failed')) {
              console.error('[MongoDB] 💡 Quick fix: Check MongoDB Atlas → Database Access → Users')
              console.error('[MongoDB]   Verify MONGODB_URI in Vercel environment variables matches Atlas user')
            } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
              console.error('[MongoDB] 💡 Quick fix: Verify cluster hostname and cluster status in Atlas')
              console.error('[MongoDB]   Cluster may be paused - resume it in Atlas dashboard')
            } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
              console.error('[MongoDB] 💡 Quick fix: Check MongoDB Atlas → Network Access → IP Access List')
              if (isVercel) {
                console.error('[MongoDB]   Add 0.0.0.0/0 to allow all IPs (recommended for serverless)')
                console.error('[MongoDB]   Or add specific Vercel IP ranges if you prefer')
              } else {
                console.error('[MongoDB]   Add your server IP address to the allowed list')
              }
            } else if (errorMessage.includes('MongoParseError') || errorMessage.includes('Protocol and host')) {
              console.error('[MongoDB] 💡 Quick fix: Encode special characters in password')
              console.error('[MongoDB]   Update MONGODB_URI in Vercel with URL-encoded password')
            } else if (errorMessage.includes('querySrv') || errorMessage.includes('SRV')) {
              console.error('[MongoDB] 💡 Quick fix: SRV DNS lookup failed - check DNS or use non-SRV connection')
            }
            
            throw error
          })
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[MongoDB] ❌ Failed to initialize client:', errorMessage)
    
    // Get detailed troubleshooting steps
    const troubleshootingSteps = getTroubleshootingSteps(errorMessage, isVercel)
    if (troubleshootingSteps.length > 0) {
      console.error('[MongoDB] 🔧 Troubleshooting steps:')
      troubleshootingSteps.forEach(step => {
        console.error(`[MongoDB]   ${step}`)
      })
    }
    
    if (errorMessage.includes('Protocol and host list are required')) {
      console.error('[MongoDB] Connection string parsing error - check if password contains special characters')
      console.error('[MongoDB] Example: If password is "password@123", encode it as "password%40123"')
      console.error('[MongoDB] Use encodeURIComponent() for username and password when building connection string')
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
    
    const isVercel = !!process.env.VERCEL
    const troubleshootingSteps = getTroubleshootingSteps(errorMessage, isVercel)
    if (troubleshootingSteps.length > 0) {
      console.error('[MongoDB] 🔧 Troubleshooting steps:')
      troubleshootingSteps.forEach(step => {
        console.error(`[MongoDB]   ${step}`)
      })
    }
    
    if (errorMessage.includes('authentication failed')) {
      console.error('[MongoDB] 💡 Quick fix: Verify username and password in MONGODB_URI match Atlas user')
    } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
      console.error('[MongoDB] 💡 Quick fix: Check cluster hostname and verify cluster is not paused')
    } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
      console.error('[MongoDB] 💡 Quick fix: Check IP Access List in MongoDB Atlas')
    } else if (errorMessage.includes('MongoParseError') || errorMessage.includes('Protocol and host')) {
      console.error('[MongoDB] 💡 Quick fix: Encode special characters in connection string password')
    }
    
    return false
  }
}

/**
 * Get comprehensive MongoDB connection diagnostics
 * Useful for debugging connection issues
 */
export function getMongoDBUriStatus() {
  const uri = process.env.MONGODB_URI
  const isVercel = !!process.env.VERCEL
  const diagnostics = uri ? parseConnectionString(uri) : null
  
  return {
    exists: !!uri,
    length: uri ? uri.length : 0,
    format: diagnostics?.format || (uri 
      ? (uri.startsWith('mongodb+srv://') ? 'mongodb+srv://' : uri.startsWith('mongodb://') ? 'mongodb://' : 'invalid')
      : 'not set'),
    preview: uri 
      ? uri.replace(/:([^:@]+)@/, ':****@').substring(0, Math.min(50, uri.length))
      : 'not set',
    environment: isVercel ? 'Vercel' : (process.env.NODE_ENV || 'unknown'),
    clientPromiseExists: !!clientPromise,
    diagnostics: diagnostics ? {
      isValid: diagnostics.isValid,
      hasAuth: diagnostics.hasAuth,
      hasPassword: diagnostics.hasPassword,
      hostname: diagnostics.hostname,
      username: diagnostics.username,
      passwordSpecialChars: diagnostics.passwordSpecialChars,
      errors: diagnostics.errors,
      warnings: diagnostics.warnings,
    } : null,
  }
}

/**
 * Get troubleshooting steps for a given error message
 * Exported for use in API routes and diagnostics
 */
export function getConnectionTroubleshootingSteps(errorMessage: string): string[] {
  const isVercel = !!process.env.VERCEL
  return getTroubleshootingSteps(errorMessage, isVercel)
}

/**
 * Encode password for MongoDB connection string
 * Exported utility for encoding passwords with special characters
 */
export { encodePassword }

/**
 * Parse and validate MongoDB connection string
 * Exported utility for connection string diagnostics
 */
export { parseConnectionString }

// Export a module-scoped promise. By doing this in a
// separate module, the client can be shared across functions.
// Returns null if MONGODB_URI is not configured (app will use in-memory fallback)
export default clientPromise
