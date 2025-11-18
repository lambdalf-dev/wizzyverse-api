export interface TokenAttribute {
  trait_type: string;
  value: string | number;
}

/**
 * Metadata as stored in the database (without image/animation URLs)
 */
export interface StoredTokenMetadata {
  modelId: string; // Model ID used to generate image/animation URLs
  attributes?: TokenAttribute[];
  name?: string;
  description?: string;
}

/**
 * Metadata as returned by the API (with generated image/animation URLs)
 * Note: modelId is NOT included in the output - it's internal only
 */
export interface TokenMetadata {
  image: string; // Placeholder before reveal, actual image after reveal
  animation?: string; // Only included after reveal
  attributes?: TokenAttribute[];
  name?: string;
  description?: string;
}

export interface MetadataEntry {
  tokenId: string | null; // null initially, assigned by shuffle/reveal script
  metadata: StoredTokenMetadata; // Stored without image/animation
}

