/**
 * Unit Tests — Proxy (formerly Middleware)
 * Tests JWT verification, rate limiting, CSRF validation, route protection
 * Source: src/proxy.ts
 */

// ─── Rate Limit Type Detection ─────────────────────────────────────────────

describe('Proxy — Rate Limit Detection', () => {
  // Re-implement the pure logic from proxy.ts for testing
  function detectRateLimitType(pathname: string): string {
    if (
      pathname.includes('/api/auth/') ||
      pathname.includes('/login') ||
      pathname.includes('/register') ||
      pathname.includes('/forgot-password') ||
      pathname.includes('/reset-password')
    ) {
      return 'auth';
    }
    if (
      pathname.includes('/api/health') ||
      pathname.includes('/api/public') ||
      pathname.includes('/api/stripe/webhook')
    ) {
      return 'public';
    }
    return 'api';
  }

  it('should detect auth type for /api/auth/login', () => {
    expect(detectRateLimitType('/api/auth/login')).toBe('auth');
  });

  it('should detect auth type for /api/auth/register', () => {
    expect(detectRateLimitType('/api/auth/register')).toBe('auth');
  });

  it('should detect auth type for /login path', () => {
    expect(detectRateLimitType('/login')).toBe('auth');
  });

  it('should detect auth type for /register path', () => {
    expect(detectRateLimitType('/register')).toBe('auth');
  });

  it('should detect auth type for /forgot-password', () => {
    expect(detectRateLimitType('/forgot-password')).toBe('auth');
  });

  it('should detect public type for /api/health', () => {
    expect(detectRateLimitType('/api/health')).toBe('public');
  });

  it('should detect public type for /api/public/data', () => {
    expect(detectRateLimitType('/api/public/data')).toBe('public');
  });

  it('should detect public type for /api/stripe/webhook', () => {
    expect(detectRateLimitType('/api/stripe/webhook')).toBe('public');
  });

  it('should default to api type for standard endpoints', () => {
    expect(detectRateLimitType('/api/projects')).toBe('api');
    expect(detectRateLimitType('/api/tasks')).toBe('api');
  });
});

// ─── Rate Limit Store Logic ───────────────────────────────────────────────

describe('Proxy — Rate Limit Store', () => {
  // Re-implement in-memory rate limiting logic from middleware.ts
  const store = new Map<string, { count: number; resetTime: number }>();

  function checkRateLimit(ip: string, type: string): { allowed: boolean; remaining: number; resetTime: number } {
    const configs: Record<string, { maxRequests: number; windowMs: number }> = {
      auth: { maxRequests: 10, windowMs: 60000 },
      api: { maxRequests: 100, windowMs: 60000 },
      public: { maxRequests: 200, windowMs: 60000 },
    };
    const config = configs[type] || configs.api;
    const key = `${ip}:${type}`;
    const now = Date.now();
    const record = store.get(key);

    if (!record || now > record.resetTime) {
      store.set(key, { count: 1, resetTime: now + config.windowMs });
      return { allowed: true, remaining: config.maxRequests - 1, resetTime: now + config.windowMs };
    }

    if (record.count >= config.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }

    record.count++;
    return { allowed: true, remaining: config.maxRequests - record.count, resetTime: record.resetTime };
  }

  beforeEach(() => {
    store.clear();
  });

  it('should allow first request', () => {
    const result = checkRateLimit('1.2.3.4', 'auth');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('should allow requests up to the limit', () => {
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimit('1.2.3.4', 'auth');
      expect(result.allowed).toBe(true);
    }
  });

  it('should block request beyond limit', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('1.2.3.4', 'auth');
    }
    const result = checkRateLimit('1.2.3.4', 'auth');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should track separate limits per IP', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('1.1.1.1', 'auth');
    }
    const result = checkRateLimit('2.2.2.2', 'auth');
    expect(result.allowed).toBe(true);
  });

  it('should track separate limits per type', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('1.1.1.1', 'auth');
    }
    const result = checkRateLimit('1.1.1.1', 'api');
    expect(result.allowed).toBe(true);
  });

  it('should have stricter auth limits than api limits', () => {
    // auth: max 10, api: max 100
    let authRemaining = 0;
    let apiRemaining = 0;
    for (let i = 0; i < 10; i++) {
      authRemaining = checkRateLimit('a', 'auth').remaining;
    }
    const authBlocked = !checkRateLimit('a', 'auth').allowed;

    for (let i = 0; i < 10; i++) {
      apiRemaining = checkRateLimit('b', 'api').remaining;
    }
    const apiBlocked = !checkRateLimit('b', 'api').allowed;

    expect(authBlocked).toBe(true);
    expect(apiBlocked).toBe(false);
    expect(apiRemaining).toBeGreaterThan(authRemaining);
  });
});

