import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgCreate as _orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { forbiddenResponse } from '@/app/api/utils/response';
import { validateIdParam, validateRequest, commentCreateSchema } from '@/lib/api-validation';
import { sanitizeObject } from '@/lib/security/sanitize';
import { parsePaginationParams, buildPaginationMeta, calculateSkip } from '@/app/api/utils/pagination';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify project exists and check org access
    const project = await db.project.findUnique({ where: { id }, select: { organizationId: true } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (user.organizationId && project.organizationId && project.organizationId !== user.organizationId) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = calculateSkip(page, limit);

    const [comments, total] = await Promise.all([
      db.projectComment.findMany({
        where: { projectId: id, deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, role: true, avatar: true },
          },
        },
        take: limit,
        skip,
      }),
      db.projectComment.count({ where: { projectId: id, deletedAt: null } }),
    ]);

    return NextResponse.json({
      comments,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    log.error("Error fetching comments:", error);
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
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_UPDATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify project exists and check org access
    const project = await db.project.findUnique({ where: { id }, select: { organizationId: true } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (user.organizationId && project.organizationId && project.organizationId !== user.organizationId) {
      return forbiddenResponse();
    }

    const body = await request.json();
    const validation = validateRequest(commentCreateSchema, body);

    // Zod validation for comment content
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const _sanitizedBody = sanitizeObject(validation.data);

    const { content } = validation.data;

    const comment = await db.projectComment.create({
      data: {
        content,
        projectId: id,
        userId: user.userId,
        organizationId: user.organizationId || "",
      },
      include: {
        user: {
          select: { id: true, name: true, role: true, avatar: true },
        },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    log.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK — deleting comments requires PROJECT_UPDATE (already checked author/admin below)
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_UPDATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const projectIdResult = validateIdParam(rawId);
    if (!projectIdResult.success) return projectIdResult.response;
    const projectId = projectIdResult.id;

    const { searchParams } = new URL(request.url);
    const rawCommentId = searchParams.get("commentId");

    if (!rawCommentId) {
      return NextResponse.json(
        { error: "Missing commentId" },
        { status: 400 }
      );
    }

    const commentIdResult = validateIdParam(rawCommentId);
    if (!commentIdResult.success) return commentIdResult.response;
    const commentId = commentIdResult.id;

    // Verify project exists and check org access
    const project = await db.project.findUnique({ where: { id: projectId }, select: { organizationId: true } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (user.organizationId && project.organizationId && project.organizationId !== user.organizationId) {
      return forbiddenResponse();
    }

    // Verify the comment exists, belongs to this project, and check authorization
    const comment = await db.projectComment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.projectId !== projectId) {
      return NextResponse.json({ error: "Comment does not belong to this project" }, { status: 400 });
    }

    // Only comment author or admin can delete
    const isUserAdmin = user.role?.toUpperCase() === 'ADMIN';
    const isAuthor = comment.userId === user.userId;

    if (!isAuthor && !isUserAdmin) {
      return forbiddenResponse();
    }

    await db.projectComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
