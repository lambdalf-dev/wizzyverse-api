import { Collection } from 'mongodb';
import clientPromise from './mongodb-proofs';
import { Proof } from '@/types/proof';
import { sanitizeMongoDocument } from './utils/data-sanitizer';

export interface ProofEntry {
  walletAddress: string;
  alloted: number;
  proof: Proof;
}

class ProofService {
  private collectionName = 'proofs';

  private async getCollection(): Promise<Collection<ProofEntry>> {
    const client = await clientPromise;
    
    // Extract database name from connection string
    // Format: mongodb://host:port/database or mongodb+srv://host/database
    const uri = process.env.PROOFS_MONGODB_URI || '';
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
    return db.collection<ProofEntry>(this.collectionName);
  }

  /**
   * Get proof for a specific wallet address
   */
  async getProofByWallet(walletAddress: string): Promise<ProofEntry | null> {
    try {
      const collection = await this.getCollection();
      const normalizedAddress = walletAddress.toLowerCase();
      
      const document = await collection.findOne({ 
        walletAddress: normalizedAddress 
      });

      if (!document) {
        return null;
      }

      return sanitizeMongoDocument(document) as ProofEntry;
    } catch (error) {
      console.error('Error fetching proof:', error);
      throw new Error(`Failed to fetch proof: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a proof exists for a wallet address
   */
  async proofExists(walletAddress: string): Promise<boolean> {
    try {
      const collection = await this.getCollection();
      const normalizedAddress = walletAddress.toLowerCase();
      
      const count = await collection.countDocuments({ 
        walletAddress: normalizedAddress 
      });

      return count > 0;
    } catch (error) {
      console.error('Error checking proof existence:', error);
      return false;
    }
  }
}

export const proofService = new ProofService();

