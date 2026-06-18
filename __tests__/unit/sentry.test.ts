import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import {
  captureError,
  captureApiError,
  captureDatabaseError,
  startSpan,
  beforeSend,
  setSentryForTesting,
  resetSentryForTesting,
} from '@/lib/monitoring/sentry';
import { log } from '@/lib/logger';

// Mock logger error method using spyOn
const mockLogError = jest.fn();
const mockInit = jest.fn();
const mockWithScope = jest.fn((cb: any) => {
  const scope = {
    setUser: jest.fn(),
    setTag: jest.fn(),
    setExtra: jest.fn(),
  };
  cb(scope);
  return scope;
});
const mockCaptureException = jest.fn();
const mockStartSpan = jest.fn((options: any, callback: any) => callback());

describe('Sentry Monitoring Service', () => {
  let logErrorSpy: any;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSentryForTesting();
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.SENTRY_DSN;
    delete process.env.NODE_ENV;
    delete process.env.SENTRY_ENABLE_DEV;
    delete process.env.NEXT_PUBLIC_APP_VERSION;

    // Spy on logger directly to intercept cached instance log calls
    logErrorSpy = jest.spyOn(log, 'error').mockImplementation(mockLogError);
  });

  afterEach(() => {
    logErrorSpy.mockRestore();
  });

  it('should fallback gracefully to console logs when Sentry is not configured', () => {
    // Inject null Sentry instance to simulate uninstalled/unconfigured state
    setSentryForTesting(null);

    const error = new Error('Test console fallback error');
    captureError(error);
    expect(mockLogError).toHaveBeenCalledWith('Error (Sentry not configured):', error);

    captureApiError(error, { method: 'GET', path: '/api/test-route' });
    expect(mockLogError).toHaveBeenCalledTimes(2);

    captureDatabaseError(error, { model: 'TestModel', operation: 'findUnique' });
    expect(mockLogError).toHaveBeenCalledTimes(3);

    const callback = jest.fn(() => 'fallback-result');
    const result = startSpan({ name: 'test-span', op: 'test-op' }, callback);
    expect(callback).toHaveBeenCalled();
    expect(result).toBe('fallback-result');
  });

  it('should configure and use Sentry properly when Sentry is active', () => {
    // Inject mocked Sentry
    const mockSentry = {
      init: mockInit,
      withScope: mockWithScope,
      captureException: mockCaptureException,
      startSpan: mockStartSpan,
    };
    setSentryForTesting(mockSentry);

    const error = new Error('Mock Sentry error');
    captureError(error, {
      user: { id: 'u456', email: 'user@test.com', role: 'editor' },
      tags: { custom_tag: 'test' },
      extra: { detail: 'extra info' },
    });

    // Test capture functions
    expect(mockWithScope).toHaveBeenCalled();
    expect(mockCaptureException).toHaveBeenCalledWith(error);

    captureApiError(error, { method: 'POST', path: '/api/submit-data', params: { query: 'test' } });
    expect(mockWithScope).toHaveBeenCalledTimes(2);

    captureDatabaseError(error, { model: 'Post', operation: 'updateMany', query: 'UPDATE Post SET ...' });
    expect(mockWithScope).toHaveBeenCalledTimes(3);

    const callback = jest.fn(() => 'value');
    const result = startSpan({ name: 'span', op: 'op' }, callback);
    expect(mockStartSpan).toHaveBeenCalled();
    expect(result).toBe('value');
  });

  it('should filter sensitive headers and body fields in beforeSend', () => {
    process.env.NODE_ENV = 'production';
    const mockEvent = {
      request: {
        headers: {
          authorization: 'Bearer secret-token',
          cookie: 'session=xyz',
          'x-csrf-token': 'token-csrf',
          'x-api-key': 'secret-api-key',
          host: 'localhost',
        },
        data: {
          username: 'admin',
          password: 'supersecretpassword',
        },
      },
    };

    const processedEvent = beforeSend(mockEvent);
    expect(processedEvent.request.headers.authorization).toBeUndefined();
    expect(processedEvent.request.headers.cookie).toBeUndefined();
    expect(processedEvent.request.headers['x-csrf-token']).toBeUndefined();
    expect(processedEvent.request.headers['x-api-key']).toBeUndefined();
    expect(processedEvent.request.headers.host).toBe('localhost');
    expect(processedEvent.request.data.password).toBe('[REDACTED]');
    expect(processedEvent.request.data.username).toBe('admin');
  });

  it('should return null in development environment unless SENTRY_ENABLE_DEV is active', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SENTRY_ENABLE_DEV;

    const event = { request: {} };
    const result = beforeSend(event);
    expect(result).toBeNull();
  });

  it('should return the event in development when SENTRY_ENABLE_DEV is set to true', () => {
    process.env.NODE_ENV = 'development';
    process.env.SENTRY_ENABLE_DEV = 'true';

    const event = { request: {} };
    const result = beforeSend(event);
    expect(result).toBe(event);
  });
});
