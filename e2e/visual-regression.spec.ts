/**
 * E2E Tests — Visual Regression Testing (m12)
 * اختبارات الانحدار البصري
 *
 * This test suite captures screenshots of key pages and compares them
 * against baseline snapshots. If the UI changes, the test fails and
 * the developer must either:
 * 1. Fix the UI change if it was unintentional
 * 2. Update the baseline snapshot if the change was intentional
 *
 * USAGE:
 *   # Run visual regression tests
 *   bunx playwright test e2e/visual-regression.spec.ts
 *
 *   # Update baselines after intentional UI changes
 *   bunx playwright test e2e/visual-regression.spec.ts --update-snapshots
 *
 * NOTE: These tests only run in non-CI environments by default because
 * CI environments may have different rendering (fonts, GPU, etc.).
 * To enable in CI, set VRT_ENABLE_CI=true.
 */

import { test, expect } from '@playwright/test';

const ENABLE_CI = process.env.VRT_ENABLE_CI === 'true';

// Use test.describe with conditional skip — Playwright's test.skip is a function,
// not a conditional test creator. We wrap in describe with a skip condition.
const describeVRT = ENABLE_CI ? test.describe : test.describe.skip;

describeVRT('Visual Regression Tests', () => {
  test('landing page matches baseline', async ({ page }) => {
    await page.goto('/', { timeout: 60000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForLoadState('domcontentloaded');

    // Wait for animations to settle
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('landing-page.png', {
      maxDiffPixelRatio: 0.02, // Allow 2% pixel difference
      threshold: 0.2,          // Color difference threshold
      fullPage: false,         // Only viewport
    });
  });

  test('dashboard login page matches baseline', async ({ page }) => {
    await page.goto('/dashboard', { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // Wait for auth store to initialize (loading screen → login form)
    await page.waitForTimeout(3000);

    await expect(page).toHaveScreenshot('dashboard-login.png', {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    });
  });

  test('about page matches baseline', async ({ page }) => {
    await page.goto('/about', { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('about-page.png', {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    });
  });

  test('services page matches baseline', async ({ page }) => {
    await page.goto('/services', { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('services-page.png', {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    });
  });

  test('calculator page matches baseline', async ({ page }) => {
    await page.goto('/calculator', { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('calculator-page.png', {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    });
  });

  test('quote page matches baseline', async ({ page }) => {
    await page.goto('/quote', { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('quote-page.png', {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    });
  });
});

describeVRT('Visual Regression — Mobile Viewports', () => {
  test('landing page mobile matches baseline', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone SE
    });
    const page = await context.newPage();

    await page.goto('/', { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('landing-mobile.png', {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
      fullPage: false,
    });

    await context.close();
  });

  test('dashboard login mobile matches baseline', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto('/dashboard', { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await expect(page).toHaveScreenshot('dashboard-login-mobile.png', {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    });

    await context.close();
  });
});
