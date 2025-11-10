import { POST } from '@/app/scores/validate/route';
import { scoreService } from '@/lib/score-service';

// Mock the dependencies of scoreService
jest.mock('@/lib/game-session-service', () => ({
  gameSessionService: {
    getSession: jest.fn(),
    updateSession: jest.fn(),
    saveSessionWithValidation: jest.fn()
  }
}));

jest.mock('@/lib/anti-cheat-service', () => ({
  antiCheatService: {
    validateGameSession: jest.fn()
  }
}));

jest.mock('@/lib/mongodb-scores', () => ({
  getCollection: jest.fn()
}));

describe('POST /scores/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: any) => {
    const request = new global.NextRequest('http://localhost:3000/api/scores/validate', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return request;
  };

  describe('Valid Requests', () => {
    it('should validate existing score successfully', async () => {
      // Mock the database collection for getScore (existing score with validation)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: 300,
          validationResult: 'VALID',
          rejectionReason: undefined
        })
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Score validation completed for address 0x1234567890123456789012345678901234567890');
      expect(data.validationResult).toBe('VALID');
      expect(data.priceTier).toBe(0);
      expect(data.timestamp).toBeDefined();
    });

    it('should handle invalid score validation', async () => {
      // Mock the database collection for getScore (existing score with INVALID validation)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: 300,
          validationResult: 'INVALID',
          rejectionReason: 'impossible score'
        })
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Score validation completed for address 0x1234567890123456789012345678901234567890');
      expect(data.validationResult).toBe('INVALID');
      expect(data.rejectionReason).toBe('impossible score');
      expect(data.priceTier).toBe(0); // Score 300 = S_TIER (0)
      expect(data.timestamp).toBeDefined();
    });

    it('should handle different price tiers', async () => {
      // Mock the database collection for getScore (existing score with validation)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: 150, // This should give us tier 1 (A_TIER)
          validationResult: 'VALID',
          rejectionReason: undefined
        })
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.validationResult).toBe('VALID');
      expect(data.priceTier).toBe(1); // Score 150 = A_TIER (1)
    });

    it('should handle case-insensitive address', async () => {
      // Mock the database collection for getScore (existing score with validation)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', // Lowercase version
          score: 250,
          validationResult: 'VALID',
          rejectionReason: undefined
        })
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle mixed case address', async () => {
      // Mock the database collection for getScore (existing score with validation)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0xabcdef1234567890123456789012345678901234', // Lowercase version
          score: 25,
          validationResult: 'VALID',
          rejectionReason: undefined
        })
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0xAbCdEf1234567890123456789012345678901234'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Invalid Requests', () => {
    it('should reject request with missing address', async () => {
      const request = createMockRequest({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Address is required');
      expect(data.code).toBe('MISSING_ADDRESS');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with empty address', async () => {
      const request = createMockRequest({
        address: ''
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Address is required');
      expect(data.code).toBe('MISSING_ADDRESS');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with null address', async () => {
      const request = createMockRequest({
        address: null
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Address is required');
      expect(data.code).toBe('MISSING_ADDRESS');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with undefined address', async () => {
      const request = createMockRequest({
        address: undefined
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Address is required');
      expect(data.code).toBe('MISSING_ADDRESS');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with invalid address format - too short', async () => {
      const request = createMockRequest({
        address: '0x123456789012345678901234567890123456789'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid Ethereum address format');
      expect(data.code).toBe('INVALID_ADDRESS_FORMAT');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with invalid address format - too long', async () => {
      const request = createMockRequest({
        address: '0x12345678901234567890123456789012345678901'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid Ethereum address format');
      expect(data.code).toBe('INVALID_ADDRESS_FORMAT');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with invalid address format - missing 0x', async () => {
      const request = createMockRequest({
        address: '1234567890123456789012345678901234567890'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid Ethereum address format');
      expect(data.code).toBe('INVALID_ADDRESS_FORMAT');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with invalid address format - invalid characters', async () => {
      const request = createMockRequest({
        address: '0xg234567890123456789012345678901234567890'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid Ethereum address format');
      expect(data.code).toBe('INVALID_ADDRESS_FORMAT');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with non-string address', async () => {
      const request = createMockRequest({
        address: 123
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid Ethereum address format');
      expect(data.code).toBe('INVALID_ADDRESS_FORMAT');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Service Errors', () => {
    it('should handle validation failure', async () => {
      // Mock the database collection for getScore (no score found)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null)
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No score found for this address');
      expect(data.code).toBe('VALIDATION_FAILED');
      expect(data.timestamp).toBeDefined();
    });

    it('should handle service error', async () => {
      // Mock the database collection for getScore to throw error
      const mockCollection = {
        findOne: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to get score');
      expect(data.code).toBe('VALIDATION_FAILED');
      expect(data.timestamp).toBeDefined();
    });

    it('should handle unknown error', async () => {
      // Mock the database collection for getScore to throw non-Error
      const mockCollection = {
        findOne: jest.fn().mockRejectedValue('Unknown error')
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to get score');
      expect(data.code).toBe('VALIDATION_FAILED');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle validation with rejection reason', async () => {
      // Mock the database collection for getScore (existing score with INVALID validation)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: 300,
          validationResult: 'INVALID',
          rejectionReason: 'session duration is too long'
        })
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.validationResult).toBe('INVALID');
      expect(data.rejectionReason).toBe('session duration is too long');
      expect(data.priceTier).toBe(0); // Score 300 = S_TIER (0)
    });

    it('should handle validation without rejection reason', async () => {
      // Mock the database collection for getScore (existing score with VALID validation)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: 300,
          validationResult: 'VALID',
          rejectionReason: undefined
        })
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.validationResult).toBe('VALID');
      expect(data.rejectionReason).toBeUndefined();
      expect(data.priceTier).toBe(0);
    });

    it('should handle all price tiers', async () => {
      const priceTiers = [0, 1, 2, 3];
      const scores = [300, 150, 75, 25];
      
      for (let i = 0; i < priceTiers.length; i++) {
        const tier = priceTiers[i];
        const score = scores[i];
        
        // Mock the database collection for getScore (existing score with validation)
        const mockCollection = {
          findOne: jest.fn().mockResolvedValue({
            address: '0x1234567890123456789012345678901234567890',
            score: score,
            validationResult: 'VALID',
            rejectionReason: undefined
          })
        };
        (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

        const request = createMockRequest({
          address: '0x1234567890123456789012345678901234567890'
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.priceTier).toBe(tier);
      }
    });
  });
});
