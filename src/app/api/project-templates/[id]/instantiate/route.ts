import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { requirePermission, orgCheck, orgCreate } from '@/app/api/utils/auth';
import { errorResponse, createdResponse, notFoundResponse, handleApiError } from '@/app/api/utils/response';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { cacheDeletePattern } from '@/lib/cache/redis';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/project-templates/[id]/instantiate
 * Create a new project from a template
 * 
 * Body: { name, nameAr?, clientId, contractorId?, customizations? }
 * 
 * Process:
 * 1. Read the template stages JSON
 * 2. Create a new Project with template defaults
 * 3. Create ProjectStage records from template stages
 * 4. Create Task records from template tasks within each stage
 * 5. Set task due dates based on estimatedDays from project start date
 * 6. Increment template usageCount
 * 7. Return the created project
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rbac = requirePermission(request, Permission.PROJECT_CREATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id } = await context.params;
    const template = await db.projectTemplate.findUnique({ where: { id } });

    if (!template || !template.isActive) {
      return notFoundResponse('Template not found');
    }

    const orgError = orgCheck(user, template);
    if (orgError) return orgError;

    const body = await request.json();
    const { name, nameAr, clientId, contractorId, customizations } = body;

    if (!name || !clientId) {
      return errorResponse('Project name and clientId are required', 'VALIDATION_ERROR', 400);
    }

    // Verify client exists
    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return errorResponse('Client not found', 'NOT_FOUND', 404);
    }

    // Parse template stages
    let stages: Array<{
      name: string;
      nameAr?: string;
      order: number;
      tasks: Array<{
        title: string;
        titleAr?: string;
        description?: string;
        assigneeRole?: string;
        priority?: string;
        estimatedDays?: number;
      }>;
    }> = [];

    try {
      stages = JSON.parse(template.stages || '[]');
    } catch {
      return errorResponse('Template has invalid stage data', 'VALIDATION_ERROR', 400);
    }

    // Generate project number
    const projectCount = await db.project.count();
    const projectNumber = `PRJ-${String(projectCount + 1).padStart(4, '0')}`;

    // Calculate dates
    const startDate = customizations?.startDate ? new Date(customizations.startDate) : new Date();

    // Create the project
    const project = await db.project.create({
      data: {
        number: projectNumber,
        name: nameAr || name,
        nameEn: name,
        clientId,
        contractorId: contractorId || null,
        type: template.category?.toLowerCase() || 'villa',
        budget: customizations?.budget || template.defaultBudget || 0,
        currency: template.currency || 'AED',
        startDate,
        expectedDuration: template.defaultDurationDays || 0,
        description: template.description || '',
        ...orgCreate(user),
        createdById: user.userId,
      },
    });

    // Create stages and tasks
    let dayOffset = 0;
    const totalTasksCreated: string[] = [];

    for (const stage of stages) {
      // Create ProjectStage
      const projectStage = await db.projectStage.create({
        data: {
          projectId: project.id,
          department: stage.name.toLowerCase().replace(/\s+/g, '_'),
          stageName: stage.name,
          stageOrder: stage.order,
          status: 'NOT_STARTED',
          ...orgCreate(user),
        },
      });

      // Create tasks for this stage
      for (let taskIndex = 0; taskIndex < stage.tasks.length; taskIndex++) {
        const taskDef = stage.tasks[taskIndex];
        const taskStartDate = new Date(startDate);
        taskStartDate.setDate(taskStartDate.getDate() + dayOffset);

        const taskDueDate = new Date(taskStartDate);
        taskDueDate.setDate(taskDueDate.getDate() + (taskDef.estimatedDays || 5));

        const task = await db.task.create({
          data: {
            projectId: project.id,
            title: taskDef.title,
            titleAr: taskDef.titleAr || '',
            description: taskDef.description || '',
            priority: taskDef.priority || 'normal',
            status: 'todo',
            startDate: taskStartDate,
            dueDate: taskDueDate,
            endDate: taskDueDate,
            order: taskIndex + 1,
            ...orgCreate(user),
            createdById: user.userId,
          },
        });

        totalTasksCreated.push(task.id);
        dayOffset += taskDef.estimatedDays || 5;
      }
    }

    // Update expected end date
    const expectedEndDate = new Date(startDate);
    expectedEndDate.setDate(expectedEndDate.getDate() + dayOffset);
    await db.project.update({
      where: { id: project.id },
      data: { expectedEndDate },
    });

    // Increment template usage count
    await db.projectTemplate.update({
      where: { id: template.id },
      data: { usageCount: { increment: 1 } },
    });

    // Invalidate caches
    try {
      await cacheDeletePattern(`projects:${user.organizationId || 'global'}:*`);
      await cacheDeletePattern(`dashboard:${user.organizationId || 'global'}:*`);
    } catch { /* cache invalidation failure is non-critical */ }

    log.info(`Project created from template: ${project.number} from template ${template.name}`, {
      projectId: project.id,
      templateId: template.id,
      tasksCreated: totalTasksCreated.length,
    });

    // Return the full project with related data
    const fullProject = await db.project.findUnique({
      where: { id: project.id },
      include: {
        client: { select: { id: true, name: true, company: true } },
        stages: { orderBy: { stageOrder: 'asc' } },
        tasks: { orderBy: { order: 'asc' } },
      },
    });

    return createdResponse({
      project: fullProject,
      tasksCreated: totalTasksCreated.length,
      stagesCreated: stages.length,
    });
  } catch (error) {
    return handleApiError('Error instantiating project from template', error);
  }
}
