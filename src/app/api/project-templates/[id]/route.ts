import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { requireVerifiedPermission, orgCheck, orgFilter } from '@/app/api/utils/auth';
import { errorResponse, successResponse, notFoundResponse, handleApiError } from '@/app/api/utils/response';
import { Permission } from '@/lib/auth/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/project-templates/[id]
 * Get a single project template
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id } = await context.params;
    const template = await db.projectTemplate.findUnique({
      where: { id },
    });

    if (!template || !template.isActive) {
      return notFoundResponse('Template not found');
    }

    const orgError = orgCheck(user, template);
    if (orgError) return orgError;

    // Parse stages
    let stagesParsed: unknown[] = [];
    try {
      stagesParsed = JSON.parse(template.stages || '[]');
    } catch { /* keep empty */ }

    return successResponse({ ...template, stagesParsed });
  } catch (error) {
    return handleApiError('Error fetching project template', error);
  }
}

/**
 * PUT /api/project-templates/[id]
 * Update a project template
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_UPDATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id } = await context.params;
    const template = await db.projectTemplate.findUnique({ where: { id } });

    if (!template) {
      return notFoundResponse('Template not found');
    }

    const orgError = orgCheck(user, template);
    if (orgError) return orgError;

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.nameAr !== undefined) updateData.nameAr = body.nameAr;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.descriptionAr !== undefined) updateData.descriptionAr = body.descriptionAr;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.defaultBudget !== undefined) updateData.defaultBudget = body.defaultBudget;
    if (body.defaultDurationDays !== undefined) updateData.defaultDurationDays = body.defaultDurationDays;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.stages !== undefined) {
      updateData.stages = typeof body.stages === 'string' ? body.stages : JSON.stringify(body.stages);
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const updated = await db.projectTemplate.update({
      where: { id },
      data: updateData,
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError('Error updating project template', error);
  }
}

/**
 * DELETE /api/project-templates/[id]
 * Soft delete a project template (set isActive = false)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_DELETE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id } = await context.params;
    const template = await db.projectTemplate.findUnique({ where: { id } });

    if (!template) {
      return notFoundResponse('Template not found');
    }

    const orgError = orgCheck(user, template);
    if (orgError) return orgError;

    // Soft delete
    await db.projectTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    return successResponse({ message: 'Template deactivated successfully' });
  } catch (error) {
    return handleApiError('Error deleting project template', error);
  }
}
