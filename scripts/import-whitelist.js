const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

/**
 * Import whitelist data from JSON file to MongoDB
 * 
 * Usage: node scripts/import-whitelist.js [path-to-json-file]
 * 
 * Example: node scripts/import-whitelist.js ../wizzyverse-ms/data/whitelist-records.json
 */

const PROOFS_MONGODB_URI = process.env.PROOFS_MONGODB_URI;

if (!PROOFS_MONGODB_URI) {
  console.error('❌ Error: PROOFS_MONGODB_URI environment variable is not set');
  console.error('Please set PROOFS_MONGODB_URI in your .env.local file');
  process.exit(1);
}

const COLLECTION_NAME = 'proofs';

async function importWhitelist(jsonFilePath) {
  let client;
  
  try {
    // Read and parse JSON file
    console.log(`📖 Reading whitelist data from: ${jsonFilePath}`);
    const fileContent = await fs.readFile(jsonFilePath, 'utf-8');
    const whitelistRecords = JSON.parse(fileContent);
    
    const entries = Object.entries(whitelistRecords);
    console.log(`✅ Found ${entries.length} whitelist entries`);
    
    if (entries.length === 0) {
      console.log('⚠️  No entries to import');
      return;
    }
    
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(PROOFS_MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection(COLLECTION_NAME);
    
    // Create index on walletAddress for faster lookups
    console.log('📇 Creating index on walletAddress...');
    await collection.createIndex({ walletAddress: 1 }, { unique: true });
    console.log('✅ Index created');
    
    // Prepare documents for insertion
    const documents = entries.map(([address, data]) => {
      const normalizedAddress = address.toLowerCase();
      
      // Validate address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(normalizedAddress)) {
        throw new Error(`Invalid Ethereum address format: ${address}`);
      }
      
      // Validate proof structure
      if (!data.proof || !data.proof.r || !data.proof.s || typeof data.proof.v !== 'number') {
        throw new Error(`Invalid proof structure for address: ${address}`);
      }
      
      // Validate alloted
      if (typeof data.alloted !== 'number' || data.alloted < 0) {
        throw new Error(`Invalid alloted value for address: ${address}`);
      }
      
      return {
        walletAddress: normalizedAddress,
        alloted: data.alloted,
        proof: {
          r: data.proof.r,
          s: data.proof.s,
          v: data.proof.v,
        },
      };
    });
    
    // Clear existing data to ensure clean import
    console.log('🧹 Clearing existing data from collection...');
    const deleteResult = await collection.deleteMany({});
    console.log(`✅ Cleared ${deleteResult.deletedCount} existing documents`);
    
    // Insert all documents
    console.log(`📝 Inserting ${documents.length} documents...`);
    const result = await collection.insertMany(documents, { ordered: false });
    console.log(`✅ Successfully inserted ${result.insertedCount} documents`);
    
    // Verify import
    const totalCount = await collection.countDocuments();
    console.log(`\n📊 Database now contains ${totalCount} proof entries`);
    
    // Show sample of imported data
    const sample = await collection.find().limit(3).toArray();
    if (sample.length > 0) {
      console.log('\n📋 Sample of imported data:');
      sample.forEach((doc, index) => {
        console.log(`   ${index + 1}. ${doc.walletAddress} - Alloted: ${doc.alloted}`);
      });
    }
    
    console.log('\n✅ Import completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error importing whitelist data:');
    console.error(error.message);
    
    if (error.code === 11000) {
      console.error('\n💡 Duplicate key error. Some entries may already exist.');
      console.error('   The script will skip existing entries on next run.');
    }
    
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
    console.error('\nUsage: node scripts/import-whitelist.js <path-to-json-file>');
    console.error('\nExample:');
    console.error('  node scripts/import-whitelist.js ../wizzyverse-ms/data/whitelist-records.json');
    console.error('  node scripts/import-whitelist.js ./data/whitelist-records.json');
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
  
  await importWhitelist(resolvedPath);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

