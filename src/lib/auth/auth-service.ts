// @ts-check
/**
 * Authentication Service
 * خدمة المصادقة والتخويل
 *
 * Facade that delegates to the modular auth system in @/lib/auth/modules/*.
 * Kept for backward compatibility with route handlers that import `authService`.
 *
 * Actual logic lives in:
 *   - @/lib/auth/modules/password.ts   — hashing & validation
 *   - @/lib/auth/modules/jwt.ts        — JWT generation & verification
 *   - @/lib/auth/modules/authorization.ts — RBAC & role hierarchy
 *   - @/lib/auth/token-utils.ts        — shared constants, cookie options, DB refresh tokens
 *   - @/lib/auth/jwt-secret.ts         — JWT secret management
 */

import { SignJWT, jwtVerify } from 'jose';
import { randomBytes, randomInt } from 'crypto';
import { generateSecret, generateURI, verify, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { log } from '@/lib/logger';
import { 
  Permission, 
  JwtPayload, 
  LoginRequest, 
  SignupRequest, 
  AuthResponse,
  PasswordChangeRequest,
  PasswordResetRequest,
  PasswordResetConfirm,
  UserRoleValues,
} from './types';
import { logAudit } from '@/lib/services/audit.service';
import { sendEmail } from '@/lib/email';
import { emailTemplates } from '@/lib/email-templates';
import { getJwtSecretBytes } from '@/lib/auth/jwt-secret';
import {
  hashToken,
  generateDbRefreshToken,
  normalizeRoleForClient,
  ACCESS_TOKEN_EXPIRY,
  encrypt,
  decrypt,
} from '@/lib/auth/token-utils';
import {
  hashPassword as _hashPassword,
  verifyPassword as _verifyPassword,
  validatePasswordStrength as _validatePasswordStrength,
} from '@/lib/auth/modules/password';
import {
  hasPermission as _hasPermission,
  hasAnyPermission as _hasAnyPermission,
  hasAllPermissions as _hasAllPermissions,
  isRoleAtLeast as _isRoleAtLeast,
  getRolePermissions as _getRolePermissions,
} from '@/lib/auth/modules/authorization';

// JWT Configuration — shared constants
const JWT_ALG = 'HS256';
const JWT_ISSUER = 'blueprint-saas';
const JWT_AUDIENCE = 'blueprint-users';

// Token expiration times — consistent with login/refresh routes
const ACCESS_TOKEN_EXPIRY_VALUE = ACCESS_TOKEN_EXPIRY; // '15m' — consistent with login/refresh routes
const PASSWORD_RESET_EXPIRY = '1h';

/**
 * Authentication Service Class
 */
class AuthenticationService {
  
  // ============================================
  // Password Management — delegates to modules/password.ts
  // ============================================
  
  /**
   * Hash a password using bcrypt
   * @see @/lib/auth/modules/password.ts — canonical implementation
   */
  async hashPassword(password: string): Promise<string> {
    return _hashPassword(password);
  }
  
  /**
   * Verify a password against a hash
   * @see @/lib/auth/modules/password.ts — canonical implementation
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return _verifyPassword(password, hashedPassword);
  }
  
  /**
   * Validate password strength
   * @see @/lib/auth/modules/password.ts — canonical implementation
   */
  validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    return _validatePasswordStrength(password);
  }
  
  // ============================================
  // JWT Token Management
  // ============================================
  
  /**
   * Get JWT secret key — uses centralized jwt-secret module
   */
  private getJwtSecret(): Uint8Array {
    return getJwtSecretBytes();
  }
  
  /**
   * Generate access token (15m expiry — consistent with login route)
   * Includes `name`, `twoFactorEnabled`, and `passwordChangedAt` fields which
   * the proxy and client-side expect in the JWT payload.
   */
  
  /**
   * Generate refresh token — uses DB-stored pattern (consistent with login/refresh routes)
   * Generates a random UUID, stores its SHA-256 hash in the database, and returns
   * the raw token. This supports rotation with reuse detection.
   */
  
  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(userId: string): Promise<string> {
    const secret = this.getJwtSecret();
    
    return new SignJWT({ userId, type: 'password-reset' })
      .setProtectedHeader({ alg: JWT_ALG })
      .setIssuedAt()
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setExpirationTime(PASSWORD_RESET_EXPIRY)
      .sign(secret);
  }
  
  /**
   * Verify and decode a JWT token
   * SECURITY: Rejects tokens with a 'type' claim that isn't 'access'.
   * This prevents password-reset, email-verification, or 2fa-pending tokens
   * from being used as access tokens.
   */
  async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      const secret = this.getJwtSecret();
      const { payload } = await jwtVerify(token, secret, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
      
      // SECURITY: Reject non-access token types (password-reset, refresh, 2fa-pending, etc.)
      // Only tokens without a 'type' field or with type='access' are valid access tokens.
      if (payload.type && payload.type !== 'access') {
        return null;
      }
      
      return {
        userId: payload.userId as string,
        email: payload.email as string,
        username: (payload.name || payload.username) as string,
        role: payload.role as string,
        organizationId: payload.organizationId as string | undefined,
        iat: payload.iat,
        exp: payload.exp,
      };
    } catch {
      return null;
    }
  }
  
  /**
   * Verify refresh token — uses DB lookup (consistent with login/refresh routes)
   * Hashes the provided token and looks it up in the database.
   * Returns the userId if the token is valid, not revoked, and not expired.
   */
  async verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
    try {
      const tokenHash = await hashToken(token);
      const storedToken = await db.refreshToken.findUnique({
        where: { tokenHash },
      });
      
      if (!storedToken) return null;
      if (storedToken.revokedAt) return null;
      if (storedToken.expiresAt < new Date()) return null;
      
      return { userId: storedToken.userId };
    } catch {
      return null;
    }
  }
  
  /**
   * Verify password reset token
   */
  async verifyPasswordResetToken(token: string): Promise<{ userId: string } | null> {
    try {
      const secret = this.getJwtSecret();
      const { payload } = await jwtVerify(token, secret, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
      
      if (payload.type !== 'password-reset') {
        return null;
      }
      
      return {
        userId: payload.userId as string,
      };
    } catch {
      return null;
    }
  }
  
  // ============================================
  // Authentication Operations
  // ============================================
  
  /**
   * Login user with email and password
   */
  
  /**
   * Register new user
   */
  
  /**
   * Refresh access token — uses DB-stored refresh token with rotation
   * Consistent with /api/auth/refresh route pattern:
   * 1. Hash the provided token and look it up in the DB
   * 2. Detect reuse of revoked tokens (security)
   * 3. Revoke the old refresh token
   * 4. Generate new access token + new refresh token (rotation)
   */
  
  /**
   * Change password
   */
  
  /**
   * Request password reset
   */
  
  /**
   * Confirm password reset
   */
  
  /**
   * Logout user
   */
  async logout(userId: string): Promise<void> {
    // Log audit
    await logAudit({
      userId,
      entityType: 'user',
      entityId: userId,
      action: 'logout',
      description: 'User logged out',
    });
  }
  
  // ============================================
  // Authorization Methods — delegates to modules/authorization.ts
  // ============================================
  
  /**
   * Check if user has a specific permission
   * @see @/lib/auth/modules/authorization.ts — canonical implementation
   */
  hasPermission(userRole: string, permission: Permission): boolean {
    return _hasPermission(userRole, permission);
  }
  
  /**
   * Check if user has any of the specified permissions
   * @see @/lib/auth/modules/authorization.ts — canonical implementation
   */
  hasAnyPermission(userRole: string, permissions: Permission[]): boolean {
    return _hasAnyPermission(userRole, permissions);
  }
  
  /**
   * Check if user has all of the specified permissions
   * @see @/lib/auth/modules/authorization.ts — canonical implementation
   */
  hasAllPermissions(userRole: string, permissions: Permission[]): boolean {
    return _hasAllPermissions(userRole, permissions);
  }
  
  /**
   * Check if user role is at or above a certain level
   * @see @/lib/auth/modules/authorization.ts — canonical implementation
   */
  isRoleAtLeast(userRole: string, requiredRole: string): boolean {
    return _isRoleAtLeast(userRole, requiredRole);
  }
  
  /**
   * Get all permissions for a role
   * @see @/lib/auth/modules/authorization.ts — canonical implementation
   */
  getRolePermissions(role: string): Permission[] {
    return _getRolePermissions(role);
  }
  
  // ============================================
  // User Management
  // ============================================
  
  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    return db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        department: true,
        organizationId: true,
        lastLogin: true,
        createdAt: true,
        passwordChangedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
  
  /**
   * Validate user session
   */
  async validateSession(token: string): Promise<JwtPayload | null> {
    const payload = await this.verifyToken(token);
    if (!payload) {
      return null;
    }
    
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { isActive: true },
    });
    
    if (!user || !user.isActive) {
      return null;
    }
    
    return payload;
  }

  // ============================================
  // Email Verification
  // ============================================

  /**
   * Generate email verification token
   */
  async generateEmailVerificationToken(email: string, userId?: string): Promise<string> {
    // Delete any existing tokens for this email
    await db.emailVerificationToken.deleteMany({
      where: { email: email.toLowerCase() },
    });

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const hashedToken = await hashToken(token);
    await db.emailVerificationToken.create({
      data: {
        email: email.toLowerCase(),
        token: hashedToken,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, userName: string, userId?: string): Promise<boolean> {
    try {
      const token = await this.generateEmailVerificationToken(email, userId);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      const verificationLink = `${appUrl}/verify-email?token=${token}`;

      const template = emailTemplates.emailVerification(userName, verificationLink, 24);

      await sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      return true;
    } catch (error) {
      log.error('Failed to send verification email', error);
      return false;
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<AuthResponse> {
    try {
      const hashedToken = await hashToken(token);
      const verificationToken = await db.emailVerificationToken.findUnique({
        where: { token: hashedToken },
      });

      if (!verificationToken) {
        return {
          success: false,
          error: 'Invalid verification token',
          code: 'INVALID_TOKEN',
        };
      }

      if (verificationToken.usedAt) {
        return {
          success: false,
          error: 'Token already used',
          code: 'TOKEN_USED',
        };
      }

      if (verificationToken.expiresAt < new Date()) {
        return {
          success: false,
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED',
        };
      }

      // Find user by email
      const user = await db.user.findUnique({
        where: { email: verificationToken.email },
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      // Mark email as verified
      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        }),
        db.emailVerificationToken.update({
          where: { id: verificationToken.id },
          data: { usedAt: new Date() },
        }),
      ]);

      // Log audit
      await logAudit({
        userId: user.id,
        organizationId: user.organizationId || undefined,
        entityType: 'user',
        entityId: user.id,
        action: 'verify_email',
        description: `Email verified: ${user.email}`,
      });

      // Send confirmation email
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      const template = emailTemplates.emailVerified(user.name ?? "", `${appUrl}/login`);
      await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.name ?? "", // Using name as username
          fullName: user.name ?? "",
          role: user.role as string,
          avatar: user.avatar,
          organizationId: user.organizationId,
        },
      };
    } catch (error) {
      log.error('Email verification error', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<AuthResponse> {
    try {
      const user = await db.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        // Don't reveal if user exists
        return { success: true };
      }

      if (user.emailVerified) {
        return {
          success: false,
          error: 'Email already verified',
          code: 'ALREADY_VERIFIED',
        };
      }

      await this.sendVerificationEmail(user.email, user.name ?? "", user.id);

      return { success: true };
    } catch (error) {
      log.error('Resend verification error', error);
      return { success: true }; // Don't reveal errors
    }
  }

  // ============================================
  // Two-Factor Authentication (2FA)
  // ============================================

  /**
   * Generate 2FA secret for TOTP
   * Uses otplib for compatibility with Google Authenticator, Authy, etc.
   */
  async generateTwoFactorSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
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
  private generateBackupCodes(count: number = 8): string[] {
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
  private async verifyTotpCode(secret: string, code: string): Promise<boolean> {
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
  async enableTwoFactor(userId: string, verificationCode: string): Promise<AuthResponse & { backupCodes?: string[] }> {
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
      const isValid = await this.verifyTotpCode(plaintextSecret, verificationCode);
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid verification code',
          code: 'INVALID_CODE',
        };
      }

      // Generate backup codes and hash them for storage
      const backupCodes = this.generateBackupCodes();
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
  async disableTwoFactor(userId: string, password: string): Promise<AuthResponse> {
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
      const isValid = await this.verifyPassword(password, user.password);
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
  async verifyTwoFactorCode(userId: string, code: string): Promise<boolean> {
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
      return await this.verifyTotpCode(plaintextSecret, code);
    } catch (error) {
      log.error('Verify 2FA error', error);
      return false;
    }
  }

  /**
   * Check if user has 2FA enabled
   */
  async hasTwoFactorEnabled(userId: string): Promise<boolean> {
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
  async regenerateBackupCodes(userId: string, password: string): Promise<AuthResponse & { backupCodes?: string[] }> {
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
      const isValid = await this.verifyPassword(password, user.password);
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid password',
          code: 'INVALID_PASSWORD',
        };
      }

      // Generate new backup codes and hash them for storage
      const backupCodes = this.generateBackupCodes();
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
