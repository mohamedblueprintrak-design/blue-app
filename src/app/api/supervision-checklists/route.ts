import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { z } from 'zod';
import { WeatherCondition } from '@prisma/client';

// Zod schema for supervision checklist creation
const supervisionChecklistCreateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required').max(100),
  stage: z.string().max(100).optional().default(''),
  title: z.string().max(300).optional().default(''),
  visitDate: z.string().min(1, 'Visit date is required'),
  engineerId: z.string().max(100).optional().default(''),
  weather: z.string().max(200).optional().default(''),
  temperature: z.string().max(50).optional().default(''),
  workerCount: z.coerce.number().min(0).max(99999).optional().default(0),
  contractorName: z.string().max(200).optional().default(''),
  progressOverall: z.coerce.number().min(0).max(100).optional().default(0),
  notes: z.string().max(5000).optional().default(''),
  status: z.string().max(50).default('DRAFT'),
  inspectionType: z.string().max(100).optional().default(''),
  items: z.array(z.object({
    category: z.string().max(100).optional().default(''),
    description: z.string().max(500).optional().default(''),
    specification: z.string().max(500).optional().default(''),
    isChecked: z.boolean().optional().default(false),
    compliant: z.boolean().optional().default(true),
    notes: z.string().max(2000).optional().default(''),
    photoUrl: z.string().max(500).optional().default(''),
  })).optional(),
  violations: z.array(z.object({
    type: z.string().max(100).optional().default(''),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('LOW'),
    description: z.string().max(5000).optional().default(''),
    contractorName: z.string().max(200).optional().default(''),
    deadline: z.string().optional().default(''),
    status: z.string().max(50).optional().default('OPEN'),
    photoBefore: z.string().optional().default(''),
    photoAfter: z.string().optional().default(''),
    resolutionNotes: z.string().max(5000).optional().default(''),
  })).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const stage = searchParams.get("stage");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { ...orgFilter(user) };
    if (projectId) where.projectId = projectId;
    if (stage) where.stage = stage;
    if (status) where.status = status;

    const checklists = await db.supervisionChecklist.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        items: true,
        violations: true,
      },
      orderBy: { visitDate: "desc" },
    });

    return NextResponse.json(checklists);
  } catch (error) {
    log.error("Error fetching supervision checklists:", error);
    return NextResponse.json({ error: "Failed to fetch supervision checklists" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_CREATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const rawBody = await request.json();

    // Zod validation for supervision checklist fields
    const validation = supervisionChecklistCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const {
      projectId, stage, title, visitDate, engineerId, weather, temperature,
      workerCount, contractorName, progressOverall, notes, status, items, violations
    } = validation.data;

    const checklist = await db.supervisionChecklist.create({
      data: {
        projectId,
        stage: stage || "",
        title: title || "",
        visitDate: new Date(visitDate),
        engineerId: engineerId || user.userId,
        weather: (weather || undefined) as WeatherCondition | undefined,
        temperature: temperature || "",
        workerCount: workerCount || 0,
        contractorName: contractorName || "",
        progressOverall: progressOverall || 0,
        notes: notes || "",
        status: (status || "DRAFT") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        ...orgCreate(user),
        items: items ? {
          create: items.map((item) => ({
            category: item.category || "",
            description: item.description || "",
            specification: item.specification || "",
            isChecked: item.isChecked || false,
            compliant: item.compliant !== undefined ? item.compliant : true,
            notes: item.notes || "",
            photoUrl: item.photoUrl || "",
          })),
        } : undefined,
        violations: violations ? {
          create: violations.map((v) => ({
            projectId,
            type: v.type || "",
            severity: (v.severity || "LOW") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
            description: v.description || "",
            contractorName: v.contractorName || contractorName || "",
            deadline: v.deadline ? new Date(v.deadline) : null,
            status: (v.status || "OPEN") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
            photoBefore: v.photoBefore || "",
            photoAfter: v.photoAfter || "",
            resolutionNotes: v.resolutionNotes || "",
          })),
        } : undefined,
      },
      include: {
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        items: true,
        violations: true,
      },
    });

    return NextResponse.json(checklist, { status: 201 });
  } catch (error) {
    log.error("Error creating supervision checklist:", error);
    return NextResponse.json({ error: "Failed to create supervision checklist" }, { status: 500 });
  }
}
