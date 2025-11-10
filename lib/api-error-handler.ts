import { NextResponse } from 'next/server';
import { ApiErrorResponse } from '@/types/error';

export interface ApiErrorOptions {
  status?: number;
  code?: string;
  message?: string;
}

export function createApiErrorResponse(
  error: unknown,
  options: ApiErrorOptions = {}
): NextResponse<ApiErrorResponse> {
  const {
    status = 500,
    code = 'INTERNAL_SERVER_ERROR',
    message
  } = options;

  let errorMessage = message || 'An unexpected error occurred';

  // Extract error message from different error types
  if (error instanceof Error) {
    errorMessage = error.message || errorMessage;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = String((error as any).message);
  }

  const errorResponse: ApiErrorResponse = {
    error: errorMessage,
    code,
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(errorResponse, { 
    status,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

export function handleApiError(
  error: unknown,
  context: string = 'API operation'
): NextResponse<ApiErrorResponse> {
  console.error(`Error in ${context}:`, error);

  // Handle specific error types
  if (error instanceof Error) {
    // Database connection errors
    if (error.message.includes('MongoDB connection') || error.message.includes('ECONNREFUSED')) {
      return createApiErrorResponse(error, {
        status: 503,
        code: 'DATABASE_CONNECTION_ERROR',
        message: 'Database connection failed'
      });
    }

    // Validation errors
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return createApiErrorResponse(error, {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: error.message
      });
    }

    // Not found errors
    if (error.message.includes('not found') || error.message.includes('does not exist')) {
      return createApiErrorResponse(error, {
        status: 404,
        code: 'NOT_FOUND',
        message: error.message
      });
    }

    // Duplicate/conflict errors
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      return createApiErrorResponse(error, {
        status: 409,
        code: 'CONFLICT',
        message: error.message
      });
    }
  }

  // Default error response
  return createApiErrorResponse(error, {
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: `Failed to complete ${context}`
  });
}

// Wrapper function to handle async API operations
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string = 'API operation'
): Promise<NextResponse<T | ApiErrorResponse>> {
  try {
    const result = await operation();
    return NextResponse.json(result, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    return handleApiError(error, context);
  }
} 