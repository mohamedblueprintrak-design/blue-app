// @ts-check
/**
 * Client Service
 * خدمة العملاء
 * 
 * Business logic layer for client operations
 * Uses cache for read operations with automatic invalidation
 * 
 * SECURITY:
 * - All methods validate organization ownership
 * - Explicit field mapping to prevent Mass Assignment
 */

import { db } from '@/lib/db';
import { logAudit } from './audit.service';
import { CacheService } from '@/lib/cache';
import { log } from '@/lib/logger';
import type { Client } from '@prisma/client';

/**
 * Client statistics interface
 */
export interface ClientStats {
  total: number;
  active: number;
  inactive: number;
}

/**
 * Client with project count
 */
export interface ClientWithProjects extends Client {
  projectCount: number;
}

/**
 * Active client for dropdowns/selectors (partial data)
 */
export interface ActiveClientDTO {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

/**
 * Create client input - only fields that can be set by user
 */
export interface CreateClientInput {
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
}

/**
 * Update client input - only fields that can be modified
 */
export interface UpdateClientInput {
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
 * Custom error for client not found or access denied
 */
export class ClientAccessError extends Error {
  constructor(message: string = 'Client not found or access denied') {
    super(message);
    this.name = 'ClientAccessError';
  }
}

// Cache key generators
const CACHE_KEYS = {
  clients: (orgId: string) => `clients:${orgId}`,
  activeClients: (orgId: string) => `clients:active:${orgId}`,
  clientById: (id: string) => `client:${id}`,
  clientStats: (orgId: string) => `clients:stats:${orgId}`,
};

// Cache TTL in seconds
const CACHE_TTL = {
  short: 60,        // 1 minute - for frequently changing data
  medium: 300,      // 5 minutes - for lists
  long: 900,        // 15 minutes - for stats
};

/**
 * Client Service
 * Handles all business logic related to clients
 */
class ClientService {
  /**
   * Get all clients for an organization (cached)
   */
  async getClients(organizationId: string): Promise<Client[]> {
    const cacheKey = CACHE_KEYS.clients(organizationId);
    
    return CacheService.getOrSet(
      cacheKey,
      async () => {
        log.service('ClientService', 'getClients', { organizationId });
        return db.client.findMany({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
        });
      },
      { ttl: CACHE_TTL.medium, prefix: 'bp' }
    );
  }

  /**
   * Get active clients for dropdowns/selectors (cached)
   */
  async getActiveClients(organizationId: string): Promise<ActiveClientDTO[]> {
    const cacheKey = CACHE_KEYS.activeClients(organizationId);
    
    return CacheService.getOrSet(
      cacheKey,
      async () => {
        log.service('ClientService', 'getActiveClients', { organizationId });
        return db.client.findMany({
          where: { isActive: true, organizationId },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        });
      },
      { ttl: CACHE_TTL.long, prefix: 'bp' }
    );
  }

  /**
   * Get client by ID with organization validation
   * SECURITY: Verifies client belongs to organization before returning
   */
  async getClientById(id: string, organizationId: string): Promise<Client | null> {
    return db.client.findFirst({
      where: { id, organizationId },
    });
  }

  /**
   * Create a new client
   * SECURITY: Validates organization ownership
   */
  async createClient(
    data: CreateClientInput,
    organizationId: string,
    userId: string
  ): Promise<Client> {
    log.service('ClientService', 'createClient', { organizationId, name: data.name });

    const client = await db.client.create({
      data: {
        name: data.name,
        organizationId,
        email: data.email,
        phone: data.phone,
        address: data.address,
        fullAddress: JSON.stringify({ city: data.city || '', country: data.country || '' }),
        taxNumber: data.taxNumber,
        creditLimit: data.creditLimit || 0,
        paymentTerms: String(data.paymentTerms || 30),
        notes: data.notes,
      },
    });

    // Log audit
    await logAudit({
      userId,
      organizationId,
      entityType: 'client',
      entityId: client.id,
      action: 'create',
      description: `تم إنشاء العميل: ${client.name}`,
      metadata: { newValue: client },
    });

    // Invalidate cache
    await this.invalidateCache(organizationId);

    return client;
  }

