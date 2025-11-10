import { whitelistService } from '../lib/whitelist-service';
import { WhitelistEntry, WhitelistData } from '../lib/whitelist-service';

// Mock only external dependencies, not the core whitelistService
jest.mock('../lib/mongodb-whitelist', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    db: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        find: jest.fn(),
        findOne: jest.fn(),
        insertOne: jest.fn(),
        insertMany: jest.fn(),
        deleteMany: jest.fn(),
        countDocuments: jest.fn()
      })
    })
  })
}));

describe('WhitelistService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllAddresses', () => {
    it('should return all addresses grouped by type', async () => {
      const mockDocuments: WhitelistEntry[] = [
        {
          _id: '1' as any,
          address: '0x1234567890123456789012345678901234567890',
          type: 'gtd',
          addedAt: new Date('2024-01-01T10:00:00.000Z'),
          addedBy: 'admin'
        },
        {
          _id: '2' as any,
          address: '0x0987654321098765432109876543210987654321',
          type: 'fcfs',
          addedAt: new Date('2024-01-01T10:00:00.000Z'),
          addedBy: 'admin'
        },
        {
          _id: '3' as any,
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          type: 'gtd',
          addedAt: new Date('2024-01-01T10:00:00.000Z'),
          addedBy: 'admin'
        }
      ];

      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockDocuments)
        })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await whitelistService.getAllAddresses();

      expect(result).toEqual({
        gtd: [
          '0x1234567890123456789012345678901234567890',
          '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
        ],
        fcfs: [
          '0x0987654321098765432109876543210987654321'
        ]
      });
      expect(mockCollection.find).toHaveBeenCalledWith({});
    });

    it('should return empty arrays when no addresses exist', async () => {
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await whitelistService.getAllAddresses();

      expect(result).toEqual({
        gtd: [],
        fcfs: []
      });
    });

    it('should handle database errors', async () => {
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await expect(whitelistService.getAllAddresses()).rejects.toThrow('Failed to fetch whitelist data');
    });
  });

  describe('isAddressWhitelisted', () => {
    it('should return true for GTD whitelisted address', async () => {
      const mockDocuments: WhitelistEntry[] = [
        {
          _id: '1' as any,
          address: '0x1234567890123456789012345678901234567890',
          type: 'gtd',
          addedAt: new Date('2024-01-01T10:00:00.000Z')
        }
      ];

      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockDocuments)
        })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await whitelistService.isAddressWhitelisted('0x1234567890123456789012345678901234567890');

      expect(result).toEqual({
        gtd: true,
        fcfs: false
      });
      expect(mockCollection.find).toHaveBeenCalledWith({ address: '0x1234567890123456789012345678901234567890' });
    });

    it('should return true for FCFS whitelisted address', async () => {
      const mockDocuments: WhitelistEntry[] = [
        {
          _id: '1' as any,
          address: '0x1234567890123456789012345678901234567890',
          type: 'fcfs',
          addedAt: new Date('2024-01-01T10:00:00.000Z')
        }
      ];

      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockDocuments)
        })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await whitelistService.isAddressWhitelisted('0x1234567890123456789012345678901234567890');

      expect(result).toEqual({
        gtd: false,
        fcfs: true
      });
    });

    it('should return true for both GTD and FCFS whitelisted address', async () => {
      const mockDocuments: WhitelistEntry[] = [
        {
          _id: '1' as any,
          address: '0x1234567890123456789012345678901234567890',
          type: 'gtd',
          addedAt: new Date('2024-01-01T10:00:00.000Z')
        },
        {
          _id: '2' as any,
          address: '0x1234567890123456789012345678901234567890',
          type: 'fcfs',
          addedAt: new Date('2024-01-01T10:00:00.000Z')
        }
      ];

      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockDocuments)
        })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await whitelistService.isAddressWhitelisted('0x1234567890123456789012345678901234567890');

      expect(result).toEqual({
        gtd: true,
        fcfs: true
      });
    });

    it('should return false for non-whitelisted address', async () => {
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await whitelistService.isAddressWhitelisted('0x1234567890123456789012345678901234567890');

      expect(result).toEqual({
        gtd: false,
        fcfs: false
      });
    });

    it('should normalize address to lowercase', async () => {
      const mockDocuments: WhitelistEntry[] = [
        {
          _id: '1' as any,
          address: '0x1234567890123456789012345678901234567890',
          type: 'gtd',
          addedAt: new Date('2024-01-01T10:00:00.000Z')
        }
      ];

      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockDocuments)
        })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await whitelistService.isAddressWhitelisted('0x1234567890123456789012345678901234567890');

      expect(mockCollection.find).toHaveBeenCalledWith({ address: '0x1234567890123456789012345678901234567890' });
    });

    it('should handle database errors', async () => {
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await expect(whitelistService.isAddressWhitelisted('0x1234567890123456789012345678901234567890')).rejects.toThrow('Failed to check whitelist status');
    });
  });

  describe('addAddress', () => {
    it('should add GTD address successfully', async () => {
      const mockCollection = {
        insertOne: jest.fn().mockResolvedValue({ insertedId: '1' })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await whitelistService.addAddress('0x1234567890123456789012345678901234567890', 'gtd', 'admin');

      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        type: 'gtd',
        addedAt: expect.any(Date),
        addedBy: 'admin'
      });
    });

    it('should add FCFS address successfully', async () => {
      const mockCollection = {
        insertOne: jest.fn().mockResolvedValue({ insertedId: '1' })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await whitelistService.addAddress('0x1234567890123456789012345678901234567890', 'fcfs');

      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        type: 'fcfs',
        addedAt: expect.any(Date),
        addedBy: undefined
      });
    });

    it('should normalize address to lowercase', async () => {
      const mockCollection = {
        insertOne: jest.fn().mockResolvedValue({ insertedId: '1' })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await whitelistService.addAddress('0x1234567890123456789012345678901234567890', 'gtd');

      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        type: 'gtd',
        addedAt: expect.any(Date),
        addedBy: undefined
      });
    });

    it('should handle database errors', async () => {
      const mockCollection = {
        insertOne: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await expect(whitelistService.addAddress('0x1234567890123456789012345678901234567890', 'gtd')).rejects.toThrow('Failed to add address to whitelist');
    });
  });

  describe('removeAddress', () => {
    it('should remove GTD address successfully', async () => {
      const mockCollection = {
        deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await whitelistService.removeAddress('0x1234567890123456789012345678901234567890', 'gtd');

      expect(mockCollection.deleteMany).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        type: 'gtd'
      });
    });

    it('should remove FCFS address successfully', async () => {
      const mockCollection = {
        deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await whitelistService.removeAddress('0x1234567890123456789012345678901234567890', 'fcfs');

      expect(mockCollection.deleteMany).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        type: 'fcfs'
      });
    });

    it('should normalize address to lowercase', async () => {
      const mockCollection = {
        deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await whitelistService.removeAddress('0x1234567890123456789012345678901234567890', 'gtd');

      expect(mockCollection.deleteMany).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        type: 'gtd'
      });
    });

    it('should handle database errors', async () => {
      const mockCollection = {
        deleteMany: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await expect(whitelistService.removeAddress('0x1234567890123456789012345678901234567890', 'gtd')).rejects.toThrow('Failed to remove address from whitelist');
    });
  });

  describe('bulkImport', () => {
    it('should bulk import GTD addresses successfully', async () => {
      const addresses = [
        '0x1234567890123456789012345678901234567890',
        '0x0987654321098765432109876543210987654321',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      ];

      const mockCollection = {
        insertMany: jest.fn().mockResolvedValue({ insertedIds: ['1', '2', '3'] })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await whitelistService.bulkImport(addresses, 'gtd', 'admin');

      expect(mockCollection.insertMany).toHaveBeenCalledWith([
        {
          address: '0x1234567890123456789012345678901234567890',
          type: 'gtd',
          addedAt: expect.any(Date),
          addedBy: 'admin'
        },
        {
          address: '0x0987654321098765432109876543210987654321',
          type: 'gtd',
          addedAt: expect.any(Date),
          addedBy: 'admin'
        },
        {
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          type: 'gtd',
          addedAt: expect.any(Date),
          addedBy: 'admin'
        }
      ]);
    });

    it('should bulk import FCFS addresses successfully', async () => {
      const addresses = [
        '0x1234567890123456789012345678901234567890',
        '0x0987654321098765432109876543210987654321'
      ];

      const mockCollection = {
        insertMany: jest.fn().mockResolvedValue({ insertedIds: ['1', '2'] })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await whitelistService.bulkImport(addresses, 'fcfs');

      expect(mockCollection.insertMany).toHaveBeenCalledWith([
        {
          address: '0x1234567890123456789012345678901234567890',
          type: 'fcfs',
          addedAt: expect.any(Date),
          addedBy: undefined
        },
        {
          address: '0x0987654321098765432109876543210987654321',
          type: 'fcfs',
          addedAt: expect.any(Date),
          addedBy: undefined
        }
      ]);
    });

    it('should normalize all addresses to lowercase', async () => {
      const addresses = [
        '0x1234567890123456789012345678901234567890',
        '0x0987654321098765432109876543210987654321'
      ];

      const mockCollection = {
        insertMany: jest.fn().mockResolvedValue({ insertedIds: ['1', '2'] })
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await whitelistService.bulkImport(addresses, 'gtd');

      expect(mockCollection.insertMany).toHaveBeenCalledWith([
        {
          address: '0x1234567890123456789012345678901234567890',
          type: 'gtd',
          addedAt: expect.any(Date),
          addedBy: undefined
        },
        {
          address: '0x0987654321098765432109876543210987654321',
          type: 'gtd',
          addedAt: expect.any(Date),
          addedBy: undefined
        }
      ]);
    });

    it('should handle database errors', async () => {
      const addresses = ['0x1234567890123456789012345678901234567890'];

      const mockCollection = {
        insertMany: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await expect(whitelistService.bulkImport(addresses, 'gtd')).rejects.toThrow('Failed to bulk import addresses');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const mockCollection = {
        countDocuments: jest.fn()
          .mockResolvedValueOnce(5) // GTD count
          .mockResolvedValueOnce(3) // FCFS count
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await whitelistService.getStats();

      expect(result).toEqual({
        gtdCount: 5,
        fcfsCount: 3,
        totalCount: 8
      });
      expect(mockCollection.countDocuments).toHaveBeenCalledWith({ type: 'gtd' });
      expect(mockCollection.countDocuments).toHaveBeenCalledWith({ type: 'fcfs' });
    });

    it('should return zero statistics when no addresses exist', async () => {
      const mockCollection = {
        countDocuments: jest.fn()
          .mockResolvedValueOnce(0) // GTD count
          .mockResolvedValueOnce(0) // FCFS count
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const result = await whitelistService.getStats();

      expect(result).toEqual({
        gtdCount: 0,
        fcfsCount: 0,
        totalCount: 0
      });
    });

    it('should handle database errors', async () => {
      const mockCollection = {
        countDocuments: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };

      (whitelistService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      await expect(whitelistService.getStats()).rejects.toThrow('Failed to get whitelist statistics');
    });
  });

  describe('getCollection', () => {
    it('should handle MongoDB connection errors', async () => {
      const mockClient = {
        db: jest.fn().mockReturnValue({
          admin: jest.fn().mockReturnValue({
            ping: jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))
          })
        })
      };

      (whitelistService as any).getCollection = jest.fn().mockImplementation(async () => {
        const client = mockClient;
        await client.db().admin().ping();
        return client.db().collection('whitelist');
      });

      await expect(whitelistService.getAllAddresses()).rejects.toThrow('Failed to fetch whitelist data');
    });

    it('should handle unknown errors', async () => {
      const mockClient = {
        db: jest.fn().mockReturnValue({
          admin: jest.fn().mockReturnValue({
            ping: jest.fn().mockRejectedValue('Unknown error')
          })
        })
      };

      (whitelistService as any).getCollection = jest.fn().mockImplementation(async () => {
        const client = mockClient;
        await client.db().admin().ping();
        return client.db().collection('whitelist');
      });

      await expect(whitelistService.getAllAddresses()).rejects.toThrow('Failed to fetch whitelist data');
    });
  });
});