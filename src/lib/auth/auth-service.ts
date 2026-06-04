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
  async verifyToken(token: string) {
    const { verifyToken } = await import('./modules/jwt');
    return verifyToken(token);
  }

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
   * Refresh access token — uses DB-stored refresh token with rotation
   * Consistent with /api/auth/refresh route pattern:
   * 1. Hash the provided token and look it up in the DB
   * 2. Detect reuse of revoked tokens (security)
   * 3. Revoke the old refresh token
   * 4. Generate new access token + new refresh token (rotation)
   */
  
  /**
   * Logout user
   */
  async logout(userId: string): Promise<void> {
    // Revoke all refresh tokens for this user
    await db.refreshToken.updateMany({
      where: { 
        userId,
        revokedAt: null
      },
      data: { revokedAt: new Date() },
    });
    
    await logAudit({
      userId,
      entityType: 'user',
      entityId: userId,
      action: 'logout',
      description: 'User logged out from all devices',
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
  // ============================================
  // Email Verification — delegates to modules/email-verification.ts
  // ============================================
  async generateEmailVerificationToken(email: string, userId?: string) {
    const { generateEmailVerificationToken } = await import('./modules/email-verification');
    return generateEmailVerificationToken(email, userId);
  }
  async sendVerificationEmail(email: string, userName: string, userId?: string) {
    const { sendVerificationEmail } = await import('./modules/email-verification');
    return sendVerificationEmail(email, userName, userId);
  }
  async verifyEmail(token: string) {
    const { verifyEmail } = await import('./modules/email-verification');
    return verifyEmail(token);
  }
  async resendVerificationEmail(email: string) {
    const { resendVerificationEmail } = await import('./modules/email-verification');
    return resendVerificationEmail(email);
  }

  // ============================================
  // Two-Factor Authentication (2FA) — delegates to modules/two-factor.ts
  // ============================================
  async generate2FASecret(userId: string, email: string) {
    const { generate2FASecret } = await import('./modules/two-factor');
    return generate2FASecret(userId, email);
  }
  async generateTwoFactorSecret(userId: string) {
    const { generateTwoFactorSecret } = await import('./modules/two-factor');
    return generateTwoFactorSecret(userId);
  }
  async generateBackupCodes(_userId: string) {
    const { generateBackupCodes } = await import('./modules/two-factor');
    return generateBackupCodes(8);
  }
  async enable2FA(userId: string, token: string) {
    const { enable2FA } = await import('./modules/two-factor');
    return enable2FA(userId, token);
  }
  async enableTwoFactor(userId: string, token: string) {
    const { enableTwoFactor } = await import('./modules/two-factor');
    return enableTwoFactor(userId, token);
  }
  async disable2FA(userId: string, currentPassword?: string, code?: string) {
    const { disable2FA } = await import('./modules/two-factor');
    return disable2FA(userId, currentPassword, code);
  }
  async disableTwoFactor(userId: string, password: string) {
    const { disableTwoFactor } = await import('./modules/two-factor');
    return disableTwoFactor(userId, password);
  }
  async verify2FA(userId: string, token: string) {
    const { verify2FA } = await import('./modules/two-factor');
    return verify2FA(userId, token);
  }
  async verifyTwoFactorCode(userId: string, code: string) {
    const { verifyTwoFactorCode } = await import('./modules/two-factor');
    return verifyTwoFactorCode(userId, code);
  }
  async check2FAStatus(userId: string) {
    const { check2FAStatus } = await import('./modules/two-factor');
    return check2FAStatus(userId);
  }
  async hasTwoFactorEnabled(userId: string) {
    const { hasTwoFactorEnabled } = await import('./modules/two-factor');
    return hasTwoFactorEnabled(userId);
  }
  async regenerateBackupCodes(userId: string, token: string) {
    const { regenerateBackupCodes } = await import('./modules/two-factor');
    return regenerateBackupCodes(userId, token);
  }
}

export const authService = new AuthenticationService();
