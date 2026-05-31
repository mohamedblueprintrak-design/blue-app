import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireVerifiedAuth } from '@/app/api/utils/auth';
import { hasPermission } from '@/lib/auth/modules/authorization';
import { Permission } from '@/lib/auth/types';
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { log } from '@/lib/logger';

const AVATAR_DIR = path.join(process.cwd(), "public", "upload", "avatars");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];

/**
 * POST /api/profile/avatar - Upload avatar image
 *
 * RBAC logic:
 * - Users can upload their OWN avatar without additional permissions.
 * - Uploading an avatar for another user requires USER_UPDATE permission (admin-level).
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY FIX: Use requireVerifiedAuth() to prevent header forgery —
    // a forged x-user-id would allow uploading avatars for any user.
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    // Determine target user — own avatar by default
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') || ctx.userId;
    const isOwnProfile = targetUserId === ctx.userId;

    // RBAC: Uploading avatar for another user requires USER_UPDATE permission
    if (!isOwnProfile && !hasPermission(ctx.role, Permission.USER_UPDATE)) {
      return NextResponse.json(
        { error: "غير مصرح بتعديل صورة هذا المستخدم" },
        { status: 403 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "لم يتم توفير ملف" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "نوع الملف غير مدعوم. الأنواع المسموحة: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت" },
        { status: 400 }
      );
    }

    // Generate unique filename — validate extension to prevent stored XSS
    const timestamp = Date.now();
    const rawExtension = (file.name.split(".").pop() || "jpg").toLowerCase();
    const extension = ALLOWED_EXTENSIONS.includes(rawExtension) ? rawExtension : "jpg";
    const filename = `${user.id}-${timestamp}.${extension}`;
    const filepath = path.join(AVATAR_DIR, filename);

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure directory exists
    if (!existsSync(AVATAR_DIR)) {
      await mkdir(AVATAR_DIR, { recursive: true });
    }

    // Write file to disk
    await writeFile(filepath, buffer);

    // Generate avatar URL
    const avatarUrl = `/upload/avatars/${filename}`;

    // Update user in database
    await db.user.update({
      where: { id: user.id },
      data: { avatar: avatarUrl },
    });

    return NextResponse.json({ avatar: avatarUrl });
  } catch (error) {
    log.error("Upload avatar error:", error);
    return NextResponse.json(
      { error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profile/avatar - Remove avatar
 *
 * RBAC logic:
 * - Users can delete their OWN avatar without additional permissions.
 * - Deleting another user's avatar requires USER_UPDATE permission (admin-level).
 */
export async function DELETE(request: NextRequest) {
  try {
    // SECURITY FIX: Use requireVerifiedAuth() to prevent header forgery —
    // a forged x-user-id would allow deleting avatars for any user.
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    // Determine target user — own avatar by default
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') || ctx.userId;
    const isOwnProfile = targetUserId === ctx.userId;

    // RBAC: Deleting another user's avatar requires USER_UPDATE permission
    if (!isOwnProfile && !hasPermission(ctx.role, Permission.USER_UPDATE)) {
      return NextResponse.json(
        { error: "غير مصرح بحذف صورة هذا المستخدم" },
        { status: 403 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    const currentAvatar = user.avatar || null;

    // Remove from database
    await db.user.update({
      where: { id: user.id },
      data: { avatar: "" },
    });

    // Delete file from disk if exists
    if (currentAvatar && currentAvatar.startsWith("/upload/avatars/")) {
      const filepath = path.join(process.cwd(), "public", currentAvatar);
      if (existsSync(filepath)) {
        await unlink(filepath);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Delete avatar error:", error);
    return NextResponse.json(
      { error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
