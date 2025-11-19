import { NextRequest, NextResponse } from 'next/server';
import { metadataService } from '@/lib/metadata-service';
import { contractService } from '@/lib/contract-service';
import { processMetadataFields } from '@/lib/utils/metadata-processor';
import { StoredTokenMetadata } from '@/types/metadata';

/**
 * GET /metadata/[tokenId]
 * 
 * Retrieve metadata for a specific token. Only returns metadata if the token exists and has been minted.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const { tokenId } = params;

    // Validate tokenId
    if (!tokenId || typeof tokenId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Token ID parameter is required',
        },
        { status: 400 }
      );
    }

    // Validate tokenId is a valid number
    const tokenIdNumber = parseInt(tokenId, 10);
    if (isNaN(tokenIdNumber) || tokenIdNumber < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid token ID format',
        },
        { status: 400 }
      );
    }

    // Check if token is minted on-chain
    let isMinted = false;
    
    try {
      isMinted = await contractService.isTokenMinted(tokenId);
    } catch (error) {
      // If contract check failed, return error immediately without checking database
      console.error(`Contract check failed for token ${tokenId}:`, error);
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to verify token mint status. Please try again later.',
          tokenId: tokenId,
        },
        { status: 503 } // Service Unavailable
      );
    }

    // If contract check explicitly says token is not minted, return 404
    // Unminted tokens should always return 404, even if metadata exists in database
    if (!isMinted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token not found',
          tokenId: tokenId,
        },
        { status: 404 }
      );
    }

    // Token is confirmed minted - fetch metadata from database
    let metadataResult;
    try {
      metadataResult = await metadataService.getMetadataByTokenId(tokenId);
    } catch (error) {
      console.error(`Error fetching metadata for token ${tokenId}:`, error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch token metadata',
          tokenId: tokenId,
        },
        { status: 500 }
      );
    }

    if (!metadataResult) {
      // Token is minted but metadata not found in database
      console.warn(`Metadata not found for token ${tokenId} (token is minted)`);
      return NextResponse.json(
        {
          success: false,
          error: 'Token metadata not found',
          tokenId: tokenId,
        },
        { status: 404 }
      );
    }

    // Return processed metadata (with generated image/animation URLs based on reveal status)
    // modelId is never included in the response
    return NextResponse.json(metadataResult.metadata);
  } catch (error) {
    console.error('Error processing metadata request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

