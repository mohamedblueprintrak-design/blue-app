import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  hashToken,
  normalizeRoleForClient,
  encrypt,
  decrypt,
  generateAuthToken,
  getAuthCookieOptions,
  generateDbRefreshToken
} from '../../src/lib/auth/token-utils';
import { db } from '../../src/lib/db';
import crypto from 'crypto';

// Mock logger
jest.mock('../../src/lib/logger', () => ({
  log: {
    warn: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../src/lib/logger', () => ({
  log: {
    warn: jest.fn(),
  },
}));

// Mock jwt-secret
jest.mock('../../src/lib/auth/jwt-secret', () => ({
  getJwtSecretBytes: jest.fn().mockReturnValue(new TextEncoder().encode('test-secret-key-that-is-at-least-32-chars')),
}));

describe('Auth Token Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Role Normalization', () => {
    it('normalizes standard roles to lowercase', () => {
      expect(normalizeRoleForClient('ADMIN')).toBe('admin');
      expect(normalizeRoleForClient('engineer')).toBe('engineer');
    });

    it('normalizes PROJECT_MANAGER correctly', () => {
      expect(normalizeRoleForClient('PROJECT_MANAGER')).toBe('project_manager');
    });
  });

  describe('Token Hashing', () => {
    it('hashes a token consistently', async () => {
      const token = 'my-secret-token';
      const hash1 = await hashToken(token);
      const hash2 = await hashToken(token);
      
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 hex string length
    });
  });

  describe('Encryption / Decryption', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      // Provide a valid 64-hex char encryption key for tests
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('encrypts and decrypts text successfully', () => {
      const plaintext = 'sensitive-data';
      const ciphertext = encrypt(plaintext);
      
      expect(ciphertext).not.toBe(plaintext);
      expect(typeof ciphertext).toBe('string');
      
      const decrypted = decrypt(ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    it('throws error if ENCRYPTION_KEY is missing in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENCRYPTION_KEY;
      delete process.env.JWT_SECRET;
      
      expect(() => encrypt('test')).toThrow(/FATAL: ENCRYPTION_KEY environment variable is required in production/);
    });

    it('falls back to JWT_SECRET in development if ENCRYPTION_KEY is missing', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ENCRYPTION_KEY;
      process.env.JWT_SECRET = 'my-dev-secret';
      
      const plaintext = 'dev-data';
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('generateAuthToken', () => {
    it('generates a valid auth token JWT', async () => {
      const payload = {
        userId: 'u1',
        email: 'u1@example.com',
        name: 'User One',
        role: 'ADMIN',
        organizationId: 'org1'
      };
      
      const token = await generateAuthToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT format
    });
  });

  describe('getAuthCookieOptions', () => {
    it('returns correct cookie options for development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const options = getAuthCookieOptions(3600);
      expect(options.maxAge).toBe(3600);
      expect(options.httpOnly).toBe(true);
      expect(options.secure).toBe(false);
      expect(options.sameSite).toBe('lax');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('returns secure cookie options for production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const options = getAuthCookieOptions(3600);
      expect(options.secure).toBe(true);
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('generateDbRefreshToken', () => {
    it('generates a token and stores its hash in the database', async () => {
      jest.spyOn(db.refreshToken, 'create').mockResolvedValue({ id: '1' } as any);

      // Mock crypto.randomUUID to ensure consistency
      const mockUuid1 = '12345678-1234-1234-1234-123456789012';
      const mockUuid2 = '87654321-4321-4321-4321-210987654321';
      jest.spyOn(global.crypto, 'randomUUID')
        .mockReturnValueOnce(mockUuid1 as any)
        .mockReturnValueOnce(mockUuid2 as any);
      
      const userId = 'user-123';
      const token = await generateDbRefreshToken(userId);
      
      expect(token).toBe(mockUuid1 + mockUuid2);
      expect(db.refreshToken.create).toHaveBeenCalled();
      
      const createCallArgs = (db.refreshToken.create as jest.Mock).mock.calls[0][0];
      expect(createCallArgs.data.userId).toBe(userId);
      expect(createCallArgs.data.tokenHash).toBeDefined();
      expect(createCallArgs.data.expiresAt).toBeInstanceOf(Date);
      
      jest.restoreAllMocks();
    });
  });
});
