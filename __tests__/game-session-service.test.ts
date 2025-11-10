import { gameSessionService } from '../lib/game-session-service';
import { ScoreEntry } from '../types/score';

// Mock the MongoDB scores connection
jest.mock('../lib/mongodb-scores', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    db: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        findOneAndUpdate: jest.fn(),
        insertOne: jest.fn(),
        countDocuments: jest.fn()
      })
    })
  })
}));

// Mock the getCollection method
const mockCollection = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  insertOne: jest.fn(),
  countDocuments: jest.fn()
};

// Mock the getCollection method on the gameSessionService instance
(gameSessionService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

describe('GameSessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure the mock is properly set up after clearing
    (gameSessionService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);
  });

  const mockScoreEntry: ScoreEntry = {
    address: '0x1234567890123456789012345678901234567890',
    score: 300,
    gameStartTime: new Date('2024-01-01T10:00:00.000Z'),
    clientStartTime: '2024-01-01T10:00:00.000Z',
    lastUpdate: new Date('2024-01-01T10:05:00.000Z'),
    gameEndTime: new Date('2024-01-01T10:05:00.000Z'),
    clientEndTime: '2024-01-01T10:05:00.000Z',
    validationResult: 'VALID',
    rejectionReason: undefined,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  describe('createSession', () => {
    it('should create a new game session successfully', async () => {
      mockCollection.findOne.mockResolvedValue(null); // No existing score
      mockCollection.insertOne.mockResolvedValue({ insertedId: '1' });

      const requestInfo = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        clientTimestamp: '2024-01-01T10:00:00.000Z'
      };

      const result = await gameSessionService.createSession('0x1234567890123456789012345678901234567890', requestInfo);

      expect(result).toEqual({
        startTime: expect.any(Date)
      });
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

    it('should update existing session without score', async () => {
      const existingSession = {
        address: '0x1234567890123456789012345678901234567890',
        score: undefined,
        lastUpdate: new Date('2024-01-01T09:00:00.000Z')
      };

      mockCollection.findOne.mockResolvedValue(existingSession);
      mockCollection.findOneAndUpdate.mockResolvedValue({
        value: {
          ...existingSession,
          lastUpdate: expect.any(Date),
          gameStartTime: expect.any(Date)
        }
      });

      const requestInfo = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        clientTimestamp: '2024-01-01T10:00:00.000Z'
      };

      const result = await gameSessionService.createSession('0x1234567890123456789012345678901234567890', requestInfo);

      expect(result).toEqual({
        startTime: expect.any(Date)
      });
      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { address: '0x1234567890123456789012345678901234567890' },
        {
          $set: {
            lastUpdate: expect.any(Date),
            gameStartTime: expect.any(Date),
            clientStartTime: '2024-01-01T10:00:00.000Z',
            gameEndTime: undefined,
            clientEndTime: undefined,
            validationResult: undefined,
            rejectionReason: undefined,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        },
        { returnDocument: 'after' }
      );
    });

    it('should reject when address already has a completed score', async () => {
      const existingScore = {
        address: '0x1234567890123456789012345678901234567890',
        score: 300,
        lastUpdate: new Date('2024-01-01T09:00:00.000Z')
      };

      mockCollection.findOne.mockResolvedValue(existingScore);

      const requestInfo = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        clientTimestamp: '2024-01-01T10:00:00.000Z'
      };

      await expect(gameSessionService.createSession('0x1234567890123456789012345678901234567890', requestInfo))
        .rejects.toThrow('Address 0x1234567890123456789012345678901234567890 already has a completed game session');
    });

    it('should handle missing request info', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockResolvedValue({ insertedId: '1' });

      const result = await gameSessionService.createSession('0x1234567890123456789012345678901234567890');

      expect(result).toEqual({
        startTime: expect.any(Date)
      });
      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        score: undefined,
        lastUpdate: expect.any(Date),
        gameStartTime: expect.any(Date),
        clientStartTime: '',
        gameEndTime: undefined,
        clientEndTime: undefined,
        validationResult: undefined,
        rejectionReason: undefined,
        ipAddress: undefined,
        userAgent: undefined
      });
    });

    it('should handle database errors during insert', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockRejectedValue(new Error('Database connection failed'));

      await expect(gameSessionService.createSession('0x1234567890123456789012345678901234567890'))
        .rejects.toThrow('Failed to create game session: Database connection failed');
    });

    it('should handle database errors during update', async () => {
      const existingSession = {
        address: '0x1234567890123456789012345678901234567890',
        score: undefined,
        lastUpdate: new Date('2024-01-01T09:00:00.000Z')
      };

      mockCollection.findOne.mockResolvedValue(existingSession);
      mockCollection.findOneAndUpdate.mockRejectedValue(new Error('Database connection failed'));

      await expect(gameSessionService.createSession('0x1234567890123456789012345678901234567890'))
        .rejects.toThrow('Failed to create game session: Database connection failed');
    });
  });

  describe('getSession', () => {
    it('should return session when it exists', async () => {
      mockCollection.findOne.mockResolvedValue(mockScoreEntry);

      const result = await gameSessionService.getSession('0x1234567890123456789012345678901234567890');

      expect(result).toEqual(mockScoreEntry);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ address: '0x1234567890123456789012345678901234567890' });
    });

    it('should return null when session does not exist', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await gameSessionService.getSession('0x1234567890123456789012345678901234567890');

      expect(result).toBeNull();
    });

    it('should normalize address to lowercase', async () => {
      mockCollection.findOne.mockResolvedValue(mockScoreEntry);

      await gameSessionService.getSession('0x1234567890123456789012345678901234567890');

      expect(mockCollection.findOne).toHaveBeenCalledWith({ address: '0x1234567890123456789012345678901234567890' });
    });
  });

  describe('updateSession', () => {
    it('should update session with score successfully', async () => {
      const updatedSession = { ...mockScoreEntry, score: 400 };
      mockCollection.findOneAndUpdate.mockResolvedValue({
        value: updatedSession
      });

      const requestInfo = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      const result = await gameSessionService.updateSession(
        '0x1234567890123456789012345678901234567890',
        400,
        new Date('2024-01-01T10:05:00.000Z'),
        '2024-01-01T10:05:00.000Z',
        requestInfo
      );

      expect(result).toEqual({ value: updatedSession });
      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { address: '0x1234567890123456789012345678901234567890' },
        {
          $set: {
            score: 400,
            gameEndTime: new Date('2024-01-01T10:05:00.000Z'),
            clientEndTime: '2024-01-01T10:05:00.000Z',
            lastUpdate: expect.any(Date)
          }
        },
        { returnDocument: 'after' }
      );
    });

    it('should update session without request info', async () => {
      const updatedSession = { ...mockScoreEntry, score: 400 };
      mockCollection.findOneAndUpdate.mockResolvedValue({
        value: updatedSession
      });

      const result = await gameSessionService.updateSession(
        '0x1234567890123456789012345678901234567890',
        400,
        new Date('2024-01-01T10:05:00.000Z')
      );

      expect(result).toEqual({ value: updatedSession });
      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { address: '0x1234567890123456789012345678901234567890' },
        {
          $set: {
            score: 400,
            gameEndTime: new Date('2024-01-01T10:05:00.000Z'),
            clientEndTime: undefined,
            lastUpdate: expect.any(Date)
          }
        },
        { returnDocument: 'after' }
      );
    });

    it('should handle database errors', async () => {
      mockCollection.findOneAndUpdate.mockRejectedValue(new Error('Database connection failed'));

      await expect(gameSessionService.updateSession(
        '0x1234567890123456789012345678901234567890',
        400,
        new Date('2024-01-01T10:05:00.000Z')
      )).rejects.toThrow('Failed to update game session: Database connection failed');
    });

    it('should handle update failure', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValue(null);

      await expect(gameSessionService.updateSession(
        '0x1234567890123456789012345678901234567890',
        400,
        new Date('2024-01-01T10:05:00.000Z')
      )).rejects.toThrow('Failed to update game session for address 0x1234567890123456789012345678901234567890');
    });
  });

  describe('saveSessionWithValidation', () => {
    it('should save validation result successfully', async () => {
      const updatedSession = { ...mockScoreEntry, validationResult: 'VALID' };
      mockCollection.findOneAndUpdate.mockResolvedValue({
        value: updatedSession
      });

      const result = await gameSessionService.saveSessionWithValidation(
        '0x1234567890123456789012345678901234567890',
        'VALID',
        undefined
      );

      expect(result).toEqual({ value: updatedSession });
      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { address: '0x1234567890123456789012345678901234567890' },
        {
          $set: {
            validationResult: 'VALID',
            rejectionReason: undefined,
            lastUpdate: expect.any(Date)
          }
        },
        { returnDocument: 'after' }
      );
    });

    it('should save validation result with rejection reason', async () => {
      const updatedSession = { ...mockScoreEntry, validationResult: 'INVALID', rejectionReason: 'impossible score' };
      mockCollection.findOneAndUpdate.mockResolvedValue({
        value: updatedSession
      });

      const result = await gameSessionService.saveSessionWithValidation(
        '0x1234567890123456789012345678901234567890',
        'INVALID',
        'impossible score'
      );

      expect(result).toEqual({ value: updatedSession });
      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { address: '0x1234567890123456789012345678901234567890' },
        {
          $set: {
            validationResult: 'INVALID',
            rejectionReason: 'impossible score',
            lastUpdate: expect.any(Date)
          }
        },
        { returnDocument: 'after' }
      );
    });

    it('should handle database errors', async () => {
      mockCollection.findOneAndUpdate.mockRejectedValue(new Error('Database connection failed'));

      await expect(gameSessionService.saveSessionWithValidation(
        '0x1234567890123456789012345678901234567890',
        'VALID'
      )).rejects.toThrow('Failed to save validation result: Database connection failed');
    });

    it('should handle save failure', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValue(null);

      await expect(gameSessionService.saveSessionWithValidation(
        '0x1234567890123456789012345678901234567890',
        'VALID'
      )).rejects.toThrow('Failed to save validation result for address 0x1234567890123456789012345678901234567890');
    });
  });

  describe('getSessionStats', () => {
    it('should return correct session statistics', async () => {
      mockCollection.countDocuments
        .mockResolvedValueOnce(10) // Total count
        .mockResolvedValueOnce(7)  // Valid count
        .mockResolvedValueOnce(3); // Invalid count

      const result = await gameSessionService.getSessionStats();

      expect(result).toEqual({
        total: 10,
        completed: 7,
        invalid: 3
      });
      expect(mockCollection.countDocuments).toHaveBeenCalledWith({});
      expect(mockCollection.countDocuments).toHaveBeenCalledWith({ validationResult: 'VALID' });
      expect(mockCollection.countDocuments).toHaveBeenCalledWith({ validationResult: 'INVALID' });
    });

    it('should return zero statistics when no sessions exist', async () => {
      mockCollection.countDocuments
        .mockResolvedValueOnce(0) // Total count
        .mockResolvedValueOnce(0) // Valid count
        .mockResolvedValueOnce(0); // Invalid count

      const result = await gameSessionService.getSessionStats();

      expect(result).toEqual({
        total: 0,
        completed: 0,
        invalid: 0
      });
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

      (gameSessionService as any).getCollection = jest.fn().mockImplementation(async () => {
        const client = mockClient;
        await client.db().admin().ping();
        return client.db().collection('scores');
      });

      await expect(gameSessionService.createSession('0x1234567890123456789012345678901234567890')).rejects.toThrow('Failed to create game session: ECONNREFUSED');
    });

    it('should handle host not found errors', async () => {
      const mockClient = {
        db: jest.fn().mockReturnValue({
          admin: jest.fn().mockReturnValue({
            ping: jest.fn().mockRejectedValue(new Error('ENOTFOUND'))
          })
        })
      };

      (gameSessionService as any).getCollection = jest.fn().mockImplementation(async () => {
        const client = mockClient;
        await client.db().admin().ping();
        return client.db().collection('scores');
      });

      await expect(gameSessionService.createSession('0x1234567890123456789012345678901234567890')).rejects.toThrow('Failed to create game session: ENOTFOUND');
    });

    it('should handle authentication errors', async () => {
      const mockClient = {
        db: jest.fn().mockReturnValue({
          admin: jest.fn().mockReturnValue({
            ping: jest.fn().mockRejectedValue(new Error('authentication failed'))
          })
        })
      };

      (gameSessionService as any).getCollection = jest.fn().mockImplementation(async () => {
        const client = mockClient;
        await client.db().admin().ping();
        return client.db().collection('scores');
      });

      await expect(gameSessionService.createSession('0x1234567890123456789012345678901234567890')).rejects.toThrow('Failed to create game session: authentication failed');
    });

    it('should handle timeout errors', async () => {
      const mockClient = {
        db: jest.fn().mockReturnValue({
          admin: jest.fn().mockReturnValue({
            ping: jest.fn().mockRejectedValue(new Error('timeout'))
          })
        })
      };

      (gameSessionService as any).getCollection = jest.fn().mockImplementation(async () => {
        const client = mockClient;
        await client.db().admin().ping();
        return client.db().collection('scores');
      });

      await expect(gameSessionService.createSession('0x1234567890123456789012345678901234567890')).rejects.toThrow('Failed to create game session: timeout');
    });

    it('should handle unknown errors', async () => {
      const mockClient = {
        db: jest.fn().mockReturnValue({
          admin: jest.fn().mockReturnValue({
            ping: jest.fn().mockRejectedValue('Unknown error')
          })
        })
      };

      (gameSessionService as any).getCollection = jest.fn().mockImplementation(async () => {
        const client = mockClient;
        await client.db().admin().ping();
        return client.db().collection('scores');
      });

      await expect(gameSessionService.createSession('0x1234567890123456789012345678901234567890')).rejects.toThrow('Failed to create game session: Unknown error');
    });
  });
});
