/**
 * Unit Tests — JWT Module Coverage
 * اختبارات تغطية وحدة JWT
 *
 * Tests generateAccessToken, generatePasswordResetToken, generateEmailVerificationToken,
 * generateToken, verifyToken, verifyPasswordResetToken, verifyEmailVerificationToken,
 * getTokenExpiration, isTokenExpired, decodeToken
 */

import { describe, it, expect, beforeAll, afterEach } from '@jest/globals';

// Set JWT_SECRET before any module loads — getJwtSecretBytes() now requires it
process.env.JWT_SECRET = 'test-jwt-secret-for-coverage-tests-min-32-chars!';

// Use dynamic imports throughout to ensure modules load with the test environment.

describe('JWT Module — generateAccessToken', () => {
  let generateAccessToken: typeof import('@/lib/auth/modules/jwt').generateAccessToken;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/modules/jwt');
    generateAccessToken = mod.generateAccessToken;
  });

  it('should generate a valid JWT token', async () => {
    const token = await generateAccessToken({
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'admin',
    });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('should include type=access in the payload', async () => {
    const token = await generateAccessToken({
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'admin',
    });
    // Decode the JWT payload without verification (base64)
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.type).toBe('access');
  });

  it('should include all payload fields', async () => {
    const token = await generateAccessToken({
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'admin',
      organizationId: 'org-456',
    });
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.userId).toBe('user-123');
    expect(payload.email).toBe('test@example.com');
    expect(payload.role).toBe('admin');
    expect(payload.organizationId).toBe('org-456');
  });

  it('should set correct issuer and audience', async () => {
    const token = await generateAccessToken({
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'admin',
    });
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.iss).toBe('blueprint-saas');
    expect(payload.aud).toBe('blueprint-users');
  });
});

describe('JWT Module — generatePasswordResetToken', () => {
  let generatePasswordResetToken: typeof import('@/lib/auth/modules/jwt').generatePasswordResetToken;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/modules/jwt');
    generatePasswordResetToken = mod.generatePasswordResetToken;
  });

  it('should generate a valid JWT token', async () => {
    const token = await generatePasswordResetToken('user-789');
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('should include type=password-reset and userId', async () => {
    const token = await generatePasswordResetToken('user-789');
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.type).toBe('password-reset');
    expect(payload.userId).toBe('user-789');
  });
});

describe('JWT Module — generateEmailVerificationToken', () => {
  let generateEmailVerificationToken: typeof import('@/lib/auth/modules/jwt').generateEmailVerificationToken;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/modules/jwt');
    generateEmailVerificationToken = mod.generateEmailVerificationToken;
  });

  it('should generate a valid JWT token with email', async () => {
    const token = await generateEmailVerificationToken('test@example.com');
    expect(typeof token).toBe('string');
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.type).toBe('email-verification');
    expect(payload.email).toBe('test@example.com');
  });

  it('should include optional userId', async () => {
    const token = await generateEmailVerificationToken('test@example.com', 'user-001');
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.userId).toBe('user-001');
  });

  it('should work without userId', async () => {
    const token = await generateEmailVerificationToken('test@example.com');
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.email).toBe('test@example.com');
  });
});

describe('JWT Module — generateToken', () => {
  let generateToken: typeof import('@/lib/auth/modules/jwt').generateToken;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/modules/jwt');
    generateToken = mod.generateToken;
  });

  it('should generate a token with custom payload', async () => {
    const token = await generateToken({ customField: 'value' });
    expect(typeof token).toBe('string');
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.customField).toBe('value');
  });

  it('should use default 1h expiration when no expiresIn provided', async () => {
    const token = await generateToken({ data: 'test' });
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.exp).toBeDefined();
    expect(payload.iat).toBeDefined();
    // 1h = 3600 seconds — check the diff is approximately 3600
    const diff = payload.exp - payload.iat;
    expect(diff).toBe(3600);
  });

  it('should use custom expiresIn when provided', async () => {
    const token = await generateToken({ data: 'test' }, { expiresIn: '30m' });
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    const diff = payload.exp - payload.iat;
    // 30m = 1800 seconds
    expect(diff).toBe(1800);
  });

  it('should set type in payload when type is provided', async () => {
    const token = await generateToken({ data: 'test' }, { type: 'refresh' });
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    // type is stored in the payload body (not as sub/subject claim) for security:
    // verifyToken() checks payload.type to reject non-access tokens.
    // Using sub would allow token type confusion attacks.
    expect(payload.type).toBe('refresh');
  });
});

