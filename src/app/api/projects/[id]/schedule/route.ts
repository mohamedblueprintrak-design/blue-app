import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgCreate as _orgCreate } from '@/app/api/utils/auth';
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

    const phases = await db.schedulePhase.findMany({
      where: { projectId: id },
      orderBy: [{ section: "asc" }, { phaseOrder: "asc" }],
    });

    const bySection: Record<string, typeof phases> = {};
    for (const phase of phases) {
      if (!bySection[phase.section]) {
        bySection[phase.section] = [];
      }
      bySection[phase.section].push(phase);
    }

    const summary: Record<string, { totalDays: number; maxDays: number; completedPhases: number; totalPhases: number }> = {};
    for (const [section, sectionPhases] of Object.entries(bySection)) {
      const totalDays = sectionPhases.reduce((sum, p) => sum + p.duration, 0);
      const maxDays = sectionPhases.reduce((sum, p) => sum + p.maxDuration, 0);
      const completedPhases = sectionPhases.filter((p) => p.status === "COMPLETED").length;
      summary[section] = {
        totalDays,
        maxDays,
        completedPhases,
        totalPhases: sectionPhases.length,
      };
    }

    return NextResponse.json({ phases, bySection, summary });
  } catch (error) {
    log.error("Error fetching schedule:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
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
    const { phases } = body as {
      phases: Array<{
        id: string;
        status: string;
        duration?: number;
        startDate?: string;
        endDate?: string;
      }>;
    };

    if (!Array.isArray(phases)) {
      return NextResponse.json(
        { error: "phases must be an array" },
        { status: 400 }
      );
    }

    // IDOR check: verify all phase IDs belong to this project
    const phaseIds = phases.map((p) => p.id);
    const ownedPhases = await db.schedulePhase.findMany({
      where: { id: { in: phaseIds }, projectId: id },
      select: { id: true },
    });
    const ownedIds = new Set(ownedPhases.map((p) => p.id));
    const unownedIds = phaseIds.filter((pid) => !ownedIds.has(pid));
    if (unownedIds.length > 0) {
      return NextResponse.json(
        { error: "One or more phases do not belong to this project" },
        { status: 403 }
      );
    }

    const updated = await Promise.all(
      phases.map((phase) =>
        db.schedulePhase.update({
          where: { id: phase.id },
          data: {
            ...(phase.status && { status: phase.status }),
            ...(phase.duration !== undefined && { duration: phase.duration }),
            ...(phase.startDate && {
              startDate: new Date(phase.startDate),
            }),
            ...(phase.endDate && {
              endDate: new Date(phase.endDate),
            }),
          },
        })
      )
    );

    return NextResponse.json({ phases: updated });
  } catch (error) {
    log.error("Error updating schedule:", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
  }
}
