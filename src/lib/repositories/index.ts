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
import { UserRepository } from './user.repository';
import { ProjectRepository } from './project.repository';
import { ClientRepository } from './client.repository';

// Singleton instances for performance
let userRepo: UserRepository | null = null;
let projectRepo: ProjectRepository | null = null;
let clientRepo: ClientRepository | null = null;

/**
 * Get User repository instance (singleton)
 */
export function getUserRepository(): UserRepository {
  if (!userRepo) {
    userRepo = new UserRepository(db);
  }
  return userRepo;
}

/**
 * Get Project repository instance (singleton)
 */
export function getProjectRepository(): ProjectRepository {
  if (!projectRepo) {
    projectRepo = new ProjectRepository(db);
  }
  return projectRepo;
}

/**
 * Get Client repository instance (singleton)
 */
export function getClientRepository(): ClientRepository {
  if (!clientRepo) {
    clientRepo = new ClientRepository(db);
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
