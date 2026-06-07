import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgCheck } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateRequest, validateIdParam, approvalUpdateSchema } from '@/lib/api-validation';

// GET: Get a single approval
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
    const approval = await db.approval.findUnique({ where: { id } });
    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    // Multi-tenancy: check org access via project relationship
    if (approval.projectId) {
      const project = await db.project.findUnique({ where: { id: approval.projectId }, select: { organizationId: true } });
      const orgError = orgCheck(user, project);
      if (orgError) return orgError;
    }

    return NextResponse.json(approval);
  } catch (error) {
    log.error('Error fetching approval:', error);
    return NextResponse.json({ error: 'Failed to fetch approval' }, { status: 500 });
  }
}

// PATCH: Update approval (approve, reject, forward to next step)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK — approving/rejecting requires PROJECT_UPDATE
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_UPDATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();
    // Zod validation for update fields
    const validation = validateRequest(approvalUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { status, notes } = body;

    const existing = await db.approval.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    // Multi-tenancy: check org access via project relationship
    if (existing.projectId) {
      const project = await db.project.findUnique({ where: { id: existing.projectId }, select: { organizationId: true } });
      const orgError = orgCheck(user, project);
      if (orgError) return orgError;
    }

    // If approving, check if there are more steps in the workflow
    let newStep = existing.step;
    let newStatus = status || existing.status;
    let newNotes = existing.notes;

    if (status === 'APPROVED' && existing.step < existing.totalSteps) {
      // Multi-step: forward to next step, keep status as pending
      newStep = existing.step + 1;
      newStatus = 'PENDING';

      // Append step note if provided
      if (notes) {
        const stepNote = `[${existing.step}/${existing.totalSteps}] ${notes}`;
        newNotes = existing.notes
          ? `${existing.notes}\n---\n${stepNote}`
          : stepNote;
      }
    } else if (status === 'APPROVED' && existing.step >= existing.totalSteps) {
      // Final step: fully approved
      newStatus = 'APPROVED';

      // Append final approval note
      if (notes) {
        const finalNote = `[${existing.step}/${existing.totalSteps} Approved] ${notes}`;
        newNotes = existing.notes
          ? `${existing.notes}\n---\n${finalNote}`
          : finalNote;
      }
    } else if (status === 'REJECTED') {
      // Rejected at current step
      newStatus = 'REJECTED';

      if (notes) {
        const rejectNote = `[${existing.step}/${existing.totalSteps} Rejected] ${notes}`;
        newNotes = existing.notes
          ? `${existing.notes}\n---\n${rejectNote}`
          : rejectNote;
      }
    }

    const updated = await db.approval.update({
      where: { id },
      data: {
        status: newStatus,
        step: newStep,
        notes: newNotes,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    log.error('Error updating approval:', error);
    return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 });
  }
}
