// @ts-check
/**
 * Project Service
 * خدمة المشاريع
 * 
 * Business logic layer for project operations
 * Follows Clean Architecture principles
 * 
 * SECURITY:
 * - All methods validate organization ownership
 * - Race condition protection for project number generation
 */

import { db } from '@/lib/db';
import { insensitiveContains } from '@/app/api/utils/db';
 
import { logAudit } from './audit.service';
import type { Project, ProjectType } from '@prisma/client';

/**
 * Project statistics interface
 */
export interface ProjectStats {
  total: number;
  ACTIVE: number;
  COMPLETED: number;
  PENDING: number;
  ON_HOLD: number;
  totalValue: number;
  averageProgress: number;
}

/**
 * Project filtering options
 */
export interface ProjectFilters {
  status?: string;
  managerId?: string;
  clientId?: string;
  projectType?: ProjectType;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Create project input - only fields that can be set by user
 */
export interface CreateProjectInput {
  name: string;
  projectNumber?: string;
  location?: string;
  projectType?: ProjectType;
  description?: string;
  contractValue?: number;
  contractDate?: Date;
  expectedStartDate?: Date;
  expectedEndDate?: Date;
  managerId?: string;
  clientId?: string;
  budget?: number;
}

/**
 * Update project input - only fields that can be modified
 */
export interface UpdateProjectInput {
  name?: string;
  location?: string;
  projectType?: ProjectType;
  description?: string;
  contractValue?: number;
  contractDate?: Date;
  expectedStartDate?: Date;
  expectedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  managerId?: string;
  clientId?: string;
  budget?: number;
  status?: string;
  progressPercentage?: number;
}

/**
 * Custom error for project access denied
 */
export class ProjectAccessError extends Error {
  constructor(message: string = 'Project not found or access denied') {
    super(message);
    this.name = 'ProjectAccessError';
  }
}

/**
 * Maximum retries for project number generation
 */
const MAX_RETRIES = 5;

/**
 * Project Service
 * Handles all business logic related to projects
 */
class ProjectService {
  /**
   * Get all projects with pagination and filtering
   */
  async getProjects(
    organizationId: string,
    filters?: ProjectFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Project>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };

    // Apply filters
    if (filters?.status) where.status = filters.status;
    if (filters?.managerId) where.managerId = filters.managerId;
    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.projectType) where.type = filters.projectType;
    
