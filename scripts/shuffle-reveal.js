const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

/**
 * Shuffle and reveal script for Wizzyverse NFT metadata
 * 
 * This script randomly shuffles all metadata entries and assigns token IDs.
 * 
 * ⚠️ IMPORTANT: This script can only be executed once. Once token IDs are assigned,
 * running it again will fail to prevent accidental re-shuffling.
 * 
 * Usage: node scripts/shuffle-reveal.js
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
 * Fisher-Yates shuffle algorithm for true randomization
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Shuffle and assign token IDs to all metadata entries
 */
async function shuffleAndReveal() {
  let client;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(METADATA_MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const dbName = extractDatabaseName(METADATA_MONGODB_URI);
    const db = dbName ? client.db(dbName) : client.db();
    const collection = db.collection(COLLECTION_NAME);
    
    // Check if shuffle has already been executed
    console.log('🔍 Checking if shuffle has already been executed...');
    const alreadyShuffled = await collection.countDocuments({ tokenId: { $ne: null } });
    
    if (alreadyShuffled > 0) {
      console.error('❌ Error: Shuffle has already been executed');
      console.error(`   Found ${alreadyShuffled} entries with assigned token IDs`);
      console.error('   This script can only be run once to prevent accidental re-shuffling');
      process.exit(1);
    }
    
    // Get all entries with null tokenId
    console.log('📊 Fetching all metadata entries...');
    const entries = await collection.find({ tokenId: null }).toArray();
    const totalEntries = entries.length;
    
    if (totalEntries === 0) {
      console.log('⚠️  No entries found to shuffle');
      return;
    }
    
    console.log(`✅ Found ${totalEntries} entries to shuffle`);
    
    // Shuffle the entries randomly
    console.log('🔀 Shuffling entries randomly...');
    const shuffledEntries = shuffleArray(entries);
    console.log('✅ Shuffle completed');
    
    // Assign token IDs starting from 1
    console.log('📝 Assigning token IDs...');
    const updates = shuffledEntries.map((entry, index) => {
      const tokenId = String(index + 1); // Start from 1, convert to string
      return {
        updateOne: {
          filter: { _id: entry._id },
          update: { $set: { tokenId: tokenId } },
        },
      };
    });
    
    // Perform bulk update
    console.log('💾 Updating database...');
    const result = await collection.bulkWrite(updates, { ordered: false });
    console.log(`✅ Successfully updated ${result.modifiedCount} entries`);
    
    // Create sparse unique index on tokenId now that tokenIds are assigned
    console.log('📇 Creating index on tokenId...');
    try {
      await collection.createIndex({ tokenId: 1 }, { unique: true, sparse: true });
      console.log('✅ Index created');
    } catch (error) {
      // If index already exists, that's fine
      if (error.code === 85 || error.codeName === 'IndexOptionsConflict' || error.code === 86) {
        console.log('ℹ️  Index already exists, continuing...');
      } else {
        throw error;
      }
    }
    
    // Verify the shuffle
    console.log('\n🔍 Verifying shuffle results...');
    const totalWithTokenIds = await collection.countDocuments({ tokenId: { $ne: null } });
    const totalNull = await collection.countDocuments({ tokenId: null });
    
    console.log(`📊 Total entries with token IDs: ${totalWithTokenIds}`);
    console.log(`📊 Total entries without token IDs: ${totalNull}`);
    
    // Show sample of shuffled data
    const sample = await collection.find({ tokenId: { $ne: null } }).limit(5).sort({ tokenId: 1 }).toArray();
    if (sample.length > 0) {
      console.log('\n📋 Sample of shuffled assignments:');
      sample.forEach((doc) => {
        console.log(`   Token ID: ${doc.tokenId} - Image: ${doc.metadata.image}`);
      });
    }
    
    console.log('\n✅ Shuffle and reveal completed successfully!');
    console.log(`📊 Total tokens processed: ${totalEntries}`);
    console.log(`🎲 Token IDs assigned: 1 to ${totalEntries}`);
    
  } catch (error) {
    console.error('\n❌ Error during shuffle and reveal:');
    console.error(error.message);
    
    if (error.code === 11000) {
      console.error('\n💡 Duplicate key error. This may indicate a conflict.');
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
  console.log('🔄 Starting shuffle and reveal process...\n');
  await shuffleAndReveal();
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

