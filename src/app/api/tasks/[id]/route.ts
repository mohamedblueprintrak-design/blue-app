import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { sanitizeObject } from '@/lib/security/sanitize';
import { requireVerifiedPermission, orgCheck } from '../../utils/auth';
import { errorResponse, notFoundResponse, forbiddenResponse } from '../../utils/response';
import { validateRequest, taskUpdateSchema, validateIdParam } from '@/lib/api-validation';
import { log } from '@/lib/logger';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.TASK_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const task = await db.task.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        subtasks: {
          include: {
            assignee: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        parent: {
          select: { id: true, title: true },
        },
      },
    });

    if (!task) {
      return notFoundResponse("Task not found");
    }

    // Multi-tenancy: check org access
    const orgError = orgCheck(user, task);
    if (orgError) return orgError;

    return NextResponse.json(task);
  } catch (error) {
    log.error("Error fetching task:", error);
    return errorResponse("Failed to fetch task", "SERVER_ERROR", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.TASK_UPDATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const rawBody = await request.json();
    const validation = validateRequest(taskUpdateSchema, rawBody);

    // Zod validation for task update fields
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const body = sanitizeObject(validation.data);

    // Check task exists
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) {
      return notFoundResponse("Task not found");
    }

    // Multi-tenancy: check org access
    const orgError = orgCheck(user, existing);
    if (orgError) return orgError;

    const validatedData = validation.data;

    const task = await db.task.update({
      where: { id },
      data: {
        ...(validatedData.title !== undefined && { title: validatedData.title }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.projectId !== undefined && { projectId: validatedData.projectId || null }),
        ...(validatedData.assigneeId !== undefined && { assigneeId: validatedData.assigneeId || null }),
        ...(validatedData.priority !== undefined && { priority: validatedData.priority }),
        ...(validatedData.status !== undefined && { status: validatedData.status }),
        ...(validatedData.startDate !== undefined && {
          startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        }),
        ...(validatedData.dueDate !== undefined && {
          dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        }),
        ...(validatedData.progress !== undefined && { progress: validatedData.progress }),
        ...(validatedData.isGovernmental !== undefined && { taskType: validatedData.isGovernmental ? 'GOVERNMENTAL' : 'STANDARD' }),
        ...(validatedData.taskType !== undefined && { taskType: validatedData.taskType }),
        ...(validatedData.slaDays !== undefined && { slaDays: validatedData.slaDays || null }),
      },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        subtasks: {
          select: { id: true, status: true },
        },
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    log.error("Error updating task:", error);
    return errorResponse("Failed to update task", "SERVER_ERROR", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.TASK_DELETE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Check task exists
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) {
      return notFoundResponse("Task not found");
    }

    // Multi-tenancy: check org access
    const orgError = orgCheck(user, existing);
    if (orgError) return orgError;

    await db.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting task:", error);
    return errorResponse("Failed to delete task", "SERVER_ERROR", 500);
  }
}
