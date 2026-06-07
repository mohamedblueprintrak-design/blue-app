/**
 * Unit Tests — API Error Handling
 * اختبارات معالجة أخطاء API
 */

import { describe, it, expect } from '@jest/globals';

// ═══════════════════════════════════════════════════════════════════════
// API Error Classes (matching src/lib/api-error.ts patterns)
// ═══════════════════════════════════════════════════════════════════════

class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class ValidationError extends AppError {
  constructor(message: string, public details?: unknown[]) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT');
    this.name = 'RateLimitError';
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Error Response Builder
// ═══════════════════════════════════════════════════════════════════════

function buildErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error instanceof ValidationError && { details: error.details }),
      },
      statusCode: error.statusCode,
    };
  }
  // Unknown errors — don't leak internals
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
    statusCode: 500,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

describe('API Errors — Error Classes', () => {
  it('ValidationError should have 400 status', () => {
    const err = new ValidationError('Invalid input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.isOperational).toBe(true);
  });

  it('ValidationError should include details', () => {
    const details = [{ field: 'email', message: 'Invalid email' }];
    const err = new ValidationError('Invalid input', details);
    expect(err.details).toEqual(details);
  });

  it('UnauthorizedError should have 401 status', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('UnauthorizedError should accept custom message', () => {
    const err = new UnauthorizedError('Token expired');
    expect(err.message).toBe('Token expired');
  });

  it('ForbiddenError should have 403 status', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('NotFoundError should have 404 status', () => {
    const err = new NotFoundError('Project');
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('Project');
  });

  it('RateLimitError should have 429 status', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT');
  });

  it('All errors should extend AppError', () => {
    expect(new ValidationError('test')).toBeInstanceOf(AppError);
    expect(new UnauthorizedError()).toBeInstanceOf(AppError);
    expect(new ForbiddenError()).toBeInstanceOf(AppError);
    expect(new NotFoundError()).toBeInstanceOf(AppError);
    expect(new RateLimitError()).toBeInstanceOf(AppError);
  });
});

describe('API Errors — Response Builder', () => {
  it('should format AppError correctly', () => {
    const err = new ValidationError('Invalid email', [
      { field: 'email', message: 'Invalid format' },
    ]);
    const response = buildErrorResponse(err);

    expect(response.success).toBe(false);
    expect(response.statusCode).toBe(400);
    expect(response.error.code).toBe('VALIDATION_ERROR');
    expect(response.error.message).toBe('Invalid email');
  });

  it('should not leak internal error details for unknown errors', () => {
    const err = new Error('Database connection string: postgres://admin:pass@host');
    const response = buildErrorResponse(err);

    expect(response.success).toBe(false);
    expect(response.statusCode).toBe(500);
    expect(response.error.message).toBe('An unexpected error occurred');
    expect(response.error.message).not.toContain('postgres');
    expect(response.error.message).not.toContain('password');
  });

  it('should handle null/undefined errors gracefully', () => {
    expect(buildErrorResponse(null).statusCode).toBe(500);
    expect(buildErrorResponse(undefined).statusCode).toBe(500);
  });
});

describe('API Errors — Error Hierarchy', () => {
  it('operational errors should be distinguishable from programming errors', () => {
    const opErr = new ValidationError('Bad input');
    const progErr = new AppError('Oops', 500, 'BUG', false);

    expect(opErr.isOperational).toBe(true);
    expect(progErr.isOperational).toBe(false);
  });

  it('should correctly identify error types for logging', () => {
    const errors = [
      new ValidationError('test'),
      new UnauthorizedError(),
      new ForbiddenError(),
      new NotFoundError(),
      new RateLimitError(),
    ];

    for (const err of errors) {
      expect(err.isOperational).toBe(true);
      expect(err.statusCode).toBeGreaterThanOrEqual(400);
      expect(err.statusCode).toBeLessThan(500);
    }
  });
});
