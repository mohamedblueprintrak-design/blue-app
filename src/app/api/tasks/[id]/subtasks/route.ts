import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { forbiddenResponse } from '@/app/api/utils/response';
import { validateIdParam, validateRequest, subtaskCreateSchema } from '@/lib/api-validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // AUTH CHECK
    const auth = await requireVerifiedPermission(request, Permission.TASK_READ);
    if ('error' in auth) return auth.error;
    const user = auth.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify parent task exists and check org access
    const parent = await db.task.findUnique({
      where: { id },
      include: { project: { select: { organizationId: true } } },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
    }

    // Multi-tenancy: check org access
    if (user.organizationId && parent.project?.organizationId && parent.project.organizationId !== user.organizationId) {
      return forbiddenResponse();
    }

    const subtasks = await db.task.findMany({
      where: { parentId: id },
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(subtasks);
  } catch (error) {
    log.error("Error fetching subtasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch subtasks" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // AUTH CHECK
    const auth = await requireVerifiedPermission(request, Permission.TASK_CREATE);
    if ('error' in auth) return auth.error;
    const user = auth.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();

    // Zod validation for subtask fields
    const validation = validateRequest(subtaskCreateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { title, description, assigneeId, priority } = validation.data;

    // Check parent task exists and org access
    const parent = await db.task.findUnique({
      where: { id },
      include: { project: { select: { organizationId: true } } },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
    }

    // Multi-tenancy: check org access
    if (user.organizationId && parent.project?.organizationId && parent.project.organizationId !== user.organizationId) {
      return forbiddenResponse();
    }

    const subtask = await db.task.create({
      data: {
        title,
        description: description || "",
        assigneeId: assigneeId || parent.assigneeId || null,
        priority: (priority || parent.priority || "NORMAL"),
        status: "TODO",
        parentId: id,
        projectId: parent.projectId,
        ...orgCreate(user),
      },
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    log.error("Error creating subtask:", error);
    return NextResponse.json(
      { error: "Failed to create subtask" },
      { status: 500 }
    );
  }
}
