export type SubscriptionType = 'privateAndPublic' | 'publicOnly';

export interface EmailSubscription {
  email: string;
  subscriptionType: SubscriptionType;
  subscribedAt: Date;
}

