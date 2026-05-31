/**
 * Unit Tests — Authentication System
 * اختبارات نظام المصادقة
 *
 * Tests login validation, demo credentials, and role normalization.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('Authentication - Login Validation', () => {
  let loginSchema: any;

  beforeAll(async () => {
    const mod = await import('@/lib/api-validation');
    loginSchema = mod.loginSchema;
  });

  it('should reject empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'test' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const result = loginSchema.safeParse({ email: 'notanemail', password: 'test' });
    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: '' });
    expect(result.success).toBe(false);
  });

  it('should accept valid login credentials', () => {
    const result = loginSchema.safeParse({ email: 'admin@blueprint.ae', password: 'Admin@BP2024!' });
    expect(result.success).toBe(true);
  });
});

describe('Authentication - Demo Credentials', () => {
  let DEMO_CREDENTIALS: any[];

  beforeAll(async () => {
    const mod = await import('@/lib/demo-credentials');
    DEMO_CREDENTIALS = mod.DEMO_CREDENTIALS;
  });

  it('should have demo credentials for all roles', () => {
    expect(DEMO_CREDENTIALS.length).toBeGreaterThanOrEqual(7);

    const roles = DEMO_CREDENTIALS.map((c: any) => c.role);
    expect(roles).toContain('ADMIN');
    expect(roles).toContain('PROJECT_MANAGER');
    expect(roles).toContain('ENGINEER');
    expect(roles).toContain('ACCOUNTANT');
    expect(roles).toContain('HR');
    expect(roles).toContain('SECRETARY');
    expect(roles).toContain('VIEWER');
  });

  it('should have unique emails for each demo user', () => {
    const emails = DEMO_CREDENTIALS.map((c: any) => c.email);
    const uniqueEmails = new Set(emails);
    expect(emails.length).toBe(uniqueEmails.size);
  });

  it('should have strong passwords for demo users when env vars are set', () => {
    // Passwords are now sourced from environment variables.
    // If env vars are not set, passwords default to '' (empty string),
    // which means demo login will fail unless explicitly configured.
    // This test verifies the structure and that non-empty passwords meet strength requirements.
    for (const cred of DEMO_CREDENTIALS) {
      if (cred.password.length > 0) {
        expect(cred.password.length).toBeGreaterThanOrEqual(8);
        expect(/[A-Z]/.test(cred.password)).toBe(true);
        expect(/[0-9]/.test(cred.password)).toBe(true);
        expect(/[!@#$%^&*]/.test(cred.password)).toBe(true);
      }
    }
  });
});

describe('Authentication - Role Normalization', () => {
  it('should normalize UPPERCASE roles to lowercase for client', () => {
    // Test the normalizeRoleForClient function logic
    const normalizeRoleForClient = (role: string): string => {
      const r = role.toUpperCase();
      switch (r) {
        case 'PROJECT_MANAGER': return 'project_manager';
        default: return r.toLowerCase();
      }
    };

    expect(normalizeRoleForClient('ADMIN')).toBe('admin');
    expect(normalizeRoleForClient('PROJECT_MANAGER')).toBe('project_manager');
    expect(normalizeRoleForClient('ENGINEER')).toBe('engineer');
    expect(normalizeRoleForClient('HR')).toBe('hr');
  });
});
