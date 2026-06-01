// @ts-check
import { log } from '@/lib/logger';

/**
 * JWT Token Management Module
 * وحدة إدارة رموز JWT
 * 
 * Handles JWT token generation, verification, and refresh
 */

import { SignJWT, jwtVerify } from 'jose';
import { getJwtSecretBytes } from '@/lib/auth/jwt-secret';

// ============================================
// Constants
// ============================================

const JWT_ALG = 'HS256';
const JWT_ISSUER = 'blueprint-saas';
const JWT_AUDIENCE = 'blueprint-users';

// Token types
export type TokenType = 'access' | 'refresh' | 'password-reset' | 'email-verification';

// ============================================
// Types
// ============================================

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
  organizationId?: string;
  type?: TokenType;
  iat?: number;
  exp?: number;
}

export interface TokenOptions {
  expiresIn?: string;
  type?: TokenType;
}

// ============================================
// Configuration
// ============================================

/**
 * Get JWT secret key
 */
function getJwtSecret(): Uint8Array {
  return getJwtSecretBytes();
}

/**
 * Get JWT configuration
 */
function getJwtConfig() {
  return {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  };
}

// ============================================
// Token Generation
// ============================================

/**
 * Generate an access token
 * Short-lived token for API authentication
 */
export async function generateAccessToken(
  payload: Omit<JwtPayload, 'iat' | 'exp' | 'type'>
): Promise<string> {
  const secret = getJwtSecret();
  const config = getJwtConfig();
  
  return new SignJWT({ ...payload, type: 'access' } as Record<string, unknown>)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(config.expiresIn)
    .sign(secret);
}

/**
 * Generate a refresh token
 * Long-lived token for refreshing access tokens
 *
 * @deprecated Use generateDbRefreshToken from @/lib/auth/token-utils instead.
 * JWT-based refresh tokens don't support rotation or reuse detection.
 * This function is kept for backward compatibility only.
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  const secret = getJwtSecret();
  const config = getJwtConfig();
  
  return new SignJWT({ userId, type: 'refresh' })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(config.refreshExpiresIn)
    .sign(secret);
}

/**
 * Generate a password reset token
 * Short-lived token for password reset
 */
export async function generatePasswordResetToken(userId: string): Promise<string> {
  const secret = getJwtSecret();
  
  return new SignJWT({ userId, type: 'password-reset' })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime('1h')
    .sign(secret);
}

/**
 * Generate an email verification token
 */
export async function generateEmailVerificationToken(
  email: string, 
  userId?: string
): Promise<string> {
  const secret = getJwtSecret();
  
  return new SignJWT({ email, userId, type: 'email-verification' })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime('24h')
    .sign(secret);
}

/**
 * Generate a custom token with specific options
 */
export async function generateToken(
  payload: Record<string, unknown>,
  options?: TokenOptions
): Promise<string> {
  const secret = getJwtSecret();
  
  const token = new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE);
  
  if (options?.expiresIn) {
    token.setExpirationTime(options.expiresIn);
  }
  
  if (options?.type) {
    token.setSubject(options.type);
  }
  
  return token.sign(secret);
}

// ============================================
// Token Verification
// ============================================

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    
    // SECURITY: Reject non-access tokens (e.g., password-reset, email-verification)
    // Only tokens with type='access' or no type (legacy) should be accepted
    const tokenType = payload.type as string | undefined;
    if (tokenType && tokenType !== 'access') {
      return null;
    }
    
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      username: (payload.name || payload.username) as string,
      role: payload.role as string,
      organizationId: payload.organizationId as string | undefined,
      type: payload.type as TokenType | undefined,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Verify refresh token
 *
 * @deprecated Use DB-based refresh token verification instead (see @/lib/auth/token-utils).
 * JWT-based refresh tokens don't support rotation or reuse detection.
 *
 * This function verifies the JWT directly (bypassing verifyToken which rejects
 * non-access tokens) to support the deprecated JWT refresh flow.
 */
export async function verifyRefreshToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    
    if (payload.type !== 'refresh') {
      return null;
    }
    
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

/**
 * Verify password reset token
 * Verifies the JWT directly (bypassing verifyToken which rejects non-access tokens)
 */
export async function verifyPasswordResetToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    
    if (payload.type !== 'password-reset') {
      return null;
    }
    
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

/**
 * Verify email verification token
 * Verifies the JWT directly (bypassing verifyToken which rejects non-access tokens)
 */
export async function verifyEmailVerificationToken(
  token: string
): Promise<{ email: string; userId?: string } | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    
    if (payload.type !== 'email-verification') {
      return null;
    }
    
    return { 
      email: payload.email as string, 
      userId: payload.userId as string | undefined
    };
  } catch {
    return null;
  }
}

// ============================================
// Shared Auth Utilities (re-exported from token-utils for convenience)
// ============================================

/**
 * These utilities are centralized in @/lib/auth/token-utils.
 * They are re-exported here for backward compatibility with any code
 * that imports from @/lib/auth/modules/jwt.
 *
 * NEW CODE should import directly from @/lib/auth/token-utils instead.
 */
export {
  hashToken,
  normalizeRoleForClient,
  generateDbRefreshToken,
  getAuthCookieOptions,
  encrypt,
  decrypt,
} from '@/lib/auth/token-utils';

export const AUTH_COOKIE_NAMES = {
  ACCESS_TOKEN: 'blue_token',
  REFRESH_TOKEN: 'blue_refresh_token',
} as const;

export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: '15m',
  ACCESS_TOKEN_MAX_AGE: 15 * 60,
  REFRESH_TOKEN_DAYS: 7,
  REFRESH_TOKEN_MAX_AGE: 7 * 24 * 60 * 60,
} as const;

// ============================================
// Token Utilities
// ============================================

/**
 * Get token expiration time
 */
export function getTokenExpiration(expiresIn: string): Date {
  const now = new Date();
  
  // Parse the expiration string (e.g., '2h', '7d', '30m')
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  
  if (!match) {
    throw new Error(`Invalid expiration format: ${expiresIn}`);
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': // seconds
      return new Date(now.getTime() + value * 1000);
    case 'm': // minutes
      return new Date(now.getTime() + value * 60 * 1000);
    case 'h': // hours
      return new Date(now.getTime() + value * 60 * 60 * 1000);
    case 'd': // days
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(exp: number): boolean {
  return Date.now() >= exp * 1000;
}

/**
 * Decode token without verification (for debugging only)
 * SECURITY: Only available in development mode to prevent accidental
 * use in production which would accept forged tokens.
 */
export function decodeToken(token: string): JwtPayload | null {
  if (process.env.NODE_ENV === 'production') {
    log.warn('[SECURITY] decodeToken() called in production — use verifyToken() instead');
    return null;
  }
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf8')
    );
    
    return payload as JwtPayload;
  } catch {
    return null;
  }
}
