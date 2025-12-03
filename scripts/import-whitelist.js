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
    
    // Detect duplicates in source data
    const addressMap = new Map();
    const duplicates = [];
    
    entries.forEach(([address, data]) => {
      const normalizedAddress = address.toLowerCase();
      
      if (addressMap.has(normalizedAddress)) {
        const existing = addressMap.get(normalizedAddress);
        if (!duplicates.find(d => d.address === normalizedAddress)) {
          duplicates.push({
            address: normalizedAddress,
            occurrences: [existing.originalAddress, address]
          });
        } else {
          const dup = duplicates.find(d => d.address === normalizedAddress);
          dup.occurrences.push(address);
        }
      } else {
        addressMap.set(normalizedAddress, { originalAddress: address, data });
      }
    });
    
    // Print duplicates if found
    if (duplicates.length > 0) {
      console.log(`\n⚠️  Found ${duplicates.length} duplicate address(es) in source data:`);
      duplicates.forEach((dup, index) => {
        console.log(`\n   ${index + 1}. Address: ${dup.address}`);
        console.log(`      Appears ${dup.occurrences.length} time(s) with these original addresses:`);
        dup.occurrences.forEach((origAddr, idx) => {
          console.log(`         ${idx + 1}. ${origAddr}`);
        });
      });
      console.log('\n   Note: Only the first occurrence will be used for each duplicate address.\n');
    } else {
      console.log('✅ No duplicates found in source data');
    }
    
    // Prepare documents for insertion (using first occurrence of each address)
    const documents = [];
    const validationErrors = [];
    
    Array.from(addressMap.entries()).forEach(([normalizedAddress, { data, originalAddress }], index) => {
      try {
        // Validate address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(normalizedAddress)) {
          throw new Error(`Invalid Ethereum address format: ${originalAddress}`);
        }
        
        // Validate proof structure
        if (!data.proof || !data.proof.r || !data.proof.s || typeof data.proof.v !== 'number') {
          throw new Error(`Invalid proof structure for address: ${originalAddress}`);
        }
        
        // Validate alloted
        if (typeof data.alloted !== 'number' || data.alloted < 0) {
          throw new Error(`Invalid alloted value for address: ${originalAddress}`);
        }
        
        documents.push({
          walletAddress: normalizedAddress,
          alloted: data.alloted,
          proof: {
            r: data.proof.r,
            s: data.proof.s,
            v: data.proof.v,
          },
        });
      } catch (error) {
        validationErrors.push({
          address: originalAddress,
          normalizedAddress: normalizedAddress,
          error: error.message
        });
      }
    });
    
    // Print validation errors if any
    if (validationErrors.length > 0) {
      console.log(`\n❌ Found ${validationErrors.length} record(s) with validation errors:`);
      validationErrors.forEach((err, index) => {
        console.log(`\n   ${index + 1}. Address: ${err.address}`);
        console.log(`      Normalized: ${err.normalizedAddress}`);
        console.log(`      Error: ${err.error}`);
      });
      console.log('\n   These records will be skipped during insertion.\n');
    }
    
    // Check if there are any valid documents to insert
    if (documents.length === 0) {
      console.log('\n⚠️  No valid documents to insert after validation.');
      if (validationErrors.length > 0) {
        console.log('   All records failed validation. Please fix the errors above and try again.');
      }
      return;
    }
    
    // Clear existing data to ensure clean import
    console.log('🧹 Clearing existing data from collection...');
    const deleteResult = await collection.deleteMany({});
    console.log(`✅ Cleared ${deleteResult.deletedCount} existing documents`);
    
    // Insert all documents
    console.log(`📝 Inserting ${documents.length} documents...`);
    let result;
    const insertionErrors = [];
    
    try {
      result = await collection.insertMany(documents, { ordered: false });
      console.log(`✅ Successfully inserted ${result.insertedCount} documents`);
    } catch (error) {
      // Handle BulkWriteError which contains details about failed insertions
      if (error.name === 'MongoBulkWriteError' && error.writeErrors) {
        result = error.result || { insertedCount: 0 };
        
        error.writeErrors.forEach((writeError) => {
          const failedDoc = documents[writeError.index];
          insertionErrors.push({
            address: failedDoc.walletAddress,
            error: writeError.errmsg || writeError.err.message,
            code: writeError.err.code
          });
        });
        
        // Still log successful insertions if any
        if (result.insertedCount > 0) {
          console.log(`⚠️  Partially inserted: ${result.insertedCount} documents succeeded`);
        }
      } else {
        // For other errors, rethrow
        throw error;
      }
    }
    
    // Print insertion errors if any
    if (insertionErrors.length > 0) {
      console.log(`\n❌ Failed to insert ${insertionErrors.length} record(s):`);
      insertionErrors.forEach((err, index) => {
        console.log(`\n   ${index + 1}. Address: ${err.address}`);
        console.log(`      Error: ${err.error}`);
        if (err.code) {
          console.log(`      Error Code: ${err.code}`);
        }
      });
      console.log('');
    }
    
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
    
    // Final summary
    const totalFailed = validationErrors.length + insertionErrors.length;
    if (totalFailed > 0) {
      console.log(`\n⚠️  Import completed with ${totalFailed} failed record(s).`);
      console.log(`   - Validation errors: ${validationErrors.length}`);
      console.log(`   - Insertion errors: ${insertionErrors.length}`);
    } else {
      console.log('\n✅ Import completed successfully!');
    }
    
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

