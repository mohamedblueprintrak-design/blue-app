import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';

export async function GET(request: NextRequest) {
  try {
    // RBAC CHECK - requires USER_READ permission (JWT-verified for user data)
    const rbac = await requireVerifiedPermission(request, Permission.USER_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const where: Record<string, unknown> = { isActive: true, ...orgFilter(ctx) };

    const users = await db.user.findMany({
      where,
      select: { id: true, name: true, avatar: true, role: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (_error) {
    return NextResponse.json([], { status: 200 });
  }
}
