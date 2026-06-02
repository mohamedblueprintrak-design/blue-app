import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { validateIdParam } from '@/lib/api-validation';
import { forbiddenResponse } from '@/app/api/utils/response';

// ============================================
// Helper: parse paymentSchedule JSON
// ============================================

interface MilestonePayment {
  milestoneName: string;
  milestoneNameAr?: string;
  amount: number;
  percentage?: number;
  dueDate?: string;
  taskId?: string;
  description?: string;
  status: string;
  paidAmount?: number;
  paidDate?: string;
  referenceNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

function parsePaymentSchedule(raw: string | null | undefined): MilestonePayment[] {
  if (!raw || raw.trim() === '') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializePaymentSchedule(schedule: MilestonePayment[]): string {
  return JSON.stringify(schedule);
}

// ============================================
// Helper: verify project access
// ============================================

async function verifyProjectAccess(projectId: string, userOrgId: string | null) {
  const project = await db.project.findUnique({
    where: { id: projectId, deletedAt: null },
    select: {
      id: true,
      name: true,
      nameEn: true,
      number: true,
      organizationId: true,
      paymentSchedule: true,
    },
  });

  if (!project) return null;

  // Multi-tenant org check
  if (userOrgId && project.organizationId && project.organizationId !== userOrgId) {
    return 'forbidden' as const;
  }

  return project;
}

// ============================================
// GET — Get single milestone payment details
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneIndex: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId, milestoneIndex: rawIndex } = await params;
    const idCheck = validateIdParam(rawId);
    if (!idCheck.success) return idCheck.response;
    const projectId = idCheck.id;

    const milestoneIndex = Number(rawIndex);
    if (isNaN(milestoneIndex) || milestoneIndex < 0 || !Number.isInteger(milestoneIndex)) {
      return NextResponse.json(
        { error: "Invalid milestone index" },
        { status: 400 }
      );
    }

    const project = await verifyProjectAccess(projectId, user.organizationId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project === 'forbidden') {
      return forbiddenResponse();
    }

    const milestones = parsePaymentSchedule(project.paymentSchedule);
    if (milestoneIndex >= milestones.length) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    const milestone = milestones[milestoneIndex];

    // Fetch linked task details if taskId exists
    let linkedTask = null;
    if (milestone.taskId) {
      linkedTask = await db.task.findFirst({
        where: {
          id: milestone.taskId,
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          titleAr: true,
          status: true,
          progress: true,
          dueDate: true,
          startDate: true,
          assigneeId: true,
        },
      });
    }

    log.info('Milestone payment detail fetched', {
      projectId,
      milestoneIndex,
      userId: user.userId,
    });

    return NextResponse.json({
      milestone,
      milestoneIndex,
      linkedTask,
    });
  } catch (error) {
    log.error("Error fetching milestone payment detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestone payment detail" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE — Remove a milestone payment
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneIndex: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_DELETE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId, milestoneIndex: rawIndex } = await params;
    const idCheck = validateIdParam(rawId);
    if (!idCheck.success) return idCheck.response;
    const projectId = idCheck.id;

    const milestoneIndex = Number(rawIndex);
    if (isNaN(milestoneIndex) || milestoneIndex < 0 || !Number.isInteger(milestoneIndex)) {
      return NextResponse.json(
        { error: "Invalid milestone index" },
        { status: 400 }
      );
    }

    const project = await verifyProjectAccess(projectId, user.organizationId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project === 'forbidden') {
      return forbiddenResponse();
    }

    const milestones = parsePaymentSchedule(project.paymentSchedule);
    if (milestoneIndex >= milestones.length) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    // Prevent deletion of paid milestones
    const milestone = milestones[milestoneIndex];
    if (milestone.status === 'PAID') {
      return NextResponse.json(
        { error: "Cannot delete a paid milestone. Please reverse the payment first." },
        { status: 400 }
      );
    }

    // Remove the milestone at the given index
    const removedMilestone = milestones.splice(milestoneIndex, 1)[0];

    // Re-index remaining milestones (they are naturally re-indexed by array position)
    // Update the project with the new payment schedule
    await db.project.update({
      where: { id: projectId },
      data: {
        paymentSchedule: serializePaymentSchedule(milestones),
      },
    });

    log.info('Milestone payment deleted', {
      projectId,
      milestoneIndex,
      milestoneName: removedMilestone.milestoneName,
      userId: user.userId,
    });

    return NextResponse.json({
      success: true,
      deletedMilestone: removedMilestone,
      remainingCount: milestones.length,
    });
  } catch (error) {
    log.error("Error deleting milestone payment:", error);
    return NextResponse.json(
      { error: "Failed to delete milestone payment" },
      { status: 500 }
    );
  }
}
