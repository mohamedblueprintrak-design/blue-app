/**
 * Unit Tests — API Response Utilities
 * اختبارات أدوات استجابة API
 *
 * Tests successResponse, createdResponse, noContentResponse,
 * errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse,
 * serverErrorResponse, validationErrorResponse, conflictResponse, badRequestResponse,
 * handleCorsPreflight, generateRequestId, logApiError, handleApiError
 */

import { describe, it, expect, beforeAll, jest, beforeEach, afterEach } from '@jest/globals';

// Mock the logger — track calls for verification
const mockLogError = jest.fn();
const mockLogWarn = jest.fn();

jest.mock('@/lib/logger', () => ({
  log: {
    warn: mockLogWarn,
    error: mockLogError,
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('next/server', () => {
  class NextResponseMock extends Response {
    static json(body: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string> || {}) },
      });
    }
  }
  return { NextResponse: NextResponseMock };
});

describe('Response — successResponse', () => {
  let successResponse: <T>(data: T, meta?: Record<string, unknown>, requestId?: string) => Response;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/response');
    successResponse = mod.successResponse;
  });

  it('should return a response with success=true and data', async () => {
    const response = successResponse({ name: 'test' });
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ name: 'test' });
    expect(body.timestamp).toBeDefined();
  });

  it('should include meta when provided', async () => {
    const response = successResponse({ name: 'test' }, { page: 1, total: 10 });
    const body = await response.json();
    expect(body.meta).toEqual({ page: 1, total: 10 });
  });

  it('should include requestId when provided', async () => {
    const response = successResponse({ name: 'test' }, undefined, 'req_abc123');
    const body = await response.json();
    expect(body.requestId).toBe('req_abc123');
  });

  it('should not include meta when not provided', async () => {
    const response = successResponse({ name: 'test' });
    const body = await response.json();
    expect(body.meta).toBeUndefined();
  });

  it('should normalize UPPERCASE enum values to lowercase', async () => {
    const response = successResponse({ status: 'ACTIVE', priority: 'HIGH' });
    const body = await response.json();
    expect(body.data.status).toBe('active');
    expect(body.data.priority).toBe('high');
  });

  it('should not normalize role field (intentionally excluded)', async () => {
    const response = successResponse({ role: 'ADMIN' });
    const body = await response.json();
    expect(body.data.role).toBe('ADMIN');
  });

  it('should normalize enums in arrays', async () => {
    const response = successResponse([{ status: 'ACTIVE' }, { status: 'PENDING' }]);
    const body = await response.json();
    expect(body.data[0].status).toBe('active');
    expect(body.data[1].status).toBe('pending');
  });

  it('should normalize enums in nested objects', async () => {
    const response = successResponse({ nested: { status: 'ACTIVE' } });
    const body = await response.json();
    expect(body.data.nested.status).toBe('active');
  });

  it('should not normalize single-character UPPERCASE strings', async () => {
    const response = successResponse({ status: 'A' });
    const body = await response.json();
    expect(body.data.status).toBe('A');
  });
});

describe('Response — createdResponse', () => {
  let createdResponse: <T>(data: T, requestId?: string) => Response;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/response');
    createdResponse = mod.createdResponse;
  });

  it('should return a 201 status response', () => {
    const response = createdResponse({ id: '1', name: 'test' });
    expect(response.status).toBe(201);
  });

  it('should include success=true and data', async () => {
    const response = createdResponse({ id: '1', name: 'test' });
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: '1', name: 'test' });
  });

  it('should include requestId when provided', async () => {
    const response = createdResponse({ id: '1' }, 'req_abc');
    const body = await response.json();
    expect(body.requestId).toBe('req_abc');
  });

  it('should normalize enums', async () => {
    const response = createdResponse({ status: 'ACTIVE' });
    const body = await response.json();
    expect(body.data.status).toBe('active');
  });
});

describe('Response — noContentResponse', () => {
  let noContentResponse: () => Response;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/response');
    noContentResponse = mod.noContentResponse;
  });

  it('should return a 204 status response', () => {
    const response = noContentResponse();
    expect(response.status).toBe(204);
  });
});

