import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/lib/db";
import { getJwtSecretBytes } from "@/lib/auth/jwt-secret";
import { normalizeRoleForClient } from "@/lib/auth/token-utils";
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Extract token from cookie or Authorization header
    const authHeader = request.headers.get("authorization");
    let token: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
    if (!token) {
      const tokenCookie = request.cookies.get('blue_token');
      token = tokenCookie?.value || null;
    }

    if (!token) {
      return NextResponse.json(
        { error: "غير مصرح" },
        { status: 401 }
      );
    }

    // Verify JWT with issuer/audience validation
    const { payload } = await jwtVerify(token, getJwtSecretBytes(), {
      issuer: 'blueprint-saas',
      audience: 'blueprint-users',
    });

    // SECURITY: Reject non-access token types (e.g. '2fa-pending', 'password-reset')
    if (payload.type && payload.type !== 'access') {
      return NextResponse.json(
        { error: "رمز مصادقة غير صالح" },
        { status: 401 }
      );
    }

    const userId = payload.userId as string;

    if (!userId) {
      return NextResponse.json(
        { error: "رمز مصادقة غير صالح" },
        { status: 401 }
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

    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    // Check if user account is still active
    if (!user.isActive) {
      return NextResponse.json(
        { error: "الحساب معطل" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, user: { ...user, role: normalizeRoleForClient(user.role) } });
  } catch (error) {
    log.error("Get current user error:", error);
    return NextResponse.json(
      { error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
