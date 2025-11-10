import { SALE_TYPES, ALLOTTED_AMOUNTS } from '../types/contract';

// Import the real proof service - no mocking of ethers
const { proofService } = require('../lib/proof-service');

// Mock environment variables
const originalEnv = process.env;

describe('ProofService', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should throw error when SIGNER_PRIVATE_KEY is not set', () => {
      delete process.env.SIGNER_PRIVATE_KEY;

      expect(() => new (require('../lib/proof-service').ProofService)()).toThrow('SIGNER_PRIVATE_KEY environment variable is required');
    });

    it('should initialize successfully when SIGNER_PRIVATE_KEY is set', () => {
      process.env.SIGNER_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';

      expect(() => new (require('../lib/proof-service').ProofService)()).not.toThrow();
    });
  });

  describe('getAllottedAmount', () => {
    let ProofServiceClass: any;
    let proofServiceInstance: any;

    beforeEach(() => {
      process.env.SIGNER_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
      ProofServiceClass = require('../lib/proof-service').ProofService;
      proofServiceInstance = new ProofServiceClass();
    });

    it('should return correct allotted amount for PUBLIC sale', () => {
      const result = proofServiceInstance.getAllottedAmount(SALE_TYPES.PUBLIC);
      expect(result).toBe(ALLOTTED_AMOUNTS.PUBLIC);
    });

    it('should return correct allotted amount for GTD sale', () => {
      const result = proofServiceInstance.getAllottedAmount(SALE_TYPES.GTD);
      expect(result).toBe(ALLOTTED_AMOUNTS.GTD);
    });

    it('should return correct allotted amount for FCFS sale', () => {
      const result = proofServiceInstance.getAllottedAmount(SALE_TYPES.FCFS);
      expect(result).toBe(ALLOTTED_AMOUNTS.FCFS);
    });

    it('should throw error for invalid sale type', () => {
      expect(() => proofServiceInstance.getAllottedAmount(999)).toThrow('Invalid sale type: 999');
    });
  });

  describe('generateProof', () => {
    beforeEach(() => {
      process.env.SIGNER_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
    });

    describe('Real Implementation Tests', () => {
      it('should generate proof successfully for PUBLIC sale', async () => {
        // Skip this test if SIGNER_PRIVATE_KEY is not available
        if (!process.env.SIGNER_PRIVATE_KEY) {
          console.log('Skipping proof generation test - SIGNER_PRIVATE_KEY not set');
          return;
        }

        const result = await proofService.generateProof(
          '0x1234567890123456789012345678901234567890',
          0, // priceTier
          0, // whitelistId
          11155111, // chainId
          SALE_TYPES.PUBLIC // saleType
        );

        // Verify the proof structure
        expect(result).toHaveProperty('proof');
        expect(result.proof).toHaveProperty('r');
        expect(result.proof).toHaveProperty('s');
        expect(result.proof).toHaveProperty('v');
        
        // Verify proof values are valid
        expect(result.proof.r).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect(result.proof.s).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect(typeof result.proof.v).toBe('number');
        expect([27, 28]).toContain(result.proof.v);
      });

      it('should generate proof successfully for GTD sale', async () => {
        // Skip this test if SIGNER_PRIVATE_KEY is not available
        if (!process.env.SIGNER_PRIVATE_KEY) {
          console.log('Skipping proof generation test - SIGNER_PRIVATE_KEY not set');
          return;
        }

        const result = await proofService.generateProof(
          '0x1234567890123456789012345678901234567890',
          1, // priceTier
          1, // whitelistId
          11155111, // chainId
          SALE_TYPES.GTD // saleType
        );

        // Verify the proof structure
        expect(result).toHaveProperty('proof');
        expect(result.proof).toHaveProperty('r');
        expect(result.proof).toHaveProperty('s');
        expect(result.proof).toHaveProperty('v');
        
        // Verify proof values are valid
        expect(result.proof.r).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect(result.proof.s).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect(typeof result.proof.v).toBe('number');
        expect([27, 28]).toContain(result.proof.v);
      });

      it('should generate proof successfully for FCFS sale', async () => {
        // Skip this test if SIGNER_PRIVATE_KEY is not available
        if (!process.env.SIGNER_PRIVATE_KEY) {
          console.log('Skipping proof generation test - SIGNER_PRIVATE_KEY not set');
          return;
        }

        const result = await proofService.generateProof(
          '0x1234567890123456789012345678901234567890',
          2, // priceTier
          2, // whitelistId
          11155111, // chainId
          SALE_TYPES.FCFS // saleType
        );

        // Verify the proof structure
        expect(result).toHaveProperty('proof');
        expect(result.proof).toHaveProperty('r');
        expect(result.proof).toHaveProperty('s');
        expect(result.proof).toHaveProperty('v');
        
        // Verify proof values are valid
        expect(result.proof.r).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect(result.proof.s).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect(typeof result.proof.v).toBe('number');
        expect([27, 28]).toContain(result.proof.v);
      });

      it('should generate exact proof values for specific parameters', async () => {
        // Skip this test if SIGNER_PRIVATE_KEY is not available
        if (!process.env.SIGNER_PRIVATE_KEY) {
          console.log('Skipping exact proof generation test - SIGNER_PRIVATE_KEY not set');
          return;
        }

        const result = await proofService.generateProof(
          '0xfdF87AD8b373d1425313ffc3E2eB4901e90a45eA', // wallet address
          3, // price tier
          1, // whitelist ID
          999, // chain ID
          1 // saleType (GTD - allotted amount: 1)
        );

        // The proof should match the expected values from Solidity
        expect(result.proof).toEqual({
          r: '0xc9576fcdcacbe9ba8401227299e256c7d32f1ed205b9841490c0658b9edd3704',
          s: '0x72b15e3df571615a96359e69ba4e5515b7a5b735b9d4853f654c3ce67a2581c9',
          v: 27
        });
      });

      it('should generate consistent proofs for same parameters', async () => {
        // Skip this test if SIGNER_PRIVATE_KEY is not available
        if (!process.env.SIGNER_PRIVATE_KEY) {
          console.log('Skipping consistency test - SIGNER_PRIVATE_KEY not set');
          return;
        }

        const params = {
          walletAddress: '0x1234567890123456789012345678901234567890',
          priceTier: 1,
          whitelistId: 1,
          chainId: 11155111,
          saleType: SALE_TYPES.GTD
        };

        // Generate proof twice with same parameters
        const result1 = await proofService.generateProof(
          params.walletAddress,
          params.priceTier,
          params.whitelistId,
          params.chainId,
          params.saleType
        );

        const result2 = await proofService.generateProof(
          params.walletAddress,
          params.priceTier,
          params.whitelistId,
          params.chainId,
          params.saleType
        );

        // Should be identical
        expect(result1.proof).toEqual(result2.proof);
      });

      it('should generate different proofs for different parameters', async () => {
        // Skip this test if SIGNER_PRIVATE_KEY is not available
        if (!process.env.SIGNER_PRIVATE_KEY) {
          console.log('Skipping different parameters test - SIGNER_PRIVATE_KEY not set');
          return;
        }

        const baseParams = {
          walletAddress: '0x1234567890123456789012345678901234567890',
          priceTier: 1,
          whitelistId: 1,
          chainId: 11155111,
          saleType: SALE_TYPES.GTD
        };

        const result1 = await proofService.generateProof(
          baseParams.walletAddress,
          baseParams.priceTier,
          baseParams.whitelistId,
          baseParams.chainId,
          baseParams.saleType
        );

        // Different wallet address
        const result2 = await proofService.generateProof(
          '0x9876543210987654321098765432109876543210',
          baseParams.priceTier,
          baseParams.whitelistId,
          baseParams.chainId,
          baseParams.saleType
        );

        // Different chain ID
        const result3 = await proofService.generateProof(
          baseParams.walletAddress,
          baseParams.priceTier,
          baseParams.whitelistId,
          999, // different chain ID
          baseParams.saleType
        );

        // All should be different
        expect(result1.proof).not.toEqual(result2.proof);
        expect(result1.proof).not.toEqual(result3.proof);
        expect(result2.proof).not.toEqual(result3.proof);
      });
    });

    describe('Error Handling Tests', () => {
      it('should reject invalid wallet address', async () => {
        await expect(proofService.generateProof(
          'invalid-address',
          0,
          0,
          11155111,
          SALE_TYPES.PUBLIC
        )).rejects.toThrow('Failed to generate proof');
      });

      it('should reject invalid price tier - negative', async () => {
        await expect(proofService.generateProof(
          '0x1234567890123456789012345678901234567890',
          -1,
          0,
          11155111,
          SALE_TYPES.PUBLIC
        )).rejects.toThrow('Failed to generate proof');
      });

      it('should reject invalid price tier - too high', async () => {
        await expect(proofService.generateProof(
          '0x1234567890123456789012345678901234567890',
          4,
          0,
          11155111,
          SALE_TYPES.PUBLIC
        )).rejects.toThrow('Failed to generate proof');
      });

      it('should accept valid price tiers', async () => {
        const validTiers = [0, 1, 2, 3];
        
        for (const tier of validTiers) {
          const result = await proofService.generateProof(
            '0x1234567890123456789012345678901234567890',
            tier,
            0,
            11155111,
            SALE_TYPES.PUBLIC
          );
          expect(result.proof).toBeDefined();
        }
      });

      it('should handle different chain IDs', async () => {
        const chainIds = [1, 11155111, 137, 56, 999];
        
        for (const chainId of chainIds) {
          const result = await proofService.generateProof(
            '0x1234567890123456789012345678901234567890',
            0,
            0,
            chainId,
            SALE_TYPES.PUBLIC
          );
          expect(result.proof).toBeDefined();
        }
      });

      it('should handle case-insensitive addresses', async () => {
        // Test that the same address in different valid cases produces the same proof
        // Using the known address from our exact proof test
        const address1 = '0xfdF87AD8b373d1425313ffc3E2eB4901e90a45eA';
        const address2 = '0xfdF87AD8b373d1425313ffc3E2eB4901e90a45eA'.toLowerCase();
        
        const result1 = await proofService.generateProof(
          address1,
          3, // price tier
          1, // whitelist ID
          999, // chain ID
          1 // saleType (GTD)
        );

        const result2 = await proofService.generateProof(
          address2,
          3, // price tier
          1, // whitelist ID
          999, // chain ID
          1 // saleType (GTD)
        );

        // Both should produce the same proof since they're the same address
        expect(result1.proof).toEqual(result2.proof);

        // Verify proof structure
        expect(result1.proof.r).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect(result1.proof.s).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect([27, 28]).toContain(result1.proof.v);

        // Since we know the expected proof for this address, let's also verify it
        expect(result1.proof).toEqual({
          r: '0xc9576fcdcacbe9ba8401227299e256c7d32f1ed205b9841490c0658b9edd3704',
          s: '0x72b15e3df571615a96359e69ba4e5515b7a5b735b9d4853f654c3ce67a2581c9',
          v: 27
        });
      });

      it('should handle zero address', async () => {
        // The zero address is technically valid according to ethers.isAddress()
        // but we might want to reject it for business logic reasons
        // For now, let's test that it generates a proof (since it's a valid address)
        const result = await proofService.generateProof(
          '0x0000000000000000000000000000000000000000',
          0,
          0,
          11155111,
          SALE_TYPES.PUBLIC
        );

        expect(result.proof).toBeDefined();
        expect(result.proof.r).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect(result.proof.s).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect([27, 28]).toContain(result.proof.v);
      });

      it('should handle very large chain IDs', async () => {
        const result = await proofService.generateProof(
          '0x1234567890123456789012345678901234567890',
          0,
          0,
          999999999, // very large chain ID
          SALE_TYPES.PUBLIC
        );

        expect(result.proof).toBeDefined();
        expect(result.proof.r).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect(result.proof.s).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect([27, 28]).toContain(result.proof.v);
      });
    });
  });
});