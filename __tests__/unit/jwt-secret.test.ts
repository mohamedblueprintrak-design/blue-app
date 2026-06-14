/**
 * Tests for JWT secret management
 * Ensures that JWT_SECRET is properly required and no hardcoded fallbacks exist
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// We need to test the module with different env states
// So we'll use dynamic imports with cache clearing

describe('JWT Secret Management', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getJwtSecretBytes', () => {
    it('should throw in production when JWT_SECRET is not set', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      const { getJwtSecretBytes } = await import('@/lib/auth/jwt-secret');
      expect(() => getJwtSecretBytes()).toThrow('JWT_SECRET environment variable is required');
    });

    it('should throw in production when JWT_SECRET is too short', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short';

      const { getJwtSecretBytes } = await import('@/lib/auth/jwt-secret');
      expect(() => getJwtSecretBytes()).toThrow('at least 32 characters long');
    });

    it('should throw in production when JWT_SECRET contains known placeholder', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'change-me-please-this-is-a-placeholder-value!';

      const { getJwtSecretBytes } = await import('@/lib/auth/jwt-secret');
      expect(() => getJwtSecretBytes()).toThrow('placeholder value');
    });

    it('should throw in production when JWT_SECRET is the old dev secret', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'blueprint-dev-secret-do-not-use-in-production-min32chars!';

      const { getJwtSecretBytes } = await import('@/lib/auth/jwt-secret');
      expect(() => getJwtSecretBytes()).toThrow('placeholder value');
    });

    it('should throw in production when JWT_SECRET matches old committed dev secret', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'bp-dev-jwt-secret-key-2024-blueprint-rak';

      const { getJwtSecretBytes } = await import('@/lib/auth/jwt-secret');
      expect(() => getJwtSecretBytes()).toThrow('placeholder value');
    });

    it('should accept a valid JWT_SECRET in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a-very-secure-production-secret-that-is-long-enough-32chars!';

      const { getJwtSecretBytes } = await import('@/lib/auth/jwt-secret');
      const bytes = getJwtSecretBytes();
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
    });

    it('should throw in development when JWT_SECRET is not set (no hardcoded fallback)', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.JWT_SECRET;

      const { getJwtSecretBytes } = await import('@/lib/auth/jwt-secret');
      expect(() => getJwtSecretBytes()).toThrow('JWT_SECRET environment variable is required');
    });

    it('should accept a valid JWT_SECRET in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'dev-secret-at-least-32-characters-long-change-me';

      const { getJwtSecretBytes } = await import('@/lib/auth/jwt-secret');
      const bytes = getJwtSecretBytes();
      expect(bytes).toBeInstanceOf(Uint8Array);
    });
  });

  describe('getJwtSecretString', () => {
    it('should return the secret as a string', async () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'dev-secret-at-least-32-characters-long-change-me';

      const { getJwtSecretString } = await import('@/lib/auth/jwt-secret');
      const str = getJwtSecretString();
      expect(typeof str).toBe('string');
      expect(str.length).toBeGreaterThan(0);
    });
  });

  describe('Security: No hardcoded secrets in source', () => {
    it('should NOT contain the old hardcoded dev secret in the module', async () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'dev-secret-at-least-32-characters-long-change-me';

      const { getJwtSecretString } = await import('@/lib/auth/jwt-secret');
      const secret = getJwtSecretString();
      // The secret should match the env var, not the old hardcoded fallback
      expect(secret).toBe('dev-secret-at-least-32-characters-long-change-me');
      expect(secret).not.toBe('blueprint-dev-secret-do-not-use-in-production-min32chars!');
    });
  });
});
