// @ts-check
/**
 * Task Service
 * خدمة المهام
 * 
 * Business logic layer for task operations
 * 
 * SECURITY: All methods that access tasks by ID verify organization ownership
 * to prevent IDOR (Insecure Direct Object Reference) attacks.
 */

import { db } from '@/lib/db';
import { insensitiveContains } from '@/app/api/utils/db';
import { logAudit } from './audit.service';
import { automationService } from './automation.service';
import type { Task } from '@prisma/client';
import type { TaskPriority, TaskStatus } from '@/types/db-enums';

/**
 * Task filtering options
 */
export interface TaskFilters {
  status?: string;
  priority?: string;
  assignedTo?: string;
  projectId?: string;
  parentId?: string;
  search?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
}

/**
 * Pagination parameters
 */
export interface TaskPaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result wrapper
 */
export interface TaskPaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Create task input - only fields that can be set by user
 */
export interface CreateTaskInput {
  title: string;
  description?: string;
  projectId?: string;
  parentId?: string;
  assignedTo?: string;
  priority?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  dueDate?: Date;
  estimatedHours?: number;
  isMilestone?: boolean;
  color?: string;
}

/**
 * Update task input - only fields that can be modified by user
 * This prevents Mass Assignment vulnerability
 */
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  projectId?: string;
  parentId?: string;
  assignedTo?: string;
  priority?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  dueDate?: Date;
  progress?: number;
  estimatedHours?: number;
  actualHours?: number;
  isMilestone?: boolean;
  color?: string;
  dependencies?: string;
  order?: number;
}

/**
 * Custom error for task not found or access denied
 */
export class TaskAccessError extends Error {
  constructor(message: string = 'Task not found or access denied') {
    super(message);
    this.name = 'TaskAccessError';
  }
}

/**
 * Gantt task DTO - partial task data for Gantt chart
 */
export interface GanttTaskDTO {
  id: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  progress: number;
  status: string;
  priority: string;
  parentId: string | null;
  dependencies: string | null;
  color: string | null;
  isMilestone: boolean;
  order: number;
  assignedTo: string | null;
}

/**
 * Task Service
 * Handles all business logic related to tasks
 * 
 * SECURITY: Implements tenant isolation through organizationId validation
 */
class TaskService {
  /**
   * Get all tasks with pagination and filtering
   * Automatically filters by organization for tenant isolation
   */
  async getTasks(
    organizationId: string,
    filters?: TaskFilters,
    pagination?: TaskPaginationParams
  ): Promise<TaskPaginatedResult<Task>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { 
      deletedAt: null,
      organizationId,
    };