  /**
   * Update client
   * SECURITY: Validates organization ownership and uses explicit field mapping
   */
  async updateClient(
    id: string,
    data: UpdateClientInput,
    organizationId: string,
    userId: string
  ): Promise<Client> {
    // SECURITY: Verify client belongs to organization
    const oldClient = await db.client.findFirst({
      where: { id, organizationId },
    });

    if (!oldClient) {
      throw new ClientAccessError('Client not found or access denied');
    }

    // SECURITY: Explicit field mapping to prevent Mass Assignment
    const updateData: Record<string, unknown> = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined || data.country !== undefined) {
      // Build fullAddress from city/country
      let existingAddress: Record<string, unknown> = {};
      if (oldClient.fullAddress) {
        try {
          existingAddress = JSON.parse(oldClient.fullAddress);
        } catch {
          // Invalid JSON
        }
      }
      if (data.city !== undefined) existingAddress.city = data.city;
      if (data.country !== undefined) existingAddress.country = data.country;
      updateData.fullAddress = JSON.stringify(existingAddress);
    }
    if (data.taxNumber !== undefined) updateData.taxNumber = data.taxNumber;
    if (data.creditLimit !== undefined) updateData.creditLimit = data.creditLimit;
    if (data.paymentTerms !== undefined) updateData.paymentTerms = String(data.paymentTerms);
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    await db.client.updateMany({
      where: { id, organizationId },
      data: updateData,
    });

    const client = await db.client.findFirst({
      where: { id, organizationId },
    });

    if (!client) {
      throw new ClientAccessError('Client not found or access denied');
    }

    // Log audit
    await logAudit({
      userId,
      organizationId,
      entityType: 'client',
      entityId: client.id,
      action: 'update',
      description: `تم تحديث العميل: ${client.name}`,
      metadata: { oldValue: oldClient, newValue: client },
    });

    // Invalidate cache
    await this.invalidateCache(organizationId, id);

    return client;
  }

  /**
   * Delete client (soft delete)
   * SECURITY: Validates organization ownership
   */
  async deleteClient(
    id: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    // SECURITY: Verify client belongs to organization
    const client = await db.client.findFirst({
      where: { id, organizationId },
    });

    if (!client) {
      throw new ClientAccessError('Client not found or access denied');
    }

    // Soft delete
    await db.client.updateMany({
      where: { id, organizationId },
      data: { isActive: false, deletedAt: new Date() },
    });

    // Log audit
    await logAudit({
      userId,
      organizationId,
      entityType: 'client',
      entityId: id,
      action: 'delete',
      description: `تم حذف العميل: ${client.name}`,
      metadata: { oldValue: client },
    });

    // Invalidate cache
    await this.invalidateCache(organizationId, id);
  }

  /**
   * Get client statistics (cached)
   */
  async getClientStats(organizationId: string): Promise<ClientStats> {
    const cacheKey = CACHE_KEYS.clientStats(organizationId);
    
    return CacheService.getOrSet(
      cacheKey,
      async () => {
        log.service('ClientService', 'getClientStats', { organizationId });
        const [total, active] = await Promise.all([
          db.client.count({ where: { organizationId } }),
          db.client.count({ where: { isActive: true, organizationId } }),
        ]);

        return {
          total,
          active,
          inactive: total - active,
        };
      },
      { ttl: CACHE_TTL.long, prefix: 'bp' }
    );
  }

  /**
   * Search clients by name or contact info
   */
  async searchClients(query: string, organizationId: string): Promise<Client[]> {
    log.service('ClientService', 'searchClients', { query, organizationId });
    
    return db.client.findMany({
      where: {
        isActive: true,
        organizationId,
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
        ],
      },
      take: 20,
    });
  }

  /**
   * Check if client has active projects
   */
  async hasActiveProjects(clientId: string, organizationId: string): Promise<boolean> {
    const count = await db.project.count({
      where: { clientId, organizationId, status: 'ACTIVE' },
    });
    return count > 0;
  }

  /**
   * Invalidate cache for client-related data
   */
  private async invalidateCache(organizationId: string, clientId?: string): Promise<void> {
    const keysToDelete = [
      CACHE_KEYS.clients(organizationId),
      CACHE_KEYS.activeClients(organizationId),
      CACHE_KEYS.clientStats(organizationId),
    ];
    
    if (clientId) {
      keysToDelete.push(CACHE_KEYS.clientById(clientId));
    }
    
    await Promise.all(
      keysToDelete.map(key => CacheService.delete(key, { prefix: 'bp' }))
    );
    
    log.debug('Cache invalidated', { organizationId, clientId });
  }
}

// Export singleton instance
export const clientService = new ClientService();
