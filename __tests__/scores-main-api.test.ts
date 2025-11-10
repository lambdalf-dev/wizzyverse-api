import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/scores/route';
import { scoreService } from '@/lib/score-service';

// Mock only external dependencies, not the core scoreService
jest.mock('@/lib/mongodb-scores', () => ({
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

describe('/scores API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /scores', () => {
    it('should return deprecated endpoint error', async () => {
      const request = new NextRequest('http://localhost:3000/scores', {
        method: 'POST',
        body: JSON.stringify({ score: 100 })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(410);
      expect(data).toEqual({
        error: 'Direct score submission is deprecated. Please use the proper game session flow: POST /scores/start to begin a game, then POST /scores/end to submit your score with validation.',
        code: 'DEPRECATED_ENDPOINT',
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /scores', () => {
    it('should return all scores and stats successfully', async () => {
      const mockScores = [
        { address: '0x123...', score: 100, validationResult: 'VALID' },
        { address: '0x456...', score: 200, validationResult: 'VALID' }
      ];
      const mockStats = {
        totalScores: 2,
        averageScore: 150,
        highestScore: 200,
        lowestScore: 100
      };

      // Mock the database collections for both getAllScores and getStats
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockScores)
        }),
        countDocuments: jest.fn().mockResolvedValue(2),
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([{
            averageScore: 150,
            highestScore: 200,
            lowestScore: 100
          }])
        })
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = new NextRequest('http://localhost:3000/scores');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: mockScores,
        stats: mockStats,
        timestamp: expect.any(String),
        note: 'Use POST /scores/start to begin a game session, then POST /scores/end to submit scores with full validation.'
      });
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error for getAllScores
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        })
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = new NextRequest('http://localhost:3000/scores');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Failed to fetch scores',
        code: 'DATABASE_ERROR',
        timestamp: expect.any(String)
      });
    });

    it('should handle getAllScores errors', async () => {
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockRejectedValue(new Error('Failed to get scores'))
        }),
        countDocuments: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = new NextRequest('http://localhost:3000/scores');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Failed to fetch scores',
        code: 'DATABASE_ERROR',
        timestamp: expect.any(String)
      });
    });

    it('should handle getStats errors', async () => {
      const mockScores = [{ address: '0x123...', score: 100 }];
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockScores)
        }),
        countDocuments: jest.fn().mockRejectedValue(new Error('Failed to get stats'))
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = new NextRequest('http://localhost:3000/scores');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Failed to fetch scores',
        code: 'DATABASE_ERROR',
        timestamp: expect.any(String)
      });
    });

    it('should handle empty scores array', async () => {
      const mockScores: any[] = [];
      const mockStats = {
        totalScores: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0
      };

      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockScores)
        }),
        countDocuments: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = new NextRequest('http://localhost:3000/scores');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: [],
        stats: mockStats,
        timestamp: expect.any(String),
        note: 'Use POST /scores/start to begin a game session, then POST /scores/end to submit scores with full validation.'
      });
    });

    it('should handle non-Error exceptions', async () => {
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockRejectedValue('String error')
        })
      };

      (scoreService as any).getCollection = jest.fn().mockResolvedValue(mockCollection);

      const request = new NextRequest('http://localhost:3000/scores');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Failed to fetch scores',
        code: 'DATABASE_ERROR',
        timestamp: expect.any(String)
      });
    });
  });
});