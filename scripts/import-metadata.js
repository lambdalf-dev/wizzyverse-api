const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

/**
 * Import metadata from JSON file to MongoDB
 * 
 * Usage: node scripts/import-metadata.js [path-to-json-file]
 * 
 * Example: node scripts/import-metadata.js ../data/metadata.json
 */

const METADATA_MONGODB_URI = process.env.METADATA_MONGODB_URI;

if (!METADATA_MONGODB_URI) {
  console.error('❌ Error: METADATA_MONGODB_URI environment variable is not set');
  console.error('Please set METADATA_MONGODB_URI in your .env.local file');
  process.exit(1);
}

const COLLECTION_NAME = 'metadata';

/**
 * Extract database name from MongoDB URI
 */
function extractDatabaseName(uri) {
  if (uri.includes('mongodb+srv://')) {
    const match = uri.match(/mongodb\+srv:\/\/[^/]+\/([^?]+)/);
    return match?.[1];
  } else {
    const match = uri.match(/mongodb:\/\/[^/]+\/([^?]+)/);
    return match?.[1];
  }
}

async function importMetadata(jsonFilePath) {
  let client;
  
  try {
    // Read and parse JSON file
    console.log(`📖 Reading metadata from: ${jsonFilePath}`);
    const fileContent = await fs.readFile(jsonFilePath, 'utf-8');
    const metadataRecords = JSON.parse(fileContent);
    
    const entries = Object.entries(metadataRecords);
    console.log(`✅ Found ${entries.length} metadata entries`);
    
    if (entries.length === 0) {
      console.log('⚠️  No entries to import');
      return;
    }
    
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(METADATA_MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const dbName = extractDatabaseName(METADATA_MONGODB_URI);
    const db = dbName ? client.db(dbName) : client.db();
    const collection = db.collection(COLLECTION_NAME);
    
    // Clear existing data first
    console.log('🧹 Clearing existing data from collection...');
    const deleteResult = await collection.deleteMany({});
    console.log(`✅ Cleared ${deleteResult.deletedCount} existing documents`);
    
    // Drop any existing tokenId index to avoid conflicts during import
    // (all tokenIds will be null, so we don't need the index yet)
    try {
      console.log('📇 Dropping existing tokenId index if it exists...');
      const indexes = await collection.indexes();
      const tokenIdIndex = indexes.find(idx => idx.key && idx.key.tokenId);
      
      if (tokenIdIndex) {
        await collection.dropIndex(tokenIdIndex.name);
        console.log('✅ Existing tokenId index dropped');
      }
    } catch (error) {
      // If index doesn't exist or can't be dropped, continue anyway
      if (error.code !== 27 && error.codeName !== 'IndexNotFound') {
        console.log('ℹ️  Could not drop existing index, continuing...');
      }
    }
    
    // Prepare documents for insertion
    // Note: tokenId starts as null and will be assigned by the shuffle/reveal script
    const documents = entries.map(([recordKey, data]) => {
      // Validate image
      if (!data.image || typeof data.image !== 'string') {
        throw new Error(`Invalid image for record: ${recordKey}`);
      }
      
      // Validate attributes
      if (!Array.isArray(data.attributes)) {
        throw new Error(`Invalid attributes for record: ${recordKey}`);
      }
      
      // Validate attribute structure
      data.attributes.forEach((attr, index) => {
        if (!attr || typeof attr !== 'object') {
          throw new Error(`Invalid attribute at index ${index} for record: ${recordKey}`);
        }
        if (!attr.trait_type || typeof attr.trait_type !== 'string') {
          throw new Error(`Invalid trait_type at index ${index} for record: ${recordKey}`);
        }
        if (attr.value === undefined || (typeof attr.value !== 'string' && typeof attr.value !== 'number')) {
          throw new Error(`Invalid value at index ${index} for record: ${recordKey}`);
        }
      });
      
      return {
        tokenId: null, // Will be assigned by shuffle/reveal script
        metadata: {
          image: data.image,
          attributes: data.attributes.map(attr => ({
            trait_type: attr.trait_type,
            value: attr.value,
          })),
        },
      };
    });
    
    // Insert all documents
    console.log(`📝 Inserting ${documents.length} documents...`);
    const result = await collection.insertMany(documents, { ordered: false });
    console.log(`✅ Successfully inserted ${result.insertedCount} documents`);
    
    // Verify import
    const totalCount = await collection.countDocuments();
    console.log(`\n📊 Database now contains ${totalCount} metadata entries`);
    
    // Show sample of imported data
    const sample = await collection.find().limit(3).toArray();
    if (sample.length > 0) {
      console.log('\n📋 Sample of imported data:');
      sample.forEach((doc, index) => {
        console.log(`   ${index + 1}. Token ID: ${doc.tokenId} - Name: ${doc.metadata.name}`);
        console.log(`      Image: ${doc.metadata.image}, Attributes: ${doc.metadata.attributes.length}`);
      });
    }
    
    console.log('\n✅ Import completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error importing metadata:');
    console.error(error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Main execution
async function main() {
  const jsonFilePath = process.argv[2];
  
  if (!jsonFilePath) {
    console.error('❌ Error: JSON file path is required');
    console.error('\nUsage: node scripts/import-metadata.js <path-to-json-file>');
    console.error('\nExample:');
    console.error('  node scripts/import-metadata.js ../data/metadata.json');
    console.error('  node scripts/import-metadata.js ./data/metadata.json');
    process.exit(1);
  }
  
  // Resolve file path
  const resolvedPath = path.resolve(jsonFilePath);
  
  // Check if file exists
  try {
    await fs.access(resolvedPath);
  } catch (error) {
    console.error(`❌ Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }
  
  await importMetadata(resolvedPath);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

