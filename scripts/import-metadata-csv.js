const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

/**
 * Import metadata from CSV file to MongoDB
 * 
 * CSV Format:
 * - First row: Header with column names (ModelId, Archmage, Arms, Beard, etc.)
 * - Subsequent rows: Data rows with values
 * 
 * Usage: node scripts/import-metadata-csv.js [path-to-csv-file] [options]
 * 
 * Options:
 *   --skip-empty  Skip attributes with empty values (default: include all)
 * 
 * Note: Image and animation URLs are ALWAYS generated dynamically from ModelId during metadata rendering.
 * Image/Animation columns in CSV (if present) are ignored - URLs are never stored in the database.
 * 
 * Example: node scripts/import-metadata-csv.js ../data/metadata.csv
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
 * Simple CSV parser that handles quoted fields and commas
 * @param {string} csvContent - The CSV file content
 * @returns {Array<Array<string>>} - Array of rows, each row is an array of fields
 */
function parseCSV(csvContent) {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  const rows = [];
  
  for (const line of lines) {
    const fields = [];
    let currentField = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // Field separator
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Add the last field
    fields.push(currentField.trim());
    rows.push(fields);
  }
  
  return rows;
}

/**
 * Convert CSV data to metadata format
 * @param {Array<Array<string>>} csvRows - Parsed CSV rows
 * @param {Object} options - Import options
 * @returns {Array} - Array of metadata documents
 */
function convertCSVToMetadata(csvRows, options = {}) {
  if (csvRows.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }
  
  const headerRow = csvRows[0];
  const dataRows = csvRows.slice(1);
  
  // Find ModelId column index
  const modelIdIndex = headerRow.findIndex(col => col.toLowerCase() === 'modelid');
  if (modelIdIndex === -1) {
    throw new Error('CSV file must have a "ModelId" column');
  }
  
  // Check for optional image/animation columns (these will override generated URLs)
  const imageColumnIndex = headerRow.findIndex(col => col.toLowerCase() === 'image');
  const animationColumnIndex = headerRow.findIndex(col => col.toLowerCase() === 'animation');
  
  // Check for Name and Description columns (these are stored in metadata.name and metadata.description)
  const nameColumnIndex = headerRow.findIndex(col => col.toLowerCase() === 'name');
  const descriptionColumnIndex = headerRow.findIndex(col => col.toLowerCase() === 'description');
  
  const skipEmpty = options.skipEmpty || false;
  
  const documents = [];
  
  for (const row of dataRows) {
    if (row.length === 0 || row.every(cell => cell.trim() === '')) {
      continue; // Skip empty rows
    }
    
    const modelId = row[modelIdIndex]?.trim();
    if (!modelId) {
      console.warn(`⚠️  Skipping row with empty ModelId: ${row.join(',')}`);
      continue;
    }
    
    // Build attributes from all columns except ModelId, Image, Animation, Name, and Description
    // Image and animation URLs will be generated dynamically from modelId
    // Name and Description are stored separately, not as attributes
    const attributes = [];
    for (let i = 0; i < headerRow.length; i++) {
      if (i === modelIdIndex || 
          i === imageColumnIndex || 
          i === animationColumnIndex ||
          i === nameColumnIndex ||
          i === descriptionColumnIndex) {
        continue; // Skip ModelId, Image, Animation, Name, and Description columns
      }
      
      const traitType = headerRow[i].trim();
      const value = row[i]?.trim() || '';
      
      // Skip empty values if option is set
      if (skipEmpty && value === '') {
        continue;
      }
      
      attributes.push({
        trait_type: traitType,
        value: value || '', // Empty string for empty values
      });
    }
    
    // Build metadata object with modelId
    // Image and animation URLs are NEVER stored - they are always generated from modelId
    const metadata = {
      modelId: modelId,
      attributes: attributes,
    };
    
    // Extract Name and Description from CSV if present
    if (nameColumnIndex !== -1 && row[nameColumnIndex]?.trim()) {
      metadata.name = row[nameColumnIndex].trim();
    }
    
    if (descriptionColumnIndex !== -1 && row[descriptionColumnIndex]?.trim()) {
      metadata.description = row[descriptionColumnIndex].trim();
    }
    
    // Note: Image and Animation columns in CSV are ignored
    // Image/animation URLs are always generated from modelId during metadata rendering
    
    documents.push({
      tokenId: null, // Will be assigned by shuffle/reveal script
      metadata: metadata,
    });
  }
  
  return documents;
}

