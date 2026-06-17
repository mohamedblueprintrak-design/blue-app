/**
 * Tests for Password Module
 * Covers all branches: validatePasswordStrength (all if/else), generateSecurePassword,
 * hashPassword, verifyPassword, checkPasswordBreached
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Set env vars before any imports
process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long!';
process.env.ENCRYPTION_KEY = 'a'.repeat(64);

import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateSecurePassword,
  checkPasswordBreached,
  PASSWORD_CONFIG,
} from '@/lib/auth/modules/password';

// ═══════════════════════════════════════════════════════════════════════
// 1. validatePasswordStrength — all branches
// ═══════════════════════════════════════════════════════════════════════

describe('Password — validatePasswordStrength', () => {
  it('should reject password that is too short', () => {
    const result = validatePasswordStrength('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(`Password must be at least ${PASSWORD_CONFIG.minLength} characters long`);
    // 'Ab1!' passes 4 checks (uppercase, lowercase, number, special) but fails length
    expect(result.strength).toBe('medium');
  });

  it('should reject password without uppercase', () => {
    const result = validatePasswordStrength('abcdefgh1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  it('should reject password without lowercase', () => {
    const result = validatePasswordStrength('ABCDEFGH1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  it('should reject password without number', () => {
    const result = validatePasswordStrength('Abcdefgh!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one number');
  });

  it('should reject password without special character', () => {
    const result = validatePasswordStrength('Abcdefgh1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one special character');
  });

  it('should accept a valid strong password', () => {
    const result = validatePasswordStrength('Abcdefg1!');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return weak strength for < 4 passed checks', () => {
    const result = validatePasswordStrength('abc');
    expect(result.strength).toBe('weak');
  });

  it('should return medium strength for 4 passed checks', () => {
    // 4 checks passed: length, uppercase, lowercase, number (no special)
    const result = validatePasswordStrength('Abcdefg1');
    expect(result.strength).toBe('medium');
  });

  it('should return strong strength for 5 passed checks but length < 12', () => {
    const result = validatePasswordStrength('Abcdefg1!');
    expect(result.strength).toBe('strong');
  });

  it('should return very-strong strength for 5 passed checks and length >= 12', () => {
    const result = validatePasswordStrength('Abcdefghij1!');
    expect(result.strength).toBe('very-strong');
    expect(result.valid).toBe(true);
  });

  it('should handle empty password', () => {
    const result = validatePasswordStrength('');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.strength).toBe('weak');
  });

  it('should accumulate multiple errors', () => {
    const result = validatePasswordStrength('ab');
    // Missing: length, uppercase, number, special
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. generateSecurePassword
// ═══════════════════════════════════════════════════════════════════════

describe('Password — generateSecurePassword', () => {
  it('should generate password of default length 16', () => {
    const password = generateSecurePassword();
    expect(password.length).toBe(16);
  });

  it('should generate password of custom length', () => {
    const password = generateSecurePassword(24);
    expect(password.length).toBe(24);
  });

  it('should include at least one uppercase letter', () => {
    const password = generateSecurePassword();
    expect(/[A-Z]/.test(password)).toBe(true);
  });

  it('should include at least one lowercase letter', () => {
    const password = generateSecurePassword();
    expect(/[a-z]/.test(password)).toBe(true);
  });

  it('should include at least one number', () => {
    const password = generateSecurePassword();
    expect(/[0-9]/.test(password)).toBe(true);
  });

  it('should include at least one special character', () => {
    const password = generateSecurePassword();
    expect(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)).toBe(true);
  });

  it('should generate minimum length password of 4 (one of each type)', () => {
    const password = generateSecurePassword(4);
    expect(password.length).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. hashPassword and verifyPassword
// ═══════════════════════════════════════════════════════════════════════

describe('Password — hashPassword and verifyPassword', () => {
  it('should hash a password and verify it correctly', async () => {
    const hashed = await hashPassword('MyPassword123!');
    expect(typeof hashed).toBe('string');
    expect(hashed).not.toBe('MyPassword123!');

    const isValid = await verifyPassword('MyPassword123!', hashed);
    expect(isValid).toBe(true);
  });

  it('should reject wrong password', async () => {
    const hashed = await hashPassword('MyPassword123!');
    const isValid = await verifyPassword('WrongPassword!', hashed);
    expect(isValid).toBe(false);
  });

  it('should produce different hashes for same password (salt)', async () => {
    const hash1 = await hashPassword('SamePassword1!');
    const hash2 = await hashPassword('SamePassword1!');
    expect(hash1).not.toBe(hash2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. checkPasswordBreached — branches
// ═══════════════════════════════════════════════════════════════════════

describe('Password — checkPasswordBreached', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('should return false when API returns non-ok response', async () => {
    // Mock global fetch to return non-ok
    const mockFetch = jest.fn<Promise<Response>>().mockResolvedValue({
      ok: false,
      text: async () => '',
    } as unknown as Response);
    jest.spyOn(globalThis, 'fetch').mockImplementation(mockFetch);

    const result = await checkPasswordBreached('testpassword');
    expect(result).toBe(false);
  });

  it('should return false when password is not found in breach data', async () => {
    const mockFetch = jest.fn<Promise<Response>>().mockResolvedValue({
      ok: true,
      text: async () => 'SOMEOTHERHASH:5\nANOTHERHASH:10',
    } as unknown as Response);
    jest.spyOn(globalThis, 'fetch').mockImplementation(mockFetch);

    const result = await checkPasswordBreached('testpassword');
    expect(result).toBe(false);
  });

  it('should return true when password is found in breach data', async () => {
    // We need to know what the SHA1 of 'testpassword' is, and provide matching suffix
    const crypto = await import('crypto');
    const sha1 = crypto.createHash('sha1').update('testpassword').digest('hex').toUpperCase();
    const _prefix = sha1.substring(0, 5);
    const suffix = sha1.substring(5);

    const mockFetch = jest.fn<Promise<Response>>().mockResolvedValue({
      ok: true,
      text: async () => `${suffix}:5`,
    } as unknown as Response);
    jest.spyOn(globalThis, 'fetch').mockImplementation(mockFetch);

    const result = await checkPasswordBreached('testpassword');
    expect(result).toBe(true);
  });

  it('should return false when count is 0', async () => {
    const crypto = await import('crypto');
    const sha1 = crypto.createHash('sha1').update('testpassword').digest('hex').toUpperCase();
    const suffix = sha1.substring(5);

    const mockFetch = jest.fn<Promise<Response>>().mockResolvedValue({
      ok: true,
      text: async () => `${suffix}:0`,
    } as unknown as Response);
    jest.spyOn(globalThis, 'fetch').mockImplementation(mockFetch);

    const result = await checkPasswordBreached('testpassword');
    expect(result).toBe(false);
  });

  it('should return false when fetch throws an error', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const result = await checkPasswordBreached('testpassword');
    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. PASSWORD_CONFIG
// ═══════════════════════════════════════════════════════════════════════

describe('Password — PASSWORD_CONFIG', () => {
  it('should have expected default configuration', () => {
    expect(PASSWORD_CONFIG.minLength).toBe(8);
    expect(PASSWORD_CONFIG.requireUppercase).toBe(true);
    expect(PASSWORD_CONFIG.requireLowercase).toBe(true);
    expect(PASSWORD_CONFIG.requireNumber).toBe(true);
    expect(PASSWORD_CONFIG.requireSpecialChar).toBe(true);
    expect(PASSWORD_CONFIG.bcryptRounds).toBe(12);
  });
});
