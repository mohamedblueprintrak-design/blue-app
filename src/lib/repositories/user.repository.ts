// @ts-check
/**
 * User Repository
 * مستودع المستخدمين
 * 
 * Specialized repository for User entity operations
 */

import { PrismaClient, User } from '@prisma/client';
import { BaseRepository, FindManyOptions } from './base.repository';

/**
 * Extended User type with organization
 */
export interface UserWithOrganization extends User {
  organization?: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    timezone: string;
    locale: string;
  } | null;
}

/**
 * Data transfer object for creating a user
 */
export interface CreateUserData {
  EMAIL: string;
  username: string;
  password: string;
  fullName?: string;
  role?: string;
  organizationId?: string;
}

/**
 * Data transfer object for updating a user
 */
export interface UpdateUserData {
  fullName?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  language?: string;
  theme?: string;
  avatar?: string;
  isActive?: boolean;
  role?: string;
}

/**
 * User Repository
 * Handles all database operations for User entities
 */
export class UserRepository extends BaseRepository<User> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'user');
  }

  /**
   * Find user by email address
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.delegate.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.delegate.findUnique({
      where: { username },
    });
  }

  /**
   * Find user by email or username with organization
   */
  async findByEmailOrUsername(identifier: string): Promise<UserWithOrganization | null> {
    return this.delegate.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier },
        ],
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            currency: true,
            timezone: true,
            locale: true,
          },
        },
      },
    });
  }

  /**
   * Find user by ID with organization details
   */
  async findByIdWithOrganization(id: string): Promise<UserWithOrganization | null> {
    return this.delegate.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            currency: true,
            timezone: true,
            locale: true,
          },
        },
      },
    });
  }

  /**
   * Find all users in an organization
   */
  async findManyByOrganization(
    organizationId: string,
    options?: FindManyOptions
  ): Promise<User[]> {
    return this.delegate.findMany({
      where: { organizationId },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { createdAt: 'desc' },
    });
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.delegate.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Update user's password
   */
  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.delegate.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  /**
   * Mark user's email as verified
   */
  async verifyEmail(id: string): Promise<void> {
    await this.delegate.update({
      where: { id },
      data: { emailVerified: new Date() },
    });
  }

  /**
   * Check if email already exists
   */
  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.delegate.count({
      where: { email: email.toLowerCase() },
    });
    return count > 0;
  }

  /**
   * Check if username already exists
   */
  async existsByUsername(username: string): Promise<boolean> {
    const count = await this.delegate.count({
      where: { username },
    });
    return count > 0;
  }

  /**
   * Find active users in organization
   */
  async findActiveByOrganization(organizationId: string): Promise<User[]> {
    return this.delegate.findMany({
      where: { organizationId, isActive: true },
      orderBy: { fullName: 'asc' },
    });
  }

  /**
   * Count users by role in organization
   */
  async countByRole(organizationId: string): Promise<Record<string, number>> {
    const roleCounts = await this.delegate.groupBy({
      by: ['role'],
      where: { organizationId },
      _count: true,
    });

    const counts: Record<string, number> = {};
    for (const item of roleCounts) {
      counts[item.role] = item._count;
    }

    return counts;
  }
}
