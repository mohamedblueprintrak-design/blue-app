/**
 * Tests for CSRF Client Utilities
 * Covers: getCsrfToken, getMutationHeaders
 */

import { describe, it, expect } from '@jest/globals';

import { getCsrfToken, getMutationHeaders } from '@/lib/csrf-client';

// ═══════════════════════════════════════════════════════════════════════
// 1. getCsrfToken
// ═══════════════════════════════════════════════════════════════════════

describe('CSRF Client — getCsrfToken', () => {
  it('should return empty string on server side (no document)', () => {
    // In test environment, typeof document is 'undefined'
    const token = getCsrfToken();
    expect(typeof token).toBe('string');
    // Server-side should return empty string
    expect(token).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. getMutationHeaders
// ═══════════════════════════════════════════════════════════════════════

describe('CSRF Client — getMutationHeaders', () => {
  it('should return headers object with Content-Type', () => {
    const headers = getMutationHeaders();
    expect(headers).toHaveProperty('Content-Type', 'application/json');
    expect(headers).toHaveProperty('X-CSRF-Token');
  });

  it('should include CSRF token (empty on server)', () => {
    const headers = getMutationHeaders();
    expect(typeof headers['X-CSRF-Token']).toBe('string');
  });
});
