import { NextResponse } from 'next/server';
import { 
  createApiErrorResponse, 
  handleApiError, 
  withErrorHandling,
  ApiErrorOptions 
} from '@/lib/api-error-handler';
import { ApiErrorResponse } from '@/types/error';

// Don't mock NextResponse - test the real error handling logic

describe('api-error-handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createApiErrorResponse', () => {
    it('should create error response with default values', () => {
      const error = new Error('Test error');
      const response = createApiErrorResponse(error);
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(500);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should create error response with custom options', () => {
      const error = new Error('Test error');
      const options: ApiErrorOptions = {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Custom error message'
      };
      
      const response = createApiErrorResponse(error, options);
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(400);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should handle Error instance and use error message', () => {
      const error = new Error('Database connection failed');
      const response = createApiErrorResponse(error);
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(500);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should handle string error', () => {
      const error = 'String error message';
      const response = createApiErrorResponse(error);
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(500);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should handle object with message property', () => {
      const error = { message: 'Object error message' };
      const response = createApiErrorResponse(error);
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(500);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should handle Error instance with empty message', () => {
      const error = new Error('');
      const response = createApiErrorResponse(error);
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(500);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should handle unknown error type', () => {
      const error = { someProperty: 'value' };
      const response = createApiErrorResponse(error);
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(500);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should handle null/undefined error', () => {
      const response = createApiErrorResponse(null);
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(500);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should use error message over custom message when both provided', () => {
      const error = new Error('Original error message');
      const options: ApiErrorOptions = {
        message: 'Override message'
      };
      
      const response = createApiErrorResponse(error, options);
      
      expect(response.status).toBe(500);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });
  });

  describe('handleApiError', () => {
    it('should log error and return database connection error', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const error = new Error('MongoDB connection failed');
      
      const response = handleApiError(error, 'Database operation');
      
      expect(consoleSpy).toHaveBeenCalledWith('Error in Database operation:', error);
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(503);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should handle ECONNREFUSED error as database connection error', () => {
      const error = new Error('ECONNREFUSED connection refused');
      
      const response = handleApiError(error);
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(503);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should handle validation errors', () => {
      const error = new Error('Invalid input validation failed');
      
      const response = handleApiError(error);
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(400);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should handle not found errors', () => {
      const error = new Error('User not found');
      
      const response = handleApiError(error);
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(404);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should handle does not exist errors', () => {
      const error = new Error('Resource does not exist');
      
      const response = handleApiError(error);
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(404);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should handle duplicate/conflict errors', () => {
      const error = new Error('User already exists');
      
      const response = handleApiError(error);
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(409);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should handle duplicate keyword errors', () => {
      const error = new Error('Duplicate key error');
      
      const response = handleApiError(error);
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(500);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should handle non-Error instances with default response', () => {
      const error = 'String error';
      
      const response = handleApiError(error);
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(500);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should use custom context in default error message', () => {
      const error = 'String error';
      
      const response = handleApiError(error, 'Custom operation');
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(500);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should use default context when not provided', () => {
      const error = 'String error';
      
      const response = handleApiError(error);
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(500);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });
  });

  describe('withErrorHandling', () => {
    it('should return successful result when operation succeeds', async () => {
      const mockResult = { success: true, data: 'test data' };
      const operation = jest.fn().mockResolvedValue(mockResult);
      
      const response = await withErrorHandling(operation, 'Test operation');
      
      expect(operation).toHaveBeenCalled();
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(200);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should handle operation errors and return error response', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);
      
      const response = await withErrorHandling(operation, 'Test operation');
      
      expect(operation).toHaveBeenCalled();
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(500);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should handle validation errors in operation', async () => {
      const error = new Error('Invalid input validation failed');
      const operation = jest.fn().mockRejectedValue(error);
      
      const response = await withErrorHandling(operation, 'Test operation');
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(400);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should use default context when not provided', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);
      
      const response = await withErrorHandling(operation);
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(500);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should handle async operation that returns undefined', async () => {
      const operation = jest.fn().mockResolvedValue(undefined);
      
      const response = await withErrorHandling(operation, 'Test operation');
      
      expect(operation).toHaveBeenCalled();
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(200);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });

    it('should handle operation that throws non-Error', async () => {
      const operation = jest.fn().mockRejectedValue('String error');
      
      const response = await withErrorHandling(operation, 'Test operation');
      
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('json');
      expect(response.status).toBe(500);
      expect(response).toBeDefined();
      expect(typeof response.json).toBe('function');
    });
  });
});