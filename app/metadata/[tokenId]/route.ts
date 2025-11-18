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
    let contractCheckError: Error | null = null;
    
    try {
      isMinted = await contractService.isTokenMinted(tokenId);
    } catch (error) {
      console.warn(`Contract check failed for token ${tokenId}:`, error);
      contractCheckError = error instanceof Error ? error : new Error('Unknown contract check error');
    }

    // If contract check explicitly says token is not minted, return 404
    // Unminted tokens should always return 404, even if metadata exists in database
    if (!isMinted && !contractCheckError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token not found',
          tokenId: tokenId,
        },
        { status: 404 }
      );
    }

    // If contract check failed, we can't verify mint status, so return 404 for safety
    if (contractCheckError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to verify token mint status',
          tokenId: tokenId,
        },
        { status: 404 }
      );
    }

    // Token is confirmed minted - fetch metadata from database
    const metadataResult = await metadataService.getMetadataByTokenId(tokenId);

    if (!metadataResult) {
      // Token is minted but metadata not found - return 404
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

