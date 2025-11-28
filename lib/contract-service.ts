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
  private initializationError: Error | null = null;

  /**
   * Initialize provider and contract
   */
  private async initialize(): Promise<void> {
    if (this.provider && this.contract) {
      return; // Already initialized
    }

    // If we previously failed to initialize, throw the cached error
    if (this.initializationError) {
      throw this.initializationError;
    }

    const chainId = process.env.CHAIN_ID;
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const rpcUrl = process.env.RPC_URL;

    if (!chainId) {
      const error = new Error('CHAIN_ID environment variable is not set');
      this.initializationError = error;
      throw error;
    }

    if (!contractAddress) {
      const error = new Error('CONTRACT_ADDRESS environment variable is not set');
      this.initializationError = error;
      throw error;
    }

    if (!rpcUrl) {
      const error = new Error('RPC_URL environment variable is not set');
      this.initializationError = error;
      throw error;
    }

    // Validate contract address format
    if (!ethers.isAddress(contractAddress)) {
      const error = new Error(`Invalid CONTRACT_ADDRESS format: ${contractAddress}`);
      this.initializationError = error;
      console.error('Contract address validation failed:', error.message);
      throw error;
    }

    // Get checksummed address
    const checksummedAddress = ethers.getAddress(contractAddress);

    try {
      // Create provider with timeout
      this.provider = new ethers.JsonRpcProvider(rpcUrl, {
        name: 'custom',
        chainId: parseInt(chainId, 10),
      });

      // Test RPC connection by getting block number
      try {
        const blockNumber = await Promise.race([
          this.provider.getBlockNumber(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('RPC connection timeout')), 10000)
          ),
        ]);
        console.log(`RPC connection successful. Current block: ${blockNumber}`);
      } catch (rpcError: any) {
        const error = new Error(
          `Failed to connect to RPC URL: ${rpcUrl}. Error: ${rpcError.message}`
        );
        this.initializationError = error;
        console.error('RPC connection test failed:', error.message);
        throw error;
      }

      // Create contract instance
      this.contract = new ethers.Contract(checksummedAddress, ERC721_ABI, this.provider);
      console.log(`Contract service initialized with address: ${checksummedAddress} on chain ${chainId}`);
    } catch (error: any) {
      // If initialization fails, cache the error
      if (!this.initializationError) {
        this.initializationError = error instanceof Error ? error : new Error(String(error));
      }
      console.error('Contract service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if a token is minted by calling ownerOf
   * Returns true if token exists (has an owner), false if it doesn't exist
   * Throws an error if there's a network/provider issue (not just token doesn't exist)
   */
  async isTokenMinted(tokenId: string): Promise<boolean> {
    try {
      await this.initialize();
    } catch (initError: any) {
      // Wrap initialization errors with more context
      const error = new Error(
        `Failed to initialize contract service: ${initError.message}. ` +
        `Please check RPC_URL, CONTRACT_ADDRESS, and CHAIN_ID configuration.`
      );
      console.error('Contract service initialization error:', error);
      throw error;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    // Convert tokenId to BigInt for the contract call
    let tokenIdBigInt: bigint;
    try {
      tokenIdBigInt = BigInt(tokenId);
    } catch (error) {
      throw new Error(`Invalid tokenId format: ${tokenId}`);
    }

    // Call ownerOf - if it throws, the token doesn't exist
    try {
      // Add timeout to the contract call
      const owner = await Promise.race([
        this.contract.ownerOf(tokenIdBigInt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Contract call timeout after 15 seconds')), 15000)
        ),
      ]);

      // If ownerOf succeeds, token exists (owner will be a valid address)
      const exists = owner && owner !== ethers.ZeroAddress;
      if (!exists) {
        console.warn(`Token ${tokenId} ownerOf returned zero address`);
      }
      return exists;
    } catch (error: any) {
      // Handle timeout errors
      if (error.message?.includes('timeout')) {
        console.error(`Contract call timeout for token ${tokenId}:`, error.message);
        throw new Error(
          `RPC call timed out. Please check your RPC_URL configuration and network connectivity.`
        );
      }

      // If ownerOf throws an error, check if it's because token doesn't exist
      // Common errors: "IERC721_NONEXISTANT_TOKEN" or "execution reverted"
      if (
        error.message?.includes('NONEXISTANT') ||
        error.message?.includes('NONEXISTENT') ||
        error.message?.includes('reverted') ||
        error.code === 'CALL_EXCEPTION' ||
        error.code === 'UNPREDICTABLE_GAS_LIMIT'
      ) {
        // Token doesn't exist - this is expected for unminted tokens
        console.log(`Token ${tokenId} does not exist on-chain`);
        return false;
      }

      // Handle network/provider errors
      if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT' || error.message?.includes('network')) {
        console.error(`Network error checking token ${tokenId}:`, error);
        throw new Error(
          `Network error while checking token mint status: ${error.message}. ` +
          `Please verify RPC_URL is correct and accessible.`
        );
      }

      // Re-throw unexpected errors with more context
      console.error(`Unexpected error checking token ${tokenId}:`, {
        message: error.message,
        code: error.code,
        error: error,
      });
      throw new Error(
        `Failed to verify token mint status: ${error.message || 'Unknown error'}. ` +
        `Please check contract configuration and RPC connectivity.`
      );
    }
  }
}

export const contractService = new ContractService();

