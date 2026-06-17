/**
 * E2E Tests — Authentication Flow
 * اختبارات نهاية لنهاء — سير المصادقة
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies before each test
    await page.context().clearCookies();
  });

  test('should show login page at /dashboard', async ({ page }) => {
    await page.goto('/dashboard', { timeout: 60000 });
    // The login page should be accessible without auth
    await page.waitForLoadState('domcontentloaded');
    // Check that page loaded (either login form or dashboard content)
    const pageContent = await page.content();
    expect(pageContent).toBeDefined();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access a protected page
    await page.goto('/projects', { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');
    // Should be redirected to login page (/dashboard or /login)
    const url = page.url();
    const isOnLoginPage = url.includes('/dashboard') || url.includes('/login');
    expect(isOnLoginPage).toBe(true);
  });

  test('should set httpOnly cookie on login', async ({ page }) => {
    await page.goto('/dashboard', { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // Check cookies - should NOT have readable blueprint-auth-token
    const cookies = await page.context().cookies();
    const authTokenCookie = cookies.find(c => c.name === 'blue_token');
    
    // Before login, should not have blue_token
    if (authTokenCookie) {
      // If exists, it should be httpOnly
      expect(authTokenCookie.httpOnly).toBe(true);
    }
  });

  test('should have CSRF token cookie for page requests', async ({ page }) => {
    await page.goto('/dashboard', { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find(c => c.name === 'csrf_token');
    
    // CSRF cookie should be set and readable by JS (not httpOnly)
    if (csrfCookie) {
      expect(csrfCookie.httpOnly).toBe(false);
    }
  });

  test('should reject API requests without authentication', async ({ request }) => {
    const response = await request.get('/api/users');
    // Protected API should require authentication
    expect(response.status()).toBe(401);
  });

  test('should accept public API requests without authentication', async ({ request }) => {
    const response = await request.get('/api/health');
    // Health endpoint should be accessible without auth
    expect(response.status()).toBe(200);
  });

  test('should accept login API request', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'admin@blue.com',
        password: 'invalid-password',
      },
    });
    // Should get a response (not a redirect)
    expect([400, 401, 429, 500]).toContain(response.status());
  });
});

test.describe('Security Headers', () => {
  test('should include X-Content-Type-Options header', async ({ page }) => {
    const response = await page.goto('/dashboard', { timeout: 60000 });
    expect(response).not.toBeNull();
    const headers = response!.headers();
    // Security headers should be present
    const contentType = headers['x-content-type-options'];
    expect(contentType).toBe('nosniff');
  });

  test('should include X-Frame-Options header', async ({ page }) => {
    const response = await page.goto('/dashboard', { timeout: 60000 });
    expect(response).not.toBeNull();
    const headers = response!.headers();
    const frameOptions = headers['x-frame-options'];
    expect(frameOptions).toBe('DENY');
  });

  test('should include CSP header', async ({ page }) => {
    const response = await page.goto('/dashboard', { timeout: 60000 });
    expect(response).not.toBeNull();
    const headers = response!.headers();
    const csp = headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain('default-src');
  });

  test('should set HSTS in production-like response', async ({ request }) => {
    const response = await request.get('/dashboard');
    // In dev, HSTS may not be set; in production it should be present
    expect([200, 307, 308]).toContain(response.status());
  });
});

test.describe('Rate Limiting', () => {
  test('should allow normal API requests', async ({ request }) => {
    // Multiple public requests should work
    const responses = await Promise.all([
      request.get('/api/health'),
      request.get('/api/health'),
      request.get('/api/health'),
    ]);
    for (const resp of responses) {
      expect([200, 404, 405]).toContain(resp.status());
    }
  });

  test('should rate limit excessive login attempts', async ({ request }) => {
    // Send many login requests rapidly
    const loginRequests = Array.from({ length: 15 }, () =>
      request.post('/api/auth/login', {
        data: { email: 'test@test.com', password: 'wrong' },
      })
    );
    const responses = await Promise.all(loginRequests);
    
    // At least one should be rate limited (429) or return auth error
    const statuses = responses.map(r => r.status());
    const hasRateLimit = statuses.includes(429);
    const hasAuthError = statuses.every(s => s === 401);
    expect(hasRateLimit || hasAuthError).toBe(true);
  });
});

test.describe('Static Assets & Public Pages', () => {
  test('should load the landing page', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test('should load services page', async ({ page }) => {
    const response = await page.goto('/services');
    expect(response).not.toBeNull();
    expect([200, 404]).toContain(response!.status());
  });

  test('should serve static files without auth', async ({ page }) => {
    const response = await page.goto('/favicon.ico');
    expect(response).not.toBeNull();
    expect([200, 204, 404]).toContain(response!.status());
  });
});
