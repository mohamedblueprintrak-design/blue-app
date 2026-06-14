/**
 * Tests for Two-Factor Authentication Module — Pure Functions
 * DB-dependent flows are covered by integration tests.
 * generateBackupCodes and verifyTotpCode are the primary testable pure functions.
 */

import { describe, it, expect } from '@jest/globals';

import { generateBackupCodes } from '@/lib/auth/modules/two-factor';

describe('Two-Factor — generateBackupCodes', () => {
  it('should generate 8 backup codes by default', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(8);
  });

  it('should generate specified number of backup codes', () => {
    const codes = generateBackupCodes(5);
    expect(codes).toHaveLength(5);
  });

  it('should generate 8-digit numeric codes', () => {
    const codes = generateBackupCodes();
    for (const code of codes) {
      expect(code).toMatch(/^\d{8}$/);
    }
  });

  it('should generate unique codes (statistically)', () => {
    const codes = generateBackupCodes(20);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBeGreaterThan(15);
  });

  it('should generate different codes on each call', () => {
    const codes1 = generateBackupCodes();
    const codes2 = generateBackupCodes();
    expect(codes1).not.toEqual(codes2);
  });

  it('should generate codes within valid 8-digit range', () => {
    const codes = generateBackupCodes(100);
    for (const code of codes) {
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(10000000);
      expect(num).toBeLessThanOrEqual(99999999);
    }
  });

  it('should handle count of 1', () => {
    const codes = generateBackupCodes(1);
    expect(codes).toHaveLength(1);
    expect(codes[0]).toMatch(/^\d{8}$/);
  });

  it('should handle count of 0', () => {
    const codes = generateBackupCodes(0);
    expect(codes).toHaveLength(0);
  });

  it('should generate strings, not numbers', () => {
    const codes = generateBackupCodes();
    for (const code of codes) {
      expect(typeof code).toBe('string');
    }
  });
});
