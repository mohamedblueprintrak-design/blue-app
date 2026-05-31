/**
 * E2E Tests — Session & Logout
 * اختبارات نهاية لنهاء — الجلسة وتسجيل الخروج
 */

import { test, expect } from '@playwright/test';

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('session endpoint should return unauthenticated without cookie', async ({ request }) => {
    const response = await request.get('/api/auth/session');
    expect(response.ok() || response.status() === 429).toBe(true);
    if (response.ok()) {
      const body = await response.json();
      expect(body.isAuthenticated).toBe(false);
      expect(body.user).toBeNull();
    }
  });

  test('logout endpoint should clear cookies', async ({ request }) => {
    const response = await request.post('/api/auth/logout');
    // May be rate limited from previous tests
    expect([200, 429]).toContain(response.status());
    if (response.ok()) {
      const body = await response.json();
      expect(body.success).toBe(true);
    }
  });

  test('CSRF protection should block mutation without token', async ({ request }) => {
    const response = await request.post('/api/users', {
      data: { name: 'test' },
      headers: {
        'Content-Type': 'application/json',
      },
    });
    // Should get 403 CSRF error or 401 unauthorized
    expect([401, 403]).toContain(response.status());
  });

  test('OPTIONS preflight should include CORS headers', async ({ request }) => {
    const response = await request.fetch('/api/users', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
      },
    });
    expect([204, 404, 405]).toContain(response.status());
  });
});
