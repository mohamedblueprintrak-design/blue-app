import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { forbiddenResponse } from '@/app/api/utils/response';
import { validateIdParam, validateRequest, commentCreateSchema } from '@/lib/api-validation';
import { parsePaginationParams, buildPaginationMeta, calculateSkip } from '@/app/api/utils/pagination';

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

    // Verify task exists and check org access
    const task = await db.task.findUnique({
      where: { id },
      include: { project: { select: { organizationId: true } } },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Multi-tenancy: check org access
    if (user.organizationId && task.project?.organizationId && task.project.organizationId !== user.organizationId) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = calculateSkip(page, limit);

    const [comments, total] = await Promise.all([
      db.taskComment.findMany({
        where: { taskId: id },
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: { id: true, name: true, role: true, avatar: true },
          },
        },
        take: limit,
        skip,
      }),
      db.taskComment.count({ where: { taskId: id } }),
    ]);

    return NextResponse.json({
      comments,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    log.error("Error fetching task comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // AUTH CHECK — verified JWT re-check for security
    const auth = await requireVerifiedPermission(request, Permission.TASK_CREATE);
    if ('error' in auth) return auth.error;
    const user = auth.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify task exists and check org access
    const task = await db.task.findUnique({
      where: { id },
      include: { project: { select: { organizationId: true } } },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Multi-tenancy: check org access
    if (user.organizationId && task.project?.organizationId && task.project.organizationId !== user.organizationId) {
      return forbiddenResponse();
    }

    const body = await request.json();

    // Zod validation for comment fields
    const validation = validateRequest(commentCreateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { content } = validation.data;

    // Create the comment using authenticated user ID
    const comment = await db.taskComment.create({
      data: {
        content: content.trim(),
        taskId: id,
        userId: user.userId,
        ...orgCreate(user),
      },
      include: {
        user: {
          select: { id: true, name: true, role: true, avatar: true },
        },
      },
    });

    // Parse @mentions from content and create notifications
    const mentionRegex = /@(\S+)/g;
    let match: RegExpExecArray | null;
    const mentionedNames: string[] = [];

    while ((match = mentionRegex.exec(content)) !== null) {
      mentionedNames.push(match[1].toLowerCase());
    }

    // SECURITY FIX: Scope @mention user lookup to the org — previously fetched
    // ALL active users across every tenant (cross-org user enumeration leak).
    if (mentionedNames.length > 0) {
      const mentionWhere: Record<string, unknown> = { isActive: true };
      if (user.organizationId) {
        mentionWhere.organizationId = user.organizationId;
      }
      const allUsers = await db.user.findMany({
        where: mentionWhere,
        select: { id: true, name: true },
      });

      for (const mentionedName of mentionedNames) {
        const targetUser = allUsers.find(
          (u) => (u.name ?? "").toLowerCase().replace(/\s+/g, ".").includes(mentionedName) ||
                 (u.name ?? "").toLowerCase().includes(mentionedName.replace(/\./g, " "))
        );

        if (targetUser && targetUser.id !== user.userId) {
          await db.notification.create({
            data: {
              userId: targetUser.id,
              type: "comment_mention",
              title: user.name
                ? `@${user.name} ذكرك في مهمة`
                : "Someone mentioned you in a task",
              message: `"${content.trim().slice(0, 100)}${content.trim().length > 100 ? "..." : ""}"`,
              isRead: false,
              relatedEntityType: "task",
              relatedEntityId: id,
              ...orgCreate(user),
            },
          });
        }
      }
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    log.error("Error creating task comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
