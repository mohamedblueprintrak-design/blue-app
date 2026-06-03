// @ts-check
/**
 * Base Repository Interface
 * واجهة المستودع الأساسية
 * 
 * Implements Repository Pattern for Clean Architecture
 */

import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Options for findMany queries
 */
export interface FindManyOptions {
  skip?: number;
  take?: number;
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  include?: Record<string, boolean | object>;
}

/**
 * Generic Repository Interface
 * Defines contract for data access operations
 */
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findOne(where: Record<string, unknown>): Promise<T | null>;
  findMany(options?: FindManyOptions): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  count(where?: Record<string, unknown>): Promise<number>;
  exists(id: string): Promise<boolean>;
}

/**
 * Base Repository Implementation
 * Provides common CRUD operations for all entities
 */
export abstract class BaseRepository<T> implements IRepository<T> {
  protected prisma: PrismaClient;
  protected model: keyof PrismaClient;

  constructor(prisma: PrismaClient, model: keyof PrismaClient) {
    this.prisma = prisma;
    this.model = model;
  }

  /**
   * Get the Prisma delegate for this model.
   * Uses a single cast point rather than scattering `as unknown as Record` throughout.
   */
  protected get delegate(): // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma delegate types are dynamic per model
    any {
    return (this.prisma as unknown as Record<string, unknown>)[this.model as string];
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    return this.delegate.findUnique({
      where: { id },
    });
  }

  /**
   * Find single entity by conditions
   */
  async findOne(where: Record<string, unknown>): Promise<T | null> {
    return this.delegate.findFirst({
      where,
    });
  }

  /**
   * Find multiple entities with pagination and filtering
   */
  async findMany(options?: FindManyOptions): Promise<T[]> {
    return this.delegate.findMany({
      skip: options?.skip,
      take: options?.take,
      where: options?.where,
      orderBy: options?.orderBy,
      include: options?.include,
    });
  }

  /**
   * Create new entity
   */
  async create(data: Partial<T>): Promise<T> {
    return this.delegate.create({
      data,
    });
  }

  /**
   * Update existing entity
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    return this.delegate.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete entity by ID
   */
  async delete(id: string): Promise<void> {
    await this.delegate.delete({
      where: { id },
    });
  }

  /**
   * Count entities matching conditions
   */
  async count(where?: Record<string, unknown>): Promise<number> {
    return this.delegate.count({
      where,
    });
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.delegate.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Execute transaction
   */
  async transaction<R>(fn: (tx: Prisma.TransactionClient) => Promise<R>): Promise<R> {
    return this.prisma.$transaction(fn);
  }

  /**
   * Soft delete (if entity has deletedAt field)
   */
  async softDelete(id: string): Promise<T> {
    return this.delegate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