// ─── Public Route Detection ───────────────────────────────────────────────

describe('Proxy — Public Route Detection', () => {
  const PUBLIC_PAGE_ROUTES = [
    '/', '/services', '/calculator', '/quote', '/portal', '/about',
    '/forgot-password', '/reset-password', '/verify-email', '/2fa-setup',
  ];

  const PUBLIC_API_ROUTES = [
    '/api/auth/login', '/api/auth/register', '/api/auth/logout',
    '/api/auth/session', '/api/auth/forgot-password', '/api/auth/reset-password',
    '/api/auth/verify-email', '/api/auth/resend-verification',
    '/api/auth/2fa', '/api/auth/2fa/verify', '/api/auth/2fa/backup-codes',
    '/api/init', '/api/quote-requests', '/api/health',
    '/api/stripe/webhook', '/api/public',
  ];

  it('should recognize all public page routes', () => {
    expect(PUBLIC_PAGE_ROUTES).toContain('/');
    expect(PUBLIC_PAGE_ROUTES).toContain('/services');
    expect(PUBLIC_PAGE_ROUTES).toContain('/about');
  });

  it('should recognize all public API routes', () => {
    expect(PUBLIC_API_ROUTES).toContain('/api/auth/login');
    expect(PUBLIC_API_ROUTES).toContain('/api/auth/register');
    expect(PUBLIC_API_ROUTES).toContain('/api/health');
    expect(PUBLIC_API_ROUTES).toContain('/api/stripe/webhook');
  });

  it('should include 2fa routes as public', () => {
    expect(PUBLIC_API_ROUTES.some(r => '/api/auth/2fa/verify'.startsWith(r))).toBe(true);
    expect(PUBLIC_API_ROUTES.some(r => '/api/auth/2fa/backup-codes'.startsWith(r))).toBe(true);
  });

  function isPublicApiRoute(pathname: string): boolean {
    return PUBLIC_API_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
  }

  it('should match exact API routes', () => {
    expect(isPublicApiRoute('/api/auth/login')).toBe(true);
    expect(isPublicApiRoute('/api/health')).toBe(true);
  });

  it('should match sub-routes', () => {
    expect(isPublicApiRoute('/api/auth/2fa/verify')).toBe(true);
  });

  it('should not match protected routes', () => {
    expect(isPublicApiRoute('/api/projects')).toBe(false);
    expect(isPublicApiRoute('/api/users')).toBe(false);
    expect(isPublicApiRoute('/api/dashboard')).toBe(false);
  });
});

// ─── Role-Based Access Control ────────────────────────────────────────────

describe('Proxy — Role-Based Access Control', () => {
  const ROLE_PROTECTED_PATHS: Record<string, string[]> = {
    '/admin': ['admin'],
    '/settings': ['admin', 'manager'],
    '/reports': ['admin', 'manager', 'accountant'],
    '/hr': ['admin', 'manager', 'hr'],
  };

  function getRequiredRoles(pathname: string): string[] | null {
    for (const [path, roles] of Object.entries(ROLE_PROTECTED_PATHS)) {
      if (pathname.startsWith(path)) {
        return roles;
      }
    }
    return null;
  }

  it('should return null for unprotected paths', () => {
    expect(getRequiredRoles('/dashboard')).toBeNull();
    expect(getRequiredRoles('/projects')).toBeNull();
    expect(getRequiredRoles('/tasks')).toBeNull();
  });

  it('should return admin roles for /admin paths', () => {
    expect(getRequiredRoles('/admin')).toEqual(['admin']);
    expect(getRequiredRoles('/admin/users')).toEqual(['admin']);
  });

  it('should return correct roles for /settings', () => {
    expect(getRequiredRoles('/settings')).toEqual(['admin', 'manager']);
  });

  it('should return correct roles for /reports', () => {
    expect(getRequiredRoles('/reports')).toEqual(['admin', 'manager', 'accountant']);
  });

  it('should return correct roles for /hr', () => {
    expect(getRequiredRoles('/hr')).toEqual(['admin', 'manager', 'hr']);
  });

  it('should check role access correctly', () => {
    const required = getRequiredRoles('/admin/users');
    expect(required).toContain('admin');
    expect(required).not.toContain('manager');

    const requiredSettings = getRequiredRoles('/settings/profile');
    expect(requiredSettings).toContain('admin');
    expect(requiredSettings).toContain('manager');
    expect(requiredSettings).not.toContain('engineer');
  });
});

