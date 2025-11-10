import { NextRequest, NextResponse } from 'next/server';
import { proofService } from '@/lib/proof-service';

/**
 * GET /whitelist/[walletAddress]
 * 
 * Retrieve the cryptographic proof associated with a specific wallet address.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { walletAddress: string } }
) {
  try {
    const { walletAddress } = params;

    // Validate wallet address format
    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet address parameter is required',
        },
        { status: 400 }
      );
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid wallet address format',
        },
        { status: 400 }
      );
    }

    // Fetch proof from database
    const proofEntry = await proofService.getProofByWallet(walletAddress);

    if (!proofEntry) {
      return NextResponse.json(
        {
          success: false,
          error: 'Proof not found for this wallet address',
          walletAddress: walletAddress.toLowerCase(),
        },
        { status: 404 }
      );
    }

    // Return proof data
    return NextResponse.json({
      walletAddress: proofEntry.walletAddress,
      alloted: proofEntry.alloted,
      proof: proofEntry.proof,
    });
  } catch (error) {
    console.error('Error processing whitelist proof request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

