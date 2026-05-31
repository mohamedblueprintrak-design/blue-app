import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '../utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { z } from 'zod';

// Zod schema for violation creation
const violationCreateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  title: z.string().min(1, 'Title is required').max(300).optional().default(''),
  type: z.string().max(100).optional().default(''),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  description: z.string().max(5000).optional().default(''),
  contractorName: z.string().max(200).optional().default(''),
  deadline: z.string().optional().default(''),
  status: z.string().max(50).default('OPEN'),
  photoBefore: z.string().optional().default(''),
  photoAfter: z.string().optional().default(''),
  resolutionNotes: z.string().max(5000).optional().default(''),
  checklistId: z.string().max(100).optional(),
});

export async function GET(request: NextRequest) {
  const result = await requireVerifiedPermission(request, Permission.VIOLATION_READ);
  if ('error' in result) return result.error;
  const ctx = result.user;
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const type = searchParams.get("type");

    const where: Record<string, unknown> = { ...orgFilter(ctx) };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (type) where.type = type;

    const violations = await db.violation.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, nameEn: true, number: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(violations);
  } catch (error) {
    log.error("Error fetching violations:", error);
    return NextResponse.json({ error: "Failed to fetch violations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const result = await requireVerifiedPermission(request, Permission.VIOLATION_CREATE);
  if ('error' in result) return result.error;
  const _ctx = result.user;
  try {
    const rawBody = await request.json();

    // Zod validation for violation fields
    const validation = violationCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const {
      checklistId, projectId, type, severity, description,
      contractorName, deadline, status, photoBefore, photoAfter, resolutionNotes
    } = validation.data;

    const violation = await db.violation.create({
      data: {
        checklistId: checklistId || projectId, // Falls back to projectId if not provided (required by schema)
        projectId,
        type: type || "",
        severity: severity || "LOW",
        description: description || "",
        contractorName: contractorName || "",
        deadline: deadline ? new Date(deadline) : null,
        status: (status || "OPEN") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        photoBefore: photoBefore || "",
        photoAfter: photoAfter || "",
        resolutionNotes: resolutionNotes || "",
      },
      include: {
        project: { select: { id: true, name: true, nameEn: true, number: true } },
      },
    });

    return NextResponse.json(violation, { status: 201 });
  } catch (error) {
    log.error("Error creating violation:", error);
    return NextResponse.json({ error: "Failed to create violation" }, { status: 500 });
  }
}
