import { MongoClient } from 'mongodb';

// Mock the mongodb module
const mockConnect = jest.fn();
const mockMongoClient = jest.fn(() => ({
  connect: mockConnect
}));

jest.mock('mongodb', () => ({
  MongoClient: mockMongoClient
}));

describe('mongodb-scores', () => {
  const originalEnv = process.env;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
    
    // Reset mock implementations
    mockConnect.mockResolvedValue({});
    
    // Mock console methods to avoid noise
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  describe('environment variable validation', () => {
    it('should throw error when SCORES_MONGODB_URI is not defined', () => {
      delete process.env.SCORES_MONGODB_URI;
      
      // Clear module cache to force re-evaluation
      jest.resetModules();
      
      expect(() => {
        require('@/lib/mongodb-scores');
      }).toThrow('Please add your Scores Mongo URI to .env.local');
    });

    it('should not throw error when SCORES_MONGODB_URI is defined', () => {
      process.env.SCORES_MONGODB_URI = 'mongodb://localhost:27017/test';
      
      // Clear module cache to force re-evaluation
      jest.resetModules();
      
      expect(() => {
        require('@/lib/mongodb-scores');
      }).not.toThrow();
    });
  });

  describe('MongoDB client configuration', () => {
    beforeEach(() => {
      process.env.SCORES_MONGODB_URI = 'mongodb://localhost:27017/test';
      jest.resetModules();
    });

    it('should create MongoClient with correct URI and options', () => {
      require('@/lib/mongodb-scores');
      
      expect(mockMongoClient).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test',
        {
          maxPoolSize: 1,
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          retryWrites: true,
          w: 'majority',
          connectTimeoutMS: 10000,
          heartbeatFrequencyMS: 10000,
        }
      );
    });

    it('should call connect on the MongoClient instance', () => {
      require('@/lib/mongodb-scores');
      
      expect(mockConnect).toHaveBeenCalled();
    });
  });

  describe('development mode behavior', () => {
    beforeEach(() => {
      process.env.SCORES_MONGODB_URI = 'mongodb://localhost:27017/test';
      process.env.NODE_ENV = 'development';
      jest.resetModules();
    });

    it('should use global variable in development mode', () => {
      // Clear any existing global
      (global as any)._scoresMongoClientPromise = undefined;
      
      require('@/lib/mongodb-scores');
      
      expect(mockMongoClient).toHaveBeenCalled();
      expect(mockConnect).toHaveBeenCalled();
      
      // Check that global variable is set
      expect((global as any)._scoresMongoClientPromise).toBeDefined();
    });

    it('should reuse existing global promise in development mode', () => {
      const existingPromise = Promise.resolve({});
      (global as any)._scoresMongoClientPromise = existingPromise;
      
      require('@/lib/mongodb-scores');
      
      // Should not create new client or call connect
      expect(mockMongoClient).not.toHaveBeenCalled();
      expect(mockConnect).not.toHaveBeenCalled();
    });
  });

  describe('production mode behavior', () => {
    beforeEach(() => {
      process.env.SCORES_MONGODB_URI = 'mongodb://localhost:27017/test';
      process.env.NODE_ENV = 'production';
      jest.resetModules();
    });

    it('should not use global variable in production mode', () => {
      // Clear any existing global
      (global as any)._scoresMongoClientPromise = undefined;
      
      require('@/lib/mongodb-scores');
      
      expect(mockMongoClient).toHaveBeenCalled();
      expect(mockConnect).toHaveBeenCalled();
      
      // Check that global variable is not set
      expect((global as any)._scoresMongoClientPromise).toBeUndefined();
    });
  });

  describe('module export', () => {
    beforeEach(() => {
      process.env.SCORES_MONGODB_URI = 'mongodb://localhost:27017/test';
      jest.resetModules();
    });

    it('should export a promise', async () => {
      const clientPromise = require('@/lib/mongodb-scores').default;
      
      expect(clientPromise).toBeInstanceOf(Promise);
      
      const result = await clientPromise;
      expect(result).toBeDefined();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      process.env.SCORES_MONGODB_URI = 'mongodb://localhost:27017/test';
      jest.resetModules();
    });

    it('should handle connection errors gracefully', async () => {
      const connectionError = new Error('Connection failed');
      mockConnect.mockRejectedValue(connectionError);
      
      const clientPromise = require('@/lib/mongodb-scores').default;
      
      await expect(clientPromise).rejects.toThrow('Connection failed');
    });
  });
});
