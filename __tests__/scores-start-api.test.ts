import { POST } from '@/app/scores/start/route';
import { gameSessionService } from '@/lib/game-session-service';

// Mock only external dependencies, not the core gameSessionService
jest.mock('@/lib/mongodb-scores', () => ({
  __esModule: true,
  default: {
    db: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        findOneAndUpdate: jest.fn(),
        insertOne: jest.fn(),
        countDocuments: jest.fn()
      })
    })
  }
}));

describe('POST /scores/start', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
    const request = new global.NextRequest('http://localhost:3000/api/scores/start', {
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
    it('should create a game session successfully', async () => {
      // Mock the database collection for gameSessionService
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null), // No existing session
        insertOne: jest.fn().mockResolvedValue({ insertedId: '1' })
      };

      (gameSessionService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        clientTimestamp: '2024-01-01T10:00:00.000Z'
      }, {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.serverTimestamp).toBeDefined();
      expect(data.message).toBe('Game session started successfully');
      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        score: undefined,
        lastUpdate: expect.any(Date),
        gameStartTime: expect.any(Date),
        clientStartTime: '2024-01-01T10:00:00.000Z',
        gameEndTime: undefined,
        clientEndTime: undefined,
        validationResult: undefined,
        rejectionReason: undefined,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
    });

    it('should handle different IP header sources', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({ insertedId: '1' })
      };

      (gameSessionService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        clientTimestamp: '2024-01-01T10:00:00.000Z'
      }, {
        'x-real-ip': '192.168.1.2',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        score: undefined,
        lastUpdate: expect.any(Date),
        gameStartTime: expect.any(Date),
        clientStartTime: '2024-01-01T10:00:00.000Z',
        gameEndTime: undefined,
        clientEndTime: undefined,
        validationResult: undefined,
        rejectionReason: undefined,
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      });
    });

    it('should handle Cloudflare IP header', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({ insertedId: '1' })
      };

      (gameSessionService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        clientTimestamp: '2024-01-01T10:00:00.000Z'
      }, {
        'cf-connecting-ip': '192.168.1.3',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        score: undefined,
        lastUpdate: expect.any(Date),
        gameStartTime: expect.any(Date),
        clientStartTime: '2024-01-01T10:00:00.000Z',
        gameEndTime: undefined,
        clientEndTime: undefined,
        validationResult: undefined,
        rejectionReason: undefined,
        ipAddress: '192.168.1.3',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      });
    });

    it('should default to unknown when no IP headers present', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({ insertedId: '1' })
      };

      (gameSessionService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        clientTimestamp: '2024-01-01T10:00:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        score: undefined,
        lastUpdate: expect.any(Date),
        gameStartTime: expect.any(Date),
        clientStartTime: '2024-01-01T10:00:00.000Z',
        gameEndTime: undefined,
        clientEndTime: undefined,
        validationResult: undefined,
        rejectionReason: undefined,
        ipAddress: 'unknown',
        userAgent: 'unknown'
      });
    });
  });

  describe('Invalid Requests', () => {
    it('should reject request with missing address', async () => {
      const request = createMockRequest({
        clientTimestamp: '2024-01-01T10:00:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Address is required');
      expect(data.code).toBe('MISSING_ADDRESS');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with missing clientTimestamp', async () => {
      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Client timestamp is required');
      expect(data.code).toBe('MISSING_CLIENT_TIMESTAMP');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with invalid address format - too short', async () => {
      const request = createMockRequest({
        address: '0x123456789012345678901234567890123456789',
        clientTimestamp: '2024-01-01T10:00:00.000Z'
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
        address: '0x12345678901234567890123456789012345678901',
        clientTimestamp: '2024-01-01T10:00:00.000Z'
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
        address: '1234567890123456789012345678901234567890',
        clientTimestamp: '2024-01-01T10:00:00.000Z'
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
        address: '0xg234567890123456789012345678901234567890',
        clientTimestamp: '2024-01-01T10:00:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid Ethereum address format');
      expect(data.code).toBe('INVALID_ADDRESS_FORMAT');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with empty address', async () => {
      const request = createMockRequest({
        address: '',
        clientTimestamp: '2024-01-01T10:00:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Address is required');
      expect(data.code).toBe('MISSING_ADDRESS');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with empty clientTimestamp', async () => {
      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
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
    it('should handle session already exists error', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({
          address: '0x1234567890123456789012345678901234567890',
          score: 300,
          lastUpdate: new Date('2024-01-01T09:00:00.000Z')
        })
      };

      (gameSessionService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        clientTimestamp: '2024-01-01T10:00:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to create game session: Address 0x1234567890123456789012345678901234567890 already has a completed game session');
      expect(data.code).toBe('SESSION_CREATION_ERROR');
      expect(data.timestamp).toBeDefined();
    });

    it('should handle generic service error', async () => {
      const mockCollection = {
        findOne: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };

      (gameSessionService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        clientTimestamp: '2024-01-01T10:00:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to create game session: Database connection failed');
      expect(data.code).toBe('SESSION_CREATION_ERROR');
      expect(data.timestamp).toBeDefined();
    });

    it('should handle unknown error', async () => {
      const mockCollection = {
        findOne: jest.fn().mockRejectedValue('Unknown error')
      };

      (gameSessionService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        clientTimestamp: '2024-01-01T10:00:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to create game session: Unknown error');
      expect(data.code).toBe('SESSION_CREATION_ERROR');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle case-insensitive address', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({ insertedId: '1' })
      };

      (gameSessionService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD',
        clientTimestamp: '2024-01-01T10:00:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        score: undefined,
        lastUpdate: expect.any(Date),
        gameStartTime: expect.any(Date),
        clientStartTime: '2024-01-01T10:00:00.000Z',
        gameEndTime: undefined,
        clientEndTime: undefined,
        validationResult: undefined,
        rejectionReason: undefined,
        ipAddress: 'unknown',
        userAgent: 'unknown'
      });
    });

    it('should handle mixed case address', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({ insertedId: '1' })
      };

      (gameSessionService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0xAbCdEf1234567890123456789012345678901234',
        clientTimestamp: '2024-01-01T10:00:00.000Z'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        address: '0xabcdef1234567890123456789012345678901234',
        score: undefined,
        lastUpdate: expect.any(Date),
        gameStartTime: expect.any(Date),
        clientStartTime: '2024-01-01T10:00:00.000Z',
        gameEndTime: undefined,
        clientEndTime: undefined,
        validationResult: undefined,
        rejectionReason: undefined,
        ipAddress: 'unknown',
        userAgent: 'unknown'
      });
    });
  });
});