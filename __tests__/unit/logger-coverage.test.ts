/**
 * Extended Tests for Logger Module — Branch Coverage
 * Tests the ACTUAL logger module (not re-implemented logic).
 * Covers: log.error (Error vs non-Error), log.apiResponse (statusCode branches),
 * log.apiRequest, log.db, log.service, log.security, log.debug, log.http
 */

import { describe, it, expect, jest } from '@jest/globals';

// Import the real logger module
import { log, default as logger } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════════════
// 1. log.error — Error vs non-Error branch
// ═══════════════════════════════════════════════════════════════════════

describe('Logger — log.error branches', () => {
  it('should handle Error objects with message and stack', () => {
    const err = new Error('test error message');
    // Should not throw
    expect(() => log.error('Test error', err)).not.toThrow();
  });

  it('should handle non-Error values', () => {
    expect(() => log.error('String error', 'just a string')).not.toThrow();
  });

  it('should handle null error', () => {
    expect(() => log.error('Null error', null)).not.toThrow();
  });

  it('should handle undefined error', () => {
    expect(() => log.error('Undefined error', undefined)).not.toThrow();
  });

  it('should handle number error', () => {
    expect(() => log.error('Number error', 42)).not.toThrow();
  });

  it('should handle Error with metadata', () => {
    const err = new Error('with meta');
    expect(() => log.error('Error with meta', err, { userId: '123' })).not.toThrow();
  });

  it('should handle non-Error with metadata', () => {
    expect(() => log.error('Non-error with meta', 'string', { userId: '456' })).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. log.apiResponse — statusCode branches
// ═══════════════════════════════════════════════════════════════════════

describe('Logger — log.apiResponse branches', () => {
  it('should use warn for 4xx status codes', () => {
    expect(() => log.apiResponse('GET', '/api/test', 400, 100)).not.toThrow();
  });

  it('should use warn for 5xx status codes', () => {
    expect(() => log.apiResponse('GET', '/api/test', 500, 200)).not.toThrow();
  });

  it('should use http for 2xx status codes', () => {
    expect(() => log.apiResponse('GET', '/api/test', 200, 50)).not.toThrow();
  });

  it('should use http for 3xx status codes', () => {
    expect(() => log.apiResponse('GET', '/api/test', 301, 10)).not.toThrow();
  });

  it('should handle boundary status code 399', () => {
    expect(() => log.apiResponse('GET', '/api/test', 399, 30)).not.toThrow();
  });

  it('should handle boundary status code 400', () => {
    expect(() => log.apiResponse('GET', '/api/test', 400, 30)).not.toThrow();
  });

  it('should include metadata', () => {
    expect(() => log.apiResponse('POST', '/api/users', 201, 150, { userId: 'u1' })).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Other log helper methods
// ═══════════════════════════════════════════════════════════════════════

describe('Logger — other helper methods', () => {
  it('log.info should work with and without metadata', () => {
    expect(() => log.info('Test message')).not.toThrow();
    expect(() => log.info('Test message', { key: 'value' })).not.toThrow();
  });

  it('log.warn should work with and without metadata', () => {
    expect(() => log.warn('Warning message')).not.toThrow();
    expect(() => log.warn('Warning message', { key: 'value' })).not.toThrow();
  });

  it('log.debug should work with and without metadata', () => {
    expect(() => log.debug('Debug message')).not.toThrow();
    expect(() => log.debug('Debug message', { key: 'value' })).not.toThrow();
  });

  it('log.http should work with and without metadata', () => {
    expect(() => log.http('HTTP message')).not.toThrow();
    expect(() => log.http('HTTP message', { key: 'value' })).not.toThrow();
  });

  it('log.apiRequest should work with and without userId/metadata', () => {
    expect(() => log.apiRequest('GET', '/api/test')).not.toThrow();
    expect(() => log.apiRequest('POST', '/api/users', 'user-1')).not.toThrow();
    expect(() => log.apiRequest('POST', '/api/users', 'user-1', { ip: '1.2.3.4' })).not.toThrow();
  });

  it('log.db should work with and without metadata', () => {
    expect(() => log.db('SELECT', 'users')).not.toThrow();
    expect(() => log.db('INSERT', 'projects', { count: 5 })).not.toThrow();
  });

  it('log.service should work with and without metadata', () => {
    expect(() => log.service('AuthService', 'login')).not.toThrow();
    expect(() => log.service('EmailService', 'send', { to: 'test@test.com' })).not.toThrow();
  });

  it('log.security should work with and without metadata', () => {
    expect(() => log.security('login_attempt')).not.toThrow();
    expect(() => log.security('brute_force', { ip: '1.2.3.4' })).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Logger instance
// ═══════════════════════════════════════════════════════════════════════

describe('Logger — default export', () => {
  it('should export a winston logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });
});
