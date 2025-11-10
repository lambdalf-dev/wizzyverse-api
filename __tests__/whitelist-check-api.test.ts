import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/whitelist/check/route';
import { whitelistService } from '@/lib/whitelist-service';

// Mock only external dependencies, not the core whitelistService
jest.mock('@/lib/mongodb-whitelist', () => ({
  getCollection: jest.fn()
}));

describe('/whitelist/check API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body?: any, headers?: Record<string, string>) => {
    return {
      json: jest.fn().mockResolvedValue(body),
      headers: {
        get: jest.fn((name: string) => headers?.[name.toLowerCase()] || null),
      },
    } as unknown as NextRequest;
  };

  describe('POST /whitelist/check', () => {
    it('should check whitelist status successfully', async () => {
      // Mock the database collection for isAddressWhitelisted
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([
            { address: '0x1234567890123456789012345678901234567890', type: 'gtd' }
          ])
        })
      };
      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest(
        { address: '0x1234567890123456789012345678901234567890' },
        { 'content-type': 'application/json' }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result).toEqual({ gtd: true, fcfs: false });
      expect(data.address).toBe('0x1234567890123456789012345678901234567890');
      expect(data.timestamp).toBeDefined();
    });

    it('should reject request with invalid content type', async () => {
      const request = createMockRequest(
        { address: '0x1234567890123456789012345678901234567890' },
        { 'content-type': 'text/plain' }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Content-Type must be application/json');
      expect(data.code).toBe('INVALID_CONTENT_TYPE');
    });

    it('should reject request with missing content type', async () => {
      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Content-Type must be application/json');
      expect(data.code).toBe('INVALID_CONTENT_TYPE');
    });

    it('should handle JSON parsing errors', async () => {
      const request = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON format in request body');
      expect(data.code).toBe('INVALID_JSON');
    });

    it('should reject request with missing address', async () => {
      const request = createMockRequest(
        {},
        { 'content-type': 'application/json' }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid address provided');
      expect(data.code).toBe('INVALID_ADDRESS');
    });

    it('should reject request with non-string address', async () => {
      const request = createMockRequest(
        { address: 123 },
        { 'content-type': 'application/json' }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid address provided');
      expect(data.code).toBe('INVALID_ADDRESS');
    });

    it('should reject request with invalid Ethereum address format', async () => {
      const request = createMockRequest(
        { address: 'invalid-address' },
        { 'content-type': 'application/json' }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid Ethereum address format');
      expect(data.code).toBe('INVALID_FORMAT');
    });

    it('should handle service errors', async () => {
      // Mock the isAddressWhitelisted method to throw specific error
      jest.spyOn(whitelistService, 'isAddressWhitelisted').mockRejectedValue(new Error('MongoDB connection failed'));

      const request = createMockRequest(
        { address: '0x1234567890123456789012345678901234567890' },
        { 'content-type': 'application/json' }
      );
      const response = await POST(request);
      const data = await response.json();

      console.log('Actual error message:', data.error);
      console.log('Actual error code:', data.code);
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection error');
      expect(data.code).toBe('DATABASE_ERROR');
    });

    it('should handle timeout errors', async () => {
      // Mock the isAddressWhitelisted method to throw timeout error
      jest.spyOn(whitelistService, 'isAddressWhitelisted').mockRejectedValue(new Error('Request timeout'));

      const request = createMockRequest(
        { address: '0x1234567890123456789012345678901234567890' },
        { 'content-type': 'application/json' }
      );
      const response = await POST(request);
      const data = await response.json();

      console.log('Actual timeout error message:', data.error);
      console.log('Actual timeout error code:', data.code);
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Request timeout');
      expect(data.code).toBe('TIMEOUT_ERROR');
    });

    it('should handle generic errors', async () => {
      // Mock the isAddressWhitelisted method to throw generic error
      jest.spyOn(whitelistService, 'isAddressWhitelisted').mockRejectedValue(new Error('Unknown error'));

      const request = createMockRequest(
        { address: '0x1234567890123456789012345678901234567890' },
        { 'content-type': 'application/json' }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /whitelist/check', () => {
    it('should return health check with connected database', async () => {
      // Mock the database collection for both getStats and getAllAddresses
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([
            { address: '0x1234567890123456789012345678901234567890', type: 'gtd' },
            { address: '0x0987654321098765432109876543210987654321', type: 'gtd' },
            { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', type: 'gtd' },
            { address: '0x1111111111111111111111111111111111111111', type: 'fcfs' },
            { address: '0x2222222222222222222222222222222222222222', type: 'fcfs' },
            { address: '0x3333333333333333333333333333333333333333', type: 'fcfs' }
          ])
        }),
        countDocuments: jest.fn()
          .mockResolvedValueOnce(3) // gtd count
          .mockResolvedValueOnce(3) // fcfs count
          .mockResolvedValueOnce(6) // total count
      };
      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Whitelist API is running');
      expect(data.database.status).toBe('connected');
      expect(data.stats).toEqual({ gtdCount: 3, fcfsCount: 3, totalCount: 6 });
      expect(data.testAddresses.gtd).toHaveLength(3);
      expect(data.testAddresses.fcfs).toHaveLength(3);
      expect(data.timestamp).toBeDefined();
    });

    it('should return health check with disconnected database', async () => {
      // Mock the database collection to throw error
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        }),
        countDocuments: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };
      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Whitelist API is running');
      expect(data.database.status).toBe('disconnected');
      expect(data.stats).toEqual({ gtdCount: 0, fcfsCount: 0, totalCount: 0 });
      expect(data.testAddresses).toEqual({ gtd: [], fcfs: [] });
    });

    it('should handle database connection errors gracefully', async () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock the database collection to throw errors
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        }),
        countDocuments: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };
      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const response = await GET();
      const data = await response.json();

      // The GET route handles database errors gracefully and returns 200 with disconnected status
      expect(response.status).toBe(200);
      expect(data.message).toBe('Whitelist API is running');
      expect(data.database.status).toBe('disconnected');
      expect(data.stats).toEqual({ gtdCount: 0, fcfsCount: 0, totalCount: 0 });
      expect(data.testAddresses).toEqual({ gtd: [], fcfs: [] });

      consoleSpy.mockRestore();
    });

  });
});
