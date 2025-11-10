import { scoreService } from '../lib/score-service';
import { gameSessionService } from '../lib/game-session-service';
import { antiCheatService } from '../lib/anti-cheat-service';

// Mock only external dependencies, not the core scoreService
jest.mock('../lib/game-session-service');
jest.mock('../lib/anti-cheat-service');
jest.mock('../lib/mongodb-scores', () => ({
  __esModule: true,
  default: {
    db: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        find: jest.fn(),
        countDocuments: jest.fn(),
        aggregate: jest.fn()
      })
    })
  }
}));

const mockGameSessionService = gameSessionService as jest.Mocked<typeof gameSessionService>;
const mockAntiCheatService = antiCheatService as jest.Mocked<typeof antiCheatService>;

describe('ScoreService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPriceTier', () => {
    it('should return tier 0 (S_TIER) for score >= 300', () => {
      const result = (scoreService as any).getPriceTier(300);
      expect(result).toBe(0);
    });

    it('should return tier 1 (A_TIER) for score >= 100', () => {
      const result = (scoreService as any).getPriceTier(200);
      expect(result).toBe(1);
    });

    it('should return tier 2 (B_TIER) for score >= 50', () => {
      const result = (scoreService as any).getPriceTier(100);
      expect(result).toBe(1); // 100 >= 100, so A_TIER (1)
    });

    it('should return tier 3 (C_TIER) for score == 50', () => {
      const result = (scoreService as any).getPriceTier(50);
      expect(result).toBe(2); // 50 >= 50, so B_TIER (2)
    });

    it('should return tier 3 (C_TIER) for score < 50', () => {
      const result = (scoreService as any).getPriceTier(25);
      expect(result).toBe(3); // 25 < 50, so C_TIER (3)
    });
  });

  describe('processGameEnd', () => {
    const mockSession = {
      address: '0x1234567890123456789012345678901234567890',
      gameStartTime: new Date('2024-01-01T10:00:00.000Z'),
      clientStartTime: '2024-01-01T10:00:00.000Z',
      lastUpdate: new Date('2024-01-01T10:00:00.000Z'),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    const mockRequestInfo = {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    it('should process valid game end successfully', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock dependencies
      mockGameSessionService.getSession.mockResolvedValue(mockSession);
      mockGameSessionService.updateSession.mockResolvedValue(mockSession);
      mockGameSessionService.saveSessionWithValidation.mockResolvedValue(mockSession);
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true
      });

      const result = await scoreService.processGameEnd(
        '0x1234567890123456789012345678901234567890',
        300,
        '2024-01-01T10:05:00.000Z',
        mockRequestInfo
      );

      expect(result.success).toBe(true);
      expect(result.validationResult).toBe('VALID');
      expect(result.priceTier).toBe(0); // Score 300 = tier 0
      expect(mockGameSessionService.updateSession).toHaveBeenCalled();
      expect(mockGameSessionService.saveSessionWithValidation).toHaveBeenCalled();
    });

    it('should reject when no game session exists', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      mockGameSessionService.getSession.mockResolvedValue(null);

      const result = await scoreService.processGameEnd(
        '0x1234567890123456789012345678901234567890',
        300,
        '2024-01-01T10:05:00.000Z',
        mockRequestInfo
      );

      expect(result.success).toBe(false);
      expect(result.validationResult).toBe('INVALID');
      expect(result.rejectionReason).toBe('No game session found for this address');
      expect(result.priceTier).toBe(3); // C_TIER
    });

    it('should reject when anti-cheat validation fails', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      mockGameSessionService.getSession.mockResolvedValue(mockSession);
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: false,
        rejectionReason: 'session duration is too short'
      });

      const result = await scoreService.processGameEnd(
        '0x1234567890123456789012345678901234567890',
        300,
        '2024-01-01T10:05:00.000Z',
        mockRequestInfo
      );

      expect(result.success).toBe(false);
      expect(result.validationResult).toBe('INVALID');
      expect(result.rejectionReason).toBe('session duration is too short');
      expect(result.priceTier).toBe(3); // C_TIER
    });

    it('should handle database errors gracefully', async () => {
      // Mock the database collection for getScore to throw error
      const mockCollection = {
        findOne: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await scoreService.processGameEnd(
        '0x1234567890123456789012345678901234567890',
        300,
        '2024-01-01T10:05:00.000Z',
        mockRequestInfo
      );

      expect(result.success).toBe(false);
      expect(result.validationResult).toBe('INVALID');
      expect(result.rejectionReason).toBe('Failed to get score');
      expect(result.priceTier).toBe(3); // C_TIER
    });

    it('should return correct price tier for different scores', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      mockGameSessionService.getSession.mockResolvedValue(mockSession);
      mockGameSessionService.updateSession.mockResolvedValue(mockSession);
      mockGameSessionService.saveSessionWithValidation.mockResolvedValue(mockSession);
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true
      });

      // Test different scores and expected tiers
      const testCases = [
        { score: 400, expectedTier: 0 }, // S_TIER (>= 300)
        { score: 250, expectedTier: 1 }, // A_TIER (>= 100)
        { score: 150, expectedTier: 1 }, // A_TIER (>= 100)
        { score: 75, expectedTier: 2 },  // B_TIER (>= 50)
        { score: 25, expectedTier: 3 }   // C_TIER (< 50)
      ];

      for (const { score, expectedTier } of testCases) {
        const result = await scoreService.processGameEnd(
          '0x1234567890123456789012345678901234567890',
          score,
          '2024-01-01T10:05:00.000Z',
          mockRequestInfo
        );

        expect(result.success).toBe(true);
        expect(result.priceTier).toBe(expectedTier);
      }
    });
  });

  describe('getPriceTierForAddress', () => {
    it('should return S_TIER (0) for score >= 300', async () => {
      // Mock the database to return a valid score
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: 350,
          validationResult: 'VALID',
          timestamp: new Date().toISOString()
        })
      };
      
      // Mock the getCollection method to return our mock collection
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await scoreService.getPriceTierForAddress('0x1234567890123456789012345678901234567890');

      expect(result).toBe(0);
    });

    it('should return A_TIER (1) for score >= 100', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: 150,
          validationResult: 'VALID',
          timestamp: new Date().toISOString()
        })
      };
      
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await scoreService.getPriceTierForAddress('0x1234567890123456789012345678901234567890');

      expect(result).toBe(1);
    });

    it('should return B_TIER (2) for score >= 50', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: 75,
          validationResult: 'VALID',
          timestamp: new Date().toISOString()
        })
      };
      
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await scoreService.getPriceTierForAddress('0x1234567890123456789012345678901234567890');

      expect(result).toBe(2);
    });

    it('should return C_TIER (3) for score < 50', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: 25,
          validationResult: 'VALID',
          timestamp: new Date().toISOString()
        })
      };
      
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await scoreService.getPriceTierForAddress('0x1234567890123456789012345678901234567890');

      expect(result).toBe(3);
    });

    it('should return C_TIER (3) when no score exists', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null)
      };
      
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await scoreService.getPriceTierForAddress('0x1234567890123456789012345678901234567890');

      expect(result).toBe(3);
    });

    it('should return C_TIER (3) for INVALID scores', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: 350,
          validationResult: 'INVALID',
          timestamp: new Date().toISOString()
        })
      };
      
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await scoreService.getPriceTierForAddress('0x1234567890123456789012345678901234567890');

      expect(result).toBe(3);
    });

    it('should return C_TIER (3) for scores with undefined score value', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: undefined,
          validationResult: 'VALID',
          timestamp: new Date().toISOString()
        })
      };
      
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await scoreService.getPriceTierForAddress('0x1234567890123456789012345678901234567890');

      expect(result).toBe(3);
    });

    it('should handle database errors gracefully and return C_TIER', async () => {
      (scoreService as any).getCollection = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const result = await scoreService.getPriceTierForAddress('0x1234567890123456789012345678901234567890');

      expect(result).toBe(3);
    });
  });

  describe('validateExistingScore', () => {
    it('should return invalid result when no existing score', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null)
      };
      
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await scoreService.validateExistingScore('0x1234567890123456789012345678901234567890');

      expect(result).toEqual({
        success: false,
        validationResult: 'INVALID',
        rejectionReason: 'No score found for this address',
        priceTier: 3
      });
    });

    it('should return valid result when score already has validation', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: 100,
          validationResult: 'VALID',
          timestamp: new Date().toISOString()
        })
      };
      
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await scoreService.validateExistingScore('0x1234567890123456789012345678901234567890');

      expect(result).toEqual({
        success: true,
        validationResult: 'VALID',
        rejectionReason: undefined,
        priceTier: 1
      });
    });

    it('should handle database errors gracefully', async () => {
      const mockCollection = {
        findOne: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await scoreService.validateExistingScore('0x1234567890123456789012345678901234567890');

      expect(result).toEqual({
        success: false,
        validationResult: 'INVALID',
        rejectionReason: 'Failed to get score',
        priceTier: 3
      });
    });

    it('should return invalid result when score exists but has no score value', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({ 
          address: '0x123...', 
          score: undefined 
        })
      };
      
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await scoreService.validateExistingScore('0x1234567890123456789012345678901234567890');

      expect(result).toEqual({
        success: false,
        validationResult: 'INVALID',
        rejectionReason: 'No score found for this address',
        priceTier: 3
      });
    });

    it('should return invalid result when score already has INVALID validation', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          score: 150, 
          validationResult: 'INVALID',
          rejectionReason: 'Previous rejection reason'
        })
      };
      
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await scoreService.validateExistingScore('0x1234567890123456789012345678901234567890');

      expect(result).toEqual({
        success: true,
        validationResult: 'INVALID',
        rejectionReason: 'Previous rejection reason',
        priceTier: 1
      });
    });

    it('should perform validation on existing score without validation', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          score: 200,
          validationResult: null,
          gameEndTime: new Date('2023-01-01T12:00:00Z'),
          clientEndTime: '2023-01-01T12:00:00Z',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        })
      };
      
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);
      
      // Mock anti-cheat validation to return valid
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });
      
      // Mock game session service
      mockGameSessionService.saveSessionWithValidation.mockResolvedValue(true);
      
      const result = await scoreService.validateExistingScore('0x1234567890123456789012345678901234567890');
      
      expect(mockAntiCheatService.validateGameSession).toHaveBeenCalledWith(
        expect.objectContaining({ score: 200 }),
        '2023-01-01T12:00:00Z',
        new Date('2023-01-01T12:00:00Z'),
        '192.168.1.1',
        'Mozilla/5.0',
        200
      );
      expect(mockGameSessionService.saveSessionWithValidation).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        'VALID',
        undefined
      );
      expect(result).toEqual({
        success: true,
        validationResult: 'VALID',
        rejectionReason: undefined,
        priceTier: 1
      });
    });

    it('should perform validation on existing score and mark as invalid', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          score: 200,
          validationResult: null,
          gameEndTime: new Date('2023-01-01T12:00:00Z'),
          clientEndTime: '2023-01-01T12:00:00Z',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        })
      };
      
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);
      
      // Mock anti-cheat validation to return invalid
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: false,
        rejectionReason: 'Suspicious activity detected'
      });
      
      // Mock game session service
      mockGameSessionService.saveSessionWithValidation.mockResolvedValue(true);
      
      const result = await scoreService.validateExistingScore('0x1234567890123456789012345678901234567890');
      
      expect(mockAntiCheatService.validateGameSession).toHaveBeenCalledWith(
        expect.objectContaining({ score: 200 }),
        '2023-01-01T12:00:00Z',
        new Date('2023-01-01T12:00:00Z'),
        '192.168.1.1',
        'Mozilla/5.0',
        200
      );
      expect(mockGameSessionService.saveSessionWithValidation).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        'INVALID',
        'Suspicious activity detected'
      );
      expect(result).toEqual({
        success: true,
        validationResult: 'INVALID',
        rejectionReason: 'Suspicious activity detected',
        priceTier: 3
      });
    });

    it('should handle missing gameEndTime and clientEndTime', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          score: 200,
          validationResult: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        })
      };
      
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);
      
      // Mock anti-cheat validation to return valid
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });
      
      // Mock game session service
      mockGameSessionService.saveSessionWithValidation.mockResolvedValue(true);
      
      const result = await scoreService.validateExistingScore('0x1234567890123456789012345678901234567890');
      
      // Should use current date for gameEndTime and fallback to endTime for clientEndTime
      expect(mockAntiCheatService.validateGameSession).toHaveBeenCalledWith(
        expect.objectContaining({ score: 200 }),
        expect.any(String), // clientEndTime should be current date ISO string
        expect.any(Date), // endTime should be current date
        '192.168.1.1',
        'Mozilla/5.0',
        200
      );
      expect(result.success).toBe(true);
    });

    it('should handle missing ipAddress and userAgent', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          score: 200,
          validationResult: null,
          gameEndTime: new Date('2023-01-01T12:00:00Z'),
          clientEndTime: '2023-01-01T12:00:00Z'
        })
      };
      
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);
      
      // Mock anti-cheat validation to return valid
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });
      
      // Mock game session service
      mockGameSessionService.saveSessionWithValidation.mockResolvedValue(true);
      
      const result = await scoreService.validateExistingScore('0x1234567890123456789012345678901234567890');
      
      expect(mockAntiCheatService.validateGameSession).toHaveBeenCalledWith(
        expect.objectContaining({ score: 200 }),
        '2023-01-01T12:00:00Z',
        new Date('2023-01-01T12:00:00Z'),
        'unknown',
        'unknown',
        200
      );
      expect(result.success).toBe(true);
    });

    it('should handle non-Error exceptions', async () => {
      const mockCollection = {
        findOne: jest.fn().mockRejectedValue('String error')
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await scoreService.validateExistingScore('0x1234567890123456789012345678901234567890');

      expect(result).toEqual({
        success: false,
        validationResult: 'INVALID',
        rejectionReason: 'Failed to get score',
        priceTier: 3
      });
    });
  });

  describe('getAllScores', () => {
    it('should return all scores', async () => {
      const mockScores = [
        { address: '0x1234567890123456789012345678901234567890', score: 300 },
        { address: '0x0987654321098765432109876543210987654321', score: 500 }
      ];

      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockScores)
        })
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await scoreService.getAllScores();

      expect(result).toEqual(mockScores);
    });

    it('should handle database errors in getAllScores', async () => {
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        })
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await expect(scoreService.getAllScores()).rejects.toThrow('Failed to get all scores');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const mockCollection = {
        countDocuments: jest.fn().mockResolvedValue(2),
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([{
            averageScore: 400,
            highestScore: 500,
            lowestScore: 300
          }])
        })
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await scoreService.getStats();

      expect(result).toEqual({
        totalScores: 2,
        averageScore: 400,
        highestScore: 500,
        lowestScore: 300
      });
    });

    it('should return zero stats when no scores exist', async () => {
      const mockCollection = {
        countDocuments: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await scoreService.getStats();

      expect(result).toEqual({
        totalScores: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0
      });
    });

    it('should handle database errors in getStats', async () => {
      const mockCollection = {
        countDocuments: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await expect(scoreService.getStats()).rejects.toThrow('Failed to get score statistics');
    });

    it('should handle aggregation errors in getStats', async () => {
      const mockCollection = {
        countDocuments: jest.fn().mockResolvedValue(5),
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockRejectedValue(new Error('Aggregation failed'))
        })
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await expect(scoreService.getStats()).rejects.toThrow('Failed to get score statistics');
    });
  });

  describe('processGameEnd error handling', () => {
    const mockSession = { address: '0x123...', startTime: new Date() };
    const mockRequestInfo = { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0' };

    it('should handle updateSession failure in processGameEnd', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      mockGameSessionService.getSession.mockResolvedValue(mockSession);
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });
      mockGameSessionService.updateSession.mockResolvedValue(false); // Update fails

      const result = await scoreService.processGameEnd(
        '0x1234567890123456789012345678901234567890',
        100,
        '2023-01-01T12:00:00Z',
        mockRequestInfo
      );

      expect(result).toEqual({
        success: false,
        validationResult: 'INVALID',
        rejectionReason: 'Failed to update game session with score data',
        priceTier: 3
      });
    });

    it('should handle saveSessionWithValidation failure in processGameEnd', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      mockGameSessionService.getSession.mockResolvedValue(mockSession);
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });
      mockGameSessionService.updateSession.mockResolvedValue(true);
      mockGameSessionService.saveSessionWithValidation.mockResolvedValue(false); // Save fails

      const result = await scoreService.processGameEnd(
        '0x1234567890123456789012345678901234567890',
        100,
        '2023-01-01T12:00:00Z',
        mockRequestInfo
      );

      expect(result).toEqual({
        success: false,
        validationResult: 'INVALID',
        rejectionReason: 'Failed to save validation result',
        priceTier: 3
      });
    });

    it('should handle non-Error exceptions in processGameEnd', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      mockGameSessionService.getSession.mockResolvedValue(mockSession);
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });
      mockGameSessionService.updateSession.mockRejectedValue('String error');

      const result = await scoreService.processGameEnd(
        '0x1234567890123456789012345678901234567890',
        100,
        '2023-01-01T12:00:00Z',
        mockRequestInfo
      );

      expect(result).toEqual({
        success: false,
        validationResult: 'INVALID',
        rejectionReason: 'Unknown error',
        priceTier: 3
      });
    });
  });
});