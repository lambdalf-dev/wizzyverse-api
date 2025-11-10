import { Collection } from 'mongodb';
import clientPromise from './mongodb-subscriptions';
import { SubscriptionType, EmailSubscription } from '@/types/subscription';
import { sanitizeMongoDocument } from './utils/data-sanitizer';

class SubscriptionService {
  private collectionName = 'subscriptions';

  private async getCollection(): Promise<Collection<EmailSubscription>> {
    const client = await clientPromise;
    
    // Extract database name from connection string
    const uri = process.env.SUBSCRIPTIONS_MONGODB_URI || '';
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
    return db.collection<EmailSubscription>(this.collectionName);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Subscribe an email to notifications
   */
  async subscribe(email: string, subscriptionType: SubscriptionType): Promise<EmailSubscription> {
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    const collection = await this.getCollection();
    const normalizedEmail = email.toLowerCase().trim();

    // Remove email from any existing subscription first
    await collection.deleteMany({ email: normalizedEmail });

    // Create new subscription
    const subscription: EmailSubscription = {
      email: normalizedEmail,
      subscriptionType,
      subscribedAt: new Date(),
    };

    await collection.insertOne(subscription);

    return sanitizeMongoDocument(subscription) as EmailSubscription;
  }

  /**
   * Unsubscribe an email from all notifications
   */
  async unsubscribe(email: string): Promise<boolean> {
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    const collection = await this.getCollection();
    const normalizedEmail = email.toLowerCase().trim();

    const result = await collection.deleteMany({ email: normalizedEmail });

    return result.deletedCount > 0;
  }

  /**
   * Check if an email is subscribed
   */
  async isSubscribed(email: string): Promise<boolean> {
    const collection = await this.getCollection();
    const normalizedEmail = email.toLowerCase().trim();

    const count = await collection.countDocuments({ email: normalizedEmail });

    return count > 0;
  }

  /**
   * Get subscription for an email
   */
  async getSubscription(email: string): Promise<EmailSubscription | null> {
    const collection = await this.getCollection();
    const normalizedEmail = email.toLowerCase().trim();

    const document = await collection.findOne({ email: normalizedEmail });

    if (!document) {
      return null;
    }

    return sanitizeMongoDocument(document) as EmailSubscription;
  }

  /**
   * Get all subscriptions by type
   */
  async getSubscriptionsByType(subscriptionType: SubscriptionType): Promise<string[]> {
    const collection = await this.getCollection();

    const documents = await collection.find({ subscriptionType }).toArray();

    return documents.map(doc => doc.email);
  }

  /**
   * Get all subscriptions
   */
  async getAllSubscriptions(): Promise<{ privateAndPublic: string[]; publicOnly: string[] }> {
    const privateAndPublic = await this.getSubscriptionsByType('privateAndPublic');
    const publicOnly = await this.getSubscriptionsByType('publicOnly');

    return {
      privateAndPublic,
      publicOnly,
    };
  }
}

export const subscriptionService = new SubscriptionService();