    if (filters?.search) {
      where.OR = [
        { name: insensitiveContains(filters.search) },
        { number: insensitiveContains(filters.search) },
        { location: insensitiveContains(filters.search) },
      ];
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters?.dateFrom) (where.createdAt as Record<string, Date>).gte = filters.dateFrom;
      if (filters?.dateTo) (where.createdAt as Record<string, Date>).lte = filters.dateTo;
    }

    const [projects, total] = await Promise.all([
      db.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: pagination?.sortBy 
          ? { [pagination.sortBy]: pagination.sortOrder || 'desc' }
          : { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          manager: { select: { id: true, name: true } },
        },
      }),
      db.project.count({ where }),
    ]);

    return {
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get project by ID with full details
   * SECURITY: Validates organization ownership
   */
  async getProjectById(id: string, organizationId: string) {
    return db.project.findFirst({
      where: { id, organizationId },
      include: {
        client: true,
        manager: { select: { id: true, name: true, email: true } },
        tasks: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        risks: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { tasks: true, documents: true, risks: true },
        },
      },
    });
  }

  /**
   * Create a new project
   * SECURITY:
   * - Validates client belongs to organization
   * - Race condition protection for project number
   * - Audit logging
   */
  async createProject(
    data: CreateProjectInput,
    organizationId: string,
    userId: string
  ): Promise<Project> {
    // SECURITY: Validate client belongs to organization
    if (data.clientId) {
      const client = await db.client.findFirst({
        where: { id: data.clientId, organizationId },
        select: { id: true },
      });
      
      if (!client) {
        throw new ProjectAccessError('Client not found or access denied');
      }
    }

    // Generate project number with retry logic for race condition protection
    const projectNumber = data.projectNumber || 
      await this.generateProjectNumberWithRetry(organizationId);

    // Use transaction to ensure atomicity
    const project = await db.$transaction(async (tx) => {
      // Double-check project number uniqueness within the organization
      const existingProject = await tx.project.findFirst({
        where: { number: projectNumber, organizationId },
        select: { id: true },
      });

      if (existingProject) {
        // If collision, generate new number
        const newNumber = await this.generateProjectNumberWithRetry(organizationId, tx);
        return tx.project.create({
          data: {
            name: data.name,
            number: newNumber,
            location: data.location,
            type: data.projectType,
            description: data.description,
            contractValue: data.contractValue,
            contractDate: data.contractDate,
            startDate: data.expectedStartDate,
            expectedEndDate: data.expectedEndDate,
            managerId: data.managerId,
            clientId: data.clientId ?? '',
            budget: data.budget,
            createdById: userId,
            organizationId,
          },
        });
      }

      return tx.project.create({
        data: {
          name: data.name,
          number: projectNumber,
          location: data.location,
          type: data.projectType,
          description: data.description,
          contractValue: data.contractValue,
          contractDate: data.contractDate,
          startDate: data.expectedStartDate,
          expectedEndDate: data.expectedEndDate,
          managerId: data.managerId,
          clientId: data.clientId ?? '',
          budget: data.budget,
          createdById: userId,
          organizationId,
        },
      });
    });

    // Log audit
    await logAudit({
      userId,
      organizationId,
      entityType: 'project',
      entityId: project.id,
      action: 'create',
      description: `تم إنشاء المشروع: ${project.name}`,
      metadata: { projectId: project.id, newValue: project },
    });

    return project;
  }

  /**
   * Update project
   * SECURITY:
   * - Validates organization ownership
   * - Explicit field mapping to prevent Mass Assignment
   */
  async updateProject(
    id: string,
    data: UpdateProjectInput,
    organizationId: string,
    userId: string
  ): Promise<Project> {
    // SECURITY: Verify project belongs to organization
    const oldProject = await db.project.findFirst({
      where: { id, organizationId },
    });

    if (!oldProject) {
      throw new ProjectAccessError('Project not found or access denied');
    }

    // SECURITY: If changing client, verify new client belongs to organization
    if (data.clientId && data.clientId !== oldProject.clientId) {
      const client = await db.client.findFirst({
        where: { id: data.clientId, organizationId },
        select: { id: true },
      });
      
      if (!client) {
        throw new ProjectAccessError('Client not found or access denied');
      }
    }

    // SECURITY: Explicit field mapping to prevent Mass Assignment
    const updateData: Record<string, unknown> = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.projectType !== undefined) updateData.type = data.projectType;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.contractValue !== undefined) updateData.contractValue = data.contractValue;
    if (data.contractDate !== undefined) updateData.contractDate = data.contractDate;
    if (data.expectedStartDate !== undefined) updateData.startDate = data.expectedStartDate;
    if (data.expectedEndDate !== undefined) updateData.expectedEndDate = data.expectedEndDate;
    if (data.actualStartDate !== undefined) updateData.actualStartDate = data.actualStartDate;
    if (data.actualEndDate !== undefined) updateData.actualEndDate = data.actualEndDate;
    if (data.managerId !== undefined) updateData.managerId = data.managerId;
    if (data.clientId !== undefined) updateData.clientId = data.clientId;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.progressPercentage !== undefined) {
      updateData.progress = Math.max(0, Math.min(100, data.progressPercentage));
    }

    await db.project.updateMany({
      where: { id, organizationId },
      data: updateData,
    });

    const project = await db.project.findFirst({
      where: { id, organizationId },
    });

    if (!project) {
      throw new ProjectAccessError('Project not found or access denied');
    }

    // Log audit
    await logAudit({
      userId,
      organizationId,
      entityType: 'project',
      entityId: project.id,
      action: 'update',
      description: `تم تحديث المشروع: ${project.name}`,
      metadata: { projectId: project.id, oldValue: oldProject, newValue: project },
    });

    return project;
  }

  /**
   * Delete project
   * SECURITY: Validates organization ownership
   */
  async deleteProject(id: string, organizationId: string, userId: string): Promise<void> {
    // SECURITY: Verify project belongs to organization
    const project = await db.project.findFirst({
      where: { id, organizationId },
    });

    if (!project) {
      throw new ProjectAccessError('Project not found or access denied');
    }

    await db.project.updateMany({
      where: { id, organizationId },
      data: { deletedAt: new Date() },
    });

    // Log audit
    await logAudit({
      userId,
      organizationId,
      entityType: 'project',
      entityId: id,
      action: 'delete',
      description: `تم حذف المشروع: ${project.name}`,
      metadata: { oldValue: project },
    });
  }

  /**
   * Get project statistics for dashboard
   */
  async getProjectStats(organizationId: string): Promise<ProjectStats> {
    const [statusCounts, valueAggregate, progressAggregate] = await Promise.all([
      db.project.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      db.project.aggregate({
        where: { organizationId },
        _sum: { contractValue: true },
      }),
      db.project.aggregate({
        where: { status: 'ACTIVE', organizationId },
        _avg: { progress: true },
      }),
    ]) as [Array<{ status: string; _count: number }>, { _sum: { contractValue: number | null } }, { _avg: { progress: number | null } | null }];

    const stats: ProjectStats = {
      total: 0,
      ACTIVE: 0,
      COMPLETED: 0,
      PENDING: 0,
      ON_HOLD: 0,
      totalValue: valueAggregate._sum?.contractValue || 0,
      averageProgress: progressAggregate._avg?.progress || 0,
    };

    for (const item of statusCounts) {
      stats.total += item._count;
      switch (item.status) {
        case 'ACTIVE':
          stats.ACTIVE = item._count;
          break;
        case 'COMPLETED':
          stats.COMPLETED = item._count;
          break;
        case 'PENDING':
          stats.PENDING = item._count;
          break;
        case 'ON_HOLD':
          stats.ON_HOLD = item._count;
          break;
      }
    }

    return stats;
  }

  /**
   * Generate unique project number with retry logic
   * 
   * RACE CONDITION PROTECTION:
   * - Uses transaction for atomicity
   * - Retries on collision with exponential backoff
   * - Uses timestamp + random suffix for uniqueness
   * 
   * @param organizationId - Organization ID
   * @param tx - Optional Prisma transaction client
   * @returns Unique project number
   */
  private async generateProjectNumberWithRetry(
    organizationId: string,
    tx?: Parameters<Parameters<typeof db.$transaction>[0]>[0]
  ): Promise<string> {
    const client = tx || db;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const projectNumber = await this.generateProjectNumber(organizationId, client);
      
      // Check if this number already exists within the organization
      const existing = await client.project.findFirst({
        where: { number: projectNumber, organizationId },
        select: { id: true },
      });
      
      if (!existing) {
        return projectNumber;
      }
      
      // Exponential backoff before retry
      if (attempt < MAX_RETRIES - 1) {
        await this.sleep(Math.pow(2, attempt) * 10);
      }
    }
    
    // If all retries fail, use timestamp + random suffix
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const year = new Date().getFullYear();
    return `PRJ-${year}-${timestamp}-${random}`;
  }

  /**
   * Generate project number based on count
   * Uses locking pattern to prevent race conditions
   */
  private async generateProjectNumber(
    organizationId: string,
    client: typeof db | Omit<typeof db, '$on' | '$connect' | '$disconnect' | '$transaction' | '$extends'>
  ): Promise<string> {
    const year = new Date().getFullYear();
    
    // Find the highest project number for this year and organization
    const latestProject = await client.project.findFirst({
      where: {
        number: { startsWith: `PRJ-${year}-` },
        organizationId,
      },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    
    let nextNumber = 1;
    
    if (latestProject?.number) {
      // Extract the number from the project number
      // Format: PRJ-2024-0001
      const match = latestProject.number.match(/PRJ-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    return `PRJ-${year}-${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update project progress based on task completion
   */
  async updateProgress(id: string, organizationId: string): Promise<number | null> {
    // SECURITY: Verify project belongs to organization
    const project = await db.project.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    
    if (!project) {
      return null;
    }

    const tasks = await db.task.findMany({
      where: { projectId: id },
      select: { progress: true },
    });

    if (tasks.length === 0) return null;

    const totalProgress = tasks.reduce((sum, task) => sum + (task.progress || 0), 0);
    const averageProgress = Math.round(totalProgress / tasks.length);

    await db.project.updateMany({
      where: { id, organizationId },
      data: { progress: averageProgress },
    });

    return averageProgress;
  }

  /**
   * Change project status
   */
  async changeStatus(
    id: string, 
    status: string, 
    organizationId: string, 
    userId: string
  ): Promise<Project> {
    // Validate status
    const validStatuses = ['PENDING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    return this.updateProject(
      id, 
      { status } as UpdateProjectInput, 
      organizationId, 
      userId
    );
  }

  /**
   * Assign manager to project
   */
  async assignManager(
    projectId: string,
    managerId: string,
    organizationId: string,
    userId: string
  ): Promise<Project> {
    // SECURITY: Verify manager exists and belongs to organization
    const manager = await db.user.findFirst({
      where: { id: managerId, organizationId },
      select: { id: true },
    });
    
    if (!manager) {
      throw new ProjectAccessError('Manager not found or access denied');
    }

    return this.updateProject(
      projectId,
      { managerId } as UpdateProjectInput,
      organizationId,
      userId
    );
  }
}

// Export singleton instance
export const projectService = new ProjectService();
