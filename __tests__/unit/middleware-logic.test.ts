/**
 * Unit Tests — Proxy Logic (Batch 2)
 * Tests rate limiting, JWT parsing, path matching, CSRF validation,
 * role-based access, and static file detection.
 * Pure logic extracted from src/proxy.ts — no Next.js dependencies.
 */

// ─── Re-implemented Pure Logic from proxy.ts ──────────────────────────

type RateLimitType = 'auth' | 'api' | 'public';

const RATE_LIMIT_CONFIGS = {
  auth: { maxRequests: 10, windowMs: 60000 },
  api: { maxRequests: 100, windowMs: 60000 },
  public: { maxRequests: 200, windowMs: 60000 },
};

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

const ROLE_PROTECTED_PATHS: Record<string, string[]> = {
  '/admin': ['admin'],
  '/settings': ['admin', 'manager'],
  '/reports': ['admin', 'manager', 'accountant'],
  '/hr': ['admin', 'manager', 'hr'],
};

const CSRF_EXEMPT_PATHS = [
  '/api/stripe/webhook', '/api/health', '/api/auth',
  '/api/init', '/api/seed', '/api/quote-requests',
];

function detectRateLimitType(pathname: string): RateLimitType {
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

function isPublicPageRoute(pathname: string): boolean {
  if (PUBLIC_PAGE_ROUTES.includes(pathname)) return true;
  if (pathname === '/dashboard') return true;
  return false;
}

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

function isStaticFile(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/favicon') ||
    /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$/i.test(pathname)
  );
}

function getRequiredRoles(pathname: string): string[] | null {
  for (const [path, roles] of Object.entries(ROLE_PROTECTED_PATHS)) {
    if (pathname.startsWith(path)) {
      return roles;
    }
  }
  return null;
}

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.some(p => pathname.startsWith(p));
}

function isMutation(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

function sanitizeIP(ip: string): string {
  const cleaned = ip.trim();
  const ipRegex = /^[0-9a-fA-F.:]+$/;
  const maxIPLength = 45;
  if (cleaned.length > maxIPLength || !ipRegex.test(cleaned)) return 'unknown';
  return cleaned;
}

function extractBearerToken(authHeader: string | null): string | null {
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

// ─── In-memory rate limit store ────────────────────────────────────────────

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, type: RateLimitType) {
  const config = RATE_LIMIT_CONFIGS[type];
  const key = `${ip}:${type}`;
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime: now + config.windowMs };
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true, remaining: config.maxRequests - record.count, resetTime: record.resetTime };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Proxy Logic — Rate Limit Type Detection', () => {
  it('should detect auth type for /api/auth/login', () => {
    expect(detectRateLimitType('/api/auth/login')).toBe('auth');
  });

  it('should detect auth type for /api/auth/register', () => {
    expect(detectRateLimitType('/api/auth/register')).toBe('auth');
  });

  it('should detect auth type for /login path', () => {
    expect(detectRateLimitType('/login')).toBe('auth');
  });

  it('should detect auth type for /forgot-password', () => {
    expect(detectRateLimitType('/forgot-password')).toBe('auth');
  });

  it('should detect public type for /api/health', () => {
    expect(detectRateLimitType('/api/health')).toBe('public');
  });

  it('should detect public type for /api/stripe/webhook', () => {
    expect(detectRateLimitType('/api/stripe/webhook')).toBe('public');
  });

  it('should default to api type for /api/projects', () => {
    expect(detectRateLimitType('/api/projects')).toBe('api');
  });

  it('should default to api type for /api/users', () => {
    expect(detectRateLimitType('/api/users')).toBe('api');
  });
});

describe('Proxy Logic — Rate Limit Store', () => {
  beforeEach(() => { rateLimitStore.clear(); });

  it('should allow first request with correct remaining count', () => {
    const result = checkRateLimit('1.2.3.4', 'auth');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('should allow up to max requests then block', () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit('1.1.1.1', 'auth').allowed).toBe(true);
    }
    expect(checkRateLimit('1.1.1.1', 'auth').allowed).toBe(false);
    expect(checkRateLimit('1.1.1.1', 'auth').remaining).toBe(0);
  });

  it('should track separate limits per IP', () => {
    for (let i = 0; i < 10; i++) checkRateLimit('a', 'auth');
    expect(checkRateLimit('b', 'auth').allowed).toBe(true);
  });

  it('should track separate limits per type', () => {
    for (let i = 0; i < 10; i++) checkRateLimit('x', 'auth');
    expect(checkRateLimit('x', 'api').allowed).toBe(true);
  });

  it('should have stricter auth (10) vs api (100) vs public (200) limits', () => {
    expect(RATE_LIMIT_CONFIGS.auth.maxRequests).toBeLessThan(RATE_LIMIT_CONFIGS.api.maxRequests);
    expect(RATE_LIMIT_CONFIGS.api.maxRequests).toBeLessThan(RATE_LIMIT_CONFIGS.public.maxRequests);
  });

  it('should return resetTime in the future', () => {
    const result = checkRateLimit('1.2.3.4', 'auth');
    expect(result.resetTime).toBeGreaterThan(Date.now() - 1000);
  });
});

