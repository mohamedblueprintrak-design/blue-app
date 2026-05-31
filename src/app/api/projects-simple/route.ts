import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { orgFilter, requireVerifiedPermission } from '../utils/auth';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

export async function GET(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  const authResult = await requireVerifiedPermission(request, Permission.PROJECT_READ);
  if ('error' in authResult) return authResult.error;
  const ctx = authResult.user;

  try {
    const projects = await db.project.findMany({
      where: { ...orgFilter(ctx) },
      select: { id: true, name: true, nameEn: true, number: true, status: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
