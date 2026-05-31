import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgCheck } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { forbiddenResponse } from '@/app/api/utils/response';

/**
 * DELETE /api/tasks/[id]/comments/[commentId] - Delete a task comment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    // AUTH CHECK — use proper getAuthContext instead of raw headers
    const auth = await requireVerifiedPermission(request, Permission.TASK_DELETE);
    if ('error' in auth) return auth.error;
    const user = auth.user;

    const { id, commentId } = await params;

    // Verify comment exists and belongs to the task
    const comment = await db.taskComment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
        task: {
          select: {
            id: true,
            project: {
              select: { organizationId: true },
            },
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.taskId !== id) {
      return NextResponse.json({ error: "Comment does not belong to this task" }, { status: 400 });
    }

    // SECURITY: Verify the comment belongs to the user's organization
    // Without this check, an admin from another org could delete comments
    const commentOrgId = comment.task?.project?.organizationId;
    const orgError = orgCheck(user, { organizationId: commentOrgId });
    if (orgError) return orgError;

    // Check authorization: only comment author or admin can delete
    const isUserAdmin = user.role?.toUpperCase() === 'ADMIN';
    const isAuthor = comment.userId === user.userId;

    if (!isAuthor && !isUserAdmin) {
      return forbiddenResponse();
    }

    await db.taskComment.delete({
      where: { id: commentId },
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
