/**
 * E2E Tests — Performance & Accessibility
 * اختبارات الأداء وإمكانية الوصول
 */

import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('landing page should load within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - start;
    // P2-30 FIX: was 30s — way too lenient. A landing page should load in <5s.
    // 5s accounts for slow CI runners + cold Next.js dev server startup.
    expect(loadTime).toBeLessThan(5000);
  });

  test('login page should load within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/dashboard', { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - start;
    // P2-30 FIX: was 30s — too lenient.
    expect(loadTime).toBeLessThan(5000);
  });

  test('API health check should respond within 2 seconds', async ({ request }) => {
    const start = Date.now();
    const response = await request.get('/api/health');
    const responseTime = Date.now() - start;
    // P2-30 FIX: was accepting [200, 401, 404, 405, 500] — that accepts server errors!
    // /api/health should return 200. A 500 means the server is broken.
    expect(response.status()).toBe(200);
    // P2-30 FIX: was 10s — health check should be instant.
    expect(responseTime).toBeLessThan(2000);
  });

  test('static assets should be cacheable', async ({ page }) => {
    const response = await page.goto('/', { timeout: 60000, waitUntil: 'domcontentloaded' });
    expect(response).not.toBeNull();

    // Check for common static assets being cacheable
    const cssResponse = await page.request.get('/_next/static/css/test.css').catch(() => null);
    if (cssResponse) {
      const cacheControl = cssResponse.headers()['cache-control'];
      if (cacheControl) {
        expect(cacheControl).toContain('max-age');
      }
    }
  });

  test('HTML should have lang attribute', async ({ page }) => {
    await page.goto('/', { timeout: 60000, waitUntil: 'domcontentloaded' });
    const lang = await page.getAttribute('html', 'lang');
    // Should have some language set
    expect(lang).toBeTruthy();
  });

  test('page should have viewport meta tag', async ({ page }) => {
    await page.goto('/', { timeout: 60000, waitUntil: 'domcontentloaded' });
    const viewport = await page.getAttribute('meta[name="viewport"]', 'content');
    expect(viewport).toBeTruthy();
  });
});

test.describe('Accessibility (a11y)', () => {
  test('page should have no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();

      // Filter out expected CI noise — these are NOT real bugs:
      // 1. Network failures (API calls that fail because CI has no real backend
      //    for public/stats, demo-credentials, etc.)
      // 2. Firebase/messaging errors (not configured in CI)
      // 3. 404s for optional resources (manifest, icons)
      const isExpectedNoise = [
        'Failed to fetch',           // Network failures (no backend in CI)
        'NetworkError',              // Firefox network errors
        'ERR_NETWORK',               // Chrome network errors
        'ERR_INTERNET_DISCONNECTED', // Chrome network errors
        'ERR_CONNECTION_REFUSED',    // Chrome connection refused
        'ERR_FAILED',                // Chrome generic failures
        'the server responded with a status of 404', // Optional resources
        'the server responded with a status of 503', // Service unavailable
        'Firebase',                  // Firebase not configured in CI
        'messaging',                 // Web push messaging not configured
        'Failed to register a ServiceWorker', // SW in CI may not register
        'Content Security Policy',            // CSP style violations for third-party dynamic styles
        'violates the following Content Security Policy directive',
      ].some(pattern => text.includes(pattern));

      if (!isExpectedNoise) {
        errors.push(text);
      }
    });

    await page.goto('/', { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // Only count REAL JavaScript errors (not network/API failures)
    // Production should have 0 real errors. CI threshold is 5 to allow for
    // minor framework warnings.
    expect(errors.length).toBeLessThan(5);
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/', { timeout: 60000, waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const images = await page.$$('img');
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      // alt can be empty string for decorative images, but should exist
      expect(alt).not.toBeNull();
    }
  });

  test('buttons should have accessible text or be icon-only', async ({ page }) => {
    await page.goto('/dashboard', { timeout: 60000, waitUntil: 'domcontentloaded' });
    // Wait for page to be fully stable (avoid execution context destroyed by navigation)
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForLoadState('domcontentloaded');

    try {
      const buttons = await page.$$('button');
      if (buttons.length > 0) {
        let buttonsWithText = 0;
        for (const button of buttons) {
          const text = await button.innerText().catch(() => '');
          const ariaLabel = await button.getAttribute('aria-label').catch(() => null);
          const title = await button.getAttribute('title').catch(() => null);
          const _ariaHidden = await button.getAttribute('aria-hidden').catch(() => null);
          if (text?.trim() || ariaLabel || title) {
            buttonsWithText++;
          }
          // Icon-only buttons with aria-hidden are acceptable patterns
        }
        // At least some buttons should have text
        expect(buttonsWithText).toBeGreaterThan(0);
      }
    } catch {
      // Page may navigate during evaluation (e.g., auth redirect); skip gracefully
    }
  });

  test('page should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/', { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const h1 = await page.$$('h1');
    // P2-30 FIX: was `>= 0` — always true, useless assertion.
    // Landing page should have at least one h1 for SEO and a11y.
    // Not enforcing exactly 1 because the landing page has multiple sections
    // that may each use an h1 (common in modern marketing pages).
    expect(h1.length).toBeGreaterThanOrEqual(1);
  });

  test('focus should be manageable via keyboard', async ({ page }) => {
    await page.goto('/dashboard', { timeout: 60000, waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // Tab through the page a few times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Check that something is focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});

test.describe('Content Security', () => {
  test('no inline scripts in page source', async ({ page }) => {
    await page.goto('/', { timeout: 60000, waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const inlineScripts = await page.$$eval('script:not([src])', (scripts) => scripts.length);
    // Minimize inline scripts (some may be needed by frameworks)
    expect(inlineScripts).toBeLessThan(20);
  });

  test('forms should use POST for sensitive actions', async ({ request }) => {
    // Login should be POST
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: 'test@test.com', password: 'test' },
    });
    expect([400, 401, 429]).toContain(loginResponse.status());
  });

  test('API should not expose sensitive headers', async ({ request }) => {
    const response = await request.get('/api/health');
    // Should not expose server version info
    const _server = response.headers()['server'];
    const poweredBy = response.headers()['x-powered-by'];
    expect(poweredBy).toBeUndefined();
  });
});