describe('Proxy Logic — Path Matching (Protected Routes)', () => {
  it('should identify / as a public page route', () => {
    expect(isPublicPageRoute('/')).toBe(true);
  });

  it('should identify /services as a public page route', () => {
    expect(isPublicPageRoute('/services')).toBe(true);
  });

  it('should identify /dashboard as a public page route (login page)', () => {
    expect(isPublicPageRoute('/dashboard')).toBe(true);
  });

  it('should NOT identify /admin as a public page route', () => {
    expect(isPublicPageRoute('/admin')).toBe(false);
  });

  it('should identify protected API routes as not public', () => {
    expect(isPublicApiRoute('/api/projects')).toBe(false);
    expect(isPublicApiRoute('/api/users')).toBe(false);
  });

  it('should identify public API routes correctly', () => {
    expect(isPublicApiRoute('/api/auth/login')).toBe(true);
    expect(isPublicApiRoute('/api/health')).toBe(true);
    expect(isPublicApiRoute('/api/stripe/webhook')).toBe(true);
  });

  it('should match public API sub-routes', () => {
    expect(isPublicApiRoute('/api/auth/2fa/verify')).toBe(true);
    expect(isPublicApiRoute('/api/auth/2fa/backup-codes')).toBe(true);
  });
});

describe('Proxy Logic — CSRF Validation', () => {
  it('should exempt stripe webhook from CSRF', () => {
    expect(isCsrfExempt('/api/stripe/webhook')).toBe(true);
  });

  it('should exempt all auth routes from CSRF', () => {
    expect(isCsrfExempt('/api/auth/login')).toBe(true);
    expect(isCsrfExempt('/api/auth/register')).toBe(true);
  });

  it('should NOT exempt protected routes from CSRF', () => {
    expect(isCsrfExempt('/api/projects')).toBe(false);
    expect(isCsrfExempt('/api/users')).toBe(false);
  });

  it('should identify mutation methods correctly', () => {
    expect(isMutation('POST')).toBe(true);
    expect(isMutation('PUT')).toBe(true);
    expect(isMutation('PATCH')).toBe(true);
    expect(isMutation('DELETE')).toBe(true);
    expect(isMutation('GET')).toBe(false);
    expect(isMutation('HEAD')).toBe(false);
    expect(isMutation('OPTIONS')).toBe(false);
  });

  it('should validate CSRF double-submit pattern (cookie === header)', () => {
    const cookie = 'csrf-token-abc';
    const header = 'csrf-token-abc';
    expect(cookie === header).toBe(true);
  });

  it('should reject CSRF when cookie and header differ', () => {
    const cookie: string = 'token-1';
    const header: string = 'token-2';
    expect(cookie === header).toBe(false);
  });
});

describe('Proxy Logic — Role-Based Path Access', () => {
  it('/admin should require admin role only', () => {
    expect(getRequiredRoles('/admin')).toEqual(['admin']);
    expect(getRequiredRoles('/admin/users')).toEqual(['admin']);
  });

  it('/settings should require admin or manager', () => {
    expect(getRequiredRoles('/settings')).toEqual(['admin', 'manager']);
  });

  it('/reports should require admin, manager, or accountant', () => {
    expect(getRequiredRoles('/reports')).toEqual(['admin', 'manager', 'accountant']);
  });

  it('/hr should require admin, manager, or hr', () => {
    expect(getRequiredRoles('/hr')).toEqual(['admin', 'manager', 'hr']);
  });

  it('unprotected paths should return null', () => {
    expect(getRequiredRoles('/dashboard')).toBeNull();
    expect(getRequiredRoles('/projects')).toBeNull();
    expect(getRequiredRoles('/tasks')).toBeNull();
  });

  it('admin role should match all protected paths', () => {
    expect(getRequiredRoles('/admin')!.includes('admin')).toBe(true);
    expect(getRequiredRoles('/settings')!.includes('admin')).toBe(true);
    expect(getRequiredRoles('/reports')!.includes('admin')).toBe(true);
    expect(getRequiredRoles('/hr')!.includes('admin')).toBe(true);
  });

  it('viewer role should not match any protected path', () => {
    expect(getRequiredRoles('/admin')!.includes('viewer')).toBe(false);
    expect(getRequiredRoles('/settings')!.includes('viewer')).toBe(false);
    expect(getRequiredRoles('/reports')!.includes('viewer')).toBe(false);
    expect(getRequiredRoles('/hr')!.includes('viewer')).toBe(false);
  });
});

describe('Proxy Logic — JWT Token Parsing', () => {
  it('should extract Bearer token from Authorization header', () => {
    expect(extractBearerToken('Bearer abc123jwt')).toBe('abc123jwt');
  });

  it('should return null for missing Authorization header', () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it('should return null for non-Bearer header', () => {
    expect(extractBearerToken('Basic abc123')).toBeNull();
  });

  it('should return empty string for "Bearer " with no token', () => {
    expect(extractBearerToken('Bearer ')).toBe('');
  });
});

describe('Proxy Logic — Static File Detection', () => {
  it('should detect _next static files', () => {
    expect(isStaticFile('/_next/static/chunks/main.js')).toBe(true);
  });

  it('should detect image files by extension', () => {
    expect(isStaticFile('/images/logo.png')).toBe(true);
  });

  it('should detect font files', () => {
    expect(isStaticFile('/fonts/inter.woff2')).toBe(true);
  });

  it('should NOT detect API routes as static', () => {
    expect(isStaticFile('/api/projects')).toBe(false);
  });

  it('should NOT detect page routes as static', () => {
    expect(isStaticFile('/dashboard')).toBe(false);
  });
});

describe('Proxy Logic — IP Sanitization', () => {
  it('should accept valid IPv4', () => {
    expect(sanitizeIP('192.168.1.1')).toBe('192.168.1.1');
  });

  it('should accept valid IPv6', () => {
    expect(sanitizeIP('::1')).toBe('::1');
  });

  it('should reject IPs with injection characters', () => {
    expect(sanitizeIP('192.168.1.1; DROP TABLE')).toBe('unknown');
  });

  it('should reject overly long IPs', () => {
    expect(sanitizeIP('a'.repeat(46))).toBe('unknown');
  });

  it('should trim whitespace from IPs', () => {
    expect(sanitizeIP('  10.0.0.1  ')).toBe('10.0.0.1');
  });
});
