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
      return NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Orphaned token — user was deleted but token still exists (SQLite FK not enforced)
    if (!storedToken.user) {
      // Clean up the orphaned token and reject the request
      await db.refreshToken.delete({ where: { id: storedToken.id } }).catch(() => {});
      const response = NextResponse.json(
        { error: 'User no longer exists' },
        { status: 401 }
      );
      // Clear the invalid refresh token cookie
      response.cookies.set(REFRESH_COOKIE_NAME, '', { ...getAuthCookieOptions(0), maxAge: 0 });
      response.cookies.set(AUTH_COOKIE_NAME, '', { ...getAuthCookieOptions(0), maxAge: 0 });
      return response;
    }

    // Check if token has been revoked
    if (storedToken.revokedAt) {
      // Possible token reuse — revoke all refresh tokens for this user as a security measure
      log.security('Refresh token reuse detected, revoking all tokens for user', {
        userId: storedToken.userId,
      });
      await db.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return NextResponse.json(
        { error: 'Refresh token has been revoked' },
        { status: 401 }
      );
    }

    // Check if token has expired
    if (storedToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Refresh token has expired' },
        { status: 401 }
      );
    }

    // Check if user is still active
    if (!storedToken.user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      );
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
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}
