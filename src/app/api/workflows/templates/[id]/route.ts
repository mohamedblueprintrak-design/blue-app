import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { handleApiErrorWithLogging as handleApiError } from '@/lib/api-error';
import { Permission } from '@/lib/auth/types';
import { validateRequest, validateIdParam, workflowTemplateUpdateSchema } from '@/lib/api-validation';

// GET /api/workflows/templates/[id] - Get template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const template = await db.workflowTemplate.findFirst({
      where: { id, deletedAt: null, ...orgFilter(ctx) },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: { steps: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json(template);
  } catch (error: unknown) {
    return handleApiError(error, 'WorkflowTemplate GET');
  }
}

// PUT /api/workflows/templates/[id] - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const existing = await db.workflowTemplate.findFirst({ where: { id, deletedAt: null, ...orgFilter(ctx) } });
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const body = await request.json();
    // Zod validation for update fields
    const validation = validateRequest(workflowTemplateUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const { name, nameEn, projectType, description, isActive } = body;

    const template = await db.workflowTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameEn !== undefined && { nameEn }),
        ...(projectType !== undefined && { projectType }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: { steps: { orderBy: { order: 'asc' } } },
        },
      },
    });

    return NextResponse.json(template);
  } catch (error: unknown) {
    return handleApiError(error, 'WorkflowTemplate PUT');
  }
}

// DELETE /api/workflows/templates/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_DELETE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const existing = await db.workflowTemplate.findFirst({ where: { id, deletedAt: null, ...orgFilter(ctx) } });
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    await db.workflowTemplate.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, 'WorkflowTemplate DELETE');
  }
}
