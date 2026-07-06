/**
 * Unit Tests — Token Utilities Coverage
 * اختبارات تغطية أدوات الرموز المميزة
 *
 * Tests normalizeRoleForClient, hashToken, encrypt, decrypt,
 * generateAuthToken, getAuthCookieOptions, generateDbRefreshToken
 *
 * NOTE: jest.mock('@/lib/db') does NOT intercept ESM imports in ts-jest ESM mode.
 * We use jest.spyOn on the real db object instead, which correctly replaces
 * methods on the shared PrismaClient singleton.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const setNodeEnv = (value: string) => {
  (process.env as { NODE_ENV?: string }).NODE_ENV = value;
};

// Set JWT_SECRET and ENCRYPTION_KEY BEFORE importing any modules
(process.env as { JWT_SECRET?: string }).JWT_SECRET = 'blue-test-secret-key-must-be-at-least-32-chars!';
(process.env as { ENCRYPTION_KEY?: string }).ENCRYPTION_KEY = 'a'.repeat(64);

import {
  normalizeRoleForClient,
  hashToken,
  encrypt,
  decrypt,
  generateAuthToken,
  getAuthCookieOptions,
  generateDbRefreshToken,
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  ACCESS_TOKEN_EXPIRY,
  TOKEN_EXPIRY,
} from '@/lib/auth/token-utils';
import { db } from '@/lib/db';

// Spy on the real db.refreshToken.create
const spyRefreshTokenCreate = jest.spyOn(db.refreshToken, 'create');

describe('Token Utils — normalizeRoleForClient', () => {
  it('should convert ADMIN to admin', () => {
    expect(normalizeRoleForClient('ADMIN')).toBe('admin');
  });

  it('should convert ENGINEER to engineer', () => {
    expect(normalizeRoleForClient('ENGINEER')).toBe('engineer');
  });

  it('should convert PROJECT_MANAGER to project_manager', () => {
    expect(normalizeRoleForClient('PROJECT_MANAGER')).toBe('project_manager');
  });

  it('should convert mixed-case project_manager correctly', () => {
    expect(normalizeRoleForClient('Project_Manager')).toBe('project_manager');
  });

  it('should handle already lowercase roles', () => {
    expect(normalizeRoleForClient('admin')).toBe('admin');
  });

  it('should handle VIEWER', () => {
    expect(normalizeRoleForClient('VIEWER')).toBe('viewer');
  });
});

describe('Token Utils — hashToken', () => {
  it('should return a hex string', async () => {
    const result = await hashToken('test-token');
    expect(result).toMatch(/^[0-9a-f]+$/);
  });

  it('should return a 64-character SHA-256 hash', async () => {
    const result = await hashToken('test-token');
    expect(result.length).toBe(64);
  });

  it('should produce consistent hashes for the same input', async () => {
    const hash1 = await hashToken('same-input');
    const hash2 = await hashToken('same-input');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', async () => {
    const hash1 = await hashToken('input-a');
    const hash2 = await hashToken('input-b');
    expect(hash1).not.toBe(hash2);
  });
});

describe('Token Utils — encrypt & decrypt', () => {
  it('should encrypt a plaintext string to a base64 string', () => {
    const result = encrypt('hello world');
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('should decrypt an encrypted string back to the original', () => {
    const original = 'sensitive data';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should produce different ciphertexts for the same plaintext (due to random IV)', () => {
    const encrypted1 = encrypt('same-plaintext');
    const encrypted2 = encrypt('same-plaintext');
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should handle empty strings', () => {
    const encrypted = encrypt('');
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe('');
  });

  it('should handle unicode strings', () => {
    const original = 'مرحبا بالعالم';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });
});

describe('Token Utils — generateAuthToken', () => {
  it('should generate a valid JWT', async () => {
    const token = await generateAuthToken({
      userId: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
    });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('should include normalized role in the token', async () => {
    const token = await generateAuthToken({
      userId: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN',
    });
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.role).toBe('admin');
  });

  it('should include twoFactorEnabled field', async () => {
    const token = await generateAuthToken({
      userId: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      twoFactorEnabled: true,
    });
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.twoFactorEnabled).toBe(true);
  });

  it('should default twoFactorEnabled to false', async () => {
    const token = await generateAuthToken({
      userId: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
    });
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.twoFactorEnabled).toBe(false);
  });

  it('should include organizationId when provided', async () => {
    const token = await generateAuthToken({
      userId: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      organizationId: 'org-1',
    });
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.organizationId).toBe('org-1');
  });

  it('should include passwordChangedAt when provided', async () => {
    const token = await generateAuthToken({
      userId: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      passwordChangedAt: 1700000000,
    });
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.passwordChangedAt).toBe(1700000000);
  });
});

describe('Token Utils — getAuthCookieOptions', () => {
  it('should return correct cookie options', () => {
    const options = getAuthCookieOptions(900);
    expect(options.path).toBe('/');
    expect(options.maxAge).toBe(900);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
  });

  it('should set secure to true in production', () => {
    const originalEnv = process.env.NODE_ENV;
    setNodeEnv('production');
    const options = getAuthCookieOptions(900);
    expect(options.secure).toBe(true);
    setNodeEnv(originalEnv as string);
  });

  it('should set secure to false in development', () => {
    const originalEnv = process.env.NODE_ENV;
    setNodeEnv('development');
    const options = getAuthCookieOptions(900);
    expect(options.secure).toBe(false);
    setNodeEnv(originalEnv as string);
  });
});

describe('Token Utils — generateDbRefreshToken', () => {
  beforeEach(() => {
    spyRefreshTokenCreate.mockClear();
    spyRefreshTokenCreate.mockResolvedValue({ id: 'rt-1' } as any);
  });

  it('should generate a raw token string', async () => {
    const token = await generateDbRefreshToken('user-1');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should call db.refreshToken.create with correct params', async () => {
    await generateDbRefreshToken('user-1');
    expect(spyRefreshTokenCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      })
    );
  });
});

describe('Token Utils — exported constants', () => {
  it('should export AUTH_COOKIE_NAME', () => {
    expect(AUTH_COOKIE_NAME).toBe('blue_token');
  });

  it('should export REFRESH_COOKIE_NAME', () => {
    expect(REFRESH_COOKIE_NAME).toBe('blue_refresh_token');
  });

  it('should export ACCESS_TOKEN_EXPIRY', () => {
    expect(ACCESS_TOKEN_EXPIRY).toBe('15m');
  });

  it('should export TOKEN_EXPIRY', () => {
    expect(TOKEN_EXPIRY.ACCESS_TOKEN).toBe('15m');
    expect(TOKEN_EXPIRY.ACCESS_TOKEN_MAX_AGE).toBe(900);
    expect(TOKEN_EXPIRY.REFRESH_TOKEN_DAYS).toBe(7);
    expect(TOKEN_EXPIRY.REFRESH_TOKEN_MAX_AGE).toBe(7 * 24 * 60 * 60);
  });
});
