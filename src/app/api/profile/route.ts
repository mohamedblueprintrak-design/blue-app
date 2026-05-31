import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireVerifiedAuth } from '@/app/api/utils/auth';
import { hasPermission } from '@/lib/auth/modules/authorization';
import { Permission } from '@/lib/auth/types';
import { validateRequest, profileUpdateSchema } from '@/lib/api-validation';
import { log } from '@/lib/logger';

/**
 * GET /api/profile - Get user profile
 *
 * Uses JWT-verified auth via requireVerifiedAuth().
 * - Users can view their OWN profile without additional permissions.
 * - Viewing another user's profile requires USER_READ permission (admin-level).
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Use requireVerifiedAuth() to prevent header forgery —
    // a forged x-user-id would expose any user's profile data.
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    // Determine target user — own profile by default
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') || ctx.userId;
    const isOwnProfile = targetUserId === ctx.userId;

    // RBAC: Viewing someone else's profile requires USER_READ permission
    if (!isOwnProfile && !hasPermission(ctx.role, Permission.USER_READ)) {
      return NextResponse.json(
        { error: "غير مصرح بعرض ملف هذا المستخدم" },
        { status: 403 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: targetUserId },
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
        organizationId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    // SECURITY: Prevent cross-organization profile access
    if (!isOwnProfile && ctx.organizationId && user.organizationId && user.organizationId !== ctx.organizationId) {
      return NextResponse.json(
        { error: "غير مصرح بعرض ملف هذا المستخدم" },
        { status: 403 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    log.error("Get profile error:", error);
    return NextResponse.json(
      { error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profile - Update user profile
 *
 * Uses JWT-verified auth via requireVerifiedAuth().
 * - Users can update their OWN profile without additional permissions.
 * - Updating another user's profile requires USER_UPDATE permission (admin-level).
 */
export async function PUT(request: NextRequest) {
  try {
    // SECURITY: Use requireVerifiedAuth() to prevent header forgery —
    // a forged x-user-id would allow modifying any user's profile.
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    const body = await request.json();

    // Determine target user — own profile by default
    const targetUserId = body.userId || ctx.userId;
    const isOwnProfile = targetUserId === ctx.userId;

    // RBAC: Updating someone else's profile requires USER_UPDATE permission
    if (!isOwnProfile && !hasPermission(ctx.role, Permission.USER_UPDATE)) {
      return NextResponse.json(
        { error: "غير مصرح بتعديل ملف هذا المستخدم" },
        { status: 403 }
      );
    }

    // Zod validation for profile update fields
    const validation = validateRequest(profileUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const validatedData = validation.data;

    const user = await db.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    // SECURITY: Prevent cross-organization profile modification
    if (!isOwnProfile && ctx.organizationId && user.organizationId && user.organizationId !== ctx.organizationId) {
      return NextResponse.json(
        { error: "غير مصرح بتعديل ملف هذا المستخدم" },
        { status: 403 }
      );
    }

    // Check if email is being changed and if it's already taken
    if (validatedData.email && validatedData.email !== user.email) {
      const existingUser = await db.user.findFirst({
        where: {
          email: validatedData.email,
          id: { not: user.id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "البريد الإلكتروني مستخدم بالفعل" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, string> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.email !== undefined) updateData.email = validatedData.email;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.department !== undefined) updateData.department = validatedData.department;
    if (validatedData.position !== undefined) updateData.position = validatedData.position;

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: updateData,
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
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    log.error("Update profile error:", error);
    return NextResponse.json(
      { error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
