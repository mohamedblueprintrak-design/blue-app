/**
 * Tests for Two-Factor Authentication Module
 * Covers: generateBackupCodes (pure function, no DB dependency)
 *
 * Note: DB-dependent functions (hasTwoFactorEnabled, enableTwoFactor, etc.)
 * are indirectly covered through auth-service integration tests.
 */

import { describe, it, expect } from '@jest/globals';

import { generateBackupCodes } from '@/lib/auth/modules/two-factor';

// ═══════════════════════════════════════════════════════════════════════
// 1. generateBackupCodes
// ═══════════════════════════════════════════════════════════════════════

describe('Two-Factor — generateBackupCodes', () => {
  it('should generate 8 backup codes by default', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(8);
  });

  it('should generate specified number of backup codes', () => {
    const codes = generateBackupCodes(12);
    expect(codes).toHaveLength(12);
  });

  it('should generate 8-digit numeric codes', () => {
    const codes = generateBackupCodes();
    for (const code of codes) {
      expect(code).toMatch(/^\d{8}$/);
    }
  });

  it('should generate unique codes', () => {
    const codes = generateBackupCodes(100);
    const uniqueCodes = new Set(codes);
    // Most codes should be unique (small collision chance)
    expect(uniqueCodes.size).toBeGreaterThan(90);
  });

  it('should handle zero count', () => {
    const codes = generateBackupCodes(0);
    expect(codes).toHaveLength(0);
  });

  it('should handle single code', () => {
    const codes = generateBackupCodes(1);
    expect(codes).toHaveLength(1);
    expect(codes[0]).toMatch(/^\d{8}$/);
  });

  it('codes should be strings', () => {
    const codes = generateBackupCodes();
    for (const code of codes) {
      expect(typeof code).toBe('string');
    }
  });
});