describe('Response — errorResponse', () => {
  let errorResponse: (message: string, code?: string, status?: number, requestId?: string) => Response;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/response');
    errorResponse = mod.errorResponse;
  });

  it('should return a 400 status by default', () => {
    const response = errorResponse('Something went wrong');
    expect(response.status).toBe(400);
  });

  it('should include error code and message', async () => {
    const response = errorResponse('Bad input', 'VALIDATION_ERROR');
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Bad input');
  });

  it('should use custom status code', () => {
    const response = errorResponse('Not found', 'NOT_FOUND', 404);
    expect(response.status).toBe(404);
  });

  it('should include requestId when provided', async () => {
    const response = errorResponse('Error', 'ERROR', 400, 'req_123');
    const body = await response.json();
    expect(body.requestId).toBe('req_123');
  });

  it('should include timestamp', async () => {
    const response = errorResponse('Error');
    const body = await response.json();
    expect(body.timestamp).toBeDefined();
  });
});

describe('Response — unauthorizedResponse', () => {
  let unauthorizedResponse: (message?: string, requestId?: string) => Response;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/response');
    unauthorizedResponse = mod.unauthorizedResponse;
  });

  it('should return a 401 status', () => {
    const response = unauthorizedResponse();
    expect(response.status).toBe(401);
  });

  it('should use default Arabic message', async () => {
    const response = unauthorizedResponse();
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('يرجى تسجيل الدخول / Please log in');
  });

  it('should use custom message when provided', async () => {
    const response = unauthorizedResponse('Please log in');
    const body = await response.json();
    expect(body.error.message).toBe('Please log in');
  });

  it('should include requestId', async () => {
    const response = unauthorizedResponse(undefined, 'req_abc');
    const body = await response.json();
    expect(body.requestId).toBe('req_abc');
  });
});

describe('Response — forbiddenResponse', () => {
  let forbiddenResponse: (message?: string, requestId?: string) => Response;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/response');
    forbiddenResponse = mod.forbiddenResponse;
  });

  it('should return a 403 status', () => {
    const response = forbiddenResponse();
    expect(response.status).toBe(403);
  });

  it('should use default Arabic message', async () => {
    const response = forbiddenResponse();
    const body = await response.json();
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toBe('غير مصرح لك بالوصول / Access denied');
  });

  it('should use custom message', async () => {
    const response = forbiddenResponse('Access denied');
    const body = await response.json();
    expect(body.error.message).toBe('Access denied');
  });
});

describe('Response — notFoundResponse', () => {
  let notFoundResponse: (message?: string, requestId?: string) => Response;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/response');
    notFoundResponse = mod.notFoundResponse;
  });

  it('should return a 404 status', () => {
    const response = notFoundResponse();
    expect(response.status).toBe(404);
  });

  it('should use default Arabic message', async () => {
    const response = notFoundResponse();
    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('غير موجود / Not found');
  });
});

describe('Response — serverErrorResponse', () => {
  let serverErrorResponse: (message?: string, requestId?: string) => Response;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/response');
    serverErrorResponse = mod.serverErrorResponse;
  });

  it('should return a 500 status', () => {
    const response = serverErrorResponse();
    expect(response.status).toBe(500);
  });

  it('should use default Arabic message', async () => {
    const response = serverErrorResponse();
    const body = await response.json();
    expect(body.error.code).toBe('SERVER_ERROR');
    expect(body.error.message).toBe('خطأ في الخادم / Server error');
  });
});

describe('Response — validationErrorResponse', () => {
  let validationErrorResponse: (message: string, field?: string, requestId?: string) => Response;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/response');
    validationErrorResponse = mod.validationErrorResponse;
  });

  it('should return a 400 status', () => {
    const response = validationErrorResponse('Invalid input');
    expect(response.status).toBe(400);
  });

  it('should include VALIDATION_ERROR code', async () => {
    const response = validationErrorResponse('Invalid email');
    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Invalid email');
  });

  it('should include field when provided', async () => {
    const response = validationErrorResponse('Required', 'email');
    const body = await response.json();
    expect(body.error.field).toBe('email');
  });

  it('should not include field when not provided', async () => {
    const response = validationErrorResponse('Required');
    const body = await response.json();
    expect(body.error.field).toBeUndefined();
  });

  it('should include requestId when provided', async () => {
    const response = validationErrorResponse('Required', undefined, 'req_123');
    const body = await response.json();
    expect(body.requestId).toBe('req_123');
  });
});

