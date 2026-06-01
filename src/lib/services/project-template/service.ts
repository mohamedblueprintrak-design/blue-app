// @ts-check
/**
 * Project Template Service
 * خدمة قوالب المشاريع للاعتمادات الحكومية
 * 
 * Service functions for managing project templates — DB-dependent operations.
 */

import { db, ExtendedPrismaClient } from './types';
import { isDatabaseAvailable } from '@/lib/db';
import { Task, TaskType } from '@prisma/client';
import { log } from '@/lib/logger';
import { PREDEFINED_TEMPLATES, getTemplateMetadata } from './templates';
import { type CreateProjectFromTemplateInput } from './types';

const extDb = db as ExtendedPrismaClient;

// ============================================
// Template Service Functions
// ============================================

/**
 * Initialize predefined templates in database
 * تهيئة القوالب المحددة مسبقاً في قاعدة البيانات
 */
export async function initializeTemplates(): Promise<void> {
  if (!await isDatabaseAvailable()) {
    log.info('Database not available, skipping template initialization');
    return;
  }

  for (const [code, tasks] of Object.entries(PREDEFINED_TEMPLATES)) {
    const templateData = getTemplateMetadata(code);
    
    // Check if template already exists
    const existing = await extDb.projectTemplate.findUnique({
      where: { code },
    });

    if (existing) {
      log.debug(`Template ${code} already exists, skipping`);
      continue;
    }

    // Create template
    const template = await extDb.projectTemplate.create({
      data: {
        name: templateData.name,
        nameAr: templateData.nameAr,
        code,
        description: templateData.description,
        descriptionAr: templateData.descriptionAr,
        category: templateData.category,
        estimatedDays: tasks.reduce((sum, t) => sum + t.slaDays, 0),
        tasks: {
          CREATE: tasks.map((task) => ({
            taskName: task.name,
            taskNameAr: task.nameAr ?? undefined,
            description: task.description ?? undefined,
            descriptionAr: task.descriptionAr ?? undefined,
            taskType: TaskType.GOVERNMENTAL,
            slaDays: task.slaDays,
            slaWarningDays: task.slaWarningDays ?? undefined,
            estimatedMinutes: task.estimatedMinutes ?? undefined,
            order: task.order,
            dependencies: task.dependencies ? JSON.stringify(task.dependencies) : null,
            governmentEntity: task.governmentEntity ?? undefined,
            governmentEntityAr: task.governmentEntityAr ?? undefined,
            isMandatory: true,
            color: task.color ?? undefined,
          })) // TODO: type this — nested create type mismatch
        },
      },
    });

    log.info(`Created template: ${template.name} (${code})`);
  }
}

/**
 * Create tasks from template for a project
 * إنشاء مهام من قالب لمشروع
 */
export async function createTasksFromTemplate(
  input: CreateProjectFromTemplateInput
): Promise<{ created: number; tasks: Task[] }> {
  if (!await isDatabaseAvailable()) {
    throw new Error('Database not available');
  }

  const { projectId, templateCode, customStartDate, assignedToId } = input;
  const startDate = customStartDate || new Date();

  // Get template
  const template = await extDb.projectTemplate.findUnique({
    where: { code: templateCode },
    include: { tasks: { orderBy: { order: 'asc' } } },
  });

  if (!template) {
    throw new Error(`Template not found: ${templateCode}`);
  }

  // Verify project exists
  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Create tasks
  const createdTasks: Task[] = [];

  for (const templateTask of template.tasks) {
    const taskStartDate = new Date(startDate);
    // Add days based on order (simplified dependency handling)
    taskStartDate.setDate(taskStartDate.getDate() + (templateTask.order - 1) * 2);

    const taskEndDate = new Date(taskStartDate);
    taskEndDate.setDate(taskEndDate.getDate() + templateTask.slaDays);

    const task = await db.task.create({
      data: {
        projectId,
        title: templateTask.taskName,
        titleAr: templateTask.taskNameAr,
        description: templateTask.description,
        taskType: TaskType.GOVERNMENTAL,
        status: 'TODO',
        priority: 'HIGH',
        startDate: taskStartDate,
        endDate: taskEndDate,
        estimatedHours: templateTask.estimatedMinutes ? templateTask.estimatedMinutes / 60 : undefined,
        slaDays: templateTask.slaDays,
        slaWarningDays: templateTask.slaWarningDays,
        slaStartDate: taskStartDate,
        isMilestone: templateTask.isMandatory || false,
        assigneeId: assignedToId,
        order: templateTask.order,
        color: templateTask.color,
        dependencies: templateTask.dependencies ? JSON.stringify(templateTask.dependencies) : undefined, // TemplateTaskData uses number[] but Task expects string — JSON.stringify handles conversion
      },
    });

    createdTasks.push(task);
  }

  return {
    created: createdTasks.length,
    tasks: createdTasks,
  };
}

/**
 * Get all available templates
 * الحصول على جميع القوالب المتاحة
 */
export async function getAvailableTemplates(): Promise<Array<Record<string, unknown>>> {
  if (!await isDatabaseAvailable()) {
    return Object.keys(PREDEFINED_TEMPLATES).map((code) => ({
      code,
      ...getTemplateMetadata(code),
      isPredefined: true,
    }));
  }

  const result = await extDb.projectTemplate.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { tasks: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });
  return result as unknown as Array<Record<string, unknown>>;
}

/**
 * Get template details with tasks
 */
export async function getTemplateDetails(templateCode: string): Promise<Record<string, unknown> | null> {
  if (!await isDatabaseAvailable()) return null;

  const result = await extDb.projectTemplate.findUnique({
    where: { code: templateCode },
    include: {
      tasks: { orderBy: { order: 'asc' } },
    },
  });
  return result as Record<string, unknown> | null;
}
