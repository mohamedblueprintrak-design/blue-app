/**
 * Unit Tests — JWT Token Operations
 * اختبارات عمليات رموز JWT
 *
 * Uses dynamic import for jose (ESM-only) with a single top-level beforeAll.
 */

let SignJWT: typeof import('jose').SignJWT;
let jwtVerify: typeof import('jose').jwtVerify;
const secret = new TextEncoder().encode('blue-test-secret-key-must-be-at-least-32-chars!');

beforeAll(async () => {
  const jose = await import('jose');
  SignJWT = jose.SignJWT;
  jwtVerify = jose.jwtVerify;
});

async function makeToken(payload: Record<string, unknown>, expiresIn: string = '2h'): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('blueprint-saas')
    .setAudience('blueprint-users')
    .setExpirationTime(expiresIn)
    .sign(secret);
}

describe('JWT Token Operations', () => {
  it('should generate and verify a valid access token', async () => {
    const token = await makeToken({
      userId: 'user-123',
      email: 'test@blue.com',
      username: 'testuser',
      role: 'admin',
    });

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const { payload } = await jwtVerify(token, secret, {
      issuer: 'blueprint-saas',
      audience: 'blueprint-users',
    });

    expect(payload.userId).toBe('user-123');
    expect(payload.email).toBe('test@blue.com');
    expect(payload.role).toBe('admin');
  });

  it('should generate and verify a refresh token', async () => {
    const token = await makeToken({ userId: 'user-456', type: 'refresh' }, '7d');
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'blueprint-saas',
      audience: 'blueprint-users',
    });
    expect(payload.userId).toBe('user-456');
    expect(payload.type).toBe('refresh');
  });

  it('should reject tokens with wrong issuer', async () => {
    const wrongIssuerToken = await new SignJWT({ userId: 'u', email: 't@t.com', username: 't', role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('wrong-issuer')
      .setAudience('blueprint-users')
      .setExpirationTime('2h')
      .sign(secret);

    await expect(jwtVerify(wrongIssuerToken, secret, {
      issuer: 'blueprint-saas',
      audience: 'blueprint-users',
    })).rejects.toThrow();
  });

  it('should reject tokens with wrong audience', async () => {
    const wrongAudToken = await new SignJWT({ userId: 'u', email: 't@t.com', username: 't', role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('blueprint-saas')
      .setAudience('wrong-audience')
      .setExpirationTime('2h')
      .sign(secret);

    await expect(jwtVerify(wrongAudToken, secret, {
      issuer: 'blueprint-saas',
      audience: 'blueprint-users',
    })).rejects.toThrow();
  });

  it('should reject expired tokens', async () => {
    const expiredToken = await makeToken({ userId: 'u', email: 't@t.com', username: 't', role: 'admin' }, '0s');
    await expect(jwtVerify(expiredToken, secret, {
      issuer: 'blueprint-saas',
      audience: 'blueprint-users',
    })).rejects.toThrow();
  });

  it('should reject tokens signed with wrong secret', async () => {
    const wrongSecret = new TextEncoder().encode('wrong-secret-key-must-be-32-chars-long!!');
    const badToken = await new SignJWT({ userId: 'u', email: 't@t.com', username: 't', role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('blueprint-saas')
      .setAudience('blueprint-users')
      .setExpirationTime('2h')
      .sign(wrongSecret);

    await expect(jwtVerify(badToken, secret, {
      issuer: 'blueprint-saas',
      audience: 'blueprint-users',
    })).rejects.toThrow();
  });

  it('should generate different tokens for different payloads', async () => {
    const token1 = await makeToken({ userId: 'user-1', email: 'a@b.com', username: 'u1', role: 'admin' });
    const token2 = await makeToken({ userId: 'user-2', email: 'c@d.com', username: 'u2', role: 'viewer' });
    expect(token1).not.toBe(token2);
  });

  it('should include iat and exp in payload', async () => {
    const token = await makeToken({ userId: 'u', email: 't@t.com', username: 't', role: 'admin' });
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'blueprint-saas',
      audience: 'blueprint-users',
    });
    expect(payload.iat).toBeDefined();
    expect(payload.exp).toBeDefined();
    expect(payload.exp!).toBeGreaterThan(payload.iat!);
  });
});

describe('Token Expiration Parsing', () => {
  function parseExpirationMs(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return -1;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return -1;
    }
  }

  it('should parse 2h as 7,200,000 ms', () => expect(parseExpirationMs('2h')).toBe(7200000));
  it('should parse 7d as 604,800,000 ms', () => expect(parseExpirationMs('7d')).toBe(604800000));
  it('should parse 30m as 1,800,000 ms', () => expect(parseExpirationMs('30m')).toBe(1800000));
  it('should parse 60s as 60,000 ms', () => expect(parseExpirationMs('60s')).toBe(60000));
  it('should return -1 for invalid format', () => {
    expect(parseExpirationMs('invalid')).toBe(-1);
    expect(parseExpirationMs('')).toBe(-1);
    expect(parseExpirationMs('10y')).toBe(-1);
  });
});

describe('JWT Base64 Decoding', () => {
  it('should decode token payload without verification', async () => {
    const token = await makeToken({ userId: 'user-123', email: 't@t.com', username: 't', role: 'admin' });
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    expect(payload.userId).toBe('user-123');
    expect(payload.email).toBe('t@t.com');
  });

  it('should handle malformed tokens gracefully', () => {
    expect(() => JSON.parse(Buffer.from('!!!', 'base64').toString())).toThrow();
    expect('not-a-jwt'.split('.')).not.toHaveLength(3);
  });
});
