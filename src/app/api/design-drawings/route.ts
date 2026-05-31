import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { z } from 'zod';

// Zod schema for design drawing creation
const designDrawingCreateSchema = z.object({
  designPhaseId: z.string().min(1, 'Design phase ID is required').max(100),
  title: z.string().min(1, 'Title is required').max(300),
  drawingNumber: z.string().max(100).optional().default(''),
  discipline: z.string().max(100).optional().default(''),
  revision: z.string().max(50).optional().default(''),
  version: z.coerce.number().min(0).max(999).optional().default(1),
  filePath: z.string().max(500).optional().default(''),
  fileSize: z.number().nonnegative().max(999999999).optional().default(0),
  status: z.string().max(50).default('DRAFT'),
});

export async function GET(request: NextRequest) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { searchParams } = new URL(request.url);
    const designPhaseId = searchParams.get("designPhaseId");

    const where: Record<string, unknown> = { ...orgFilter(user) };
    if (designPhaseId) where.designPhaseId = designPhaseId;

    const drawings = await db.designDrawing.findMany({
      where,
      include: {
        designPhase: {
          select: { id: true, phase: true, phaseNameAr: true, phaseNameEn: true },
        },
        revisions: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(drawings);
  } catch (error) {
    log.error("Error fetching design drawings:", error);
    return NextResponse.json({ error: "Failed to fetch design drawings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_CREATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const rawBody = await request.json();

    // Zod validation for design drawing fields
    const validation = designDrawingCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const { designPhaseId, title, drawingNumber, discipline, version, filePath, fileSize, status } = validation.data;

    const drawing = await db.designDrawing.create({
      data: {
        designPhaseId,
        title,
        drawingNumber: drawingNumber || "",
        discipline: (discipline || "") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        version: version || 1,
        filePath: filePath || "",
        fileSize: fileSize || 0,
        status: (status || "DRAFT") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        uploadedById: user.userId,
        ...orgCreate(user),
      },
      include: {
        designPhase: {
          select: { id: true, phase: true, phaseNameAr: true, phaseNameEn: true },
        },
      },
    });

    return NextResponse.json(drawing, { status: 201 });
  } catch (error) {
    log.error("Error creating design drawing:", error);
    return NextResponse.json({ error: "Failed to create design drawing" }, { status: 500 });
  }
}
