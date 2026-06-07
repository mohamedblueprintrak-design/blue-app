import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  hashToken,
  getAuthCookieOptions,
} from '@/lib/auth/token-utils';
import { getAuthContext } from '@/app/api/utils/auth';
import { authService } from '@/lib/auth/auth-service';
import { db } from '@/lib/db';

/**
 * POST /api/auth/logout
 * Revokes the refresh token on logout and clears both auth cookies.
 */
export async function POST(request: NextRequest) {
  try {
    // Extract refresh token from cookie using safe cookie API
    const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value || null;
    let targetUserId = null;

    if (refreshToken) {
      // Hash the token and revoke it in the database
      const tokenHash = await hashToken(refreshToken);
      const storedToken = await db.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (storedToken) {
        targetUserId = storedToken.userId;
      }
    }

    if (!targetUserId) {
      const ctx = getAuthContext(request);
      if (ctx?.userId) {
        targetUserId = ctx.userId;
      }
    }

    if (targetUserId) {
      // authService.logout revokes all refresh tokens and logs the audit event
      await authService.logout(targetUserId);
      log.info('All refresh tokens revoked on logout', { userId: targetUserId });
    }
  } catch (error) {
    // Log but don't block logout if revocation fails
    log.error('Error revoking refresh token on logout:', error);
  }

  // Always clear both cookies regardless of revocation outcome
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  response.cookies.set(AUTH_COOKIE_NAME, '', {
    ...getAuthCookieOptions(0),
  });

  response.cookies.set(REFRESH_COOKIE_NAME, '', {
    ...getAuthCookieOptions(0),
  });

  return response;
}

/**
 * GET /api/auth/logout
 * SECURITY: Removed GET handler to prevent CSRF-based logout attacks.
 * Logout must be initiated via POST request only.
 */
