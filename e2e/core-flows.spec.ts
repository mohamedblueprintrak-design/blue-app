/**
 * E2E Tests — Core Application Flows
 * اختبارات نهاية لنهاء — مسارات العمل الأساسية (الدخول، المشاريع، الفواتير)
 */

import { test, expect, type Page } from '@playwright/test';

test.describe.serial('Core Application Flows (Login, Projects, Invoices)', () => {
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Use a single page context across serial tests to preserve session cookies
    sharedPage = await browser.newPage();
  });

  test.afterAll(async () => {
    if (sharedPage) {
      await sharedPage.close();
    }
  });

  test('should log in successfully via the UI', async () => {
    // 1. Navigate to dashboard login page
    const response = await sharedPage.goto('/dashboard', { timeout: 60000 });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBe(true);
    await sharedPage.waitForLoadState('domcontentloaded');

    // 2. Wait for the auth store to initialize.
    // The dashboard layout shows a loading screen (logo + "BluePrint" text) while
    // `isInitialized` is false. The auth store calls /api/auth/session to check
    // if the user is authenticated. In CI, this API call may be slow.
    // We wait for the loading screen to disappear by waiting for either:
    //   - The email input (login form rendered), OR
    //   - The main dashboard layout (already authenticated)
    const emailInput = sharedPage.locator('input[type="email"], input[name="email"]').first();
    const mainLayout = sharedPage.locator('main[role="main"]').first();

    // Wait up to 30s for either the login form or the dashboard to appear
    await expect.poll(async () => {
      const emailVisible = await emailInput.isVisible().catch(() => false);
      const layoutVisible = await mainLayout.isVisible().catch(() => false);
      return emailVisible || layoutVisible;
    }, {
      timeout: 30000,
      intervals: [500, 1000, 2000], // poll every 500ms, then 1s, then 2s
      message: 'Waiting for auth store to initialize (login form or dashboard)',
    }).toBe(true);

    // If already authenticated (e.g., session cookie from previous test), skip login
    const layoutVisible = await mainLayout.isVisible().catch(() => false);
    if (layoutVisible) {
      // Already logged in — test passes
      return;
    }

    // 3. Fill credentials for Admin
    const passwordInput = sharedPage.locator('input[type="password"], input[name="password"]').first();
    const submitButton = sharedPage.locator('button[type="submit"]').first();

    await emailInput.fill(process.env.E2E_ADMIN_EMAIL || 'admin@blueprint.ae');
    await passwordInput.fill(process.env.E2E_ADMIN_PASSWORD || 'Admin@BP2024!');
    await submitButton.click();

    // 4. Verify successful redirection and rendering of authenticated layout
    await sharedPage.waitForURL('**/dashboard', { timeout: 30000 });
    
    await expect(mainLayout).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to and load the projects list page', async () => {
    // 1. Navigate directly to projects route
    const response = await sharedPage.goto('/dashboard/projects', { timeout: 60000 });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBe(true);
    await sharedPage.waitForLoadState('domcontentloaded');

    // 2. Verify URL
    expect(sharedPage.url()).toContain('/dashboard/projects');

    // 3. Verify header elements or filter controls are loaded
    const header = sharedPage.locator('h1, h2, header, .project-header').first();
    await expect(header).toBeVisible({ timeout: 15000 });

    const searchInput = sharedPage.locator('input[placeholder*="search"], input[placeholder*="بحث"], input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to and load the invoices list page', async () => {
    // 1. Navigate directly to invoices route
    const response = await sharedPage.goto('/dashboard/invoices', { timeout: 60000 });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBe(true);
    await sharedPage.waitForLoadState('domcontentloaded');

    // 2. Verify URL
    expect(sharedPage.url()).toContain('/dashboard/invoices');

    // 3. Verify header and list container exist
    const header = sharedPage.locator('h1, h2, header, .invoice-header').first();
    await expect(header).toBeVisible({ timeout: 15000 });

    const listContainer = sharedPage.locator('table, .table, .list-container, .grid').first();
    await expect(listContainer).toBeVisible({ timeout: 15000 });
  });
});
