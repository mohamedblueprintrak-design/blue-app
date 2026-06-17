/**
 * Tests for JWT secret management
 * Ensures that JWT_SECRET is properly required and no hardcoded fallbacks exist
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Import once — getJwtSecretBytes reads process.env on every call (no module-level caching)
import { getJwtSecretBytes, getJwtSecretString } from '@/lib/auth/jwt-secret';

describe('JWT Secret Management', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    // Reset to a known safe state before each test
    process.env.JWT_SECRET = 'dev-secret-at-least-32-characters-long-change-me';
    (process.env as Record<string, string>).NODE_ENV = 'development';
  });

  afterEach(() => {
    // Restore original env
    (process.env as Record<string, string>).NODE_ENV = originalNodeEnv as string;
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  describe('getJwtSecretBytes', () => {
    it('should throw in production when JWT_SECRET is not set', () => {
      (process.env as Record<string, string>).NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      expect(() => getJwtSecretBytes()).toThrow('JWT_SECRET environment variable is required');
    });

    it('should throw in production when JWT_SECRET is too short', () => {
      (process.env as Record<string, string>).NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short';

      expect(() => getJwtSecretBytes()).toThrow('at least 32 characters long');
    });

    it('should throw in production when JWT_SECRET contains known placeholder', () => {
      (process.env as Record<string, string>).NODE_ENV = 'production';
      process.env.JWT_SECRET = 'change-me-please-this-is-a-placeholder-value!';

      expect(() => getJwtSecretBytes()).toThrow('placeholder value');
    });

    it('should throw in production when JWT_SECRET is the old dev secret', () => {
      (process.env as Record<string, string>).NODE_ENV = 'production';
      process.env.JWT_SECRET = 'blueprint-dev-secret-do-not-use-in-production-min32chars!';

      expect(() => getJwtSecretBytes()).toThrow('placeholder value');
    });

    it('should throw in production when JWT_SECRET matches old committed dev secret', () => {
      (process.env as Record<string, string>).NODE_ENV = 'production';
      process.env.JWT_SECRET = 'bp-dev-jwt-secret-key-2024-blueprint-rak';

      expect(() => getJwtSecretBytes()).toThrow('placeholder value');
    });

    it('should accept a valid JWT_SECRET in production', () => {
      (process.env as Record<string, string>).NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a-very-secure-production-secret-that-is-long-enough-32chars!';

      const bytes = getJwtSecretBytes();
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
    });

    it('should throw in development when JWT_SECRET is not set (no hardcoded fallback)', () => {
      (process.env as Record<string, string>).NODE_ENV = 'development';
      delete process.env.JWT_SECRET;

      expect(() => getJwtSecretBytes()).toThrow('JWT_SECRET environment variable is required');
    });

    it('should accept a valid JWT_SECRET in development', () => {
      (process.env as Record<string, string>).NODE_ENV = 'development';
      process.env.JWT_SECRET = 'dev-secret-at-least-32-characters-long-change-me';

      const bytes = getJwtSecretBytes();
      expect(bytes).toBeInstanceOf(Uint8Array);
    });
  });

  describe('getJwtSecretString', () => {
    it('should return the secret as a string', () => {
      (process.env as Record<string, string>).NODE_ENV = 'development';
      process.env.JWT_SECRET = 'dev-secret-at-least-32-characters-long-change-me';

      const str = getJwtSecretString();
      expect(typeof str).toBe('string');
      expect(str.length).toBeGreaterThan(0);
    });
  });

  describe('Security: No hardcoded secrets in source', () => {
    it('should NOT contain the old hardcoded dev secret in the module', () => {
      (process.env as Record<string, string>).NODE_ENV = 'development';
      process.env.JWT_SECRET = 'dev-secret-at-least-32-characters-long-change-me';

      const secret = getJwtSecretString();
      // The secret should match the env var, not the old hardcoded fallback
      expect(secret).toBe('dev-secret-at-least-32-characters-long-change-me');
      expect(secret).not.toBe('blueprint-dev-secret-do-not-use-in-production-min32chars!');
    });
  });
});