    // Apply filters
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.assignedTo) where.assigneeId = filters.assignedTo;
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.parentId) where.parentId = filters.parentId;

    if (filters?.search) {
      where.OR = [
        { title: insensitiveContains(filters.search) },
        { description: insensitiveContains(filters.search) },
      ];
    }

    if (filters?.dueDateFrom || filters?.dueDateTo) {
      where.dueDate = {};
      if (filters?.dueDateFrom) (where.dueDate as Record<string, Date>).gte = filters.dueDateFrom;
      if (filters?.dueDateTo) (where.dueDate as Record<string, Date>).lte = filters.dueDateTo;
    }

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: pagination?.sortBy
          ? { [pagination.sortBy]: pagination.sortOrder || 'desc' }
          : { createdAt: 'desc' },
        include: {
          project: {
            select: { id: true, name: true },
          },
        },
      }),
      db.task.count({ where }),
    ]);

    return {
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get task by ID with organization validation
   * SECURITY: Verifies task belongs to organization before returning
   * 
   * @param id - Task ID
   * @param organizationId - Organization ID for access control
   * @returns Task or null if not found or access denied
   */
  async getTaskById(id: string, organizationId: string): Promise<Task | null> {
    // SECURITY: Use findFirst with organization filter instead of findUnique
    // This prevents IDOR by ensuring the task belongs to the organization
    const task = await db.task.findFirst({
      where: {
        id,
        deletedAt: null,
        organizationId,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        parent: {
          select: { id: true, title: true },
        },
        subtasks: {
          take: 20,
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return task;
  }

  /**
   * Create a new task
   * SECURITY: Validates that the project belongs to the organization
   */
  async createTask(
    data: CreateTaskInput,
    organizationId: string,
    userId: string
  ): Promise<Task> {
    // SECURITY: Verify project belongs to organization before creating task
    if (data.projectId) {
      const project = await db.project.findFirst({
        where: {
          id: data.projectId,
          organizationId,
        },
        select: { id: true },
      });

      if (!project) {
        throw new TaskAccessError('Project not found or access denied');
      }
    }

    // SECURITY: Verify parent task belongs to organization if specified
    if (data.parentId) {
      const parentTask = await db.task.findFirst({
        where: {
          id: data.parentId,
          organizationId,
        },
        select: { id: true },
      });

      if (!parentTask) {
        throw new TaskAccessError('Parent task not found or access denied');
      }
    }

    const task = await db.task.create({
      data: {
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        parentId: data.parentId,
        assigneeId: data.assignedTo,
        priority: (data.priority || 'NORMAL') as TaskPriority,
        status: (data.status || 'TODO') as TaskStatus,
        startDate: data.startDate,
        endDate: data.endDate,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours,
        isMilestone: data.isMilestone || false,
        color: data.color,
        organizationId: organizationId,
      },
    });

    if (data.projectId) {
      await logAudit({
        userId,
        organizationId,
        entityType: 'task',
        entityId: task.id,
        action: 'create',
        description: `تم إنشاء المهمة: ${task.title}`,
        metadata: { projectId: data.projectId, newValue: task },
      });
    }

    return task;
  }

  /**
   * Update task with organization validation
   * SECURITY: 
   * - Verifies task belongs to organization before updating
   * - Uses explicit field mapping to prevent Mass Assignment
   * 
   * @param id - Task ID
   * @param data - Update data (only allowed fields)
   * @param organizationId - Organization ID for access control
   * @param userId - User performing the update
   * @returns Updated task
   * @throws TaskAccessError if task not found or access denied
   */
  async updateTask(
    id: string,
    data: UpdateTaskInput,
    organizationId: string,
    userId: string
  ): Promise<Task> {
    // SECURITY: Get existing task with organization validation
    const oldTask = await db.task.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!oldTask) {
      throw new TaskAccessError('Task not found or access denied');
    }

    // SECURITY: If changing project, verify new project belongs to organization
    if (data.projectId && data.projectId !== oldTask.projectId) {
      const newProject = await db.project.findFirst({
        where: {
          id: data.projectId,
          organizationId,
        },
        select: { id: true },
      });

      if (!newProject) {
        throw new TaskAccessError('Target project not found or access denied');
      }
    }

    // SECURITY: Explicit field mapping to prevent Mass Assignment
    // Only allow specific fields to be updated
    const updateData: Record<string, unknown> = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;
    if (data.assignedTo !== undefined) updateData.assigneeId = data.assignedTo;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.progress !== undefined) updateData.progress = Math.max(0, Math.min(100, data.progress));
    if (data.estimatedHours !== undefined) updateData.estimatedHours = data.estimatedHours;
    if (data.actualHours !== undefined) updateData.actualHours = data.actualHours;
    if (data.isMilestone !== undefined) updateData.isMilestone = data.isMilestone;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.dependencies !== undefined) updateData.dependencies = data.dependencies;
    if (data.order !== undefined) updateData.order = data.order;

    await db.task.updateMany({
      where: { id, organizationId },
      data: updateData,
    });

    const task = await db.task.findFirst({ where: { id, organizationId } });
    if (!task) throw new TaskAccessError('Task not found after update');

    await logAudit({
      userId,
      organizationId,
      entityType: 'task',
      entityId: task.id,
      action: 'update',
      description: `تم تحديث المهمة: ${task.title}`,
      metadata: { projectId: task.projectId, oldValue: oldTask, newValue: task },
    });

    return task;
  }

  /**
   * Delete task with organization validation
   * SECURITY: Verifies task belongs to organization before deleting
   * 
   * @param id - Task ID
   * @param organizationId - Organization ID for access control
   * @param userId - User performing the deletion
   * @throws TaskAccessError if task not found or access denied
   */
  async deleteTask(id: string, organizationId: string, userId: string): Promise<void> {
    // SECURITY: Get task with organization validation
    const task = await db.task.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!task) {
      throw new TaskAccessError('Task not found or access denied');
    }

    // Soft delete the task
    await db.task.updateMany({
      where: { id, organizationId },
      data: { deletedAt: new Date() },
    });

    await logAudit({
      userId,
      organizationId,
      entityType: 'task',
      entityId: id,
      action: 'delete',
      description: `تم حذف المهمة: ${task.title}`,
      metadata: { projectId: task.projectId, oldValue: task },
    });
  }

  /**
   * Update task progress
   * SECURITY: Delegates to updateTask which validates organization
   */
  async updateProgress(
    id: string,
    progress: number,
    organizationId: string,
    userId: string
  ): Promise<Task> {
    // Clamp progress to valid range
    const clampedProgress = Math.max(0, Math.min(100, progress));
    return this.updateTask(id, { progress: clampedProgress }, organizationId, userId);
  }

  /**
   * Change task status
   * SECURITY: Delegates to updateTask which validates organization
   */
  async changeStatus(
    id: string,
    status: string,
    organizationId: string,
    userId: string
  ): Promise<Task> {
    const updateData: UpdateTaskInput = { status };
    
    // If completing the task, set progress to 100%
    if (status === 'DONE') {
      updateData.progress = 100;
    }

    const task = await this.updateTask(id, updateData, organizationId, userId);

    if (status === 'DONE') {
      await automationService.triggerEvent('TASK_COMPLETED', {
        organizationId,
        entityId: id,
        userId
      });
    }

    return task;
  }

  /**
   * Get tasks for Gantt chart with organization validation
   * SECURITY: Validates project belongs to organization
   * 
   * @param projectId - Project ID
   * @param organizationId - Organization ID for access control
   * @returns Array of tasks for the project
   * @throws TaskAccessError if project not found or access denied
   */
  async getTasksForGantt(projectId: string, organizationId: string): Promise<GanttTaskDTO[]> {
    // SECURITY: Verify project belongs to organization
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      select: { id: true },
    });

    if (!project) {
      throw new TaskAccessError('Project not found or access denied');
    }

    return db.task.findMany({
      where: { projectId, deletedAt: null },
      orderBy: [{ order: 'asc' }, { startDate: 'asc' }],
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        progress: true,
        status: true,
        priority: true,
        parentId: true,
        dependencies: true,
        color: true,
        isMilestone: true,
        order: true,
        assigneeId: true,
      },
    // NOTE: Double cast needed because Prisma select returns { assigneeId }
    // but GanttTaskDTO expects { assignedTo } — field names don't overlap
    }) as unknown as GanttTaskDTO[];
  }

  /**
   * Get task statistics for dashboard
   * SECURITY: Filters by organization through project relation
   */
  async getTaskStats(organizationId: string): Promise<{
    total: number;
    TODO: number;
    inProgress: number;
    REVIEW: number;
    DONE: number;
    OVERDUE: number;
  }> {
    const [statusCounts, overdueCount] = await Promise.all([
      db.task.groupBy({
        by: ['status'],
        where: {
          organizationId,
          deletedAt: null,
        },
        _count: true,
      }),
      db.task.count({
        where: {
          organizationId,
          deletedAt: null,
          dueDate: { lt: new Date() },
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
      }),
    ]) as [Array<{ status: string; _count: number }>, number];

    const stats = {
      total: 0,
      TODO: 0,
      inProgress: 0,
      REVIEW: 0,
      DONE: 0,
      OVERDUE: overdueCount,
    };

    for (const item of statusCounts) {
      stats.total += item._count;
      switch (item.status) {
        case 'TODO':
          stats.TODO = item._count;
          break;
        case 'IN_PROGRESS':
          stats.inProgress = item._count;
          break;
        case 'REVIEW':
          stats.REVIEW = item._count;
          break;
        case 'DONE':
          stats.DONE = item._count;
          break;
      }
    }

    return stats;
  }
}

// Export singleton instance
export const taskService = new TaskService();