async function importMetadataFromCSV(csvFilePath, options = {}) {
  let client;
  
  try {
    // Read and parse CSV file
    console.log(`📖 Reading CSV from: ${csvFilePath}`);
    const fileContent = await fs.readFile(csvFilePath, 'utf-8');
    const csvRows = parseCSV(fileContent);
    
    console.log(`✅ Parsed ${csvRows.length} rows (including header)`);
    
    if (csvRows.length < 2) {
      console.error('❌ Error: CSV file must have at least a header row and one data row');
      process.exit(1);
    }
    
    // Convert CSV to metadata format
    console.log('🔄 Converting CSV to metadata format...');
    const documents = convertCSVToMetadata(csvRows, options);
    console.log(`✅ Converted ${documents.length} rows to metadata entries`);
    
    if (documents.length === 0) {
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
    
    // Validate documents before insertion
    console.log('✅ Validating documents...');
    documents.forEach((doc, index) => {
      if (!doc.metadata.modelId || typeof doc.metadata.modelId !== 'string') {
        throw new Error(`Invalid modelId for document at index ${index}`);
      }
      if (!Array.isArray(doc.metadata.attributes)) {
        throw new Error(`Invalid attributes for document at index ${index}`);
      }
      doc.metadata.attributes.forEach((attr, attrIndex) => {
        if (!attr || typeof attr !== 'object') {
          throw new Error(`Invalid attribute at index ${attrIndex} for document at index ${index}`);
        }
        if (!attr.trait_type || typeof attr.trait_type !== 'string') {
          throw new Error(`Invalid trait_type at index ${attrIndex} for document at index ${index}`);
        }
        if (attr.value === undefined || (typeof attr.value !== 'string' && typeof attr.value !== 'number')) {
          throw new Error(`Invalid value at index ${attrIndex} for document at index ${index}`);
        }
      });
    });
    console.log('✅ All documents validated');
    
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
        const modelIdInfo = doc.metadata.modelId || 'N/A';
        console.log(`   ${index + 1}. ModelId: ${modelIdInfo}`);
        console.log(`      Image/Animation URLs will be generated from modelId`);
        console.log(`      Attributes: ${doc.metadata.attributes.length}`);
        console.log(`      Sample attributes: ${doc.metadata.attributes.slice(0, 3).map(a => `${a.trait_type}: ${a.value}`).join(', ')}`);
      });
    }
    
    console.log('\n✅ Import completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error importing metadata:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const csvFilePath = args.find(arg => !arg.startsWith('--'));
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--skip-empty') {
      options.skipEmpty = true;
    }
  }
  
  return { csvFilePath, options };
}

// Main execution
async function main() {
  const { csvFilePath, options } = parseArgs();
  
  if (!csvFilePath) {
    console.error('❌ Error: CSV file path is required');
    console.error('\nUsage: node scripts/import-metadata-csv.js <path-to-csv-file> [options]');
    console.error('\nOptions:');
    console.error('  --skip-empty                 Skip attributes with empty values');
    console.error('\nNote: Image and animation URLs are ALWAYS generated dynamically from ModelId.');
    console.error('      Image/Animation columns in CSV (if present) are ignored.');
    console.error('\nExamples:');
    console.error('  node scripts/import-metadata-csv.js ../data/metadata.csv');
    console.error('  node scripts/import-metadata-csv.js ./data/metadata.csv --skip-empty');
    process.exit(1);
  }
  
  // Resolve file path
  const resolvedPath = path.resolve(csvFilePath);
  
  // Check if file exists
  try {
    await fs.access(resolvedPath);
  } catch (error) {
    console.error(`❌ Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }
  
  await importMetadataFromCSV(resolvedPath, options);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

