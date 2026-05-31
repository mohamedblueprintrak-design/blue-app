import { NextRequest, NextResponse } from 'next/server';
import { executeStepAction } from '@/lib/workflow-engine';
import { handleApiError } from '@/lib/api-error';
import { requireVerifiedPermission, orgCheck } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateIdParam } from '@/lib/api-validation';
import { db } from '@/lib/db';

// POST /api/projects/[id]/workflow/stages/[stageId]/steps/[stepId]/action
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string; stepId: string }> }
) {
  try {
    // RBAC CHECK — executing workflow step actions requires PROJECT_UPDATE
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_UPDATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawProjectId, stepId: rawStepId } = await params;
    const projectIdResult = validateIdParam(rawProjectId);
    if (!projectIdResult.success) return projectIdResult.response;
    const stepIdResult = validateIdParam(rawStepId);
    if (!stepIdResult.success) return stepIdResult.response;
    const projectId = projectIdResult.id;
    const stepId = stepIdResult.id;

    // SECURITY: Verify project belongs to user's organization before executing workflow action
    const project = await db.project.findUnique({ where: { id: projectId }, select: { organizationId: true } });
    const orgError = orgCheck(user, project);
    if (orgError) return orgError;

    const body = await request.json();
    const { action, notes, returnReason, severity } = body;

    // Use authenticated user ID instead of trusting body.userId
    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const validActions = ['start', 'approve', 'complete', 'reject', 'request_changes'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const result = await executeStepAction(stepId, action, user.userId, { notes, returnReason, severity });
    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error, 'StepAction');
  }
}
