import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { requirePermission, orgFilter } from '@/app/api/utils/auth';
import { errorResponse, successResponse, createdResponse, handleApiError } from '@/app/api/utils/response';
import { Permission } from '@/lib/auth/types';

/**
 * GET /api/project-templates
 * List all project templates
 * Requires PROJECT_READ permission
 */
export async function GET(request: NextRequest) {
  try {
    const rbac = requirePermission(request, Permission.PROJECT_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';

    const where: Record<string, unknown> = {
      isActive: true,
      ...orgFilter(user),
    };

    if (category && category !== 'all') {
      where.category = category;
    }

    const templates = await db.projectTemplate.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    // Parse stages JSON for each template and add task count
    const result = templates.map((t) => {
      let stages: unknown[] = [];
      try {
        stages = JSON.parse(t.stages || '[]');
      } catch { /* keep empty */ }
      const taskCount = (stages as Array<{ tasks?: unknown[] }>).reduce(
        (sum, s) => sum + (Array.isArray(s.tasks) ? s.tasks.length : 0),
        0
      );
      return {
        ...t,
        stagesParsed: stages,
        taskCount,
      };
    });

    return successResponse(result);
  } catch (error) {
    return handleApiError('Error fetching project templates', error);
  }
}

/**
 * POST /api/project-templates
 * Create a new project template (admin/manager only)
 * Requires PROJECT_CREATE permission
 */
export async function POST(request: NextRequest) {
  try {
    const rbac = requirePermission(request, Permission.PROJECT_CREATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const body = await request.json();
    const { name, nameAr, description, descriptionAr, category, icon, defaultBudget, defaultDurationDays, currency, stages } = body;

    if (!name) {
      return errorResponse('Template name is required', 'VALIDATION_ERROR', 400);
    }
    if (!stages || !Array.isArray(stages) || stages.length === 0) {
      return errorResponse('At least one stage is required', 'VALIDATION_ERROR', 400);
    }

    const template = await db.projectTemplate.create({
      data: {
        name,
        nameAr: nameAr || null,
        description: description || null,
        descriptionAr: descriptionAr || null,
        category: category || null,
        icon: icon || null,
        defaultBudget: defaultBudget || null,
        defaultDurationDays: defaultDurationDays || null,
        currency: currency || 'AED',
        stages: typeof stages === 'string' ? stages : JSON.stringify(stages),
        isActive: true,
        usageCount: 0,
        createdById: user.userId,
        organizationId: user.organizationId || null,
      },
    });

    return createdResponse(template);
  } catch (error) {
    return handleApiError('Error creating project template', error);
  }
}