describe('JWT Module — verifyToken', () => {
  let verifyToken: typeof import('@/lib/auth/modules/jwt').verifyToken;
  let generateAccessToken: typeof import('@/lib/auth/modules/jwt').generateAccessToken;
  let generateToken: typeof import('@/lib/auth/modules/jwt').generateToken;
  let generatePasswordResetToken: typeof import('@/lib/auth/modules/jwt').generatePasswordResetToken;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/modules/jwt');
    verifyToken = mod.verifyToken;
    generateAccessToken = mod.generateAccessToken;
    generateToken = mod.generateToken;
    generatePasswordResetToken = mod.generatePasswordResetToken;
  });

  it('should verify a valid access token and return payload', async () => {
    const token = await generateAccessToken({
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'admin',
    });
    const result = await verifyToken(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe('user-123');
    expect(result!.email).toBe('test@example.com');
    expect(result!.role).toBe('admin');
  });

  it('should return null for tokens with non-access type', async () => {
    // Use generatePasswordResetToken which creates type='password-reset'
    const token = await generatePasswordResetToken('user-789');
    const result = await verifyToken(token);
    expect(result).toBeNull();
  });

  it('should accept tokens with no type (legacy)', async () => {
    // Use generateToken which doesn't set a type in the payload by default
    const token = await generateToken({
      userId: 'u',
      email: 'e@e.com',
      username: 'un',
      role: 'admin',
    });
    const result = await verifyToken(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe('u');
  });

  it('should return null for invalid/tampered tokens', async () => {
    const result = await verifyToken('invalid.token.value');
    expect(result).toBeNull();
  });

  it('should use name field as username fallback', async () => {
    // generateToken allows any payload, so use 'name' instead of 'username'
    const token = await generateToken({
      userId: 'u',
      email: 'e@e.com',
      name: 'TestName',
      role: 'admin',
      type: 'access',
    });
    const result = await verifyToken(token);
    expect(result).not.toBeNull();
    expect(result!.username).toBe('TestName');
  });

  it('should include organizationId when present', async () => {
    const token = await generateAccessToken({
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'admin',
      organizationId: 'org-1',
    });
    const result = await verifyToken(token);
    expect(result).not.toBeNull();
    expect(result!.organizationId).toBe('org-1');
  });
});

describe('JWT Module — verifyPasswordResetToken', () => {
  let verifyPasswordResetToken: typeof import('@/lib/auth/modules/jwt').verifyPasswordResetToken;
  let generatePasswordResetToken: typeof import('@/lib/auth/modules/jwt').generatePasswordResetToken;
  let generateAccessToken: typeof import('@/lib/auth/modules/jwt').generateAccessToken;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/modules/jwt');
    verifyPasswordResetToken = mod.verifyPasswordResetToken;
    generatePasswordResetToken = mod.generatePasswordResetToken;
    generateAccessToken = mod.generateAccessToken;
  });

  it('should verify a valid password reset token', async () => {
    const token = await generatePasswordResetToken('user-789');
    const result = await verifyPasswordResetToken(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe('user-789');
  });

  it('should return null for non-password-reset tokens', async () => {
    // Use generateAccessToken which creates type='access'
    const token = await generateAccessToken({
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'admin',
    });
    const result = await verifyPasswordResetToken(token);
    expect(result).toBeNull();
  });

  it('should return null for invalid tokens', async () => {
    const result = await verifyPasswordResetToken('invalid-token');
    expect(result).toBeNull();
  });
});

describe('JWT Module — verifyEmailVerificationToken', () => {
  let verifyEmailVerificationToken: typeof import('@/lib/auth/modules/jwt').verifyEmailVerificationToken;
  let generateEmailVerificationToken: typeof import('@/lib/auth/modules/jwt').generateEmailVerificationToken;
  let generateAccessToken: typeof import('@/lib/auth/modules/jwt').generateAccessToken;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/modules/jwt');
    verifyEmailVerificationToken = mod.verifyEmailVerificationToken;
    generateEmailVerificationToken = mod.generateEmailVerificationToken;
    generateAccessToken = mod.generateAccessToken;
  });

  it('should verify a valid email verification token', async () => {
    const token = await generateEmailVerificationToken('test@example.com', 'user-001');
    const result = await verifyEmailVerificationToken(token);
    expect(result).not.toBeNull();
    expect(result!.email).toBe('test@example.com');
    expect(result!.userId).toBe('user-001');
  });

  it('should return null for non-email-verification tokens', async () => {
    const token = await generateAccessToken({
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'admin',
    });
    const result = await verifyEmailVerificationToken(token);
    expect(result).toBeNull();
  });

  it('should return null for invalid tokens', async () => {
    const result = await verifyEmailVerificationToken('invalid-token');
    expect(result).toBeNull();
  });
});

