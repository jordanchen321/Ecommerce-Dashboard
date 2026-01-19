// Verify MongoDB document structure for user-specific data
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

async function verifyStructure() {
  const uri = process.env.MONGODB_URI
  
  console.log('\n=== MongoDB Document Structure Verification ===\n')
  
  if (!uri) {
    console.log('❌ MONGODB_URI is NOT configured')
    process.exit(1)
  }
  
  try {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    })
    
    await client.connect()
    console.log('✓ Connected to MongoDB\n')
    
    const db = client.db('ecommerce_dashboard')
    const collection = db.collection('products')
    
    const allDocuments = await collection.find({}).toArray()
    console.log(`Total documents in 'products' collection: ${allDocuments.length}\n`)
    
    if (allDocuments.length === 0) {
      console.log('📝 Collection is empty - this is normal if you haven\'t added any products yet.')
      console.log('\n📋 Expected Document Structure (when data exists):')
      console.log('   {')
      console.log('     userEmail: "user@gmail.com",  ← User\'s Gmail address')
      console.log('     products: [                   ← Array of products')
      console.log('       { id: "...", name: "...", price: 10, ... },')
      console.log('       ...')
      console.log('     ],')
      console.log('     columnConfig: [               ← Column configuration')
      console.log('       { id: "...", field: "name", visible: true, ... },')
      console.log('       ...')
      console.log('     ],')
      console.log('     updatedAt: ISODate("...")     ← Last update timestamp')
      console.log('   }')
      console.log('\n💡 Each user (Gmail) gets their own document in the collection.')
      console.log('   Documents are identified by the "userEmail" field.\n')
    } else {
      console.log('📋 Document Structure Verification:\n')
      allDocuments.forEach((doc, index) => {
        console.log(`Document ${index + 1}:`)
        console.log(`  ✓ userEmail: "${doc.userEmail || 'MISSING ❌'}"`)
        console.log(`  ✓ products: ${Array.isArray(doc.products) ? doc.products.length + ' items' : 'MISSING ❌'}`)
        console.log(`  ✓ columnConfig: ${doc.columnConfig !== undefined ? (Array.isArray(doc.columnConfig) ? doc.columnConfig.length + ' columns' : 'invalid type') : 'MISSING ❌'}`)
        console.log(`  ✓ updatedAt: ${doc.updatedAt ? doc.updatedAt.toISOString() : 'MISSING ❌'}`)
        
        if (doc.products && doc.products.length > 0) {
          console.log(`\n  Sample product:`)
          const sample = doc.products[0]
          console.log(`    - name: "${sample.name || 'N/A'}"`)
          console.log(`    - productId: "${sample.productId || 'N/A'}"`)
          console.log(`    - price: ${sample.price || 0}`)
        }
        
        if (doc.columnConfig && Array.isArray(doc.columnConfig) && doc.columnConfig.length > 0) {
          const customCols = doc.columnConfig.filter(c => c.isCustom)
          console.log(`\n  Column config:`)
          console.log(`    - Total columns: ${doc.columnConfig.length}`)
          console.log(`    - Custom columns: ${customCols.length}`)
        }
        
        console.log('')
      })
    }
    
    await client.close()
    console.log('✅ Verification complete!\n')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

verifyStructure()
