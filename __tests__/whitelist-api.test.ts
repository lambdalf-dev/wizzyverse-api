import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/whitelist/route';
import { whitelistService } from '@/lib/whitelist-service';

// Mock the dependencies of whitelistService
jest.mock('@/lib/mongodb-whitelist', () => ({
  getCollection: jest.fn()
}));

describe('/whitelist API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body?: any, searchParams?: Record<string, string>) => {
    const url = new URL('http://localhost:3000/whitelist');
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    
    return {
      json: jest.fn().mockResolvedValue(body),
      url: url.toString(),
    } as unknown as NextRequest;
  };

  describe('GET /whitelist', () => {
    it('should return all whitelist addresses and stats', async () => {
      // Mock the database collection for whitelist operations
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([
            { address: '0x1234567890123456789012345678901234567890', type: 'gtd' },
            { address: '0x0987654321098765432109876543210987654321', type: 'fcfs' }
          ])
        }),
        countDocuments: jest.fn()
          .mockResolvedValueOnce(1) // gtd count
          .mockResolvedValueOnce(1) // fcfs count
          .mockResolvedValueOnce(2) // total count
      };
      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        gtd: ['0x1234567890123456789012345678901234567890'],
        fcfs: ['0x0987654321098765432109876543210987654321']
      });
      expect(data.stats).toEqual({
        gtdCount: 1,
        fcfsCount: 1,
        totalCount: 2
      });
      expect(data.timestamp).toBeDefined();
    });

    it('should handle service errors', async () => {
      // Mock the database collection to throw error
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        }),
        countDocuments: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };
      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch whitelist data');
    });
  });

  describe('POST /whitelist', () => {
    it('should add address to whitelist successfully', async () => {
      // Mock the database collection for addAddress
      const mockCollection = {
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'mock-id' })
      };
      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        type: 'gtd',
        addedBy: 'admin'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Address 0x1234567890123456789012345678901234567890 added to GTD whitelist');
      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        type: 'gtd',
        addedBy: 'admin',
        addedAt: expect.any(Date)
      });
    });

    it('should reject request with missing address', async () => {
      const request = createMockRequest({
        type: 'gtd',
        addedBy: 'admin'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Address and type are required');
    });

    it('should reject request with missing type', async () => {
      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        addedBy: 'admin'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Address and type are required');
    });

    it('should reject request with invalid type', async () => {
      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        type: 'invalid',
        addedBy: 'admin'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Type must be either "gtd" or "fcfs"');
    });

    it('should reject request with invalid Ethereum address format', async () => {
      const request = createMockRequest({
        address: 'invalid-address',
        type: 'gtd',
        addedBy: 'admin'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid Ethereum address format');
    });

    it('should handle service errors', async () => {
      // Mock the database collection to throw error
      const mockCollection = {
        insertOne: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };
      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        address: '0x1234567890123456789012345678901234567890',
        type: 'gtd',
        addedBy: 'admin'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to add address to whitelist');
    });
  });

  describe('DELETE /whitelist', () => {
    it('should remove address from whitelist successfully', async () => {
      // Mock the database collection for removeAddress
      const mockCollection = {
        deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 })
      };
      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest(undefined, {
        address: '0x1234567890123456789012345678901234567890',
        type: 'gtd'
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Address 0x1234567890123456789012345678901234567890 removed from GTD whitelist');
      expect(mockCollection.deleteMany).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890', // Service normalizes to lowercase
        type: 'gtd'
      });
    });

    it('should reject request with missing address parameter', async () => {
      const request = createMockRequest(undefined, {
        type: 'gtd'
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Address and type parameters are required');
    });

    it('should reject request with missing type parameter', async () => {
      const request = createMockRequest(undefined, {
        address: '0x1234567890123456789012345678901234567890'
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Address and type parameters are required');
    });

    it('should reject request with invalid type parameter', async () => {
      const request = createMockRequest(undefined, {
        address: '0x1234567890123456789012345678901234567890',
        type: 'invalid'
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Type must be either "gtd" or "fcfs"');
    });

    it('should handle service errors', async () => {
      // Mock the database collection to throw error
      const mockCollection = {
        deleteMany: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };
      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest(undefined, {
        address: '0x1234567890123456789012345678901234567890',
        type: 'gtd'
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to remove address from whitelist');
    });
  });
});
