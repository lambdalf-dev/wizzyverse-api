const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

/**
 * Shuffle and reveal script for Wizzyverse NFT metadata
 * 
 * This script randomly shuffles all metadata entries and assigns token IDs with constraints:
 * - Token #10001 must be "Witchy the Red"
 * - Santa Wizzy and Wizzy de los Muertos can be anywhere
 * - Exactly one archmage per batch of 666 tokens
 * - Prismatic Wizzy must be in batch 8 (middle batch)
 * - Wizzy the Blue, Green, Golden, Orange, Black, Purple + one of Santa Wizzy or Wizzy de los Muertos must be in batches 1-7
 * - Wizzy the Blue Undying, Green Overgrown, Golden Transmuted, Orange Summoned, Black Fortified, Purple Overpowered + the other one of Santa Wizzy or Wizzy de los Muertos must be in batches 9-15
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

// Batch configuration
const TOKENS_PER_BATCH = 666;
const TOTAL_BATCHES = 15;
const TOTAL_TOKENS = 10001; // 15 batches * 666 + 1 special token

// Batch ranges (1-indexed)
function getBatchRange(batchNumber) {
  const start = (batchNumber - 1) * TOKENS_PER_BATCH + 1;
  const end = batchNumber * TOKENS_PER_BATCH;
  return { start, end };
}

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
 * Get token name from metadata (checks name field, Archmage attribute, or Name attribute)
 */
function getTokenName(entry) {
  const metadata = entry.metadata || {};
  
  // Check name field first
  if (metadata.name && metadata.name.trim() !== '') {
    return metadata.name.trim();
  }
  
  // Check Archmage attribute
  if (metadata.attributes && Array.isArray(metadata.attributes)) {
    const archmageAttr = metadata.attributes.find(attr => 
      attr.trait_type && attr.trait_type.toLowerCase() === 'archmage'
    );
    if (archmageAttr && archmageAttr.value) {
      return String(archmageAttr.value).trim();
    }
    
    // Check Name attribute
    const nameAttr = metadata.attributes.find(attr => 
      attr.trait_type && attr.trait_type.toLowerCase() === 'name'
    );
    if (nameAttr && nameAttr.value) {
      return String(nameAttr.value).trim();
    }
  }
  
  return null;
}

/**
 * Check if token is an Archmage token
 */
function isArchmageToken(entry) {
  const metadata = entry.metadata || {};
  if (!metadata.attributes || !Array.isArray(metadata.attributes)) {
    return false;
  }
  
  const archmageAttr = metadata.attributes.find(attr => 
    attr.trait_type && attr.trait_type.toLowerCase() === 'archmage'
  );
  
  return archmageAttr !== undefined && 
         archmageAttr.value !== undefined &&
         String(archmageAttr.value).trim() !== '';
}

/**
 * Helper function to check if token name matches (case-insensitive, flexible matching)
 */
function nameMatches(entry, ...possibleNames) {
  const name = getTokenName(entry);
  if (!name) return false;
  
  const normalizedName = name.toLowerCase().trim();
  return possibleNames.some(possibleName => 
    normalizedName === possibleName.toLowerCase().trim()
  );
}

// Special token identification functions
function isWitchyTheRed(entry) {
  return nameMatches(entry, 'Witchy the Red', 'Witchy The Red');
}

function isPrismaticWizzy(entry) {
  return nameMatches(entry, 'Prismatic Wizzy');
}

function isSantaWizzy(entry) {
  return nameMatches(entry, 'Santa Wizzy');
}

function isWizzyDeLosMuertos(entry) {
  return nameMatches(entry, 'Wizzy de los Muertos', 'Wizzy De Los Muertos');
}

function isWizzyTheBlue(entry) {
  return nameMatches(entry, 'Wizzy the Blue', 'Wizzy The Blue');
}

function isWizzyTheGreen(entry) {
  return nameMatches(entry, 'Wizzy the Green', 'Wizzy The Green');
}

function isWizzyTheGolden(entry) {
  return nameMatches(entry, 'Wizzy the Golden', 'Wizzy The Golden');
}

function isWizzyTheOrange(entry) {
  return nameMatches(entry, 'Wizzy the Orange', 'Wizzy The Orange');
}

function isWizzyTheBlack(entry) {
  return nameMatches(entry, 'Wizzy the Black', 'Wizzy The Black');
}

