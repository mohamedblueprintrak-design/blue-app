/**
 * Unit Tests — Permissions & Navigation
 * اختبارات الصلاحيات والتنقل
 *
 * Tests role-based navigation filtering, role normalization,
 * and page-level permission checks.
 */

 

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('Permissions - Navigation Filtering', () => {
  let getNavItems: (role: string) => any[];
  let normalizeRole: (role: string) => string;
  let hasPagePermission: (role: string, pageId: string) => boolean;

  beforeAll(async () => {
    const mod = await import('@/lib/permissions');
    getNavItems = mod.getNavItems;
    normalizeRole = mod.normalizeRole;
    hasPagePermission = mod.hasPagePermission;
  });

  it('should return all nav items for ADMIN', () => {
    const items = getNavItems('ADMIN');
    expect(items.length).toBeGreaterThan(0);
    // Admin should see all top-level items
    const ids = items.map((i: any) => i.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('admin');
  });

  it('should hide admin section from non-admin users', () => {
    const engineerItems = getNavItems('ENGINEER');
    const ids = engineerItems.map((i: any) => i.id);
    expect(ids).not.toContain('admin');
  });

  it('should show finance only for ADMIN, MANAGER, and ACCOUNTANT', () => {
    const adminItems = getNavItems('ADMIN');
    const managerItems = getNavItems('MANAGER');
    const accountantItems = getNavItems('ACCOUNTANT');
    const engineerItems = getNavItems('ENGINEER');

    expect(adminItems.some((i: any) => i.id === 'finance')).toBe(true);
    expect(managerItems.some((i: any) => i.id === 'finance')).toBe(true);
    expect(accountantItems.some((i: any) => i.id === 'finance')).toBe(true);
    expect(engineerItems.some((i: any) => i.id === 'finance')).toBe(false);
  });

  it('should normalize role variants', () => {
    expect(normalizeRole('admin')).toBe('ADMIN');
    expect(normalizeRole('ADMIN')).toBe('ADMIN');
    expect(normalizeRole('project_manager')).toBe('PROJECT_MANAGER');
    expect(normalizeRole('PROJECT-MANAGER')).toBe('PROJECT_MANAGER');
  });

  it('should check page permissions correctly', () => {
    expect(hasPagePermission('ADMIN', 'admin')).toBe(true);
    expect(hasPagePermission('ENGINEER', 'admin')).toBe(false);
    expect(hasPagePermission('VIEWER', 'dashboard')).toBe(true);
  });
});
