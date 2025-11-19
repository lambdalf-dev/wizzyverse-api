/**
 * Utility functions for processing metadata fields
 */

import { StoredTokenMetadata, TokenMetadata } from '@/types/metadata';

/**
 * Process a URL to handle both relative and absolute paths
 * @param url - The URL to process (can be relative or absolute)
 * @param baseUrl - Optional base URL to prepend for relative URLs
 * @returns Processed URL
 */
function processUrl(url: string, baseUrl?: string): string {
  if (!url) {
    return url;
  }

  // If URL is already absolute (starts with http:// or https://), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If base URL is provided and URL is relative, prepend base URL
  if (baseUrl) {
    // Remove trailing slash from baseUrl and leading slash from url if present
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${cleanBaseUrl}${cleanUrl}`;
  }

  // If no base URL and URL is relative, ensure it starts with /
  return url.startsWith('/') ? url : `/${url}`;
}

/**
 * Generate image URL from modelId using environment variable pattern
 * @param modelId - The model ID
 * @returns Generated image URL
 */
function generateImageUrl(modelId: string): string {
  const imagePathPattern = process.env.METADATA_IMAGE_PATH;
  
  if (!imagePathPattern) {
    throw new Error('METADATA_IMAGE_PATH environment variable is required');
  }
  
  // Replace {modelId} placeholder with actual modelId
  const url = imagePathPattern.replace(/{modelId}/g, modelId);
  
  // Get optional base URL for relative paths
  const baseUrl = process.env.METADATA_ASSETS_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
  
  // Process URL to handle both relative and absolute paths
  return processUrl(url, baseUrl);
}

/**
 * Generate animation URL from modelId using environment variable pattern
 * @param modelId - The model ID
 * @returns Generated animation URL
 */
function generateAnimationUrl(modelId: string): string {
  const animationPathPattern = process.env.METADATA_ANIMATION_PATH;
  
  if (!animationPathPattern) {
    throw new Error('METADATA_ANIMATION_PATH environment variable is required');
  }
  
  // Replace {modelId} placeholder with actual modelId
  const url = animationPathPattern.replace(/{modelId}/g, modelId);
  
  // Get optional base URL for relative paths
  const baseUrl = process.env.METADATA_ASSETS_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
  
  // Process URL to handle both relative and absolute paths
  return processUrl(url, baseUrl);
}

/**
 * Check if a token is an Archmage token
 * Archmage tokens have Archmage attribute with a non-empty value
 */
function isArchmageToken(attributes?: Array<{ trait_type: string; value: string | number }>): boolean {
  if (!attributes || !Array.isArray(attributes)) {
    return false;
  }
  
  const archmageAttr = attributes.find(attr => 
    attr.trait_type.toLowerCase() === 'archmage'
  );
  
  // Archmage token if attribute exists and has a non-empty value
  return archmageAttr !== undefined && 
         archmageAttr.value !== undefined &&
         String(archmageAttr.value).trim() !== '';
}

/**
 * Extract Archmage attribute value directly from attributes
 * The value is fully spelled out in the CSV (e.g., "Wizzy the Orange")
 */
function extractArchmageAttributeValue(attributes?: Array<{ trait_type: string; value: string | number }>): string | null {
  if (!attributes || !Array.isArray(attributes)) {
    return null;
  }
  
  const archmageAttr = attributes.find(attr => 
    attr.trait_type.toLowerCase() === 'archmage'
  );
  
  if (archmageAttr && archmageAttr.value && String(archmageAttr.value).trim() !== '') {
    return String(archmageAttr.value).trim();
  }
  
  return null;
}

/**
 * Extract color from Class attribute for Archmage tokens
 */
function extractColorFromClass(attributes?: Array<{ trait_type: string; value: string | number }>): string | null {
  if (!attributes || !Array.isArray(attributes)) {
    return null;
  }
  
  const classAttr = attributes.find(attr => 
    attr.trait_type.toLowerCase() === 'class'
  );
  
  if (classAttr && classAttr.value && String(classAttr.value).trim() !== '') {
    return String(classAttr.value).trim();
  }
  
  return null;
}

/**
 * Extract name from Archmage attribute value (for backwards compatibility)
 * This handles cases where the name was stored in the Archmage attribute value
 * instead of the name field (e.g., "Wizzy the Green" in Archmage attribute)
 */
function extractNameFromArchmageAttribute(attributes?: Array<{ trait_type: string; value: string | number }>): string | null {
  if (!attributes || !Array.isArray(attributes)) {
    return null;
  }
  
  const archmageAttr = attributes.find(attr => 
    attr.trait_type.toLowerCase() === 'archmage'
  );
  
  // If Archmage attribute value is not "Yes", it might contain the name
  if (archmageAttr && archmageAttr.value) {
    const value = String(archmageAttr.value).trim();
    if (value.toLowerCase() !== 'yes' && value !== '') {
      return value;
    }
  }
  
  return null;
}

/**
 * Process stored metadata by generating image and animation URLs from modelId
 * Image and animation are NEVER stored in the database, always generated
 * @param metadata - The stored metadata object (without image/animation)
 * @param isRevealed - Whether the token has been revealed (tokenId assigned)
 * @param tokenId - The token ID (required for revealed tokens to generate default name)
 * @returns Processed metadata with generated image/animation URLs (modelId excluded)
 */
export function processMetadataFields(
  metadata: StoredTokenMetadata,
  isRevealed: boolean,
  tokenId?: string
): TokenMetadata {
  // Get placeholder image path from environment variable
  const placeholderImagePath = process.env.METADATA_PLACEHOLDER_IMAGE_PATH;
  
  let image: string;
  let animation: string | undefined;

  if (isRevealed) {
    // After reveal: show actual image and animation
    if (!metadata.modelId) {
      throw new Error('modelId is required to generate image/animation URLs for revealed tokens');
    }
    
    // Generate actual image from modelId
    image = generateImageUrl(metadata.modelId);
    
    // Generate animation from modelId (only after reveal)
    animation = generateAnimationUrl(metadata.modelId);
  } else {
    // Before reveal: show placeholder image, no animation
    if (!placeholderImagePath) {
      throw new Error('METADATA_PLACEHOLDER_IMAGE_PATH environment variable is required for pre-reveal tokens');
    }
    
    // Get optional base URL for relative paths
    const baseUrl = process.env.METADATA_ASSETS_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
    
    // Process placeholder URL to handle both relative and absolute paths
    image = processUrl(placeholderImagePath, baseUrl);
    // animation is undefined (not included before reveal)
  }

  // Check if this is an Archmage token
  const isArchmage = isArchmageToken(metadata.attributes);
  
  // Get default description from environment variable or use fallback
  // Users can eventually write their own descriptions which will be stored in the database
  const defaultDescription = process.env.METADATA_DEFAULT_DESCRIPTION || 'A unique Wizzyverse NFT';
  
  // Use stored description if available, otherwise use default placeholder
  const description = metadata.description && metadata.description.trim() !== '' 
    ? metadata.description 
    : defaultDescription;
  
  // Build result metadata
  const result: TokenMetadata = {
    image,
    description,
  };

  // Handle Archmage tokens specially
  if (isArchmage) {
    // Extract Archmage attribute value directly from attributes
    // The value is fully spelled out in the CSV (e.g., "Wizzy the Orange")
    const archmageAttributeValue = extractArchmageAttributeValue(metadata.attributes);
    
    if (!archmageAttributeValue) {
      throw new Error('Archmage token must have a non-empty Archmage attribute value');
    }
    
    // Handle the name field separately - can be customized by users
    // Always use stored name from database if it exists (user's custom name)
    // Users will eventually be able to rename their NFTs, which will be stored in the database
    // Check multiple sources for the name (for backwards compatibility with old imports)
    let archmageName: string;
    if (metadata.name && metadata.name.trim() !== '') {
      // Use the name from the database (user's custom name)
      archmageName = metadata.name;
    } else {
      // Fallback: check if name is stored in attributes (for backwards compatibility)
      // Check "Name" attribute first
      const nameAttr = metadata.attributes?.find(attr => 
        attr.trait_type.toLowerCase() === 'name'
      );
      const nameFromNameAttribute = nameAttr && nameAttr.value && String(nameAttr.value).trim() !== ''
        ? String(nameAttr.value).trim()
        : null;
      
      if (nameFromNameAttribute) {
        archmageName = nameFromNameAttribute;
      } else {
        // If no custom name, use the Archmage attribute value as the name
        archmageName = archmageAttributeValue;
      }
    }
    
    result.name = archmageName;
    
    // Archmage tokens have a single "Archmage" attribute
    // The attribute value comes directly from the CSV (fully spelled out)
    // This is independent of the name field, which can be customized
    result.attributes = [
      {
        trait_type: 'Archmage',
        value: archmageAttributeValue,
      },
    ];
  } else {
    // Regular tokens: include all attributes except Archmage attribute
    // Archmage attribute should only be present for Archmage tokens
    if (metadata.attributes && Array.isArray(metadata.attributes)) {
      result.attributes = metadata.attributes.filter(attr => 
        attr.trait_type.toLowerCase() !== 'archmage'
      );
    } else {
      result.attributes = metadata.attributes;
    }
    
    // Use stored name if available (user's custom name)
    // Users will eventually be able to rename their NFTs, which will be stored in the database
    // If no custom name is stored, generate default name: "Wizzy the [color] #[tokenId]"
    if (metadata.name && metadata.name.trim() !== '') {
      result.name = metadata.name;
    } else if (isRevealed && tokenId) {
      // Generate default name for revealed tokens: "Wizzy the [color] #[tokenId]"
      const color = extractColorFromClass(metadata.attributes);
      const paddedTokenId = String(tokenId).padStart(5, '0');
      
      if (color) {
        result.name = `Wizzy the ${color} #${paddedTokenId}`;
      } else {
        // Fallback if Class attribute is missing
        result.name = `Wizzy #${paddedTokenId}`;
      }
    }
    // If not revealed or no tokenId, name remains undefined
  }

  // Only include animation if revealed
  if (isRevealed && animation) {
    result.animation = animation;
  }

  return result;
}

