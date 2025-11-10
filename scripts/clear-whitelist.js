const { MongoClient } = require('mongodb');
const readline = require('readline');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

/**
 * Clear whitelist database
 * 
 * This script deletes all entries from the proofs collection.
 * 
 * ⚠️ WARNING: This operation is irreversible!
 * 
 * Usage: node scripts/clear-whitelist.js
 */

const PROOFS_MONGODB_URI = process.env.PROOFS_MONGODB_URI;

if (!PROOFS_MONGODB_URI) {
  console.error('❌ Error: PROOFS_MONGODB_URI environment variable is not set');
  console.error('Please set PROOFS_MONGODB_URI in your .env.local file');
  process.exit(1);
}

const COLLECTION_NAME = 'proofs';

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

/**
 * Prompt for confirmation
 */
function promptConfirmation() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('⚠️  Are you sure you want to delete ALL whitelist entries? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Clear all whitelist entries
 */
async function clearWhitelist() {
  let client;
  
  try {
    // Prompt for confirmation
    const confirmed = await promptConfirmation();
    
    if (!confirmed) {
      console.log('❌ Operation cancelled');
      return;
    }
    
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(PROOFS_MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const dbName = extractDatabaseName(PROOFS_MONGODB_URI);
    const db = dbName ? client.db(dbName) : client.db();
    const collection = db.collection(COLLECTION_NAME);
    
    // Get count before deletion
    const countBefore = await collection.countDocuments({});
    console.log(`📊 Found ${countBefore} entries in proofs collection`);
    
    if (countBefore === 0) {
      console.log('ℹ️  Database is already empty');
      return;
    }
    
    // Delete all documents
    console.log('🗑️  Deleting all entries...');
    const result = await collection.deleteMany({});
    console.log(`✅ Successfully deleted ${result.deletedCount} entries`);
    
    // Verify deletion
    const countAfter = await collection.countDocuments({});
    console.log(`📊 Remaining entries: ${countAfter}`);
    
    if (countAfter === 0) {
      console.log('\n✅ Database cleared successfully');
    } else {
      console.log(`\n⚠️  Warning: ${countAfter} entries still remain`);
    }
    
  } catch (error) {
    console.error('\n❌ Error during database clear:');
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
  console.log('🔄 Starting whitelist database clear...\n');
  await clearWhitelist();
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

