import { Collection } from 'mongodb';
import clientPromise from './mongodb-metadata';
import { MetadataEntry } from '@/types/metadata';
import { sanitizeMongoDocument } from './utils/data-sanitizer';

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
   */
  async getMetadataByTokenId(tokenId: string): Promise<MetadataEntry | null> {
    try {
      const collection = await this.getCollection();
      
      const document = await collection.findOne({ 
        tokenId: tokenId 
      });

      if (!document) {
        return null;
      }

      return sanitizeMongoDocument(document) as MetadataEntry;
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