/**
 * Generate placeholder metadata for pre-reveal tokens
 * Used when a token is minted but metadata hasn't been revealed yet
 * @param tokenId - The token ID to include in the placeholder name
 * @returns Placeholder TokenMetadata
 */
export function generatePlaceholderMetadata(tokenId: string): TokenMetadata {
  const placeholderImagePath = process.env.METADATA_PLACEHOLDER_IMAGE_PATH;
  
  if (!placeholderImagePath) {
    throw new Error('METADATA_PLACEHOLDER_IMAGE_PATH environment variable is required');
  }
  
  // Get optional base URL for relative paths
  const baseUrl = process.env.METADATA_ASSETS_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
  
  // Process placeholder image URL
  const image = processUrl(placeholderImagePath, baseUrl);
  
  // Get default description from environment variable or use fallback
  const defaultDescription = process.env.METADATA_DEFAULT_DESCRIPTION || 'A unique Wizzyverse NFT';
  
  // Generate placeholder name: "Wizzy #[tokenId]" with tokenId padded to 5 digits
  const paddedTokenId = String(tokenId).padStart(5, '0');
  const name = `Wizzy #${paddedTokenId}`;
  
  return {
    image,
    name,
    description: defaultDescription,
    // No attributes or animation for pre-reveal tokens
  };
}