describe('Response — conflictResponse', () => {
  let conflictResponse: (message: string, requestId?: string) => Response;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/response');
    conflictResponse = mod.conflictResponse;
  });

  it('should return a 409 status', () => {
    const response = conflictResponse('Duplicate');
    expect(response.status).toBe(409);
  });

  it('should include CONFLICT code', async () => {
    const response = conflictResponse('Duplicate');
    const body = await response.json();
    expect(body.error.code).toBe('CONFLICT');
  });
});

describe('Response — badRequestResponse', () => {
  let badRequestResponse: (message: string, requestId?: string) => Response;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/response');
    badRequestResponse = mod.badRequestResponse;
  });

  it('should return a 400 status', () => {
    const response = badRequestResponse('Bad request');
    expect(response.status).toBe(400);
  });

  it('should include BAD_REQUEST code', async () => {
    const response = badRequestResponse('Bad request');
    const body = await response.json();
    expect(body.error.code).toBe('BAD_REQUEST');
  });
});

describe('Response — handleCorsPreflight', () => {
  let handleCorsPreflight: () => Response;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/response');
    handleCorsPreflight = mod.handleCorsPreflight;
  });

  it('should return a 204 No Content response', () => {
    const response = handleCorsPreflight();
    expect(response.status).toBe(204);
  });

  it('should include CORS headers', () => {
    const response = handleCorsPreflight();
    const allowMethods = response.headers.get('Access-Control-Allow-Methods');
    expect(allowMethods).toBeDefined();
  });
});

describe('Response — generateRequestId', () => {
  let generateRequestId: () => string;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/response');
    generateRequestId = mod.generateRequestId;
  });

  it('should return a string starting with req_', () => {
    const id = generateRequestId();
    expect(id).toMatch(/^req_/);
  });

  it('should generate unique IDs', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    expect(id1).not.toBe(id2);
  });
});

describe('Response — logApiError', () => {
  let logApiError: (context: string, error: unknown) => void;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/response');
    logApiError = mod.logApiError;
  });

  beforeEach(() => {
    mockLogError.mockClear();
  });

  it('should call log.error with context and Error object', () => {
    const error = new Error('test error');
    logApiError('TestContext', error);
    expect(mockLogError).toHaveBeenCalledWith(
      '[API Error] TestContext',
      expect.objectContaining({ error: expect.objectContaining({ message: 'test error' }) })
    );
  });

  it('should handle non-Error objects', () => {
    logApiError('TestContext', 'string error');
    expect(mockLogError).toHaveBeenCalledWith(
      '[API Error] TestContext',
      expect.objectContaining({ error: { error: 'string error' } })
    );
  });
});

describe('Response — handleApiError', () => {
  let handleApiError: (message: string, error: unknown, code?: string, status?: number, requestId?: string) => Response;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/response');
    handleApiError = mod.handleApiError;
  });

  beforeEach(() => {
    mockLogError.mockClear();
  });

  it('should log the error and return an error response', async () => {
    const error = new Error('test error');
    const response = handleApiError('Something failed', error);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.message).toBe('Something failed');
    expect(body.error.code).toBe('SERVER_ERROR');
  });

  it('should use custom code and status', async () => {
    const response = handleApiError('Not found', new Error('x'), 'NOT_FOUND', 404);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should include requestId', async () => {
    const response = handleApiError('Error', new Error('x'), 'ERROR', 500, 'req_abc');
    const body = await response.json();
    expect(body.requestId).toBe('req_abc');
  });

  it('should log error with stack trace for Error objects', () => {
    const error = new Error('stack test');
    handleApiError('Test', error);
    expect(mockLogError).toHaveBeenCalledWith(
      'Test',
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'stack test',
          stack: expect.any(String),
        }),
      })
    );
  });

  it('should handle non-Error error objects', () => {
    handleApiError('Test', 'string error');
    expect(mockLogError).toHaveBeenCalledWith(
      'Test',
      expect.objectContaining({ error: { error: 'string error' } })
    );
  });
});

describe('Response — CORS headers', () => {
  let successResponse: <T>(data: T) => Response;

  const originalEnv = process.env;

  beforeEach(() => {
    process.env.CORS_ORIGINS = 'https://app.example.com,https://admin.example.com';
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    delete process.env.CORS_DEV_ORIGIN;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/response');
    successResponse = mod.successResponse;
  });

  it('should include Access-Control-Allow-Methods header', () => {
    const response = successResponse({ ok: true });
    expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
  });

  it('should include Access-Control-Allow-Headers header', () => {
    const response = successResponse({ ok: true });
    expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
  });
});
