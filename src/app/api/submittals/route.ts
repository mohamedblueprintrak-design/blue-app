import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { z } from 'zod';

// Zod schema for submittal creation
const submittalCreateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required').max(100),
  number: z.string().max(50).optional().default(''),
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().max(5000).optional().default(''),
  type: z.string().max(100).optional().default(''),
  revision: z.string().max(50).optional().default(''),
  revisionNumber: z.coerce.number().min(0).max(999).optional().default(1),
  contractorId: z.string().max(100).optional().default(''),
  contractor: z.string().max(200).optional().default(''),
  status: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REVISION_REQUIRED', 'PENDING']).default('UNDER_REVIEW'),
});

export async function GET(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SUBMITTAL_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    // Submittal doesn't have organizationId directly; filter through project relationship
    const orgWhere = ctx.organizationId ? { project: { organizationId: ctx.organizationId } } : {};
    const where: Record<string, unknown> = { ...orgWhere };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const submittals = await db.submittal.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(submittals);
  } catch (error) {
    log.error("Error fetching submittals:", error);
    return NextResponse.json({ error: "Failed to fetch submittals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SUBMITTAL_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const rawBody = await request.json();

    // Zod validation for submittal fields
    const validation = submittalCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const { projectId, number, title, type, contractor, revisionNumber, status } = validation.data;

    const submittal = await db.submittal.create({
      data: {
        ...orgCreate(ctx),
        projectId,
        number: number || "",
        title,
        type: type || "",
        contractor: contractor || "",
        revisionNumber: revisionNumber || 1,
        status: (status || "UNDER_REVIEW") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
    });

    return NextResponse.json(submittal, { status: 201 });
  } catch (error) {
    log.error("Error creating submittal:", error);
    return NextResponse.json({ error: "Failed to create submittal" }, { status: 500 });
  }
}
