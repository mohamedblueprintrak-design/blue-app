import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { validateRequest, siteDiarySchema } from '@/lib/api-validation';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import type { WeatherCondition } from '@/types/db-enums';

export async function GET(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SITE_DIARY_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    // SiteDiary doesn't have organizationId directly; filter through project relationship
    const orgWhere = ctx.organizationId ? { project: { organizationId: ctx.organizationId } } : {};
    const where: Record<string, unknown> = { deletedAt: null, ...orgWhere };
    if (projectId) where.projectId = projectId;

    const siteDiaries = await db.siteDiary.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(siteDiaries);
  } catch (error) {
    log.error("Error fetching site diaries:", error);
    return NextResponse.json({ error: "Failed to fetch site diaries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SITE_DIARY_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const body = await request.json();

    const validation = validateRequest(siteDiarySchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const { projectId, date, weather, workerCount, workDescription, issues, safetyNotes, equipment, materials, photos } = validation.data;

    const siteDiary = await db.siteDiary.create({
      data: {
        ...orgCreate(ctx),
        projectId,
        date: new Date(date),
        weather: (weather || undefined) as WeatherCondition | undefined,
        workerCount: workerCount || 0,
        workDescription: workDescription || "",
        issues: issues || "",
        safetyNotes: safetyNotes || "",
        equipment: equipment || "",
        materials: materials || "",
        photos: photos || "",
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    return NextResponse.json(siteDiary, { status: 201 });
  } catch (error) {
    log.error("Error creating site diary:", error);
    return NextResponse.json({ error: "Failed to create site diary" }, { status: 500 });
  }
}