describe('JWT Module — getTokenExpiration', () => {
  let getTokenExpiration: typeof import('@/lib/auth/modules/jwt').getTokenExpiration;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/modules/jwt');
    getTokenExpiration = mod.getTokenExpiration;
  });

  it('should parse seconds correctly', () => {
    const before = Date.now();
    const result = getTokenExpiration('60s');
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before + 60000);
    expect(result.getTime()).toBeLessThanOrEqual(after + 60000);
  });

  it('should parse minutes correctly', () => {
    const before = Date.now();
    const result = getTokenExpiration('30m');
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before + 30 * 60 * 1000);
    expect(result.getTime()).toBeLessThanOrEqual(after + 30 * 60 * 1000);
  });

  it('should parse hours correctly', () => {
    const before = Date.now();
    const result = getTokenExpiration('2h');
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before + 2 * 60 * 60 * 1000);
    expect(result.getTime()).toBeLessThanOrEqual(after + 2 * 60 * 60 * 1000);
  });

  it('should parse days correctly', () => {
    const before = Date.now();
    const result = getTokenExpiration('7d');
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before + 7 * 24 * 60 * 60 * 1000);
    expect(result.getTime()).toBeLessThanOrEqual(after + 7 * 24 * 60 * 60 * 1000);
  });

  it('should throw for invalid format', () => {
    expect(() => getTokenExpiration('invalid')).toThrow('Invalid expiration format');
  });

  it('should throw for unsupported time unit like years', () => {
    expect(() => getTokenExpiration('10y')).toThrow('Invalid expiration format');
  });
});

describe('JWT Module — isTokenExpired', () => {
  let isTokenExpired: typeof import('@/lib/auth/modules/jwt').isTokenExpired;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/modules/jwt');
    isTokenExpired = mod.isTokenExpired;
  });

  it('should return true for past exp', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 100;
    expect(isTokenExpired(pastExp)).toBe(true);
  });

  it('should return false for future exp', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    expect(isTokenExpired(futureExp)).toBe(false);
  });

  it('should return true when exp equals current time', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isTokenExpired(now)).toBe(true);
  });
});

describe('JWT Module — decodeToken', () => {
  let decodeToken: typeof import('@/lib/auth/modules/jwt').decodeToken;
  let generateAccessToken: typeof import('@/lib/auth/modules/jwt').generateAccessToken;

  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    const mod = await import('@/lib/auth/modules/jwt');
    decodeToken = mod.decodeToken;
    generateAccessToken = mod.generateAccessToken;
  });

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, configurable: true });
  });

  it('should decode a valid token in development mode', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true });
    const token = await generateAccessToken({
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'admin',
    });
    const result = decodeToken(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe('user-123');
    expect(result!.email).toBe('test@example.com');
  });

  it('should return null in production mode', async () => {
    // Generate token while still in non-production mode
    const token = await generateAccessToken({
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'admin',
    });
    // Now switch to production — decodeToken should return null
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });
    const result = decodeToken(token);
    expect(result).toBeNull();
  });

  it('should return null for malformed tokens', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true });
    expect(decodeToken('not-a-jwt')).toBeNull();
    expect(decodeToken('only.two')).toBeNull();
  });

  it('should return null for tokens with invalid base64', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true });
    expect(decodeToken('a.!!!.c')).toBeNull();
  });
});

describe('JWT Module — exported constants', () => {
  it('should export AUTH_COOKIE_NAMES', async () => {
    const mod = await import('@/lib/auth/modules/jwt');
    expect(mod.AUTH_COOKIE_NAMES).toBeDefined();
    expect(mod.AUTH_COOKIE_NAMES.ACCESS_TOKEN).toBe('blue_token');
    expect(mod.AUTH_COOKIE_NAMES.REFRESH_TOKEN).toBe('blue_refresh_token');
  });

  it('should export TOKEN_EXPIRY', async () => {
    const mod = await import('@/lib/auth/modules/jwt');
    expect(mod.TOKEN_EXPIRY).toBeDefined();
    expect(mod.TOKEN_EXPIRY.ACCESS_TOKEN).toBe('15m');
    expect(mod.TOKEN_EXPIRY.ACCESS_TOKEN_MAX_AGE).toBe(15 * 60);
  });
});
