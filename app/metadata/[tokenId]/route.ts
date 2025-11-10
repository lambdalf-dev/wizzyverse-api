import { NextRequest, NextResponse } from 'next/server';
import { metadataService } from '@/lib/metadata-service';
import { contractService } from '@/lib/contract-service';

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
    // If the contract check fails, we'll still try to return metadata from DB
    // (useful for pre-reveal scenarios or if there are temporary contract issues)
    let isMinted = false;
    let contractCheckError: Error | null = null;
    
    try {
      isMinted = await contractService.isTokenMinted(tokenId);
    } catch (error) {
      console.warn(`Contract check failed for token ${tokenId}, will check database anyway:`, error);
      contractCheckError = error instanceof Error ? error : new Error('Unknown contract check error');
    }

    // If contract check explicitly says token is not minted, return 404
    if (!isMinted && !contractCheckError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token not found or not minted',
          tokenId: tokenId,
        },
        { status: 404 }
      );
    }

    // Fetch metadata from database
    // Even if contract check failed, we'll try to return metadata
    // (this handles pre-reveal scenarios where metadata exists but contract might have issues)
    const metadataEntry = await metadataService.getMetadataByTokenId(tokenId);

    if (!metadataEntry) {
      // If token is confirmed minted but metadata not found, return placeholder metadata
      // This handles pre-reveal scenarios where tokens are minted but metadata hasn't been assigned yet
      if (isMinted) {
        const paddedTokenId = String(tokenIdNumber).padStart(5, '0');
        return NextResponse.json({
          name: `Wizzy the [color] #${paddedTokenId}`,
          description: 'A unique Wizzyverse NFT',
          image: 'placeholder.png',
        });
      }
      
      // Token not minted and no metadata found
      return NextResponse.json(
        {
          success: false,
          error: 'Token metadata not found',
          tokenId: tokenId,
        },
        { status: 404 }
      );
    }

    // Return metadata directly
    return NextResponse.json(metadataEntry.metadata);
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

