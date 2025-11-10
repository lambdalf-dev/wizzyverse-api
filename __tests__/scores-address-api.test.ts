import { NextRequest } from 'next/server';
import { GET, DELETE } from '@/app/scores/[address]/route';
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

describe('/scores/[address] API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /scores/[address]', () => {
    it('should return score for valid address', async () => {
      // Mock the database collection for getScore
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: 150,
          validationResult: 'VALID'
        })
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = new NextRequest('http://localhost:3000/scores/0x1234567890123456789012345678901234567890');
      const response = await GET(request, {
        params: Promise.resolve({ address: '0x1234567890123456789012345678901234567890' })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        address: '0x1234567890123456789012345678901234567890',
        score: 150,
        validation: 'VALID',
        priceTier: 1, // 150 >= 100, so A_TIER (1)
        timestamp: expect.any(String)
      });
    });

    it('should return 400 for invalid address format', async () => {
      const request = new NextRequest('http://localhost:3000/scores/invalid-address');
      const response = await GET(request, {
        params: Promise.resolve({ address: 'invalid-address' })
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Invalid Ethereum address format',
        code: 'INVALID_ADDRESS_FORMAT',
        timestamp: expect.any(String)
      });
    });

    it('should return 400 for address with wrong length', async () => {
      const request = new NextRequest('http://localhost:3000/scores/0x123');
      const response = await GET(request, {
        params: Promise.resolve({ address: '0x123' })
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Invalid Ethereum address format',
        code: 'INVALID_ADDRESS_FORMAT',
        timestamp: expect.any(String)
      });
    });

    it('should return 400 for address without 0x prefix', async () => {
      const request = new NextRequest('http://localhost:3000/scores/1234567890123456789012345678901234567890');
      const response = await GET(request, {
        params: Promise.resolve({ address: '1234567890123456789012345678901234567890' })
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Invalid Ethereum address format',
        code: 'INVALID_ADDRESS_FORMAT',
        timestamp: expect.any(String)
      });
    });

    it('should return 404 when no score exists', async () => {
      // Mock the database collection for getScore (no score found)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null)
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = new NextRequest('http://localhost:3000/scores/0x1234567890123456789012345678901234567890');
      const response = await GET(request, {
        params: Promise.resolve({ address: '0x1234567890123456789012345678901234567890' })
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        error: 'Score not found for this address',
        code: 'SCORE_NOT_FOUND',
        timestamp: expect.any(String)
      });
    });

    it('should return score with null values when score is undefined', async () => {
      // Mock the database collection for getScore (score with undefined score value)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: undefined,
          validationResult: null
        })
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = new NextRequest('http://localhost:3000/scores/0x1234567890123456789012345678901234567890');
      const response = await GET(request, {
        params: Promise.resolve({ address: '0x1234567890123456789012345678901234567890' })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        address: '0x1234567890123456789012345678901234567890',
        score: null,
        validation: null,
        priceTier: null,
        timestamp: expect.any(String)
      });
    });

    it('should validate existing score when validation is null', async () => {
      // Mock the database collection for getScore (score without validation)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: 200,
          validationResult: null
        })
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock the dependencies for validateExistingScore
      const { gameSessionService } = require('@/lib/game-session-service');
      const { antiCheatService } = require('@/lib/anti-cheat-service');
      
      gameSessionService.saveSessionWithValidation = jest.fn().mockResolvedValue(true);
      antiCheatService.validateGameSession = jest.fn().mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });

      const request = new NextRequest('http://localhost:3000/scores/0x1234567890123456789012345678901234567890');
      const response = await GET(request, {
        params: Promise.resolve({ address: '0x1234567890123456789012345678901234567890' })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        address: '0x1234567890123456789012345678901234567890',
        score: 200,
        validation: 'VALID',
        priceTier: 1, // 200 >= 200, so tier 1
        timestamp: expect.any(String)
      });
      // The validateExistingScore method was called internally by the real service
    });

    it('should validate existing score when validation is undefined', async () => {
      // Mock the database collection for getScore (score without validation)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: 200,
          validationResult: null,
          gameStartTime: new Date('2024-01-01T00:00:00Z'),
          gameEndTime: new Date('2024-01-01T00:05:00Z'),
          clientStartTime: '2024-01-01T00:00:00Z',
          clientEndTime: '2024-01-01T00:05:00Z',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        })
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock the dependencies for validateExistingScore
      const { gameSessionService } = require('@/lib/game-session-service');
      const { antiCheatService } = require('@/lib/anti-cheat-service');
      
      gameSessionService.saveSessionWithValidation = jest.fn().mockResolvedValue(true);
      antiCheatService.validateGameSession = jest.fn().mockReturnValue({
        isValid: false,
        rejectionReason: 'Suspicious activity'
      });

      const request = new NextRequest('http://localhost:3000/scores/0x1234567890123456789012345678901234567890');
      const response = await GET(request, {
        params: Promise.resolve({ address: '0x1234567890123456789012345678901234567890' })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        address: '0x1234567890123456789012345678901234567890',
        score: 200,
        validation: 'INVALID',
        priceTier: 3, // INVALID validation results in tier 3
        timestamp: expect.any(String)
      });
    });

    it('should handle validation errors gracefully', async () => {
      // Mock the database collection for getScore (score without validation)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: 200,
          validationResult: null
        })
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock the dependencies for validateExistingScore to throw error
      const { gameSessionService } = require('@/lib/game-session-service');
      const { antiCheatService } = require('@/lib/anti-cheat-service');
      
      gameSessionService.saveSessionWithValidation = jest.fn().mockRejectedValue(new Error('Validation failed'));
      antiCheatService.validateGameSession = jest.fn().mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });

      const request = new NextRequest('http://localhost:3000/scores/0x1234567890123456789012345678901234567890');
      const response = await GET(request, {
        params: Promise.resolve({ address: '0x1234567890123456789012345678901234567890' })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        address: '0x1234567890123456789012345678901234567890',
        score: 200,
        validation: 'INVALID', // Validation failed, so marked as INVALID
        priceTier: 3, // INVALID scores always get tier 3
        timestamp: expect.any(String)
      });
    });

    it('should calculate correct price tiers for different scores', async () => {
      const testCases = [
        { score: 350, expectedTier: 0 }, // >= 300 = tier 0
        { score: 250, expectedTier: 1 }, // >= 100 = tier 1
        { score: 150, expectedTier: 1 }, // >= 100 = tier 1
        { score: 75, expectedTier: 2 },  // >= 50 = tier 2
        { score: 25, expectedTier: 3 }   // < 50 = default tier 3
      ];

      for (const testCase of testCases) {
        const mockScore = {
          address: '0x1234567890123456789012345678901234567890',
          score: testCase.score,
          validationResult: 'VALID'
        };
        // Mock the database collection for getScore (score with validation)
        const mockCollection = {
          findOne: jest.fn().mockResolvedValue({
            address: '0x1234567890123456789012345678901234567890',
            score: testCase.score,
            validationResult: 'VALID'
          })
        };
        (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

        const request = new NextRequest('http://localhost:3000/scores/0x1234567890123456789012345678901234567890');
        const response = await GET(request, {
          params: Promise.resolve({ address: '0x1234567890123456789012345678901234567890' })
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.priceTier).toBe(testCase.expectedTier);
      }
    });

    it('should return tier 4 for invalid validation', async () => {
      // Mock the database collection for getScore (score with INVALID validation)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: 200,
          validationResult: 'INVALID'
        })
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = new NextRequest('http://localhost:3000/scores/0x1234567890123456789012345678901234567890');
      const response = await GET(request, {
        params: Promise.resolve({ address: '0x1234567890123456789012345678901234567890' })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.priceTier).toBe(3); // Invalid validation, so tier 3
    });

    it('should handle database errors', async () => {
      // Mock the database collection for getScore to throw error
      const mockCollection = {
        findOne: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = new NextRequest('http://localhost:3000/scores/0x1234567890123456789012345678901234567890');
      const response = await GET(request, {
        params: Promise.resolve({ address: '0x1234567890123456789012345678901234567890' })
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Failed to fetch score',
        code: 'DATABASE_ERROR',
        timestamp: expect.any(String)
      });
    });

    it('should handle non-Error exceptions', async () => {
      // Mock the database collection for getScore to throw non-Error
      const mockCollection = {
        findOne: jest.fn().mockRejectedValue('String error')
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = new NextRequest('http://localhost:3000/scores/0x1234567890123456789012345678901234567890');
      const response = await GET(request, {
        params: Promise.resolve({ address: '0x1234567890123456789012345678901234567890' })
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Failed to fetch score',
        code: 'DATABASE_ERROR',
        timestamp: expect.any(String)
      });
    });
  });

  describe('DELETE /scores/[address]', () => {
    it('should return not implemented error for valid address', async () => {
      const request = new NextRequest('http://localhost:3000/scores/0x1234567890123456789012345678901234567890', {
        method: 'DELETE'
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ address: '0x1234567890123456789012345678901234567890' })
      });
      const data = await response.json();

      expect(response.status).toBe(501);
      expect(data).toEqual({
        error: 'Delete functionality not implemented',
        code: 'NOT_IMPLEMENTED',
        timestamp: expect.any(String)
      });
    });

    it('should return 400 for invalid address format', async () => {
      const request = new NextRequest('http://localhost:3000/scores/invalid-address', {
        method: 'DELETE'
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ address: 'invalid-address' })
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Invalid Ethereum address format',
        code: 'INVALID_ADDRESS_FORMAT',
        timestamp: expect.any(String)
      });
    });

    it('should return 400 for address with wrong length', async () => {
      const request = new NextRequest('http://localhost:3000/scores/0x123', {
        method: 'DELETE'
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ address: '0x123' })
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Invalid Ethereum address format',
        code: 'INVALID_ADDRESS_FORMAT',
        timestamp: expect.any(String)
      });
    });

    it('should return 400 for address without 0x prefix', async () => {
      const request = new NextRequest('http://localhost:3000/scores/1234567890123456789012345678901234567890', {
        method: 'DELETE'
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ address: '1234567890123456789012345678901234567890' })
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Invalid Ethereum address format',
        code: 'INVALID_ADDRESS_FORMAT',
        timestamp: expect.any(String)
      });
    });

    it('should handle database errors', async () => {
      // Mock a database error by making params throw
      const request = new NextRequest('http://localhost:3000/scores/0x1234567890123456789012345678901234567890', {
        method: 'DELETE'
      });
      const response = await DELETE(request, {
        params: Promise.reject(new Error('Database error'))
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Failed to delete score',
        code: 'DATABASE_ERROR',
        timestamp: expect.any(String)
      });
    });

    it('should handle non-Error exceptions', async () => {
      const request = new NextRequest('http://localhost:3000/scores/0x1234567890123456789012345678901234567890', {
        method: 'DELETE'
      });
      const response = await DELETE(request, {
        params: Promise.reject('String error')
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Failed to delete score',
        code: 'DATABASE_ERROR',
        timestamp: expect.any(String)
      });
    });
  });
});
