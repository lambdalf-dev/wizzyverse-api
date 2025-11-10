import { NextRequest } from 'next/server';
import { POST } from '@/app/whitelist/bulk/route';
import { whitelistService } from '@/lib/whitelist-service';

// Mock only external dependencies, not the core whitelistService
jest.mock('@/lib/mongodb-whitelist', () => ({
  getCollection: jest.fn()
}));

describe('/whitelist/bulk API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: any) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  describe('POST /whitelist/bulk', () => {
    it('should bulk import addresses successfully', async () => {
      // Mock the database collection for bulkImport
      const mockCollection = {
        insertMany: jest.fn().mockResolvedValue({ insertedCount: 3 })
      };
      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const addresses = [
        '0x1234567890123456789012345678901234567890',
        '0x0987654321098765432109876543210987654321',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      ];

      const request = createMockRequest({
        addresses,
        type: 'gtd',
        addedBy: 'admin'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('3 addresses added to GTD whitelist');
      expect(data.count).toBe(3);
      expect(data.type).toBe('gtd');
      expect(data.timestamp).toBeDefined();
      expect(mockCollection.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            address: '0x1234567890123456789012345678901234567890',
            type: 'gtd',
            addedBy: 'admin',
            addedAt: expect.any(Date)
          }),
          expect.objectContaining({
            address: '0x0987654321098765432109876543210987654321',
            type: 'gtd',
            addedBy: 'admin',
            addedAt: expect.any(Date)
          }),
          expect.objectContaining({
            address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            type: 'gtd',
            addedBy: 'admin',
            addedAt: expect.any(Date)
          })
        ])
      );
    });

    it('should reject request with missing addresses array', async () => {
      const request = createMockRequest({
        type: 'gtd',
        addedBy: 'admin'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Addresses array is required and must not be empty');
    });

    it('should reject request with non-array addresses', async () => {
      const request = createMockRequest({
        addresses: 'not-an-array',
        type: 'gtd',
        addedBy: 'admin'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Addresses array is required and must not be empty');
    });

    it('should reject request with empty addresses array', async () => {
      const request = createMockRequest({
        addresses: [],
        type: 'gtd',
        addedBy: 'admin'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Addresses array is required and must not be empty');
    });

    it('should reject request with missing type', async () => {
      const request = createMockRequest({
        addresses: ['0x1234567890123456789012345678901234567890'],
        addedBy: 'admin'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Type must be either "gtd" or "fcfs"');
    });

    it('should reject request with invalid type', async () => {
      const request = createMockRequest({
        addresses: ['0x1234567890123456789012345678901234567890'],
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
        addresses: [
          '0x1234567890123456789012345678901234567890',
          'invalid-address',
          '0x0987654321098765432109876543210987654321'
        ],
        type: 'gtd',
        addedBy: 'admin'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid Ethereum address format found');
      expect(data.invalidAddresses).toEqual(['invalid-address']);
    });

    it('should handle service errors', async () => {
      // Mock the database collection to throw error
      const mockCollection = {
        insertMany: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };
      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = createMockRequest({
        addresses: ['0x1234567890123456789012345678901234567890'],
        type: 'gtd',
        addedBy: 'admin'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to bulk import addresses');
    });
  });
});
