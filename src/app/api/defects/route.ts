import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { sanitizeObject } from '@/lib/security/sanitize';
import { z } from 'zod';

// Zod schema for defect creation
const defectCreateSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().max(5000).optional().default(''),
  severity: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).default('NORMAL'),
  status: z.string().max(50).default('OPEN'),
  assigneeId: z.string().max(100).optional().default(''),
  location: z.string().max(300).optional().default(''),
  photos: z.string().optional().default(''),
  notes: z.string().max(5000).optional().default(''),
});

export async function GET(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.DEFECT_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");
    const assigneeId = searchParams.get("assigneeId");

    const where: Record<string, unknown> = { deletedAt: null, ...orgFilter(ctx) };
    if (projectId) where.projectId = projectId;
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;

    const defects = await db.defect.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(defects);
  } catch (error) {
    log.error("Error fetching defects:", error);
    return NextResponse.json({ error: "Failed to fetch defects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.DEFECT_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    // Zod validation for defect fields
    const validation = defectCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { projectId, title, severity, location, assigneeId, photos, notes, status } = validation.data;

    const defect = await db.defect.create({
      data: {
        projectId,
        title: title || "",
        severity: (severity || "NORMAL") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        location: location || "",
        assigneeId: assigneeId || null,
        photos: photos || "",
        resolutionNotes: notes || "",
        status: (status || "OPEN") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        ...orgCreate(ctx),
        createdById: ctx.userId,
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    return NextResponse.json(defect, { status: 201 });
  } catch (error) {
    log.error("Error creating defect:", error);
    return NextResponse.json({ error: "Failed to create defect" }, { status: 500 });
  }
}
