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
 * Minimal interface for Prisma model delegate operations.
 * Constrains the `any` escape hatch to the known CRUD methods
 * that BaseRepository actually calls, while preserving generic return types via T.
 *
 * Includes findUnique, aggregate, and groupBy for subclass use.
 */
interface PrismaModelDelegate<T> {
  findFirst(args?: Record<string, unknown>): Promise<T | null>;
  findUnique(args?: Record<string, unknown>): Promise<T | null>;
  findMany(args?: Record<string, unknown>): Promise<T[]>;
  create(args: Record<string, unknown>): Promise<T>;
  update(args: Record<string, unknown>): Promise<T>;
  delete(args: Record<string, unknown>): Promise<void>;
  count(args?: Record<string, unknown>): Promise<number>;
  aggregate(args?: Record<string, unknown>): Promise<Record<string, unknown>>;
  groupBy(args?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
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
   *
   * The delegate is cast to PrismaModelDelegate<T> instead of raw `any`,
   * constraining it to the known CRUD methods while keeping return types generic via T.
   */
  protected get delegate(): PrismaModelDelegate<T> {
    return (this.prisma as unknown as Record<string, unknown>)[this.model as string] as PrismaModelDelegate<T>;
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    return this.delegate.findFirst({
      where: { id, deletedAt: null },
    });
  }

  /**
   * Find single entity by conditions
   */
  async findOne(where: Record<string, unknown>): Promise<T | null> {
    return this.delegate.findFirst({
      where: { ...where, deletedAt: null },
    });
  }

  /**
   * Find multiple entities with pagination and filtering
   */
  async findMany(options?: FindManyOptions): Promise<T[]> {
    return this.delegate.findMany({
      skip: options?.skip,
      take: options?.take,
      where: { ...options?.where, deletedAt: null },
      orderBy: options?.orderBy,
      include: options?.include,
    });
  }

  /**
   * Find multiple entities including soft-deleted records (for admin use)
   */
  async findManyIncludingDeleted(options?: FindManyOptions): Promise<T[]> {
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
      where: { ...where, deletedAt: null },
    });
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.delegate.count({
      where: { id, deletedAt: null },
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
