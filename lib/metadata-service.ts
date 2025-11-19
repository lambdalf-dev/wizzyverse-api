import { Collection } from 'mongodb';
import clientPromise from './mongodb-metadata';
import { MetadataEntry, TokenMetadata } from '@/types/metadata';
import { sanitizeMongoDocument } from './utils/data-sanitizer';
import { processMetadataFields } from './utils/metadata-processor';

class MetadataService {
  private collectionName = 'metadata';

  private async getCollection(): Promise<Collection<MetadataEntry>> {
    const client = await clientPromise;
    
    // Extract database name from connection string
    const uri = process.env.METADATA_MONGODB_URI || '';
    let dbName: string | undefined;
    
    if (uri.includes('mongodb+srv://')) {
      // MongoDB Atlas format: mongodb+srv://user:pass@host/database
      const match = uri.match(/mongodb\+srv:\/\/[^/]+\/([^?]+)/);
      dbName = match?.[1];
    } else {
      // Standard format: mongodb://host:port/database
      const match = uri.match(/mongodb:\/\/[^/]+\/([^?]+)/);
      dbName = match?.[1];
    }
    
    const db = dbName ? client.db(dbName) : client.db();
    return db.collection<MetadataEntry>(this.collectionName);
  }

  /**
   * Get metadata for a specific token ID
   * Returns processed metadata with generated image/animation URLs
   * @param tokenId - The token ID to fetch metadata for
   * @returns Object with metadata and reveal status, or null if not found
   */
  async getMetadataByTokenId(tokenId: string): Promise<{ metadata: TokenMetadata; isRevealed: boolean } | null> {
    try {
      const collection = await this.getCollection();
      
      const document = await collection.findOne({ 
        tokenId: tokenId 
      });

      if (!document) {
        console.log(`Metadata not found for tokenId: ${tokenId}`);
        return null;
      }

      const sanitized = sanitizeMongoDocument(document) as MetadataEntry;
      
      // Process stored metadata to generate image/animation URLs
      // Image and animation are NEVER stored, always generated from modelId
      if (!sanitized.metadata) {
        return null;
      }

      // Token is revealed if it has a non-null tokenId (which it does, since we found it by tokenId)
      const isRevealed = sanitized.tokenId !== null;
      
      const processedMetadata = processMetadataFields(sanitized.metadata, isRevealed);
      
      return {
        metadata: processedMetadata,
        isRevealed,
      };
    } catch (error) {
      console.error('Error fetching metadata:', error);
      throw new Error(`Failed to fetch metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a token exists
   */
  async tokenExists(tokenId: string): Promise<boolean> {
    try {
      const collection = await this.getCollection();
      
      const count = await collection.countDocuments({ 
        tokenId: tokenId 
      });

      return count > 0;
    } catch (error) {
      console.error('Error checking token existence:', error);
      return false;
    }
  }
}

export const metadataService = new MetadataService();

