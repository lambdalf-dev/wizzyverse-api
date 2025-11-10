export interface TokenAttribute {
  trait_type: string;
  value: string | number;
}

export interface TokenMetadata {
  image: string;
  attributes?: TokenAttribute[];
  name?: string;
  description?: string;
  animation?: string;
}

export interface MetadataEntry {
  tokenId: string | null; // null initially, assigned by shuffle/reveal script
  metadata: TokenMetadata;
}