function isWizzyThePurple(entry) {
  return nameMatches(entry, 'Wizzy the Purple', 'Wizzy The Purple', 'Wizy the Purple', 'Wizy The Purple');
}

function isWizzyTheBlueUndying(entry) {
  return nameMatches(entry, 'Wizzy the Blue Undying', 'Wizzy The Blue Undying');
}

function isWizzyTheGreenOvergrown(entry) {
  return nameMatches(entry, 'Wizzy the Green Overgrown', 'Wizzy The Green Overgrown');
}

function isWizzyTheGoldenTransmuted(entry) {
  return nameMatches(entry, 'Wizzy the Golden Transmuted', 'Wizzy The Golden Transmuted');
}

function isWizzyTheOrangeSummoned(entry) {
  return nameMatches(entry, 'Wizzy the Orange Summoned', 'Wizzy The Orange Summoned');
}

function isWizzyTheBlackFortified(entry) {
  return nameMatches(entry, 'Wizzy the Black Fortified', 'Wizzy The Black Fortified');
}

function isWizzyThePurpleOverpowered(entry) {
  return nameMatches(entry, 'Wizzy the Purple Overpowered', 'Wizzy The Purple Overpowered');
}

/**
 * Shuffle and assign token IDs to all metadata entries with constraints
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
    
    if (totalEntries !== TOTAL_TOKENS) {
      console.warn(`⚠️  Warning: Expected ${TOTAL_TOKENS} entries, found ${totalEntries}`);
    }
    
    console.log(`✅ Found ${totalEntries} entries to shuffle\n`);
    
    // Separate tokens into categories
    console.log('🔍 Categorizing tokens...');
    
    let witchyTheRed = null;
    let prismaticWizzy = null;
    let santaWizzy = null;
    let wizzyDeLosMuertos = null;
    const batch1to7Tokens = []; // Wizzy the Blue, Green, Golden, Orange, Black, Purple
    const batch9to15Tokens = []; // Wizzy the Blue Undying, Green Overgrown, etc.
    const archmages = [];
    const regularTokens = [];
    
    for (const entry of entries) {
      const isArchmage = isArchmageToken(entry);
      
      if (isWitchyTheRed(entry)) {
        if (witchyTheRed) {
          console.warn(`⚠️  Warning: Found duplicate Witchy the Red: ${getTokenName(entry)}`);
        }
        witchyTheRed = entry;
      } else if (isPrismaticWizzy(entry)) {
        if (prismaticWizzy) {
          console.warn(`⚠️  Warning: Found duplicate Prismatic Wizzy: ${getTokenName(entry)}`);
        }
        prismaticWizzy = entry;
      } else if (isSantaWizzy(entry)) {
        if (santaWizzy) {
          console.warn(`⚠️  Warning: Found duplicate Santa Wizzy: ${getTokenName(entry)}`);
        }
        santaWizzy = entry;
      } else if (isWizzyDeLosMuertos(entry)) {
        if (wizzyDeLosMuertos) {
          console.warn(`⚠️  Warning: Found duplicate Wizzy de los Muertos: ${getTokenName(entry)}`);
        }
        wizzyDeLosMuertos = entry;
      } else if (isWizzyTheBlue(entry) || isWizzyTheGreen(entry) || isWizzyTheGolden(entry) || 
                 isWizzyTheOrange(entry) || isWizzyTheBlack(entry) || isWizzyThePurple(entry)) {
        batch1to7Tokens.push(entry);
        // Don't add to archmages array - if it's an archmage, it will serve as archmage for its batch
      } else if (isWizzyTheBlueUndying(entry) || isWizzyTheGreenOvergrown(entry) || 
                 isWizzyTheGoldenTransmuted(entry) || isWizzyTheOrangeSummoned(entry) || 
                 isWizzyTheBlackFortified(entry) || isWizzyThePurpleOverpowered(entry)) {
        batch9to15Tokens.push(entry);
        // Don't add to archmages array - if it's an archmage, it will serve as archmage for its batch
      } else if (isArchmage) {
        archmages.push(entry);
      } else {
        regularTokens.push(entry);
      }
    }
    
    // Check if Prismatic Wizzy is an archmage
    const prismaticIsArchmage = prismaticWizzy && isArchmageToken(prismaticWizzy);
    
    // Check if batch 1-7 and batch 9-15 tokens are archmages
    const batch1to7Archmages = batch1to7Tokens.filter(isArchmageToken).length;
    const batch9to15Archmages = batch9to15Tokens.filter(isArchmageToken).length;
    const santaIsArchmage = santaWizzy && isArchmageToken(santaWizzy);
    const muertosIsArchmage = wizzyDeLosMuertos && isArchmageToken(wizzyDeLosMuertos);
    
    // Validation
    console.log('\n📋 Token categorization:');
    console.log(`   Witchy the Red: ${witchyTheRed ? '✓' : '✗'}`);
    console.log(`   Prismatic Wizzy: ${prismaticWizzy ? '✓' : '✗'} ${prismaticIsArchmage ? '(is archmage)' : ''}`);
    console.log(`   Santa Wizzy: ${santaWizzy ? '✓' : '✗'} ${santaIsArchmage ? '(is archmage)' : ''}`);
    console.log(`   Wizzy de los Muertos: ${wizzyDeLosMuertos ? '✓' : '✗'} ${muertosIsArchmage ? '(is archmage)' : ''}`);
    console.log(`   Batch 1-7 tokens: ${batch1to7Tokens.length} (expected: 6) - ${batch1to7Archmages} are archmages`);
    console.log(`   Batch 9-15 tokens: ${batch9to15Tokens.length} (expected: 6) - ${batch9to15Archmages} are archmages`);
    console.log(`   Other archmages: ${archmages.length}`);
    const totalArchmages = archmages.length + (prismaticIsArchmage ? 1 : 0) + batch1to7Archmages + batch9to15Archmages + (santaIsArchmage ? 1 : 0) + (muertosIsArchmage ? 1 : 0);
    console.log(`   Total archmages: ${totalArchmages} (expected: ${TOTAL_BATCHES})`);
    console.log(`   Regular tokens: ${regularTokens.length}`);
    
    if (!witchyTheRed) {
      throw new Error('❌ Witchy the Red not found!');
    }
    if (!prismaticWizzy) {
      throw new Error('❌ Prismatic Wizzy not found!');
    }
    if (batch1to7Tokens.length !== 6) {
      throw new Error(`❌ Expected 6 batch 1-7 tokens, found ${batch1to7Tokens.length}`);
    }
    if (batch9to15Tokens.length !== 6) {
      throw new Error(`❌ Expected 6 batch 9-15 tokens, found ${batch9to15Tokens.length}`);
    }
    
    // Randomly assign Santa Wizzy or Wizzy de los Muertos to batches 1-7
    // The other one goes to batches 9-15
    const batch1to7Special = [];
    const batch9to15Special = [];
    
    if (santaWizzy && wizzyDeLosMuertos) {
      if (Math.random() < 0.5) {
        batch1to7Special.push(santaWizzy);
        batch9to15Special.push(wizzyDeLosMuertos);
        console.log('\n📋 Santa Wizzy → Batches 1-7, Wizzy de los Muertos → Batches 9-15');
      } else {
        batch1to7Special.push(wizzyDeLosMuertos);
        batch9to15Special.push(santaWizzy);
        console.log('\n📋 Wizzy de los Muertos → Batches 1-7, Santa Wizzy → Batches 9-15');
      }
    } else if (santaWizzy) {
      // Only one found, randomly assign
      if (Math.random() < 0.5) {
        batch1to7Special.push(santaWizzy);
        console.log('\n📋 Santa Wizzy → Batches 1-7');
      } else {
        batch9to15Special.push(santaWizzy);
        console.log('\n📋 Santa Wizzy → Batches 9-15');
      }
    } else if (wizzyDeLosMuertos) {
      // Only one found, randomly assign
      if (Math.random() < 0.5) {
        batch1to7Special.push(wizzyDeLosMuertos);
        console.log('\n📋 Wizzy de los Muertos → Batches 1-7');
      } else {
        batch9to15Special.push(wizzyDeLosMuertos);
        console.log('\n📋 Wizzy de los Muertos → Batches 9-15');
      }
    }
    
    // Count archmages in special tokens (Santa Wizzy and Wizzy de los Muertos)
    const batch1to7SpecialArchmages = batch1to7Special.filter(isArchmageToken).length;
    const batch9to15SpecialArchmages = batch9to15Special.filter(isArchmageToken).length;
    
    // Calculate total archmages found
    // Count: Prismatic Wizzy (if archmage) + batch 1-7 tokens that are archmages + batch 9-15 tokens that are archmages 
    //        + Santa Wizzy/Wizzy de los Muertos in batch 1-7 (if archmages) + Santa Wizzy/Wizzy de los Muertos in batch 9-15 (if archmages) + other archmages
    const totalArchmagesFound = (prismaticIsArchmage ? 1 : 0) + batch1to7Archmages + batch9to15Archmages + 
                                batch1to7SpecialArchmages + batch9to15SpecialArchmages + archmages.length;
    
    // We need exactly TOTAL_BATCHES archmages (one per batch)
    // If batch 1-7 tokens are archmages, they serve as archmages for batches 1-7
    // If batch 9-15 tokens are archmages, they serve as archmages for batches 9-15
    // Prismatic Wizzy (if archmage) serves as archmage for batch 8
    // Santa Wizzy/Wizzy de los Muertos can also be archmages for their assigned batches
    // Remaining batches need separate archmages
    const expectedTotalArchmages = TOTAL_BATCHES;
    
    if (totalArchmagesFound !== expectedTotalArchmages) {
      console.error(`\n❌ Archmage count mismatch:`);
      console.error(`   Found: ${totalArchmagesFound} total archmages`);
      console.error(`   - Prismatic Wizzy: ${prismaticIsArchmage ? '1 (archmage for batch 8)' : '0 (not archmage)'}`);
      console.error(`   - Batch 1-7 tokens that are archmages: ${batch1to7Archmages} (serve as archmages for batches 1-7)`);
      console.error(`   - Batch 9-15 tokens that are archmages: ${batch9to15Archmages} (serve as archmages for batches 9-15)`);
      console.error(`   - Santa Wizzy/Wizzy de los Muertos in batch 1-7 (if archmages): ${batch1to7SpecialArchmages}`);
      console.error(`   - Santa Wizzy/Wizzy de los Muertos in batch 9-15 (if archmages): ${batch9to15SpecialArchmages}`);
      console.error(`   - Other archmages: ${archmages.length} (for remaining batches)`);
      console.error(`   Expected: ${expectedTotalArchmages} archmages (one per batch)`);
      throw new Error(`❌ Expected ${expectedTotalArchmages} total archmages, found ${totalArchmagesFound}`);
    }
    
    // Calculate how many batches still need archmages
    // Note: batch1to7Special and batch9to15Special will be placed in batches 1-7 and 9-15 respectively
    // If they are archmages, they will serve as archmages for those batches
    const batchesWithArchmages = (prismaticIsArchmage ? 1 : 0) + batch1to7Archmages + batch9to15Archmages + 
                                  batch1to7SpecialArchmages + batch9to15SpecialArchmages;
    const batchesNeedingArchmages = TOTAL_BATCHES - batchesWithArchmages;
    
    if (archmages.length !== batchesNeedingArchmages) {
      console.error(`\n❌ Archmage distribution mismatch:`);
      console.error(`   Batches with archmages already: ${batchesWithArchmages}`);
      console.error(`   - Batch 8 (Prismatic): ${prismaticIsArchmage ? '1' : '0'}`);
      console.error(`   - Batches 1-7: ${batch1to7Archmages} (base tokens) + ${batch1to7SpecialArchmages} (special tokens) = ${batch1to7Archmages + batch1to7SpecialArchmages}`);
      console.error(`   - Batches 9-15: ${batch9to15Archmages} (base tokens) + ${batch9to15SpecialArchmages} (special tokens) = ${batch9to15Archmages + batch9to15SpecialArchmages}`);
      console.error(`   Batches still needing archmages: ${batchesNeedingArchmages}`);
      console.error(`   Other archmages available: ${archmages.length}`);
      throw new Error(`❌ Need ${batchesNeedingArchmages} archmages for remaining batches, but found ${archmages.length}`);
    }
    
    // Shuffle all arrays
    console.log('\n🔀 Shuffling tokens...');
    const shuffledArchmages = shuffleArray(archmages);
    const shuffledBatch1to7 = shuffleArray([...batch1to7Tokens, ...batch1to7Special]);
    const shuffledBatch9to15 = shuffleArray([...batch9to15Tokens, ...batch9to15Special]);
    const shuffledRegular = shuffleArray(regularTokens);
    console.log('✅ Shuffle completed');
    
    // Build assignment array
    console.log('\n📝 Building token assignments with constraints...');
    const assignments = new Array(TOTAL_TOKENS).fill(null);
    
    // 1. Place Witchy the Red at token 10001
    assignments[TOTAL_TOKENS - 1] = witchyTheRed;
    console.log(`   ✓ Token ${TOTAL_TOKENS}: Witchy the Red`);
    
    // 2. Place Prismatic Wizzy in batch 8 (tokens 4663-5328)
    const batch8Range = getBatchRange(8);
    const batch8Position = batch8Range.start + Math.floor(Math.random() * TOKENS_PER_BATCH);
    assignments[batch8Position - 1] = prismaticWizzy;
    console.log(`   ✓ Token ${batch8Position}: Prismatic Wizzy (batch 8)`);
    
    // 3. Place batch 1-7 special tokens first (they may be archmages)
    // These will serve as archmages for their batches if they are archmages
    const batch1to7ArchmageMap = new Map(); // Track which batches have archmages from batch 1-7 tokens
    let batch1to7Index = 0;
    for (let batch = 1; batch <= 7 && batch1to7Index < shuffledBatch1to7.length; batch++) {
      const batchRange = getBatchRange(batch);
      const token = shuffledBatch1to7[batch1to7Index];
      
      // Find an available slot in this batch
      let position;
      let attempts = 0;
      do {
        position = batchRange.start + Math.floor(Math.random() * TOKENS_PER_BATCH);
        attempts++;
        if (attempts > 100) {
          throw new Error(`Failed to find available slot in batch ${batch}`);
        }
      } while (assignments[position - 1] !== null);
      
      assignments[position - 1] = token;
      const tokenName = getTokenName(token);
      const isTokenArchmage = isArchmageToken(token);
      if (isTokenArchmage) {
        batch1to7ArchmageMap.set(batch, true);
        console.log(`   ✓ Token ${position}: ${tokenName} (batch ${batch}, archmage)`);
      } else {
        console.log(`   ✓ Token ${position}: ${tokenName} (batch ${batch})`);
      }
      batch1to7Index++;
    }
    
    // 4. Place batch 9-15 special tokens (they may be archmages)
    // These will serve as archmages for their batches if they are archmages
    const batch9to15ArchmageMap = new Map(); // Track which batches have archmages from batch 9-15 tokens
    let batch9to15Index = 0;
    for (let batch = 9; batch <= 15 && batch9to15Index < shuffledBatch9to15.length; batch++) {
      const batchRange = getBatchRange(batch);
      const token = shuffledBatch9to15[batch9to15Index];
      
      // Find an available slot in this batch
      let position;
      let attempts = 0;
      do {
        position = batchRange.start + Math.floor(Math.random() * TOKENS_PER_BATCH);
        attempts++;
        if (attempts > 100) {
          throw new Error(`Failed to find available slot in batch ${batch}`);
        }
      } while (assignments[position - 1] !== null);
      
      assignments[position - 1] = token;
      const tokenName = getTokenName(token);
      const isTokenArchmage = isArchmageToken(token);
      if (isTokenArchmage) {
        batch9to15ArchmageMap.set(batch, true);
        console.log(`   ✓ Token ${position}: ${tokenName} (batch ${batch}, archmage)`);
      } else {
        console.log(`   ✓ Token ${position}: ${tokenName} (batch ${batch})`);
      }
      batch9to15Index++;
    }
    
    // 5. Place remaining archmages in batches that don't have one yet
    // Batches 1-7: skip if they have an archmage from batch 1-7 tokens
    // Batch 8: skip if Prismatic Wizzy is an archmage
    // Batches 9-15: skip if they have an archmage from batch 9-15 tokens
    let archmageIndex = 0;
    for (let batch = 1; batch <= TOTAL_BATCHES; batch++) {
      // Skip batch 8 if Prismatic Wizzy is an archmage
      if (batch === 8 && prismaticIsArchmage) {
        console.log(`   ✓ Batch 8: Prismatic Wizzy (archmage)`);
        continue;
      }
      
      // Skip batches 1-7 if they already have an archmage from batch 1-7 tokens
      if (batch >= 1 && batch <= 7 && batch1to7ArchmageMap.has(batch)) {
        continue;
      }
      
      // Skip batches 9-15 if they already have an archmage from batch 9-15 tokens
      if (batch >= 9 && batch <= 15 && batch9to15ArchmageMap.has(batch)) {
        continue;
      }
      
      const batchRange = getBatchRange(batch);
      // Find an available slot in this batch
      let position;
      let attempts = 0;
      do {
        position = batchRange.start + Math.floor(Math.random() * TOKENS_PER_BATCH);
        attempts++;
        if (attempts > 100) {
          throw new Error(`Failed to find available slot in batch ${batch}`);
        }
      } while (assignments[position - 1] !== null);
      
      assignments[position - 1] = shuffledArchmages[archmageIndex];
      console.log(`   ✓ Token ${position}: Archmage (batch ${batch})`);
      archmageIndex++;
    }
    
    // 6. Fill remaining slots with regular tokens
    let regularIndex = 0;
    for (let i = 0; i < TOTAL_TOKENS; i++) {
      if (assignments[i] === null) {
        if (regularIndex >= shuffledRegular.length) {
          throw new Error(`Not enough regular tokens to fill all slots. Missing ${TOTAL_TOKENS - i} tokens.`);
        }
        assignments[i] = shuffledRegular[regularIndex];
        regularIndex++;
      }
    }
    
    console.log(`\n✅ All ${TOTAL_TOKENS} tokens assigned`);
    
    // Create updates
    console.log('\n💾 Preparing database updates...');
    const updates = assignments.map((entry, index) => {
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
    
    // Verify constraints
    console.log('\n🔍 Verifying constraints...');
    const witchyCheck = await collection.findOne({ tokenId: String(TOTAL_TOKENS) });
    if (witchyCheck && isWitchyTheRed(witchyCheck)) {
      console.log(`   ✓ Token ${TOTAL_TOKENS} is Witchy the Red`);
    } else {
      console.warn(`   ✗ Token ${TOTAL_TOKENS} is NOT Witchy the Red!`);
    }
    
    const batch8RangeCheck = getBatchRange(8);
    const prismaticCheck = await collection.findOne({ 
      tokenId: { $gte: String(batch8RangeCheck.start), $lte: String(batch8RangeCheck.end) },
      $or: [
        { 'metadata.name': { $regex: /Prismatic Wizzy/i } },
        { 'metadata.attributes': { $elemMatch: { trait_type: /archmage/i, value: { $regex: /Prismatic Wizzy/i } } } }
      ]
    });
    if (prismaticCheck) {
      console.log(`   ✓ Prismatic Wizzy is in batch 8 (token ${prismaticCheck.tokenId})`);
    } else {
      console.warn(`   ✗ Prismatic Wizzy is NOT in batch 8!`);
    }
    
    // Check archmage distribution
    for (let batch = 1; batch <= TOTAL_BATCHES; batch++) {
      const batchRange = getBatchRange(batch);
      const archmageCount = await collection.countDocuments({
        tokenId: { $gte: String(batchRange.start), $lte: String(batchRange.end) },
        'metadata.attributes': { $elemMatch: { trait_type: { $regex: /^archmage$/i }, value: { $exists: true, $ne: '' } } }
      });
      if (batch === 8) {
        // Batch 8 should have Prismatic Wizzy, which may or may not be an archmage
        if (archmageCount === 1) {
          console.log(`   ✓ Batch ${batch} has exactly 1 archmage (Prismatic Wizzy)`);
        } else if (archmageCount === 0 && prismaticCheck) {
          console.log(`   ✓ Batch ${batch} has Prismatic Wizzy (not an archmage, separate archmage should be present)`);
        } else {
          console.warn(`   ✗ Batch ${batch} has ${archmageCount} archmages (expected 1)`);
        }
      } else {
        if (archmageCount === 1) {
          console.log(`   ✓ Batch ${batch} has exactly 1 archmage`);
        } else {
          console.warn(`   ✗ Batch ${batch} has ${archmageCount} archmages (expected 1)`);
        }
      }
    }
    
    // Show sample of shuffled data
    const sample = await collection.find({ tokenId: { $ne: null } }).limit(10).sort({ tokenId: 1 }).toArray();
    if (sample.length > 0) {
      console.log('\n📋 Sample of shuffled assignments:');
      sample.forEach((doc) => {
        const name = getTokenName(doc) || 'N/A';
        console.log(`   Token ID: ${doc.tokenId} - ${name} (Model: ${doc.metadata.modelId || 'N/A'})`);
      });
    }
    
    console.log('\n✅ Shuffle and reveal completed successfully!');
    console.log(`📊 Total tokens processed: ${totalEntries}`);
    console.log(`🎲 Token IDs assigned: 1 to ${totalEntries}`);
    
  } catch (error) {
    console.error('\n❌ Error during shuffle and reveal:');
    console.error(error.message);
    console.error(error.stack);
    
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

