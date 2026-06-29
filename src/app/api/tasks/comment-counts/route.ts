import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgFilterNested } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';

export async function GET(request: NextRequest) {
  try {
    // AUTH CHECK
    const auth = await requireVerifiedPermission(request, Permission.TASK_READ);
    if ('error' in auth) return auth.error;
    const ctx = auth.user;

    // SECURITY: Apply orgFilter to prevent cross-tenant data leakage
    // Without this, any authenticated user could see comment counts
    // for ALL tasks across ALL organizations
    const orgWhere = orgFilterNested(ctx, 'task');

    const counts = await db.taskComment.groupBy({
      by: ["taskId"],
      where: orgWhere,
      _count: true,
      orderBy: { _count: { id: "desc" } },
    });

    return NextResponse.json({ counts });
  } catch (error) {
    log.error("Error fetching comment counts:", error);
    return NextResponse.json(
      { error: "Failed to fetch comment counts" },
      { status: 500 }
    );
  }
}
