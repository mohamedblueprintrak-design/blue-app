// @ts-check
/**
 * Project Repository
 * مستودع المشاريع
 * 
 * Specialized repository for Project entity operations
 */

import { PrismaClient, Project } from '@prisma/client';
import { insensitiveContains } from '@/app/api/utils/db';
import { BaseRepository, FindManyOptions } from './base.repository';

/**
 * Extended Project type with related entities
 */
export interface ProjectWithDetails extends Project {
  client?: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  manager?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  _count?: {
    tasks: number;
    documents: number;
    risks: number;
  };
}

/**
 * Data transfer object for creating a project
 */
export interface CreateProjectData {
  name: string;
  number?: string;
  location?: string;
  projectType?: string;
  description?: string;
  contractValue?: number;
  contractDate?: Date;
  expectedStartDate?: Date;
  expectedEndDate?: Date;
  managerId?: string;
  clientId?: string;
  budget?: number;
  organizationId?: string;
}

/**
 * Data transfer object for updating a project
 */
export interface UpdateProjectData {
  name?: string;
  location?: string;
  projectType?: string;
  status?: string;
  progress?: number;
  description?: string;
  contractValue?: number;
  actualStartDate?: Date;
  actualEndDate?: Date;
  managerId?: string | null;
}

/**
 * Project Repository
 * Handles all database operations for Project entities
 */
export class ProjectRepository extends BaseRepository<Project> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'project');
  }

  /**
   * Find project by ID with all related details
   */
  async findByIdWithDetails(id: string): Promise<ProjectWithDetails | null> {
    return this.delegate.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true, email: true },
        },
        manager: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { tasks: true, documents: true, risks: true },
        },
      },
    });
  }

  /**
   * Find project by project number
   */
  async findByProjectNumber(number: string, organizationId: string): Promise<Project | null> {
    return this.delegate.findFirst({
      where: { number, organizationId },
    });
  }

  /**
   * Find all projects for an organization
   */
  async findManyByOrganization(
    organizationId: string,
    options?: FindManyOptions
  ): Promise<Project[]> {
    return this.delegate.findMany({
      where: { organizationId, ...options?.where },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { createdAt: 'desc' },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Find projects by status within an organization
   */
  async findManyByStatus(
    status: string,
    organizationId: string,
    options?: FindManyOptions
  ): Promise<Project[]> {
    return this.delegate.findMany({
      where: { status, organizationId },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { createdAt: 'desc' },
    });
  }

  /**
   * Find projects managed by a specific user
   */
  async findManyByManager(
    managerId: string,
    organizationId: string,
    options?: FindManyOptions
  ): Promise<Project[]> {
    return this.delegate.findMany({
      where: { managerId, organizationId },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { createdAt: 'desc' },
    });
  }

  /**
   * Update project progress percentage
   */
  async updateProgress(id: string, progress: number): Promise<Project> {
    return this.delegate.update({
      where: { id },
      data: { progress },
    });
  }

  /**
   * Update project status
   */
  async updateStatus(id: string, status: string): Promise<Project> {
    return this.delegate.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Get count of projects by status for an organization
   */
  async countByStatus(organizationId: string): Promise<Record<string, number>> {
    const counts = await this.prisma.project.groupBy({
      by: ['status'],
      where: { organizationId, deletedAt: null },
      _count: { status: true }
    });
    return counts.reduce((acc, item) => {
      acc[item.status] = (item._count as Record<string, number>).status ?? 0;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Search projects by query string
   */
  async search(
    query: string,
    organizationId: string,
    options?: FindManyOptions
  ): Promise<Project[]> {
    return this.delegate.findMany({
      where: {
        organizationId,
        OR: [
          { name: insensitiveContains(query) },
          { number: insensitiveContains(query) },
          { location: insensitiveContains(query) },
        ],
      },
      skip: options?.skip,
      take: options?.take,
    });
  }

  /**
   * Get project statistics for dashboard
   */
  async getStats(organizationId: string): Promise<{
    total: number;
    totalValue: number;
    averageProgress: number;
    byStatus: Record<string, number>;
  }> {
    const [totalCount, valueAggregate, progressAggregate, statusCounts] = await Promise.all([
      this.delegate.count({ where: { organizationId } }),
      this.delegate.aggregate({
        where: { organizationId },
        _sum: { contractValue: true },
      }),
      this.delegate.aggregate({
        where: { organizationId, status: 'ACTIVE' },
        _avg: { progress: true },
      }),
      this.delegate.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const item of statusCounts) {
      const status = (item as Record<string, unknown>).status as string;
      const count = (item as Record<string, unknown>)._count as number;
      byStatus[status] = count;
    }

    return {
      total: totalCount,
      totalValue: ((valueAggregate as Record<string, unknown>)._sum as Record<string, unknown>).contractValue as number || 0,
      averageProgress: ((progressAggregate as Record<string, unknown>)._avg as Record<string, unknown>).progress as number || 0,
      byStatus,
    };
  }
}
