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

    const stages = await db.projectStage.findMany({
      where: { projectId: id },
      orderBy: [{ department: "asc" }, { stageOrder: "asc" }],
      include: {
        project: {
          select: { name: true },
        },
      },
    });

    const byDepartment: Record<string, typeof stages> = {};
    for (const stage of stages) {
      if (!byDepartment[stage.department]) {
        byDepartment[stage.department] = [];
      }
      byDepartment[stage.department].push(stage);
    }

    return NextResponse.json({ stages, byDepartment });
  } catch (error) {
    log.error("Error fetching stages:", error);
    return NextResponse.json(
      { error: "Failed to fetch stages" },
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
    const { stages } = body as { stages: Array<{ id: string; status: string; notes?: string; engineerId?: string }> };

    if (!Array.isArray(stages)) {
      return NextResponse.json(
        { error: "stages must be an array" },
        { status: 400 }
      );
    }

    // IDOR check: verify all stage IDs belong to this project
    const stageIds = stages.map((s) => s.id);
    const ownedStages = await db.projectStage.findMany({
      where: { id: { in: stageIds }, projectId: id },
      select: { id: true },
    });
    const ownedIds = new Set(ownedStages.map((s) => s.id));
    const unownedIds = stageIds.filter((sid) => !ownedIds.has(sid));
    if (unownedIds.length > 0) {
      return NextResponse.json(
        { error: "One or more stages do not belong to this project" },
        { status: 403 }
      );
    }

    // Wrap updates + progress recalculation in a transaction for atomicity
    const { stages: updated, progress } = await db.$transaction(async (tx) => {
      const updatedStages = await Promise.all(
        stages.map((stage) =>
          tx.projectStage.update({
            where: { id: stage.id },
            data: {
              ...(stage.status && { status: stage.status }),
              ...(stage.notes !== undefined && { notes: stage.notes }),
              ...(stage.engineerId && { engineerId: stage.engineerId }),
            },
          })
        )
      );

      // Recalculate project progress based on all stages
      const allStages = await tx.projectStage.findMany({
        where: { projectId: id },
      });
      const completed = allStages.filter(
        (s) => s.status === "APPROVED"
      ).length;
      const total = allStages.length;
      const calculatedProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

      await tx.project.update({
        where: { id },
        data: { progress: calculatedProgress },
      });

      return { stages: updatedStages, progress: calculatedProgress };
    });

    return NextResponse.json({ stages: updated, progress });
  } catch (error) {
    log.error("Error updating stages:", error);
    return NextResponse.json(
      { error: "Failed to update stages" },
      { status: 500 }
    );
  }
}
