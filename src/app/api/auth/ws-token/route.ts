import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getJWTSecret, requireVerifiedAuth } from '../../utils/auth';
import { errorResponse } from '../../utils/response';
import { log } from '@/lib/logger';

/**
 * GET /api/auth/ws-token
 *
 * Returns a short-lived WebSocket authentication token (5 minutes).
 * The client uses this token to authenticate with the Socket.io mini-service.
 *
 * This is needed because the main JWT is stored in an httpOnly cookie
 * (blue_token) which JavaScript cannot read. We verify the user is
 * authenticated via middleware-set headers, then issue a short-lived
 * WS-specific token.
 *
 * Response format: { success: true, token: "..." }
 * Note: token is at top level (not nested in data) because the WebSocket
 * context checks for data.token directly.
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY FIX: Use requireVerifiedAuth() to prevent header forgery —
    // a forged x-user-id would produce valid WebSocket tokens for any user.
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    // Generate a short-lived JWT for WebSocket authentication (5 minutes)
    // SECURITY: Include issuer and audience claims so the token can't be
    // accepted by other JWT verification paths that check these claims.
    const token = await new SignJWT({
      userId: ctx.userId,
      email: ctx.email,
      role: ctx.role,
      name: ctx.name,
      organizationId: ctx.organizationId,
      type: 'ws', // Token type to distinguish from access tokens
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('blueprint-saas')
      .setAudience('blueprint-ws')
      .setExpirationTime('5m')
      .setIssuedAt()
      .sign(getJWTSecret());

    // Return token at top level for WebSocket context compatibility
    return NextResponse.json({ success: true, token });
  } catch (error) {
    log.error('WS token generation error:', error);
    return errorResponse('خطأ في الخادم', 'SERVER_ERROR', 500);
  }
}

export async function OPTIONS() {
  const { handleCorsPreflight } = await import('../../utils/response');
  return handleCorsPreflight();
}
