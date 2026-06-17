import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiErrorWithLogging as handleApiError } from '@/lib/api-error';
import { requireVerifiedPermission, orgCheck } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateIdParam } from '@/lib/api-validation';

// POST /api/projects/[id]/workflow/init - Init workflow for project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK — initializing workflow requires PROJECT_UPDATE
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
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const orgError = orgCheck(user, project);
    if (orgError) return orgError;

    const { initWorkflow, seedDefaultWorkflowTemplates } = await import('@/lib/workflow-engine');

    // Ensure templates exist
    await seedDefaultWorkflowTemplates(project.organizationId);

    // Init workflow
    const workflow = await initWorkflow(id);
    return NextResponse.json(workflow, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, 'Workflow POST');
  }
}

// GET /api/projects/[id]/workflow - Get project workflow
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK — reading workflow requires PROJECT_READ
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
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const orgError = orgCheck(user, project);
    if (orgError) return orgError;

    const workflow = await db.projectWorkflow.findUnique({
      where: { projectId: id },
      include: {
        template: true,
        stages: {
          orderBy: { order: 'asc' },
          include: {
            steps: {
              orderBy: { order: 'asc' },
              include: {
                assignee: {
                  select: { id: true, name: true, avatar: true, role: true },
                },
              },
            },
            assignee: {
              select: { id: true, name: true, avatar: true, role: true },
            },
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json({ workflow: null });
    }

    // Recalculate progress
    const { getWorkflowProgress } = await import('@/lib/workflow-engine');
    const progress = await getWorkflowProgress(workflow.id);

    return NextResponse.json({
      ...workflow,
      progressData: progress,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'Workflow GET');
  }
}
