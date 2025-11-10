import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-proofs';
import subscriptionsClientPromise from '@/lib/mongodb-subscriptions';

/**
 * GET /api/health
 * 
 * Get API status and database connection status.
 */
export async function GET() {
  try {
    // Check proofs database connection
    let proofsStatus = 'disconnected';
    try {
      const client = await clientPromise;
      await client.db().admin().ping();
      proofsStatus = 'connected';
    } catch (error) {
      console.error('Proofs database connection error:', error);
    }

    // Check metadata database connection
    // TODO: Add metadata database connection check when implemented
    const metadataStatus = 'not implemented';

    // Check subscriptions database connection
    let subscriptionsStatus = 'disconnected';
    try {
      const client = await subscriptionsClientPromise;
      await client.db().admin().ping();
      subscriptionsStatus = 'connected';
    } catch (error) {
      console.error('Subscriptions database connection error:', error);
    }

    return NextResponse.json({
      status: 'healthy',
      message: 'Wizzyverse API is running',
      databases: {
        proofs: proofsStatus,
        metadata: metadataStatus,
        subscriptions: subscriptionsStatus,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        message: 'API health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

