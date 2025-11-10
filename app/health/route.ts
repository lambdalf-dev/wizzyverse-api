import { NextResponse } from 'next/server';
import proofsClientPromise from '@/lib/mongodb-proofs';
import metadataClientPromise from '@/lib/mongodb-metadata';

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
      const client = await proofsClientPromise;
      await client.db().admin().ping();
      proofsStatus = 'connected';
    } catch (error) {
      console.error('Proofs database connection error:', error);
    }

    // Check metadata database connection
    let metadataStatus = 'disconnected';
    try {
      const client = await metadataClientPromise;
      await client.db().admin().ping();
      metadataStatus = 'connected';
    } catch (error) {
      console.error('Metadata database connection error:', error);
    }

    return NextResponse.json({
      status: 'healthy',
      message: 'Wizzyverse API is running',
      databases: {
        proofs: proofsStatus,
        metadata: metadataStatus,
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

