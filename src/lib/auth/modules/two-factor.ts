import { randomBytes, randomInt } from 'crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { AuthResponse } from '../types';
import { logAudit } from '@/lib/services/audit.service';
import { sendEmail } from '@/lib/email';
import { emailTemplates } from '@/lib/email-templates';
import { encrypt, decrypt, hashToken } from '@/lib/auth/token-utils';

  // Two-Factor Authentication (2FA)
  // ============================================

  /**
   * Generate 2FA secret for TOTP
   * Uses otplib for compatibility with Google Authenticator, Authy, etc.
   */
export async function generateTwoFactorSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    // Generate a proper Base32 secret compatible with authenticator apps
    const secret = generateSecret({ crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() });
    
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Create OTPAuth URL for QR code using otplib
    const appName = 'BluePrint';
    const qrCodeUrl = generateURI({ label: user.email, issuer: appName, secret, strategy: 'totp' });

    // Store secret temporarily (will be activated after verification)
    const existingSecret = await db.twoFactorSecret.findUnique({
      where: { userId },
    });

    // Encrypt the TOTP secret before storing — never store secrets in plaintext
    const encryptedSecret = encrypt(secret);

    if (existingSecret) {
      await db.twoFactorSecret.update({
        where: { userId },
        data: { secret: encryptedSecret, isEnabled: false, verifiedAt: null },
      });
    } else {
      await db.twoFactorSecret.create({
        data: { userId, secret: encryptedSecret, backupCodes: '[]', isEnabled: false },
      });
    }

    return { secret, qrCodeUrl };
  }

  /**
   * Generate backup codes for 2FA
   */
export function generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = randomInt(10000000, 99999999).toString();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Verify TOTP code using otplib
   * Compatible with Google Authenticator, Authy, Microsoft Authenticator, etc.
   */
export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
    try {
      // Use otplib v13 verify function for proper TOTP verification
      // It handles time window drift automatically
      const result = await verify({ token: code, secret, strategy: 'totp', crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() });
      // Handle both possible return types from otplib:
      // - v13+ returns { valid: boolean }
      // - Some versions return boolean directly
      if (typeof result === 'boolean') {
        return result;
      }
      return result.valid;
    } catch (error) {
      log.error('TOTP verification error', error);
      return false;
    }
  }

  /**
   * Enable 2FA after verification
   */
