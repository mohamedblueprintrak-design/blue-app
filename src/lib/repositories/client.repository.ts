// @ts-check
/**
 * Client Repository
 * مستودع العملاء
 * 
 * Specialized repository for Client entity operations
 */

import { PrismaClient, Client } from '@prisma/client';
import { insensitiveContains } from '@/app/api/utils/db';
import { BaseRepository, FindManyOptions } from './base.repository';

/**
 * Extended Client type with project count
 */
export interface ClientWithStats extends Client {
  _count?: {
    projects: number;
    invoices: number;
  };
}

/**
 * Data transfer object for creating a client
 */
export interface CreateClientData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  contactPerson?: string;
  taxNumber?: string;
  creditLimit?: number;
  paymentTerms?: number;
  notes?: string;
  organizationId?: string;
}

/**
 * Data transfer object for updating a client
 */
export interface UpdateClientData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  contactPerson?: string;
  taxNumber?: string;
  creditLimit?: number;
  paymentTerms?: number;
  notes?: string;
  isActive?: boolean;
}

/**
 * Client Repository
 * Handles all database operations for Client entities
 */
export class ClientRepository extends BaseRepository<Client> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'client');
  }

  /**
   * Find client by ID with project statistics
   */
  async findByIdWithStats(id: string): Promise<ClientWithStats | null> {
    return this.delegate.findUnique({
      where: { id },
      include: {
        _count: {
          select: { projects: true, invoices: true },
        },
      },
    });
  }

  /**
   * Find all active clients for an organization
   */
  async findActiveByOrganization(organizationId: string): Promise<Client[]> {
    return this.delegate.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find all clients for an organization with pagination
   */
  async findManyByOrganization(
    organizationId: string,
    options?: FindManyOptions
  ): Promise<Client[]> {
    return this.delegate.findMany({
      where: { organizationId, ...options?.where },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { createdAt: 'desc' },
    });
  }

  /**
   * Search clients by name or contact info
   */
  async search(
    query: string,
    organizationId: string,
    options?: FindManyOptions
  ): Promise<Client[]> {
    return this.delegate.findMany({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { name: insensitiveContains(query) },
          { email: insensitiveContains(query) },
          { contactPerson: insensitiveContains(query) },
        ],
      },
      skip: options?.skip,
      take: options?.take,
    });
  }

  /**
   * Check if client has active projects
   */
  async hasActiveProjects(id: string, organizationId: string): Promise<boolean> {
    const count = await this.delegate.project?.count?.({
      where: { clientId: id, organizationId, status: 'ACTIVE' },
    });
    return (count || 0) > 0;
  }

  /**
   * Soft delete client by ID and organization
   * This is a specialized soft delete that includes organization check for security
   */
  async softDeleteByOrganization(id: string, organizationId: string): Promise<Client> {
    return this.delegate.update({
      where: { id, organizationId },
      data: { isActive: false },
    });
  }

  /**
   * Get client statistics for organization
   */
  async getStats(organizationId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const [total, active] = await Promise.all([
      this.delegate.count({ where: { organizationId } }),
      this.delegate.count({ where: { organizationId, isActive: true } }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
    };
  }
}
