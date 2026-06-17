import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { getJwtSecretBytes } from '@/lib/auth/jwt-secret';
import { normalizeRoleForClient } from '@/lib/auth/token-utils';

/**
 * GET /api/auth/session
 * Returns current user session info from httpOnly cookie.
 * This is the primary way for the client to check authentication status.
 */
export async function GET(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get('blue_token');
    if (!tokenCookie?.value) {
      return NextResponse.json(
        { success: false, user: null, isAuthenticated: false },
        { status: 200 }
      );
    }

    const { payload } = await jwtVerify(tokenCookie.value, getJwtSecretBytes(), {
      issuer: 'blueprint-saas',
      audience: 'blueprint-users',
    });

    // SECURITY: Reject non-access token types (e.g. '2fa-pending', 'password-reset')
    if (payload.type && payload.type !== 'access') {
      return NextResponse.json(
        { success: false, user: null, isAuthenticated: false },
        { status: 200 }
      );
    }

    const userId = payload.userId as string;

    if (!userId) {
      return NextResponse.json(
        { success: false, user: null, isAuthenticated: false },
        { status: 200 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        department: true,
        position: true,
        isActive: true,
        deletedAt: true,
        lastLogin: true,
        createdAt: true,
        passwordChangedAt: true,
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      return NextResponse.json(
        { success: false, user: null, isAuthenticated: false },
        { status: 200 }
      );
    }

    // SECURITY: Check if password was changed after this token was issued
    if (user.passwordChangedAt && payload.iat && Math.floor(user.passwordChangedAt.getTime() / 1000) > payload.iat) {
      return NextResponse.json(
        { success: false, user: null, isAuthenticated: false, error: 'Token expired due to password change' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        role: normalizeRoleForClient(user.role),
      },
      isAuthenticated: true,
    });
  } catch {
    return NextResponse.json(
      { success: false, user: null, isAuthenticated: false },
      { status: 200 }
    );
  }
}
