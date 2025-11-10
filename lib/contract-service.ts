import { ethers } from 'ethers';

// Minimal ERC721 ABI for ownerOf function
const ERC721_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

class ContractService {
  private provider: ethers.Provider | null = null;
  private contract: ethers.Contract | null = null;

  /**
   * Initialize provider and contract
   */
  private async initialize(): Promise<void> {
    if (this.provider && this.contract) {
      return; // Already initialized
    }

    const chainId = process.env.CHAIN_ID;
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const rpcUrl = process.env.RPC_URL;

    if (!chainId) {
      throw new Error('CHAIN_ID environment variable is not set');
    }

    if (!contractAddress) {
      throw new Error('CONTRACT_ADDRESS environment variable is not set');
    }

    if (!rpcUrl) {
      throw new Error('RPC_URL environment variable is not set');
    }

    // Create provider
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Create contract instance
    this.contract = new ethers.Contract(contractAddress, ERC721_ABI, this.provider);
  }

  /**
   * Check if a token is minted by calling ownerOf
   * Returns true if token exists (has an owner), false if it doesn't exist
   * Throws an error if there's a network/provider issue (not just token doesn't exist)
   */
  async isTokenMinted(tokenId: string): Promise<boolean> {
    await this.initialize();

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    // Convert tokenId to BigInt for the contract call
    const tokenIdBigInt = BigInt(tokenId);

    // Call ownerOf - if it throws, the token doesn't exist
    try {
      const owner = await this.contract.ownerOf(tokenIdBigInt);
      // If ownerOf succeeds, token exists (owner will be a valid address)
      const exists = owner && owner !== ethers.ZeroAddress;
      if (!exists) {
        console.warn(`Token ${tokenId} ownerOf returned zero address`);
      }
      return exists;
    } catch (error: any) {
      // If ownerOf throws an error, check if it's because token doesn't exist
      // Common errors: "IERC721_NONEXISTANT_TOKEN" or "execution reverted"
      if (
        error.message?.includes('NONEXISTANT') ||
        error.message?.includes('NONEXISTENT') ||
        error.message?.includes('reverted') ||
        error.code === 'CALL_EXCEPTION'
      ) {
        // Token doesn't exist - this is expected for unminted tokens
        console.log(`Token ${tokenId} does not exist on-chain`);
        return false;
      }
      // Re-throw unexpected errors (network issues, provider errors, etc.)
      console.error(`Unexpected error checking token ${tokenId}:`, error);
      throw error;
    }
  }
}

export const contractService = new ContractService();

