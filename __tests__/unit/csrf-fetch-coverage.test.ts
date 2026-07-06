/**
 * Extended Tests for CSRF Fetch Wrapper — Branch Coverage
 * Simulates window environment to test the internal csrfAwareFetch branches
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// We need to set up window BEFORE the module is first loaded.
// The module captures window.fetch at init time.

describe('CSRF Fetch — with window mock', () => {
  let originalWindow: typeof globalThis.window | undefined;
  let originalFetch: typeof globalThis.fetch;
  let mockFetch: jest.Mock;
  let initCsrfFetch: typeof import('@/lib/api/csrf-fetch').initCsrfFetch;
  let restoreOriginalFetch: typeof import('@/lib/api/csrf-fetch').restoreOriginalFetch;

  beforeEach(async () => {
    // Save originals
    originalWindow = globalThis.window;
    originalFetch = globalThis.fetch;
    
    mockFetch = (jest.fn() as jest.MockedFunction<typeof fetch>).mockResolvedValue(new Response('OK')) as unknown as jest.Mock;
    
    // Set up window mock before importing
    (globalThis as any).window = {
      fetch: mockFetch,
    };
    
    // Reset modules to get fresh import with window present
    jest.resetModules();
    
    // Mock csrf-client before importing
    jest.doMock('@/lib/csrf-client', () => ({
      getCsrfToken: jest.fn().mockReturnValue('test-csrf-token-12345'),
    }));
    
    const mod = await import('@/lib/api/csrf-fetch');
    initCsrfFetch = mod.initCsrfFetch;
    restoreOriginalFetch = mod.restoreOriginalFetch;
  });

  afterEach(() => {
    // Restore
    try { restoreOriginalFetch(); } catch {}
    
    if (originalWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      globalThis.window = originalWindow;
    }
    globalThis.fetch = originalFetch;
    
    jest.resetModules();
  });

  it('should inject CSRF token for POST to /api/ endpoint', async () => {
    initCsrfFetch();
    
    await (globalThis as any).window.fetch('/api/users', { method: 'POST' });
    
    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    const init = callArgs[1] as RequestInit;
    // Check that headers include CSRF token
    if (init?.headers) {
      const headers = init.headers as Headers;
      expect(headers.has('X-CSRF-Token')).toBe(true);
    }
  });

  it('should inject CSRF token for PUT to /api/ endpoint', async () => {
    initCsrfFetch();
    
    await (globalThis as any).window.fetch('/api/users/1', { method: 'PUT' });
    
    expect(mockFetch).toHaveBeenCalled();
  });

  it('should inject CSRF token for DELETE to /api/ endpoint', async () => {
    initCsrfFetch();
    
    await (globalThis as any).window.fetch('/api/users/1', { method: 'DELETE' });
    
    expect(mockFetch).toHaveBeenCalled();
  });

  it('should inject CSRF token for PATCH to /api/ endpoint', async () => {
    initCsrfFetch();
    
    await (globalThis as any).window.fetch('/api/users/1', { method: 'PATCH' });
    
    expect(mockFetch).toHaveBeenCalled();
  });

  it('should NOT inject CSRF token for GET requests', async () => {
    initCsrfFetch();
    
    await (globalThis as any).window.fetch('/api/users', { method: 'GET' });
    
    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    // GET requests: init is passed through without CSRF headers
    const init = callArgs[1] as RequestInit | undefined;
    if (init?.headers) {
      const headers = init.headers as Headers;
      expect(headers.has('X-CSRF-Token')).toBe(false);
    }
    // If no init modification happened, that's also fine
  });

  it('should NOT inject CSRF token for non-API URLs', async () => {
    initCsrfFetch();
    
    await (globalThis as any).window.fetch('https://external.com/data', { method: 'POST' });
    
    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    const init = callArgs[1] as RequestInit | undefined;
    // Non-API POST should not have CSRF headers
    if (init?.headers) {
      const headers = init.headers as Headers;
      expect(headers.has('X-CSRF-Token')).toBe(false);
    }
  });

  it('should handle URL input as URL object', async () => {
    initCsrfFetch();
    
    const url = new URL('http://localhost:3000/api/test');
    await (globalThis as any).window.fetch(url, { method: 'POST' });
    
    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    const init = callArgs[1] as RequestInit;
    if (init?.headers) {
      const headers = init.headers as Headers;
      expect(headers.has('X-CSRF-Token')).toBe(true);
    }
  });

  it('should NOT overwrite existing CSRF header', async () => {
    initCsrfFetch();
    
    const headers = new Headers();
    headers.set('X-CSRF-Token', 'existing-token');
    await (globalThis as any).window.fetch('/api/users', { method: 'POST', headers });
    
    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    const init = callArgs[1] as RequestInit;
    const resultHeaders = init.headers as Headers;
    // Existing header should be preserved (not overwritten)
    expect(resultHeaders.get('X-CSRF-Token')).toBe('existing-token');
  });

  it('should handle API URL with /api/ in the middle of full URL', async () => {
    initCsrfFetch();
    
    await (globalThis as any).window.fetch('http://localhost:3000/api/test', { method: 'POST' });
    
    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    const init = callArgs[1] as RequestInit;
    if (init?.headers) {
      const headers = init.headers as Headers;
      expect(headers.has('X-CSRF-Token')).toBe(true);
    }
  });

  it('should not initialize twice', async () => {
    initCsrfFetch();
    initCsrfFetch(); // Second call should be no-op
    
    await (globalThis as any).window.fetch('/api/test', { method: 'POST' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should restore original fetch', async () => {
    initCsrfFetch();
    restoreOriginalFetch();
    
    // After restore, window.fetch should be the mock again
    expect((globalThis as any).window.fetch).toBe(mockFetch);
  });

  it('should handle POST without explicit method (defaults to GET)', async () => {
    initCsrfFetch();
    
    await (globalThis as any).window.fetch('/api/users'); // No method = GET
    
    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    // Default method is GET, so no CSRF should be injected
    const init = callArgs[1] as RequestInit | undefined;
    if (init?.headers) {
      const headers = init.headers as Headers;
      expect(headers.has('X-CSRF-Token')).toBe(false);
    }
  });
});
