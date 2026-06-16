/**
 * Repositories Index
 * تصدير المستودعات
 * 
 * Centralized exports and singleton management for repositories
 */

// Export types and classes
export { 
  BaseRepository, 
  type IRepository, 
  type FindManyOptions 
} from './base.repository';

export { 
  UserRepository, 
  type UserWithOrganization, 
  type CreateUserData, 
  type UpdateUserData 
} from './user.repository';

export { 
  ProjectRepository, 
  type ProjectWithDetails, 
  type CreateProjectData, 
  type UpdateProjectData 
} from './project.repository';

export { 
  ClientRepository, 
  type ClientWithStats, 
  type CreateClientData, 
  type UpdateClientData 
} from './client.repository';

import { db } from '@/lib/db';
import { PrismaClient } from '@prisma/client';
import { UserRepository } from './user.repository';
import { ProjectRepository } from './project.repository';
import { ClientRepository } from './client.repository';

/**
 * Cast the extended Prisma client (returned by `$extends`) to `PrismaClient`.
 *
 * The extended client is structurally compatible with `PrismaClient` for every
 * method used by the repository layer ($transaction, model delegates like
 * `db.user`, `db.project`). It only omits `$on` and `$use`, which repositories
 * never call. The cast is therefore safe at runtime; it exists solely to
 * satisfy TypeScript because Prisma's extended-client type is not assignable
 * to `PrismaClient` directly.
 */
const prismaClient = db as unknown as PrismaClient;

// Singleton instances for performance
let userRepo: UserRepository | null = null;
let projectRepo: ProjectRepository | null = null;
let clientRepo: ClientRepository | null = null;

/**
 * Get User repository instance (singleton)
 */
export function getUserRepository(): UserRepository {
  if (!userRepo) {
    userRepo = new UserRepository(prismaClient);
  }
  return userRepo;
}

/**
 * Get Project repository instance (singleton)
 */
export function getProjectRepository(): ProjectRepository {
  if (!projectRepo) {
    projectRepo = new ProjectRepository(prismaClient);
  }
  return projectRepo;
}

/**
 * Get Client repository instance (singleton)
 */
export function getClientRepository(): ClientRepository {
  if (!clientRepo) {
    clientRepo = new ClientRepository(prismaClient);
  }
  return clientRepo;
}

/**
 * Reset all repository instances (useful for testing)
 */
export function resetRepositories(): void {
  userRepo = null;
  projectRepo = null;
  clientRepo = null;
}
