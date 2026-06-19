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
    await sharedPage.goto('/dashboard', { timeout: 60000 });
    await sharedPage.waitForLoadState('domcontentloaded');

    // 2. Fill credentials for Admin
    const emailInput = sharedPage.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = sharedPage.locator('input[type="password"], input[name="password"]').first();
    const submitButton = sharedPage.locator('button[type="submit"]').first();

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill(process.env.E2E_ADMIN_EMAIL || 'admin@blueprint.ae');
    await passwordInput.fill(process.env.E2E_ADMIN_PASSWORD || 'Admin@BP2024!');
    await submitButton.click();

    // 3. Verify successful redirection and rendering of authenticated layout
    await sharedPage.waitForURL('**/dashboard', { timeout: 30000 });
    
    // Check for the main dashboard content layout presence
    const mainLayout = sharedPage.locator('main[role="main"]').first();
    await expect(mainLayout).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to and load the projects list page', async () => {
    // 1. Navigate directly to projects route
    await sharedPage.goto('/dashboard/projects', { timeout: 60000 });
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
    await sharedPage.goto('/dashboard/invoices', { timeout: 60000 });
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
