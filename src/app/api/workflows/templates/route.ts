import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createWorkflowTemplate } from '@/lib/workflow-engine'
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { handleApiErrorWithLogging as handleApiError } from '@/lib/api-error';
import { Permission } from '@/lib/auth/types';

// POST /api/workflows/templates - Create template
export async function POST(request: NextRequest) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.SETTINGS_UPDATE);
    if ('error' in rbac) return rbac.error;
    const _ctx = rbac.user;

    const body = await request.json();
    const template = await createWorkflowTemplate(body);
    return NextResponse.json(template, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, 'WorkflowTemplates POST');
  }
}

// GET /api/workflows/templates - List templates
export async function GET(request: NextRequest) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const templates = await db.workflowTemplate.findMany({
      where: { isActive: true, ...orgFilter(ctx) },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: { steps: { orderBy: { order: 'asc' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(templates);
  } catch (error: unknown) {
    return handleApiError(error, 'WorkflowTemplates GET');
  }
}
