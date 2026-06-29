import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  hashToken,
  generateAuthToken,
  generateDbRefreshToken,
  getAuthCookieOptions,
} from '@/lib/auth/token-utils';

/** Grace period for concurrent refresh detection (30 seconds) */
const CONCURRENT_REFRESH_GRACE_MS = 30_000;

/** Track tokens currently being rotated within the grace period to prevent concurrent rotations */
const tokensInGraceRotation = new Set<string>();

/**
 * Helper to clear auth cookies on a response
 */
function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set(AUTH_COOKIE_NAME, '', { ...getAuthCookieOptions(0), maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE_NAME, '', { ...getAuthCookieOptions(0), maxAge: 0 });
  return response;
}

/**
 * POST /api/auth/refresh
 *
 * Accepts a refresh token from the `blue_refresh_token` httpOnly cookie,
 * verifies it against the database, and issues a new access token + new
 * refresh token (rotation). The old refresh token is invalidated.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting — auth limiter (10 req/min)
    const { result: rlResult } = await withRateLimit(request, 'auth');
    const rlBlocked = rateLimitResponse(rlResult);
    if (rlBlocked) return rlBlocked;

    const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value || null;

    if (!refreshToken) {
      return clearAuthCookies(NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      ));
    }

    // Hash the provided token to look it up in the database
    const tokenHash = await hashToken(refreshToken);

    // Find the refresh token record WITHOUT including user (to avoid Prisma crash
    // on orphaned tokens where userId points to a deleted user in SQLite).
    // SQLite does not enforce FKs, so orphaned tokens can exist.
    // Using findFirst + select to avoid Prisma's "Field user is required" error
    // that can still occur with findUnique on orphaned records.
    let storedToken: { id: string; userId: string; tokenHash: string; expiresAt: Date; revokedAt: Date | null; createdAt: Date } | null = null;
    try {
      storedToken = await db.refreshToken.findFirst({
        where: { tokenHash },
        select: {
          id: true,
          userId: true,
          tokenHash: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
        },
      });
    } catch (dbErr) {
      // If Prisma throws "Field user is required" due to orphaned relation, catch it
      log.error('Refresh token lookup failed (possible orphaned record):', dbErr);
      return clearAuthCookies(NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      ));
    }

    if (!storedToken) {
      return clearAuthCookies(NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      ));
    }

    // Orphaned token — user was deleted but token still exists (SQLite FK not enforced)
    // Fetch user separately to avoid Prisma "Field user is required" crash
    let user: { id: string; email: string; name: string | null; role: string; isActive: boolean; twoFactorEnabled: boolean; organizationId: string | null; passwordChangedAt: Date | null } | null = null;
    try {
      user = await db.user.findUnique({
        where: { id: storedToken.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          twoFactorEnabled: true,
          organizationId: true,
          passwordChangedAt: true,
        },
      });
    } catch (dbErr) {
      log.error('User lookup for refresh token failed:', dbErr);
    }

    if (!user) {
      // Clean up the orphaned token and reject the request
      // Use deleteMany (more resilient than delete for orphaned records)
      try {
        await db.refreshToken.deleteMany({ where: { id: storedToken.id } });
      } catch { /* ignore cleanup failure */ }
      return clearAuthCookies(NextResponse.json(
        { error: 'User no longer exists' },
        { status: 401 }
      ));
    }

    // Check if token has been revoked
    if (storedToken.revokedAt) {
      const revokeAge = Date.now() - new Date(storedToken.revokedAt).getTime();

      if (revokeAge < CONCURRENT_REFRESH_GRACE_MS) {
        // Likely a concurrent refresh from another tab — the token was just
        // rotated. Don't nuke all sessions; instead issue new tokens.
        // This prevents the common issue where two tabs refreshing simultaneously
        // causes reuse detection that logs the user out of all devices.
        
        // SECURITY: Track which tokens are already being rotated within the grace
        // period to prevent multiple concurrent rotations from the same token,
        // which could allow token amplification.
        if (tokensInGraceRotation.has(storedToken.id)) {
          log.security('Duplicate concurrent refresh from same token blocked', {
            userId: storedToken.userId,
            tokenId: storedToken.id,
            revokeAgeMs: revokeAge,
          });
          return clearAuthCookies(NextResponse.json(
            { error: 'Token already being rotated' },
            { status: 401 }
          ));
        }
        
        tokensInGraceRotation.add(storedToken.id);
        // Auto-cleanup after grace period expires
        setTimeout(() => tokensInGraceRotation.delete(storedToken.id), CONCURRENT_REFRESH_GRACE_MS);
        
        log.warn('Concurrent refresh detected within grace period', {
          userId: storedToken.userId,
          revokeAgeMs: revokeAge,
        });
        // Continue to issue new tokens below
      } else {
        // Genuine token reuse — security incident. Revoke all refresh tokens.
        log.security('Refresh token reuse detected, revoking all tokens for user', {
          userId: storedToken.userId,
          revokeAgeMs: revokeAge,
        });
        await db.refreshToken.updateMany({
          where: { userId: storedToken.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return clearAuthCookies(NextResponse.json(
          { error: 'Refresh token has been revoked' },
          { status: 401 }
        ));
      }
    }

    // Check if token has expired
    if (storedToken.expiresAt < new Date()) {
      return clearAuthCookies(NextResponse.json(
        { error: 'Refresh token has expired' },
        { status: 401 }
      ));
    }

    // Check if user is still active
    if (!user.isActive) {
      return clearAuthCookies(NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      ));
    }

    // Invalidate the old refresh token (rotation)
    await db.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new access token using centralized utility
    const accessToken = await generateAuthToken({
      userId: user.id,
      email: user.email,
      name: user.name ?? "",
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      organizationId: user.organizationId,
      passwordChangedAt: user.passwordChangedAt ? Math.floor(new Date(user.passwordChangedAt).getTime() / 1000) : 0,
    });

    // Generate new refresh token (rotation) using centralized utility
    const newRawRefreshToken = await generateDbRefreshToken(user.id);

    // Build response
    const response = NextResponse.json({
      success: true,
      message: 'Tokens refreshed',
    });

    // Set new access token cookie
    response.cookies.set(AUTH_COOKIE_NAME, accessToken, getAuthCookieOptions(ACCESS_TOKEN_MAX_AGE));

    // Set new refresh token cookie
    response.cookies.set(REFRESH_COOKIE_NAME, newRawRefreshToken, getAuthCookieOptions(REFRESH_TOKEN_MAX_AGE));

    log.info('Refresh token rotated', { userId: user.id });

    return response;
  } catch (error) {
    log.error("Refresh token error:", error);
    return clearAuthCookies(NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    ));
  }
}
