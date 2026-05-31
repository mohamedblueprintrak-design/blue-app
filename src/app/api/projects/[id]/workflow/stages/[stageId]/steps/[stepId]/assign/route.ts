import { NextRequest, NextResponse } from 'next/server';
import { assignStep } from '@/lib/workflow-engine';
import { handleApiError } from '@/lib/api-error';
import { requireVerifiedPermission, orgCheck } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateIdParam } from '@/lib/api-validation';
import { db } from '@/lib/db';

// POST /api/projects/[id]/workflow/stages/[stageId]/steps/[stepId]/assign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string; stepId: string }> }
) {
  try {
    // RBAC CHECK — assigning workflow steps requires PROJECT_UPDATE
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

    // SECURITY: Verify project belongs to user's organization before assigning workflow step
    const project = await db.project.findUnique({ where: { id: projectId }, select: { organizationId: true } });
    const orgError = orgCheck(user, project);
    if (orgError) return orgError;

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const result = await assignStep(stepId, userId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error, 'StepAssign');
  }
}
