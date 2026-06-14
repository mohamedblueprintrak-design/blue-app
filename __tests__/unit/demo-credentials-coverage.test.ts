/**
 * Tests for Demo Credentials Module
 * Covers: DEMO_CREDENTIALS, getDemoPassword, isDemoMode, validateDemoMode
 */

import { describe, it, expect, afterEach } from '@jest/globals';

import {
  DEMO_CREDENTIALS,
  getDemoPassword,
  isDemoMode,
  validateDemoMode,
} from '@/lib/demo-credentials';

// ═══════════════════════════════════════════════════════════════════════
// 1. DEMO_CREDENTIALS
// ═══════════════════════════════════════════════════════════════════════

describe('Demo Credentials — DEMO_CREDENTIALS', () => {
  it('should have 12 demo users', () => {
    expect(DEMO_CREDENTIALS).toHaveLength(12);
  });

  it('should have admin user', () => {
    const admin = DEMO_CREDENTIALS.find(c => c.email === 'admin@blueprint.ae');
    expect(admin).toBeDefined();
    expect(admin!.role).toBe('ADMIN');
    expect(admin!.nameEn).toBe('General Manager');
  });

  it('should have project manager user', () => {
    const pm = DEMO_CREDENTIALS.find(c => c.email === 'pm@blueprint.ae');
    expect(pm).toBeDefined();
    expect(pm!.role).toBe('PROJECT_MANAGER');
  });

  it('should have engineer user', () => {
    const eng = DEMO_CREDENTIALS.find(c => c.email === 'eng@blueprint.ae');
    expect(eng).toBeDefined();
    expect(eng!.role).toBe('ENGINEER');
  });

  it('should have viewer user', () => {
    const viewer = DEMO_CREDENTIALS.find(c => c.email === 'viewer@blueprint.ae');
    expect(viewer).toBeDefined();
    expect(viewer!.role).toBe('VIEWER');
  });

  it('all credentials should have passwords', () => {
    for (const cred of DEMO_CREDENTIALS) {
      expect(cred.password).toBeTruthy();
      expect(cred.password.length).toBeGreaterThan(0);
    }
  });

  it('all credentials should have Arabic and English names', () => {
    for (const cred of DEMO_CREDENTIALS) {
      expect(cred.nameAr).toBeTruthy();
      expect(cred.nameEn).toBeTruthy();
    }
  });

  it('all credentials should have Arabic and English labels', () => {
    for (const cred of DEMO_CREDENTIALS) {
      expect(cred.labelAr).toBeTruthy();
      expect(cred.labelEn).toBeTruthy();
    }
  });

  it('should have unique emails', () => {
    const emails = DEMO_CREDENTIALS.map(c => c.email);
    const uniqueEmails = new Set(emails);
    expect(uniqueEmails.size).toBe(emails.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. getDemoPassword
// ═══════════════════════════════════════════════════════════════════════

describe('Demo Credentials — getDemoPassword', () => {
  it('should return password for existing email', () => {
    const password = getDemoPassword('admin@blueprint.ae');
    expect(password).toBeTruthy();
  });

  it('should return undefined for non-existent email', () => {
    const password = getDemoPassword('nonexistent@example.com');
    expect(password).toBeUndefined();
  });

  it('should return correct password for each demo user', () => {
    for (const cred of DEMO_CREDENTIALS) {
      const password = getDemoPassword(cred.email);
      expect(password).toBe(cred.password);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. isDemoMode
// ═══════════════════════════════════════════════════════════════════════

describe('Demo Credentials — isDemoMode', () => {
  const originalDemoMode = process.env.DEMO_MODE;

  afterEach(() => {
    if (originalDemoMode !== undefined) {
      process.env.DEMO_MODE = originalDemoMode;
    } else {
      delete process.env.DEMO_MODE;
    }
  });

  it('should return false when DEMO_MODE is not set', () => {
    delete process.env.DEMO_MODE;
    expect(isDemoMode()).toBe(false);
  });

  it('should return true when DEMO_MODE is true', () => {
    process.env.DEMO_MODE = 'true';
    expect(isDemoMode()).toBe(true);
  });

  it('should return false when DEMO_MODE is false', () => {
    process.env.DEMO_MODE = 'false';
    expect(isDemoMode()).toBe(false);
  });

  it('should return false when DEMO_MODE is some other value', () => {
    process.env.DEMO_MODE = 'yes';
    expect(isDemoMode()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. validateDemoMode
// ═══════════════════════════════════════════════════════════════════════

describe('Demo Credentials — validateDemoMode', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDemoMode = process.env.DEMO_MODE;

  afterEach(() => {
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    if (originalDemoMode !== undefined) {
      process.env.DEMO_MODE = originalDemoMode;
    } else {
      delete process.env.DEMO_MODE;
    }
  });

  it('should throw when DEMO_MODE is true in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.DEMO_MODE = 'true';
    expect(() => validateDemoMode()).toThrow('SECURITY');
  });

  it('should not throw when DEMO_MODE is false in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.DEMO_MODE = 'false';
    expect(() => validateDemoMode()).not.toThrow();
  });

  it('should not throw when DEMO_MODE is true in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.DEMO_MODE = 'true';
    expect(() => validateDemoMode()).not.toThrow();
  });

  it('should not throw when DEMO_MODE is not set', () => {
    delete process.env.DEMO_MODE;
    expect(() => validateDemoMode()).not.toThrow();
  });
});
