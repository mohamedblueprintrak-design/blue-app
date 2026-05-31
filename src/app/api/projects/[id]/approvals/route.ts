import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgCreate as _orgCreate, orgFilter} from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { forbiddenResponse } from '@/app/api/utils/response';
import { validateIdParam } from '@/lib/api-validation';

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

    const approvals = await db.govApproval.findMany({
      where: { projectId: id },
      orderBy: { authority: "asc" },
    });

    return NextResponse.json({ approvals });
  } catch (error) {
    log.error("Error fetching approvals:", error);
    return NextResponse.json(
      { error: "Failed to fetch approvals" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const { approvals } = body as {
      approvals: Array<{
        id: string;
        status: string;
        submissionDate?: string;
        approvalDate?: string;
        rejectionCount?: number;
        notes?: string;
      }>;
    };

    if (!Array.isArray(approvals)) {
      return NextResponse.json(
        { error: "approvals must be an array" },
        { status: 400 }
      );
    }

    // IDOR check: verify all approval IDs belong to this project
    const approvalIds = approvals.map((a) => a.id);
    const ownedApprovals = await db.govApproval.findMany({
      where: { id: { in: approvalIds }, projectId: id },
      select: { id: true },
    });
    const ownedIds = new Set(ownedApprovals.map((a) => a.id));
    const unownedIds = approvalIds.filter((aid) => !ownedIds.has(aid));
    if (unownedIds.length > 0) {
      return NextResponse.json(
        { error: "One or more approvals do not belong to this project" },
        { status: 403 }
      );
    }

    const updated = await Promise.all(
      approvals.map((approval) =>
        db.govApproval.update({
          where: { id: approval.id },
          data: {
            ...(approval.status && { status: approval.status as import('@prisma/client').GovernmentApprovalStatus }),
            ...(approval.submissionDate && {
              submissionDate: new Date(approval.submissionDate),
            }),
            ...(approval.approvalDate && {
              approvalDate: new Date(approval.approvalDate),
            }),
            ...(approval.rejectionCount !== undefined && {
              rejectionCount: approval.rejectionCount,
            }),
            ...(approval.notes !== undefined && { notes: approval.notes }),
          },
        })
      )
    );

    return NextResponse.json({ approvals: updated });
  } catch (error) {
    log.error("Error updating approvals:", error);
    return NextResponse.json(
      { error: "Failed to update approvals" },
      { status: 500 }
    );
  }
}