export async function enableTwoFactor(userId: string, verificationCode: string): Promise<AuthResponse & { backupCodes?: string[] }> {
    try {
      const twoFactorSecret = await db.twoFactorSecret.findUnique({
        where: { userId },
      });

      if (!twoFactorSecret || twoFactorSecret.isEnabled) {
        return {
          success: false,
          error: '2FA not set up or already enabled',
          code: 'INVALID_STATE',
        };
      }

      // Decrypt the TOTP secret for verification
      // NOTE: The legacy plaintext fallback has been removed. All 2FA secrets
      // must be AES-256-GCM encrypted. If decryption fails, the operation is
      // rejected — a failed decrypt indicates a corrupted record or a rotated
      // ENCRYPTION_KEY, not a valid plaintext secret.
      let plaintextSecret: string;
      try {
        plaintextSecret = decrypt(twoFactorSecret.secret);
      } catch (decryptError) {
        log.error('[2FA] Failed to decrypt TOTP secret — rejecting verification', { userId, error: String(decryptError) });
        return {
          success: false,
          error: 'Unable to verify 2FA code. Please contact an administrator.',
          code: 'DECRYPT_FAILED',
        };
      }

      // Verify the code
      const isValid = await verifyTotpCode(plaintextSecret, verificationCode);
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid verification code',
          code: 'INVALID_CODE',
        };
      }

      // Generate backup codes and hash them for storage
      const backupCodes = generateBackupCodes();
      const hashedBackupCodes = await Promise.all(backupCodes.map(code => hashToken(code)));

      // Enable 2FA
      await db.twoFactorSecret.update({
        where: { userId },
        data: {
          isEnabled: true,
          verifiedAt: new Date(),
          backupCodes: JSON.stringify(hashedBackupCodes),
        },
      });

      // Get user for email
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      // Send confirmation email
      if (user) {
        const template = emailTemplates.twoFactorEnabled(user.name ?? "");
        await sendEmail({
          to: user.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
      }

      // Log audit
      await logAudit({
        userId,
        entityType: 'user',
        entityId: userId,
        action: 'enable_2fa',
        description: 'Two-factor authentication enabled',
      });

      return {
        success: true,
        backupCodes,
      };
    } catch (error) {
      log.error('Enable 2FA error', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Disable 2FA
   */
export async function disableTwoFactor(userId: string, password: string): Promise<AuthResponse> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.password) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      // Verify password
      const isValid = await import('../modules/password').then(m => m.verifyPassword)(password, user.password);
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid password',
          code: 'INVALID_PASSWORD',
        };
      }

      // Disable 2FA
      await db.twoFactorSecret.deleteMany({
        where: { userId },
      });

      // Log audit
      await logAudit({
        userId,
        organizationId: user.organizationId || undefined,
        entityType: 'user',
        entityId: userId,
        action: 'disable_2fa',
        description: 'Two-factor authentication disabled',
      });

      return { success: true };
    } catch (error) {
      log.error('Disable 2FA error', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Verify 2FA code during login
   */
export async function verifyTwoFactorCode(userId: string, code: string): Promise<boolean> {
    try {
      const twoFactorSecret = await db.twoFactorSecret.findUnique({
        where: { userId },
      });

      if (!twoFactorSecret || !twoFactorSecret.isEnabled) {
        return false;
      }

      // Check if it's a backup code (compare hashed)
      const storedCodes = (Array.isArray(twoFactorSecret.backupCodes)
        ? twoFactorSecret.backupCodes
        : JSON.parse(String(twoFactorSecret.backupCodes || '[]'))) as string[];
      const codeHash = await hashToken(code);
      const backupCodeIndex = storedCodes.indexOf(codeHash);
      
      if (backupCodeIndex !== -1) {
        // Remove used backup code
        storedCodes.splice(backupCodeIndex, 1);
        await db.twoFactorSecret.update({
          where: { userId },
          data: { backupCodes: JSON.stringify(storedCodes) },
        });
        return true;
      }

      // Decrypt the TOTP secret for verification
      // NOTE: Legacy plaintext fallback removed — secrets must be encrypted.
      let plaintextSecret: string;
      try {
        plaintextSecret = decrypt(twoFactorSecret.secret);
      } catch (decryptError) {
        log.error('[2FA] Failed to decrypt TOTP secret — rejecting verification', { userId, error: String(decryptError) });
        return false;
      }

      // Verify TOTP code
      return await verifyTotpCode(plaintextSecret, code);
    } catch (error) {
      log.error('Verify 2FA error', error);
      return false;
    }
  }

  /**
   * Check if user has 2FA enabled
   */
export async function hasTwoFactorEnabled(userId: string): Promise<boolean> {
    try {
      const twoFactorSecret = await db.twoFactorSecret.findUnique({
        where: { userId },
        select: { isEnabled: true },
      });
      return twoFactorSecret?.isEnabled || false;
    } catch {
      return false;
    }
  }

  /**
   * Generate new backup codes
   */
  export async function regenerateBackupCodes(userId: string, password: string): Promise<AuthResponse & { backupCodes?: string[] }> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.password) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      // Verify password
      const isValid = await import('../modules/password').then(m => m.verifyPassword)(password, user.password);
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid password',
          code: 'INVALID_PASSWORD',
        };
      }

      // Generate new backup codes and hash them for storage
      const backupCodes = generateBackupCodes();
      const hashedBackupCodes = await Promise.all(backupCodes.map(code => hashToken(code)));

      await db.twoFactorSecret.update({
        where: { userId },
        data: { backupCodes: JSON.stringify(hashedBackupCodes) },
      });

      // Log audit
      await logAudit({
        userId,
        organizationId: user.organizationId || undefined,
        entityType: 'user',
        entityId: userId,
        action: 'regenerate_backup_codes',
        description: '2FA backup codes regenerated',
      });

      return {
        success: true,
        backupCodes,
      };
    } catch (error) {
      log.error('Regenerate backup codes error', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      };
    }
  }
}

// Export singleton instance
export const authService = new AuthenticationService();
export default authService;