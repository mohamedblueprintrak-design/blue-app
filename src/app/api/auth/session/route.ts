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
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, user: null, isAuthenticated: false },
        { status: 200 }
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
