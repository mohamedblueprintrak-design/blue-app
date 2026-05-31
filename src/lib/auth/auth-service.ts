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
  async generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'> & { name?: string; twoFactorEnabled?: boolean; passwordChangedAt?: number }): Promise<string> {
    const secret = this.getJwtSecret();
    const clientRole = normalizeRoleForClient(payload.role);
    
    return new SignJWT({
      userId: payload.userId,
      email: payload.email,
      name: payload.name || payload.username,
      role: clientRole,
      twoFactorEnabled: payload.twoFactorEnabled || false,
      organizationId: payload.organizationId || undefined,
      passwordChangedAt: payload.passwordChangedAt || 0,
    } as Record<string, unknown>)
      .setProtectedHeader({ alg: JWT_ALG })
      .setIssuedAt()
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setExpirationTime(ACCESS_TOKEN_EXPIRY_VALUE)
      .sign(secret);
  }
  
  /**
   * Generate refresh token — uses DB-stored pattern (consistent with login/refresh routes)
   * Generates a random UUID, stores its SHA-256 hash in the database, and returns
   * the raw token. This supports rotation with reuse detection.
   */
  async generateRefreshToken(userId: string): Promise<string> {
    return generateDbRefreshToken(userId);
  }
  
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
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      // Find user by email OR name (username) — single query to avoid timing differences
      // that could reveal whether an email exists in the system (M-4: Login Timing Attack)
      const user = await db.user.findFirst({
        where: {
          OR: [
            { email: (data.email ?? '').toLowerCase() },
            { name: data.email },
          ],
        },
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      });
      
      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        };
      }
      
      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          error: 'Account is deactivated',
          code: 'ACCOUNT_DEACTIVATED',
        };
      }

      // Check account lockout — prevent brute force attacks
      const MAX_FAILED_ATTEMPTS = parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5', 10);
      const LOCKOUT_DURATION_MINUTES = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10);
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        return {
          success: false,
          error: 'Account temporarily locked due to too many failed login attempts',
          code: 'ACCOUNT_LOCKED',
        };
      }
      
      // Verify password
      if (!user.password) {
        return {
          success: false,
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        };
      }
      
      const isValidPassword = await this.verifyPassword(data.password, user.password);
      if (!isValidPassword) {
        // Increment failed login attempts
        const newFailedCount = (user.failedLoginAttempts || 0) + 1;
        if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newFailedCount,
              lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000),
            },
          });
        } else {
          await db.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: newFailedCount },
          });
        }
        return {
          success: false,
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        };
      }

      // Reset failed login attempts on successful login
      if (user.failedLoginAttempts > 0 || user.lockedUntil) {
        await db.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null },
        });
      }
      
      // Generate tokens
      const accessToken = await this.generateAccessToken({
        userId: user.id,
        email: user.email,
        username: user.name ?? "", // Using name as username
        role: user.role as string,
        organizationId: user.organizationId || undefined,
        passwordChangedAt: user.passwordChangedAt ? Math.floor(new Date(user.passwordChangedAt).getTime() / 1000) : 0,
      });
      
      const refreshToken = await this.generateRefreshToken(user.id);
      
      // Update last login
      await db.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
      
      // Log audit
      await logAudit({
        userId: user.id,
        organizationId: user.organizationId || undefined,
        entityType: 'user',
        entityId: user.id,
        action: 'login',
        description: `User logged in: ${user.email}`,
      });
      
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.name ?? "", // Using name as username
          fullName: user.name ?? "",
          role: normalizeRoleForClient(user.role as string),
          avatar: user.avatar,
          organizationId: user.organizationId,
          organization: user.organization,
        },
        token: accessToken,
        refreshToken,
      };
    } catch (error) {
      log.error('Login error', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      };
    }
  }
  
  /**
   * Register new user
   */
  async signup(data: SignupRequest): Promise<AuthResponse> {
    try {
      // Validate password strength
      const passwordValidation = this.validatePasswordStrength(data.password);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.errors.join('. '),
          code: 'WEAK_PASSWORD',
        };
      }
      
      // Check if email already exists
      const existingEmail = await db.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      
      if (existingEmail) {
        return {
          success: false,
          error: 'Email already registered',
          code: 'EMAIL_EXISTS',
        };
      }
      
      // Hash password
      const hashedPassword = await this.hashPassword(data.password);
      
      // Create organization if name provided
      let organizationId: string | null = null;
      if (data.organizationName) {
        const org = await db.organization.create({
          data: {
            name: data.organizationName,
            slug: data.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          },
        });
        organizationId = org.id;
      }
      
      // Create user - using `name` field instead of `username` and `fullName`
      // SECURITY: Role is NEVER derived from user input. Organization creators get ADMIN,
      // all others get VIEWER. This prevents privilege escalation via the signup API.
      const user = await db.user.create({
        data: {
          email: data.email.toLowerCase(),
          password: hashedPassword,
          name: data.fullName, // Using name field
          role: (organizationId ? UserRoleValues.ADMIN : UserRoleValues.VIEWER) as UserRole,
          department: data.department || '',
          organizationId,
        },
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      });
      
      // Generate tokens
      const accessToken = await this.generateAccessToken({
        userId: user.id,
        email: user.email,
        username: user.name ?? "", // Using name as username
        name: user.name ?? "",
        role: user.role as string,
        organizationId: user.organizationId || undefined,
        passwordChangedAt: 0, // New user — no password change yet
      });
      
      const refreshToken = await this.generateRefreshToken(user.id);
      
      // Log audit
      await logAudit({
        userId: user.id,
        organizationId: user.organizationId || undefined,
        entityType: 'user',
        entityId: user.id,
        action: 'create',
        description: `New user registered: ${user.email}`,
      });
      
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.name ?? "", // Using name as username
          fullName: user.name ?? "",
          role: normalizeRoleForClient(user.role as string),
          avatar: user.avatar,
          organizationId: user.organizationId,
          organization: (user as { organization?: { id: string; name: string; slug: string } | null }).organization,
        },
        token: accessToken,
        refreshToken,
      };
    } catch (error) {
      log.error('Signup error', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      };
    }
  }
  
  /**
   * Refresh access token — uses DB-stored refresh token with rotation
   * Consistent with /api/auth/refresh route pattern:
   * 1. Hash the provided token and look it up in the DB
   * 2. Detect reuse of revoked tokens (security)
   * 3. Revoke the old refresh token
   * 4. Generate new access token + new refresh token (rotation)
   */
  async refreshToken(oldRefreshToken: string): Promise<AuthResponse> {
    try {
      // Hash the provided token and look it up in the database
      const tokenHash = await hashToken(oldRefreshToken);
      const storedToken = await db.refreshToken.findUnique({
        where: { tokenHash },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              twoFactorEnabled: true,
              avatar: true,
              organizationId: true,
              passwordChangedAt: true,
              organization: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      });

      if (!storedToken) {
        return {
          success: false,
          error: 'Invalid refresh token',
          code: 'INVALID_TOKEN',
        };
      }

      // Detect reuse of revoked tokens — security measure
      if (storedToken.revokedAt) {
        log.security('Refresh token reuse detected in auth-service, revoking all tokens for user', {
          userId: storedToken.userId,
        });
        await db.refreshToken.updateMany({
          where: { userId: storedToken.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return {
          success: false,
          error: 'Refresh token has been revoked',
          code: 'INVALID_TOKEN',
        };
      }

      // Check if token has expired
      if (storedToken.expiresAt < new Date()) {
        return {
          success: false,
          error: 'Refresh token has expired',
          code: 'INVALID_TOKEN',
        };
      }

      const user = storedToken.user;

      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'User not found or inactive',
          code: 'USER_NOT_FOUND',
        };
      }

      // Revoke the old refresh token (rotation)
      await db.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      // Generate new access token
      const accessToken = await this.generateAccessToken({
        userId: user.id,
        email: user.email,
        username: user.name ?? "",
        name: user.name ?? "",
        role: user.role as string,
        twoFactorEnabled: user.twoFactorEnabled || false,
        organizationId: user.organizationId || undefined,
        passwordChangedAt: user.passwordChangedAt ? Math.floor(new Date(user.passwordChangedAt).getTime() / 1000) : 0,
      });
      
      // Generate new refresh token (rotation)
      const newRefreshToken = await this.generateRefreshToken(user.id);
      
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.name ?? "",
          fullName: user.name ?? "",
          role: normalizeRoleForClient(user.role as string),
          avatar: user.avatar,
          organizationId: user.organizationId,
          organization: user.organization,
        },
        token: accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      log.error('Token refresh error', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      };
    }
  }
  
  /**
   * Change password
   */
  async changePassword(userId: string, data: PasswordChangeRequest): Promise<AuthResponse> {
    try {
      // Validate new password
      if (data.newPassword !== data.confirmPassword) {
        return {
          success: false,
          error: 'Passwords do not match',
          code: 'PASSWORD_MISMATCH',
        };
      }
      
      const passwordValidation = this.validatePasswordStrength(data.newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.errors.join('. '),
          code: 'WEAK_PASSWORD',
        };
      }
      
      // Get user
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
      
      // Verify current password
      const isValid = await this.verifyPassword(data.currentPassword, user.password);
      if (!isValid) {
        return {
          success: false,
          error: 'Current password is incorrect',
          code: 'INVALID_PASSWORD',
        };
      }
      
      // Update password
      const hashedPassword = await this.hashPassword(data.newPassword);
      await db.user.update({
        where: { id: userId },
        data: { 
          password: hashedPassword,
          passwordChangedAt: new Date(),
        },
      });

      // Invalidate all existing refresh tokens for security
      await db.refreshToken.deleteMany({
        where: { userId },
      });
      
      // Log audit
      await logAudit({
        userId,
        organizationId: user.organizationId || undefined,
        entityType: 'user',
        entityId: userId,
        action: 'update',
        description: 'Password changed',
      });
      
      return {
        success: true,
      };
    } catch (error) {
      log.error('Password change error', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      };
    }
  }
  
  /**
   * Request password reset
   */
  async requestPasswordReset(data: PasswordResetRequest): Promise<AuthResponse> {
    try {
      const user = await db.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      
      // Don't reveal if email exists or not
      if (!user) {
        return { success: true };
      }
      
      const resetToken = await this.generatePasswordResetToken(user.id);
      
      // Store HASHED token in database for invalidation after use
      // The original token is only sent via email — never stored in plaintext
      await db.passwordResetToken.create({
        data: {
          email: user.email,
          token: await hashToken(resetToken),
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      // Send password reset email with secure link
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

      const template = emailTemplates.passwordReset(
        user.name ?? "",
        resetLink,
        60 // 1 hour expiry in minutes
      );

      await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }).catch(() => {
        // Email sending failed but don't reveal error to prevent enumeration
      });
      
      return { success: true };
    } catch (error) {
      log.error('Password reset request error', error);
      return { success: true }; // Don't reveal errors
    }
  }
  
  /**
   * Confirm password reset
   */
  async confirmPasswordReset(data: PasswordResetConfirm): Promise<AuthResponse> {
    try {
      const payload = await this.verifyPasswordResetToken(data.token);
      if (!payload) {
        return {
          success: false,
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        };
      }
      
      if (data.newPassword !== data.confirmPassword) {
        return {
          success: false,
          error: 'Passwords do not match',
          code: 'PASSWORD_MISMATCH',
        };
      }
      
      const passwordValidation = this.validatePasswordStrength(data.newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.errors.join('. '),
          code: 'WEAK_PASSWORD',
        };
      }
      
      // Hash the token once and reuse the result (avoid double hashing)
      const hashedInputToken = await hashToken(data.token);
      
      // Check if token has already been used (look up by hashed token)
      const existingToken = await db.passwordResetToken.findUnique({
        where: { token: hashedInputToken },
      });
      if (existingToken?.usedAt) {
        return {
          success: false,
          error: 'Token already used',
          code: 'TOKEN_USED',
        };
      }

      const hashedPassword = await this.hashPassword(data.newPassword);
      
      await db.$transaction([
        db.user.update({
          where: { id: payload.userId },
          data: { 
            password: hashedPassword,
            passwordChangedAt: new Date(), // Invalidate existing JWT tokens
            emailVerified: new Date(),
          },
        }),
        // Invalidate the token after successful password reset (reuse hashed token)
        db.passwordResetToken.update({
          where: { token: hashedInputToken },
          data: { usedAt: new Date() },
        }),
      ]);
      
      return { success: true };
    } catch (error) {
      log.error('Password reset confirmation error', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      };
    }
  }
  
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
