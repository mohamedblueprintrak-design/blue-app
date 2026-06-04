import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  hashToken,
  getAuthCookieOptions,
} from '@/lib/auth/token-utils';
import { getAuthContext } from '@/app/api/utils/auth';

/**
 * POST /api/auth/logout
 * Revokes the refresh token on logout and clears both auth cookies.
 */
export async function POST(request: NextRequest) {
  try {
    // Extract refresh token from cookie using safe cookie API
    const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value || null;

    if (refreshToken) {
      // Hash the token and revoke it in the database
      const tokenHash = await hashToken(refreshToken);
      const storedToken = await db.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (storedToken) {
        // Revoke ALL refresh tokens for this user to log out from all devices
        await db.refreshToken.updateMany({
          where: { 
            userId: storedToken.userId,
            revokedAt: null
          },
          data: { revokedAt: new Date() },
        });
        log.info('All refresh tokens revoked on logout', { userId: storedToken.userId });
      } else {
        // Fallback: If we couldn't find the refresh token, try to get userId from the request context
        const ctx = getAuthContext(request);
        if (ctx?.id) {
          await db.refreshToken.updateMany({
            where: { 
              userId: ctx.id,
              revokedAt: null
            },
            data: { revokedAt: new Date() },
          });
          log.info('All refresh tokens revoked on logout via auth context', { userId: ctx.id });
        }
      }
    } else {
      // No refresh token cookie, but maybe we have the auth context
      const ctx = getAuthContext(request);
      if (ctx?.id) {
        await db.refreshToken.updateMany({
          where: { 
            userId: ctx.id,
            revokedAt: null
          },
          data: { revokedAt: new Date() },
        });
        log.info('All refresh tokens revoked on logout via auth context', { userId: ctx.id });
      }
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