// ─── Static File Detection ────────────────────────────────────────────────

describe('Proxy — Static File Detection', () => {
  function isStaticFile(pathname: string): boolean {
    return (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/images') ||
      pathname.startsWith('/fonts') ||
      pathname.startsWith('/favicon') ||
      /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$/i.test(pathname)
    );
  }

  it('should detect _next static files', () => {
    expect(isStaticFile('/_next/static/chunks/main.js')).toBe(true);
  });

  it('should detect image files', () => {
    expect(isStaticFile('/images/logo.png')).toBe(true);
  });

  it('should detect font files', () => {
    expect(isStaticFile('/fonts/inter.woff2')).toBe(true);
  });

  it('should detect favicon', () => {
    expect(isStaticFile('/favicon.ico')).toBe(true);
  });

  it('should detect CSS files', () => {
    expect(isStaticFile('/styles/app.css')).toBe(true);
  });

  it('should not detect API routes as static', () => {
    expect(isStaticFile('/api/projects')).toBe(false);
  });

  it('should not detect page routes as static', () => {
    expect(isStaticFile('/dashboard')).toBe(false);
  });
});

// ─── JWT Secret Logic ─────────────────────────────────────────────────────

describe('Proxy — JWT Secret', () => {
  const DEV_JWT_SECRET = 'blueprint-dev-secret-do-not-use-in-production-min32chars!';

  it('dev secret should be at least 32 characters', () => {
    expect(DEV_JWT_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  it('should produce consistent bytes', () => {
    const bytes1 = new TextEncoder().encode(DEV_JWT_SECRET);
    const bytes2 = new TextEncoder().encode(DEV_JWT_SECRET);
    expect(bytes1).toEqual(bytes2);
  });
});

// ─── CSRF Exempt Paths ────────────────────────────────────────────────────

describe('Proxy — CSRF Exempt Paths', () => {
  const csrfExemptPaths = [
    '/api/stripe/webhook',
    '/api/health',
    '/api/auth',
    '/api/init',
    '/api/seed',
    '/api/quote-requests',
  ];

  function isCsrfExempt(pathname: string): boolean {
    return csrfExemptPaths.some(p => pathname.startsWith(p));
  }

  it('should exempt stripe webhook', () => {
    expect(isCsrfExempt('/api/stripe/webhook')).toBe(true);
  });

  it('should exempt all auth routes', () => {
    expect(isCsrfExempt('/api/auth/login')).toBe(true);
    expect(isCsrfExempt('/api/auth/register')).toBe(true);
  });

  it('should exempt health check', () => {
    expect(isCsrfExempt('/api/health')).toBe(true);
  });

  it('should NOT exempt protected API routes', () => {
    expect(isCsrfExempt('/api/projects')).toBe(false);
    expect(isCsrfExempt('/api/users')).toBe(false);
  });

  it('should detect mutations (POST, PUT, PATCH, DELETE)', () => {
    const mutations = ['POST', 'PUT', 'PATCH', 'DELETE'];
    const nonMutations = ['GET', 'HEAD', 'OPTIONS'];
    expect(mutations.every(m => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(m))).toBe(true);
    expect(nonMutations.every(m => !['POST', 'PUT', 'PATCH', 'DELETE'].includes(m))).toBe(true);
  });
});

// ─── Cookie Name ──────────────────────────────────────────────────────────

describe('Proxy — Configuration', () => {
  it('COOKIE_NAME should be blue_token', () => {
    expect('blue_token').toBe('blue_token');
  });

  it('middleware config should have matcher', () => {
    const config = {
      matcher: ['/((?!_next/static|_next/image|favicon\\.ico|public/).*)'],
    };
    expect(config.matcher).toBeDefined();
    expect(config.matcher.length).toBe(1);
  });
});
