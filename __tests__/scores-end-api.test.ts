import { POST } from '@/app/scores/end/route';
import { scoreService } from '@/lib/score-service';
import { gameSessionService } from '@/lib/game-session-service';
import { antiCheatService } from '@/lib/anti-cheat-service';

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

const mockGameSessionService = gameSessionService as jest.Mocked<typeof gameSessionService>;
const mockAntiCheatService = antiCheatService as jest.Mocked<typeof antiCheatService>;

describe('POST /scores/end', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
    const request = new global.NextRequest('http://localhost:3000/api/scores/end', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
    return request;
  };

  describe('Valid Requests', () => {
    it('should process game end successfully', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock game session service
      const mockSession = {
        address: '0x1234567890123456789012345678901234567890',
        startTime: '2024-01-01T10:00:00.000Z',
        endTime: null,
        score: null,
        validationResult: null,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };
      mockGameSessionService.getSession.mockResolvedValue(mockSession);
      mockGameSessionService.updateSession.mockResolvedValue(true);
      mockGameSessionService.saveSessionWithValidation.mockResolvedValue(true);

      // Mock anti-cheat service
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '300',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      }, {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.validation).toBe('VALID');
      expect(data.priceTier).toBe(0);
      expect(data.serverTimestamp).toBeDefined();
    });

    it('should handle different price tiers', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock game session service
      const mockSession = {
        address: '0x1234567890123456789012345678901234567890',
        startTime: '2024-01-01T10:00:00.000Z',
        endTime: null,
        score: null,
        validationResult: null,
        ipAddress: 'unknown',
        userAgent: 'unknown'
      };
      mockGameSessionService.getSession.mockResolvedValue(mockSession);
      mockGameSessionService.updateSession.mockResolvedValue(true);
      mockGameSessionService.saveSessionWithValidation.mockResolvedValue(true);

      // Mock anti-cheat service
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '150',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.validation).toBe('VALID');
      expect(data.priceTier).toBe(1);
    });

    it('should handle different IP header sources', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock game session service
      const mockSession = {
        address: '0x1234567890123456789012345678901234567890',
        startTime: '2024-01-01T10:00:00.000Z',
        endTime: null,
        score: null,
        validationResult: null,
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      };
      mockGameSessionService.getSession.mockResolvedValue(mockSession);
      mockGameSessionService.updateSession.mockResolvedValue(true);
      mockGameSessionService.saveSessionWithValidation.mockResolvedValue(true);

      // Mock anti-cheat service
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '250',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      }, {
        'x-real-ip': '192.168.1.2',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle Cloudflare IP header', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock game session service
      const mockSession = {
        address: '0x1234567890123456789012345678901234567890',
        startTime: '2024-01-01T10:00:00.000Z',
        endTime: null,
        score: null,
        validationResult: null,
        ipAddress: '192.168.1.3',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      };
      mockGameSessionService.getSession.mockResolvedValue(mockSession);
      mockGameSessionService.updateSession.mockResolvedValue(true);
      mockGameSessionService.saveSessionWithValidation.mockResolvedValue(true);

      // Mock anti-cheat service
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '75',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      }, {
        'cf-connecting-ip': '192.168.1.3',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should default to unknown when no IP headers present', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock game session service
      const mockSession = {
        address: '0x1234567890123456789012345678901234567890',
        startTime: '2024-01-01T10:00:00.000Z',
        endTime: null,
        score: null,
        validationResult: null,
        ipAddress: 'unknown',
        userAgent: 'unknown'
      };
      mockGameSessionService.getSession.mockResolvedValue(mockSession);
      mockGameSessionService.updateSession.mockResolvedValue(true);
      mockGameSessionService.saveSessionWithValidation.mockResolvedValue(true);

      // Mock anti-cheat service
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '25',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Invalid Requests', () => {
    it('should reject request with missing address', async () => {
      const request = createMockRequest({
        score: '300',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Address and score are required');
      expect(data.code).toBe('MISSING_REQUIRED_FIELDS');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with missing score', async () => {
      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Address and score are required');
      expect(data.code).toBe('MISSING_REQUIRED_FIELDS');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with missing clientTimestamp', async () => {
      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '300'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Client timestamp is required');
      expect(data.code).toBe('MISSING_CLIENT_TIMESTAMP');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with invalid address format', async () => {
      const request = createMockRequest({
        address: 'invalid-address',
        score: '300',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid Ethereum address format');
      expect(data.code).toBe('INVALID_ADDRESS_FORMAT');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with invalid score - not a number', async () => {
      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: 'abc',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Score must be a valid integer string between 0 and 10000');
      expect(data.code).toBe('INVALID_SCORE_RANGE');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with invalid score - decimal number', async () => {
      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '300.5',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Score must be a valid integer string between 0 and 10000');
      expect(data.code).toBe('INVALID_SCORE_RANGE');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with invalid score - negative number', async () => {
      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '-100',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Score must be a valid integer string between 0 and 10000');
      expect(data.code).toBe('INVALID_SCORE_RANGE');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with invalid score - too high', async () => {
      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '15000',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Score must be a valid integer string between 0 and 10000');
      expect(data.code).toBe('INVALID_SCORE_RANGE');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with invalid score - too low', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock game session service
      const mockSession = {
        address: '0x1234567890123456789012345678901234567890',
        startTime: '2024-01-01T10:00:00.000Z',
        endTime: null,
        score: null,
        validationResult: null,
        ipAddress: 'unknown',
        userAgent: 'unknown'
      };
      mockGameSessionService.getSession.mockResolvedValue(mockSession);

      // Mock anti-cheat service to reject low score
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: false,
        rejectionReason: 'impossible score'
      });

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '2',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('impossible score');
      expect(data.code).toBe('ANTI_CHEAT_REJECTION');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with empty address', async () => {
      const request = createMockRequest({
        address: '',
        score: '300',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Address and score are required');
      expect(data.code).toBe('MISSING_REQUIRED_FIELDS');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with empty score', async () => {
      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Address and score are required');
      expect(data.code).toBe('MISSING_REQUIRED_FIELDS');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with empty clientTimestamp', async () => {
      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '300',
        clientTimestamp: ''
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Client timestamp is required');
      expect(data.code).toBe('MISSING_CLIENT_TIMESTAMP');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Service Errors', () => {
    it('should handle anti-cheat validation failure', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock game session service
      const mockSession = {
        address: '0x1234567890123456789012345678901234567890',
        startTime: '2024-01-01T10:00:00.000Z',
        endTime: null,
        score: null,
        validationResult: null,
        ipAddress: 'unknown',
        userAgent: 'unknown'
      };
      mockGameSessionService.getSession.mockResolvedValue(mockSession);

      // Mock anti-cheat service to reject
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: false,
        rejectionReason: 'impossible score'
      });

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '300',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('impossible score');
      expect(data.code).toBe('ANTI_CHEAT_REJECTION');
      expect(data.timestamp).toBeDefined();
    });

    it('should handle no game session found error', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock game session service to return null (no session found)
      mockGameSessionService.getSession.mockResolvedValue(null);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '300',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No game session found for this address');
      expect(data.code).toBe('ANTI_CHEAT_REJECTION');
      expect(data.timestamp).toBeDefined();
    });

    it('should handle session already exists error', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock game session service to throw error
      mockGameSessionService.getSession.mockRejectedValue(
        new Error('Address already has a game session')
      );

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '300',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Address already has a game session');
      expect(data.code).toBe('ANTI_CHEAT_REJECTION');
      expect(data.timestamp).toBeDefined();
    });

    it('should handle session update error', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock game session service
      const mockSession = {
        address: '0x1234567890123456789012345678901234567890',
        startTime: '2024-01-01T10:00:00.000Z',
        endTime: null,
        score: null,
        validationResult: null,
        ipAddress: 'unknown',
        userAgent: 'unknown'
      };
      mockGameSessionService.getSession.mockResolvedValue(mockSession);
      mockGameSessionService.updateSession.mockRejectedValue(
        new Error('Failed to update game session')
      );

      // Mock anti-cheat service
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '300',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to update game session');
      expect(data.code).toBe('ANTI_CHEAT_REJECTION');
      expect(data.timestamp).toBeDefined();
    });

    it('should handle validation save error', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock game session service
      const mockSession = {
        address: '0x1234567890123456789012345678901234567890',
        startTime: '2024-01-01T10:00:00.000Z',
        endTime: null,
        score: null,
        validationResult: null,
        ipAddress: 'unknown',
        userAgent: 'unknown'
      };
      mockGameSessionService.getSession.mockResolvedValue(mockSession);
      mockGameSessionService.updateSession.mockResolvedValue(true);
      mockGameSessionService.saveSessionWithValidation.mockRejectedValue(
        new Error('Failed to save validation result')
      );

      // Mock anti-cheat service
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '300',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to save validation result');
      expect(data.code).toBe('ANTI_CHEAT_REJECTION');
      expect(data.timestamp).toBeDefined();
    });

    it('should handle generic service error', async () => {
      // Mock the database collection for getScore to throw error
      const mockCollection = {
        findOne: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '300',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to get score');
      expect(data.code).toBe('ANTI_CHEAT_REJECTION');
      expect(data.timestamp).toBeDefined();
    });

    it('should handle unknown error', async () => {
      // Mock the database collection for getScore to throw non-Error
      const mockCollection = {
        findOne: jest.fn().mockRejectedValue('Unknown error')
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '300',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to get score');
      expect(data.code).toBe('ANTI_CHEAT_REJECTION');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary score values', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock game session service
      const mockSession = {
        address: '0x1234567890123456789012345678901234567890',
        startTime: '2024-01-01T10:00:00.000Z',
        endTime: null,
        score: null,
        validationResult: null,
        ipAddress: 'unknown',
        userAgent: 'unknown'
      };
      mockGameSessionService.getSession.mockResolvedValue(mockSession);
      mockGameSessionService.updateSession.mockResolvedValue(true);
      mockGameSessionService.saveSessionWithValidation.mockResolvedValue(true);

      // Mock anti-cheat service
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });

      // Test minimum valid score
      const minRequest = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '3',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const minResponse = await POST(minRequest);
      expect(minResponse.status).toBe(200);

      // Test maximum valid score
      const maxRequest = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        score: '10000',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const maxResponse = await POST(maxRequest);
      expect(maxResponse.status).toBe(200);
    });

    it('should handle case-insensitive address', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock game session service
      const mockSession = {
        address: '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD',
        startTime: '2024-01-01T10:00:00.000Z',
        endTime: null,
        score: null,
        validationResult: null,
        ipAddress: 'unknown',
        userAgent: 'unknown'
      };
      mockGameSessionService.getSession.mockResolvedValue(mockSession);
      mockGameSessionService.updateSession.mockResolvedValue(true);
      mockGameSessionService.saveSessionWithValidation.mockResolvedValue(true);

      // Mock anti-cheat service
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });

      const request = createMockRequest({
        address: '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD',
        score: '250',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle mixed case address', async () => {
      // Mock the database collection for getScore (no existing score)
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null) // No existing score
      };
      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      // Mock game session service
      const mockSession = {
        address: '0xAbCdEf1234567890123456789012345678901234',
        startTime: '2024-01-01T10:00:00.000Z',
        endTime: null,
        score: null,
        validationResult: null,
        ipAddress: 'unknown',
        userAgent: 'unknown'
      };
      mockGameSessionService.getSession.mockResolvedValue(mockSession);
      mockGameSessionService.updateSession.mockResolvedValue(true);
      mockGameSessionService.saveSessionWithValidation.mockResolvedValue(true);

      // Mock anti-cheat service
      mockAntiCheatService.validateGameSession.mockReturnValue({
        isValid: true,
        rejectionReason: undefined
      });

      const request = createMockRequest({
        address: '0xAbCdEf1234567890123456789012345678901234',
        score: '150',
        clientTimestamp: '2024-01-01T10:05:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
