// Quick MongoDB connection test script
const fs = require('fs')
const path = require('path')
const { MongoClient } = require('mongodb')

// Read .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8')
    content.split(/\r?\n/).forEach(line => {
      line = line.trim()
      if (line && !line.startsWith('#')) {
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          let value = match[2].trim()
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          process.env[key] = value
        }
      }
    })
  }
}

loadEnv()

async function testConnection() {
  const uri = process.env.MONGODB_URI
  
  console.log('\n=== MongoDB Connection Test ===\n')
  
  if (!uri) {
    console.log('❌ MONGODB_URI is NOT configured in .env.local')
    console.log('   Please add: MONGODB_URI=your-connection-string')
    process.exit(1)
  }
  
  // Mask password in output
  const maskedUri = uri.replace(/:([^:@]+)@/, ':****@')
  console.log(`✓ MONGODB_URI is configured: ${maskedUri}`)
  
  try {
    console.log('\nAttempting to connect...')
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    })
    
    await client.connect()
    console.log('✓ Successfully connected to MongoDB!')
    
    // Test ping
    await client.db('admin').command({ ping: 1 })
    console.log('✓ Connection ping successful')
    
    // Check if database exists
    const db = client.db('ecommerce_dashboard')
    const collections = await db.listCollections().toArray()
    console.log(`✓ Database 'ecommerce_dashboard' accessible`)
    console.log(`  Collections found: ${collections.length}`)
    
    // Check products collection
    const productsCollection = db.collection('products')
    const productCount = await productsCollection.countDocuments()
    console.log(`✓ Products collection accessible`)
    console.log(`  Total user documents: ${productCount}`)
    
    if (productCount > 0) {
      const sample = await productsCollection.findOne({})
      console.log(`\n  Sample document structure:`)
      console.log(`    - gmail: ${sample?.gmail || sample?.userEmail || 'N/A'}`)
      console.log(`    - userEmail (old): ${sample?.userEmail || 'N/A (migrated to gmail)'}`)
      console.log(`    - products count: ${sample?.products?.length || 0}`)
      console.log(`    - columnConfigs count: ${sample?.columnConfigs?.length || sample?.columnConfig?.length || 0}`)
      console.log(`    - updatedAt: ${sample?.updatedAt || 'N/A'}`)
      
      // Check for migration needed
      if (sample?.userEmail && !sample?.gmail) {
        console.log(`\n  ⚠ Document uses old structure (userEmail) - will be migrated on next save`)
      }
    } else {
      console.log(`  No documents found - database is ready for new data`)
    }
    
    await client.close()
    console.log('\n✅ MongoDB is fully configured and connected!')
    console.log('   Your app will save data to MongoDB.\n')
    
  } catch (error) {
    console.error('\n❌ Connection failed!')
    console.error(`   Error: ${error.message}\n`)
    
    if (error.message.includes('authentication failed')) {
      console.error('   → Check your username and password in MONGODB_URI')
      console.error('   → Make sure your MongoDB user has read/write permissions')
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('   → Check your cluster hostname in MONGODB_URI')
      console.error('   → Verify your MongoDB Atlas cluster is running')
    } else if (error.message.includes('timeout')) {
      console.error('   → Check your network connection')
      console.error('   → Verify MongoDB Atlas Network Access allows your IP')
      console.error('   → Go to: MongoDB Atlas → Network Access → Add IP Address')
    } else if (error.message.includes('MongoParseError')) {
      console.error('   → Check your connection string format')
      console.error('   → If password contains @, encode it as %40')
    }
    
    process.exit(1)
  }
}

testConnection()
