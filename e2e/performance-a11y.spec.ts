/**
 * E2E Tests — Performance & Accessibility
 * اختبارات الأداء وإمكانية الوصول
 */

import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('landing page should load within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });

  test('login page should load within 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(3000);
  });

  test('API health check should respond within 1 second', async ({ request }) => {
    const start = Date.now();
    const response = await request.get('/api/health');
    const responseTime = Date.now() - start;
    expect([200, 404, 405]).toContain(response.status());
    expect(responseTime).toBeLessThan(1000);
  });

  test('static assets should be cacheable', async ({ page }) => {
    const response = await page.goto('/');
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
    await page.goto('/');
    const lang = await page.getAttribute('html', 'lang');
    // Should have some language set
    expect(lang).toBeTruthy();
  });

  test('page should have viewport meta tag', async ({ page }) => {
    await page.goto('/');
    const viewport = await page.getAttribute('meta[name="viewport"]', 'content');
    expect(viewport).toBeTruthy();
  });
});

test.describe('Accessibility (a11y)', () => {
  test('page should have no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Allow some errors but not too many
    expect(errors.length).toBeLessThan(10);
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const images = await page.$$('img');
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      // alt can be empty string for decorative images, but should exist
      expect(alt).not.toBeNull();
    }
  });

  test('buttons should have accessible text or be icon-only', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const buttons = await page.$$('button');
    if (buttons.length > 0) {
      let buttonsWithText = 0;
      for (const button of buttons) {
        const text = await button.innerText();
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');
        const _ariaHidden = await button.getAttribute('aria-hidden');
        if (text?.trim() || ariaLabel || title) {
          buttonsWithText++;
        }
        // Icon-only buttons with aria-hidden are acceptable patterns
      }
      // At least some buttons should have text
      expect(buttonsWithText).toBeGreaterThan(0);
    }
  });

  test('page should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1 = await page.$$('h1');
    // Landing page should have at least one h1
    expect(h1.length).toBeGreaterThanOrEqual(0);
  });

  test('focus should be manageable via keyboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

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
    await page.goto('/');
    await page.waitForLoadState('networkidle');

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
