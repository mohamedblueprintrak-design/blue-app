/**
 * Unit Tests — Step-up 2FA Middleware
 * اختبارات وحدة الطبقة الأمنية الإضافية
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { NextRequest } from 'next/server';

// Mock dependencies before importing
const mockVerifyTwoFactorCode = jest.fn<(userId: string, code: string) => Promise<boolean>>();
const mockHasTwoFactorEnabled = jest.fn<(userId: string) => Promise<boolean>>();

jest.mock('@/lib/auth/modules/two-factor', () => ({
  verifyTwoFactorCode: (...args: Parameters<typeof mockVerifyTwoFactorCode>) =>
    mockVerifyTwoFactorCode(...args),
  hasTwoFactorEnabled: (...args: Parameters<typeof mockHasTwoFactorEnabled>) =>
    mockHasTwoFactorEnabled(...args),
}));

jest.mock('@/lib/logger', () => ({
  log: {
    info: jest.fn(),
    security: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Import after mocks are set up
import {
  requireStepUp2FA,
  clearStepUpSession,
  _clearAllStepUpSessionsForTests,
} from '../step-up-2fa';

// Mock AuthContext
const mockAuthCtx = (userId: string): any => ({
  userId,
  email: `${userId}@test.com`,
  role: 'ADMIN',
  name: 'Test User',
  organizationId: 'org-1',
});

// Mock NextRequest
const mockRequest = (headers: Record<string, string> = {}, pathname = '/api/test'): NextRequest => {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] || null,
    },
    nextUrl: { pathname },
  } as unknown as NextRequest;
};

describe('Step-up 2FA Middleware', () => {
  beforeEach(() => {
    _clearAllStepUpSessionsForTests();
    jest.clearAllMocks();
  });

  afterEach(() => {
    _clearAllStepUpSessionsForTests();
  });

  describe('when user does NOT have 2FA enabled', () => {
    it('should allow operation (bypass) with security log', async () => {
      mockHasTwoFactorEnabled.mockResolvedValue(false);

      const result = await requireStepUp2FA(mockRequest(), mockAuthCtx('user-1'));

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.verified).toBe(true);
        expect(result.method).toBe('bypass');
        expect(result.twoFactorEnabled).toBe(false);
      }
    });
  });

  describe('when user has 2FA enabled but no code provided', () => {
    it('should return 403 with STEP_UP_2FA_REQUIRED error', async () => {
      mockHasTwoFactorEnabled.mockResolvedValue(true);

      const result = await requireStepUp2FA(mockRequest(), mockAuthCtx('user-1'));

      expect('error' in result).toBe(true);
      if ('error' in result) {
        const response = result.error;
        expect(response.status).toBe(403);
        const json = await response.json();
        expect(json.error.code).toBe('STEP_UP_2FA_REQUIRED');
        expect(json.error.requiresStepUp).toBe(true);
      }
    });
  });

  describe('when user has 2FA enabled and provides invalid code', () => {
    it('should return 403 with STEP_UP_2FA_INVALID error', async () => {
      mockHasTwoFactorEnabled.mockResolvedValue(true);
      mockVerifyTwoFactorCode.mockResolvedValue(false);

      const result = await requireStepUp2FA(
        mockRequest({ 'x-2fa-code': '000000' }),
        mockAuthCtx('user-1')
      );

      expect('error' in result).toBe(true);
      if ('error' in result) {
        const response = result.error;
        expect(response.status).toBe(403);
        const json = await response.json();
        expect(json.error.code).toBe('STEP_UP_2FA_INVALID');
      }
    });
  });

  describe('when user has 2FA enabled and provides valid code', () => {
    it('should allow operation (code) and create step-up session', async () => {
      mockHasTwoFactorEnabled.mockResolvedValue(true);
      mockVerifyTwoFactorCode.mockResolvedValue(true);

      const result = await requireStepUp2FA(
        mockRequest({ 'x-2fa-code': '123456' }),
        mockAuthCtx('user-1')
      );

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.verified).toBe(true);
        expect(result.method).toBe('code');
        expect(result.twoFactorEnabled).toBe(true);
        expect(result.verifiedAt).toBeDefined();
      }
    });

    it('should allow subsequent operations without code (session)', async () => {
      mockHasTwoFactorEnabled.mockResolvedValue(true);
      mockVerifyTwoFactorCode.mockResolvedValue(true);

      // First call: with code
      const result1 = await requireStepUp2FA(
        mockRequest({ 'x-2fa-code': '123456' }),
        mockAuthCtx('user-2')
      );
      expect('error' in result1).toBe(false);

      // Second call: without code — should use session
      const result2 = await requireStepUp2FA(mockRequest(), mockAuthCtx('user-2'));
      expect('error' in result2).toBe(false);
      if (!('error' in result2)) {
        expect(result2.method).toBe('session');
      }
    });
  });

  describe('clearStepUpSession', () => {
    it('should clear the session so next request requires code again', async () => {
      mockHasTwoFactorEnabled.mockResolvedValue(true);
      mockVerifyTwoFactorCode.mockResolvedValue(true);

      // First call: verify with code
      await requireStepUp2FA(
        mockRequest({ 'x-2fa-code': '123456' }),
        mockAuthCtx('user-3')
      );

      // Clear session (e.g., after one-shot operation)
      clearStepUpSession('user-3');

      // Second call: should require code again (not use session)
      const result = await requireStepUp2FA(mockRequest(), mockAuthCtx('user-3'));
      expect('error' in result).toBe(true);
      if ('error' in result) {
        const json = await result.error.json();
        expect(json.error.code).toBe('STEP_UP_2FA_REQUIRED');
      }
    });
  });

  describe('different users have independent sessions', () => {
    it('should not share step-up sessions between users', async () => {
      mockHasTwoFactorEnabled.mockResolvedValue(true);
      mockVerifyTwoFactorCode.mockResolvedValue(true);

      // User A verifies
      await requireStepUp2FA(
        mockRequest({ 'x-2fa-code': '123456' }),
        mockAuthCtx('user-a')
      );

      // User B should NOT have a session
      const resultB = await requireStepUp2FA(mockRequest(), mockAuthCtx('user-b'));
      expect('error' in resultB).toBe(true);
    });
  });
});
