/**
 * Unit Tests — Token Utilities Coverage
 * اختبارات تغطية أدوات الرموز المميزة
 *
 * Tests normalizeRoleForClient, hashToken, encrypt, decrypt,
 * generateAuthToken, getAuthCookieOptions, generateDbRefreshToken
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';

// Use unstable_mockModule for ESM-compatible mocking
jest.unstable_mockModule('@/lib/db', () => ({
  db: {
    refreshToken: {
      // @ts-expect-error — Jest mock for Prisma model
      create: jest.fn().mockResolvedValue({ id: 'rt-1' }),
    },
  },
}));

jest.unstable_mockModule('@/lib/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.unstable_mockModule('@/lib/auth/jwt-secret', () => ({
  getJwtSecretBytes: () => new TextEncoder().encode('blue-test-secret-key-must-be-at-least-32-chars!'),
}));

describe('Token Utils — normalizeRoleForClient', () => {
  let normalizeRoleForClient: (role: string) => string;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/token-utils');
    normalizeRoleForClient = mod.normalizeRoleForClient;
  });

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
  let hashToken: (token: string) => Promise<string>;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/token-utils');
    hashToken = mod.hashToken;
  });

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
  let encrypt: (plaintext: string) => string;
  let decrypt: (ciphertext: string) => string;
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up a valid ENCRYPTION_KEY for tests
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', configurable: true });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  beforeAll(async () => {
    const mod = await import('@/lib/auth/token-utils');
    encrypt = mod.encrypt;
    decrypt = mod.decrypt;
  });

  it('should encrypt a plaintext string to a base64 string', () => {
    const result = encrypt('hello world');
    expect(typeof result).toBe('string');
    // Base64 encoded string
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
    const original = 'مرحبا بالعالم 🌍';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should throw when ENCRYPTION_KEY is missing in production', () => {
    delete process.env.ENCRYPTION_KEY;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });
    expect(() => encrypt('test')).toThrow('FATAL: ENCRYPTION_KEY');
  });

  it('should derive key from JWT_SECRET in dev when ENCRYPTION_KEY missing', () => {
    delete process.env.ENCRYPTION_KEY;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true });
    process.env.JWT_SECRET = 'some-dev-jwt-secret-key-that-is-long-enough';
    // Should not throw
    const encrypted = encrypt('test');
    expect(typeof encrypted).toBe('string');
  });

  it('should throw when neither ENCRYPTION_KEY nor JWT_SECRET is available', () => {
    delete process.env.ENCRYPTION_KEY;
    delete process.env.JWT_SECRET;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true });
    expect(() => encrypt('test')).toThrow('FATAL: ENCRYPTION_KEY');
  });
});

describe('Token Utils — generateAuthToken', () => {
  let generateAuthToken: (user: import('@/lib/auth/token-utils').AuthTokenPayload) => Promise<string>;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/token-utils');
    generateAuthToken = mod.generateAuthToken;
  });

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
    // Decode without verification to check payload
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.role).toBe('admin'); // normalized
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

  it('should handle null/empty name by converting to empty string', async () => {
    const token = await generateAuthToken({
      userId: 'user-1',
      email: 'test@example.com',
      name: '' ,
      role: 'admin',
    });
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.name).toBe('');
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
  let getAuthCookieOptions: (maxAge: number) => Record<string, unknown>;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/token-utils');
    getAuthCookieOptions = mod.getAuthCookieOptions;
  });

  it('should return correct cookie options', () => {
    const options = getAuthCookieOptions(900);
    expect(options.path).toBe('/');
    expect(options.maxAge).toBe(900);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
  });

  it('should set secure to true in production', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });
    const options = getAuthCookieOptions(900);
    expect(options.secure).toBe(true);
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
  });

  it('should set secure to false in development', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true });
    const options = getAuthCookieOptions(900);
    expect(options.secure).toBe(false);
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
  });
});

describe('Token Utils — generateDbRefreshToken', () => {
  let generateDbRefreshToken: (userId: string) => Promise<string>;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/token-utils');
    generateDbRefreshToken = mod.generateDbRefreshToken;
  });

  it('should generate a raw token string', async () => {
    const token = await generateDbRefreshToken('user-1');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should call db.refreshToken.create with correct params', async () => {
    const { db } = await import('@/lib/db');
    await generateDbRefreshToken('user-1');
    expect(db.refreshToken.create).toHaveBeenCalledWith(
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
  it('should export AUTH_COOKIE_NAME', async () => {
    const mod = await import('@/lib/auth/token-utils');
    expect(mod.AUTH_COOKIE_NAME).toBe('blue_token');
  });

  it('should export REFRESH_COOKIE_NAME', async () => {
    const mod = await import('@/lib/auth/token-utils');
    expect(mod.REFRESH_COOKIE_NAME).toBe('blue_refresh_token');
  });

  it('should export ACCESS_TOKEN_EXPIRY', async () => {
    const mod = await import('@/lib/auth/token-utils');
    expect(mod.ACCESS_TOKEN_EXPIRY).toBe('15m');
  });

  it('should export TOKEN_EXPIRY', async () => {
    const mod = await import('@/lib/auth/token-utils');
    expect(mod.TOKEN_EXPIRY.ACCESS_TOKEN).toBe('15m');
    expect(mod.TOKEN_EXPIRY.ACCESS_TOKEN_MAX_AGE).toBe(900);
    expect(mod.TOKEN_EXPIRY.REFRESH_TOKEN_DAYS).toBe(7);
    expect(mod.TOKEN_EXPIRY.REFRESH_TOKEN_MAX_AGE).toBe(7 * 24 * 60 * 60);
  });
});
