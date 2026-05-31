import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { z } from 'zod';

// Zod schema for RFI creation
const rfiCreateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required').max(100),
  number: z.string().max(50).optional().default(''),
  subject: z.string().min(1, 'Subject is required').max(300),
  description: z.string().max(5000).optional().default(''),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  fromId: z.string().min(1, 'From user is required').max(100),
  fromUserId: z.string().max(100).optional().default(''),
  toId: z.string().min(1, 'To user is required').max(100),
  toUserId: z.string().max(100).optional().default(''),
  dueDate: z.string().optional().default(''),
});

export async function GET(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PROJECT_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    // RFI doesn't have organizationId directly; filter through project relationship
    const orgWhere = ctx.organizationId ? { project: { organizationId: ctx.organizationId } } : {};
    const where: Record<string, unknown> = { deletedAt: null, ...orgWhere };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const rfis = await db.rFI.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        from: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        to: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(rfis);
  } catch (error) {
    log.error("Error fetching RFIs:", error);
    return NextResponse.json({ error: "Failed to fetch RFIs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.SUBMITTAL_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const rawBody = await request.json();

    // Zod validation for RFI fields
    const validation = rfiCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const { projectId, number, subject, description, fromId, toId, priority, dueDate } = validation.data;

    const rfi = await db.rFI.create({
      data: {
        ...orgCreate(ctx),
        projectId,
        number: number || "",
        subject,
        description: description || "",
        fromId,
        toId,
        priority: (priority || "NORMAL") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        from: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        to: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    return NextResponse.json(rfi, { status: 201 });
  } catch (error) {
    log.error("Error creating RFI:", error);
    return NextResponse.json({ error: "Failed to create RFI" }, { status: 500 });
  }
}
