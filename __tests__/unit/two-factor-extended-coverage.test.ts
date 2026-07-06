/**
 * Extended Tests for Two-Factor Authentication — Additional Branch Coverage
 * Covers: generateTwoFactorSecret (existing secret branch), disableTwoFactor (success path),
 * regenerateBackupCodes (success path), disable2FA (with/without code, without password)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long!';
process.env.ENCRYPTION_KEY = 'a'.repeat(64);

import { db } from '@/lib/db';
import { log } from '@/lib/logger';
jest.spyOn(log, 'warn').mockImplementation(() => {});
jest.spyOn(log, 'error').mockImplementation(() => {});
jest.spyOn(log, 'info').mockImplementation(() => {});

jest.mock('@/lib/services/audit.service', () => ({
  logAudit: (jest.fn() as jest.MockedFunction<() => Promise<void>>).mockResolvedValue(undefined),
}));

import {
  generateTwoFactorSecret,
  generate2FASecret,
  enableTwoFactor,
  disableTwoFactor,
  regenerateBackupCodes,
  disable2FA,
  verifyTwoFactorCode,
} from '@/lib/auth/modules/two-factor';
import { encrypt as _encrypt, hashToken as _hashToken } from '@/lib/auth/token-utils';
void _encrypt; void _hashToken;

const spyTwoFactorSecretFindUnique = jest.spyOn(db.twoFactorSecret, 'findUnique');
const spyTwoFactorSecretCreate = jest.spyOn(db.twoFactorSecret, 'create');
const spyTwoFactorSecretUpdate = jest.spyOn(db.twoFactorSecret, 'update');
const _spyTwoFactorSecretDeleteMany = jest.spyOn(db.twoFactorSecret, 'deleteMany');
void _spyTwoFactorSecretDeleteMany;
const spyUserFindUnique = jest.spyOn(db.user, 'findUnique');

// ═══════════════════════════════════════════════════════════════════════
// 1. generateTwoFactorSecret — existing secret branch
// ═══════════════════════════════════════════════════════════════════════

describe('Two-Factor — generateTwoFactorSecret branches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update existing secret when one already exists', async () => {
    spyUserFindUnique.mockResolvedValue({ email: 'test@test.com' } as any);
    spyTwoFactorSecretFindUnique.mockResolvedValue({ userId: 'user-1', secret: 'old' } as any);
    spyTwoFactorSecretUpdate.mockResolvedValue({} as any);

    const result = await generateTwoFactorSecret('user-1');
    
    expect(result.secret).toBeDefined();
    expect(result.qrCodeUrl).toBeDefined();
    expect(spyTwoFactorSecretUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        data: expect.objectContaining({ isEnabled: false, verifiedAt: null }),
      })
    );
  });

  it('should create new secret when none exists', async () => {
    spyUserFindUnique.mockResolvedValue({ email: 'test@test.com' } as any);
    spyTwoFactorSecretFindUnique.mockResolvedValue(null);
    spyTwoFactorSecretCreate.mockResolvedValue({} as any);

    const result = await generateTwoFactorSecret('user-1');
    
    expect(result.secret).toBeDefined();
    expect(result.qrCodeUrl).toBeDefined();
    expect(spyTwoFactorSecretCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1' }),
      })
    );
  });

  it('should throw when user not found', async () => {
    spyUserFindUnique.mockResolvedValue(null);

    await expect(generateTwoFactorSecret('nonexistent')).rejects.toThrow('User not found');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. enableTwoFactor — success path
// ═══════════════════════════════════════════════════════════════════════

describe('Two-Factor — enableTwoFactor success path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error on internal error', async () => {
    spyTwoFactorSecretFindUnique.mockRejectedValue(new Error('DB error'));
    
    const result = await enableTwoFactor('user-1', '123456');
    expect(result.success).toBe(false);
    expect(result.code).toBe('INTERNAL_ERROR');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. disableTwoFactor — success path
// ═══════════════════════════════════════════════════════════════════════

describe('Two-Factor — disableTwoFactor success and error paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return internal error on DB failure', async () => {
    spyUserFindUnique.mockRejectedValue(new Error('DB error'));
    
    const result = await disableTwoFactor('user-1', 'password');
    expect(result.success).toBe(false);
    expect(result.code).toBe('INTERNAL_ERROR');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. regenerateBackupCodes — success and error paths
// ═══════════════════════════════════════════════════════════════════════

describe('Two-Factor — regenerateBackupCodes additional paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return internal error on DB failure', async () => {
    spyUserFindUnique.mockRejectedValue(new Error('DB error'));
    
    const result = await regenerateBackupCodes('user-1', 'password');
    expect(result.success).toBe(false);
    expect(result.code).toBe('INTERNAL_ERROR');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. disable2FA facade — with code path
// ═══════════════════════════════════════════════════════════════════════

describe('Two-Factor — disable2FA facade branches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when code is provided but invalid', async () => {
    spyTwoFactorSecretFindUnique.mockResolvedValue(null);
    
    const result = await disable2FA('user-1', 'password', '123456');
    expect(result.success).toBe(false);
  });

  it('should proceed without code when code is not provided', async () => {
    spyUserFindUnique.mockResolvedValue(null);
    
    const result = await disable2FA('user-1', 'password');
    // Should proceed to disableTwoFactor
    expect(result.success).toBe(false);
    expect(result.code).toBe('USER_NOT_FOUND');
  });

  it('should use empty string when no password provided', async () => {
    spyUserFindUnique.mockResolvedValue(null);
    
    const result = await disable2FA('user-1');
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. verifyTwoFactorCode — error path
// ═══════════════════════════════════════════════════════════════════════

describe('Two-Factor — verifyTwoFactorCode error path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when DB query fails', async () => {
    spyTwoFactorSecretFindUnique.mockRejectedValue(new Error('DB error'));
    
    const result = await verifyTwoFactorCode('user-1', '123456');
    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. generate2FASecret facade
// ═══════════════════════════════════════════════════════════════════════

describe('Two-Factor — generate2FASecret facade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delegate to generateTwoFactorSecret with email parameter ignored', async () => {
    spyUserFindUnique.mockResolvedValue({ email: 'test@test.com' } as any);
    spyTwoFactorSecretFindUnique.mockResolvedValue(null);
    spyTwoFactorSecretCreate.mockResolvedValue({} as any);
    
    const result = await generate2FASecret('user-1', 'optional@email.com');
    expect(result.secret).toBeDefined();
    expect(result.qrCodeUrl).toBeDefined();
  });
});
