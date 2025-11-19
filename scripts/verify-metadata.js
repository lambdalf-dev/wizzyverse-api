const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

/**
 * Verify metadata table contents
 * 
 * This script shows:
 * - Total number of entries
 * - Number of entries with tokenId = null
 * - Number of entries with tokenId != null
 * 
 * Usage: node scripts/verify-metadata.js
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

/**
 * Verify metadata table contents
 */
async function verifyMetadata() {
  let client;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(METADATA_MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const dbName = extractDatabaseName(METADATA_MONGODB_URI);
    const db = dbName ? client.db(dbName) : client.db();
    const collection = db.collection(COLLECTION_NAME);
    
    // Get counts
    console.log('📊 Verifying metadata table...\n');
    
    const totalCount = await collection.countDocuments({});
    const nullTokenIdCount = await collection.countDocuments({ tokenId: null });
    const assignedTokenIdCount = await collection.countDocuments({ tokenId: { $ne: null } });
    
    // Display results
    console.log('📈 Metadata Table Summary:');
    console.log('─'.repeat(50));
    console.log(`   Total entries:        ${totalCount}`);
    console.log(`   tokenId = null:      ${nullTokenIdCount}`);
    console.log(`   tokenId != null:     ${assignedTokenIdCount}`);
    console.log('─'.repeat(50));
    
    // Show sample entries if any exist
    if (totalCount > 0) {
      console.log('\n📋 Sample entries:');
      
      // Sample with null tokenId
      const nullSample = await collection.find({ tokenId: null }).limit(3).toArray();
      if (nullSample.length > 0) {
        console.log('\n   Entries with tokenId = null:');
        nullSample.forEach((doc, index) => {
          const metadata = doc.metadata || {};
          const modelId = metadata.modelId || 'N/A';
          const name = metadata.name || 'N/A';
          console.log(`   ${index + 1}. _id: ${doc._id}`);
          console.log(`      ModelId: ${modelId}`);
          console.log(`      Name: ${name}`);
          console.log(`      Attributes: ${metadata.attributes?.length || 0}`);
        });
      }
      
      // Sample with assigned tokenId
      const assignedSample = await collection.find({ tokenId: { $ne: null } }).limit(3).sort({ tokenId: 1 }).toArray();
      if (assignedSample.length > 0) {
        console.log('\n   Entries with tokenId assigned:');
        assignedSample.forEach((doc, index) => {
          const metadata = doc.metadata || {};
          const modelId = metadata.modelId || 'N/A';
          const name = metadata.name || 'N/A';
          console.log(`   ${index + 1}. tokenId: ${doc.tokenId}`);
          console.log(`      ModelId: ${modelId}`);
          console.log(`      Name: ${name}`);
          console.log(`      Attributes: ${metadata.attributes?.length || 0}`);
        });
      }
      
      // Validate that all entries have modelId
      const entriesWithoutModelId = await collection.countDocuments({
        $or: [
          { 'metadata.modelId': { $exists: false } },
          { 'metadata.modelId': null },
          { 'metadata.modelId': '' }
        ]
      });
      
      if (entriesWithoutModelId > 0) {
        console.log(`\n⚠️  Warning: Found ${entriesWithoutModelId} entries without modelId`);
      } else {
        console.log('\n✅ All entries have a valid modelId');
      }
    }
    
    console.log('\n✅ Verification completed');
    
  } catch (error) {
    console.error('\n❌ Error during verification:');
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
  await verifyMetadata();
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

