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

    // Find the refresh token record
    // NOTE: SQLite does not enforce foreign keys, so orphaned tokens (userId
    // pointing to a deleted user) can exist. We handle this gracefully.
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
            organizationId: true,
            passwordChangedAt: true,
          },
        },
      },
    });

    if (!storedToken) {
      return clearAuthCookies(NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      ));
    }

    // Orphaned token — user was deleted but token still exists (SQLite FK not enforced)
    if (!storedToken.user) {
      // Clean up the orphaned token and reject the request
      await db.refreshToken.delete({ where: { id: storedToken.id } }).catch(() => {});
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
    if (!storedToken.user.isActive) {
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
      userId: storedToken.user.id,
      email: storedToken.user.email,
      name: storedToken.user.name ?? "",
      role: storedToken.user.role,
      twoFactorEnabled: storedToken.user.twoFactorEnabled,
      organizationId: storedToken.user.organizationId,
      passwordChangedAt: storedToken.user.passwordChangedAt ? Math.floor(new Date(storedToken.user.passwordChangedAt).getTime() / 1000) : 0,
    });

    // Generate new refresh token (rotation) using centralized utility
    const newRawRefreshToken = await generateDbRefreshToken(storedToken.user.id);

    // Build response
    const response = NextResponse.json({
      success: true,
      message: 'Tokens refreshed',
    });

    // Set new access token cookie
    response.cookies.set(AUTH_COOKIE_NAME, accessToken, getAuthCookieOptions(ACCESS_TOKEN_MAX_AGE));

    // Set new refresh token cookie
    response.cookies.set(REFRESH_COOKIE_NAME, newRawRefreshToken, getAuthCookieOptions(REFRESH_TOKEN_MAX_AGE));

    log.info('Refresh token rotated', { userId: storedToken.user.id });

    return response;
  } catch (error) {
    log.error("Refresh token error:", error);
    return clearAuthCookies(NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    ));
  }
}
