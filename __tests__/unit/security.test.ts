/**
 * Unit Tests — Security Utilities
 * اختبارات أدوات الأمان
 *
 * Tests input sanitization, XSS/SQL injection detection, and CSRF protection.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('Security - Input Sanitization', () => {
  let sanitizeString: (input: string) => string;
  let sanitizeObject: <T extends Record<string, unknown>>(obj: T) => T;

  beforeAll(async () => {
    const mod = await import('@/lib/security/sanitize');
    sanitizeString = mod.sanitizeString;
    sanitizeObject = mod.sanitizeObject;
  });

  it('should strip HTML tags from strings', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).not.toContain('<script>');
    expect(sanitizeString('<b>Hello</b>')).not.toContain('<b>');
  });

  it('should sanitize nested objects', () => {
    const input = {
      name: '<script>alert(1)</script>',
      nested: { value: '<img onerror="hack">' },
    };
    const result = sanitizeObject(input);
    expect(result.name).not.toContain('<script>');
    expect(result.nested.value).not.toContain('<img');
  });

  it('should preserve safe strings', () => {
    expect(sanitizeString('Hello World')).toBe('Hello World');
    expect(sanitizeString('محمد أحمد')).toBe('محمد أحمد');
  });
});

describe('Security - XSS & SQL Injection Detection', () => {
  let validateXSS: (input: string) => boolean;
  let validateSQLInjection: (input: string) => boolean;

  beforeAll(async () => {
    const mod = await import('@/lib/security/sanitize');
    validateXSS = mod.validateXSS;
    validateSQLInjection = mod.validateSQLInjection;
  });

  it('should detect XSS patterns', () => {
    expect(validateXSS('<script>alert(1)</script>')).toBe(true);
    expect(validateXSS('javascript:void(0)')).toBe(true);
    expect(validateXSS('<img onerror="hack">')).toBe(true);
    expect(validateXSS('Hello World')).toBe(false);
  });

  it('should detect SQL injection patterns', () => {
    expect(validateSQLInjection("'; DROP TABLE users; --")).toBe(true);
    expect(validateSQLInjection('1 OR 1=1')).toBe(true);
    expect(validateSQLInjection('Hello World')).toBe(false);
  });
});
