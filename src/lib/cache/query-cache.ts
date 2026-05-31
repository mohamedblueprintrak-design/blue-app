/**
 * Query Cache Integration
 * ربط التخزين المؤقت مع استعلامات قاعدة البيانات
 * 
 * Provides a simple API to cache database query results.
 * Falls back to in-memory cache when Redis is not available.
 * 
 * Usage:
 *   import { cachedQuery, invalidateCache } from '@/lib/cache/query-cache';
 *   
 *   // Cache a database query (5 min TTL)
 *   const data = await cachedQuery(
 *     'projects:list:org123:page1',
 *     () => prisma.project.findMany({ ... }),
 *     300
 *   );
 *   
 *   // Invalidate cache when data changes
 *   await invalidateCache('projects');
 */

import { getCacheManager } from './cache-manager';
import { log } from '@/lib/logger';

// ============================================
// Cache Configuration
// ============================================

/** Default TTL values for different data types (in seconds) */
export const CACHE_TTL = {
  /** Projects list - changes frequently */
  PROJECTS: 120,         // 2 minutes
  /** Single project details */
  PROJECT: 180,          // 3 minutes
  /** Clients list - relatively stable */
  CLIENTS: 300,          // 5 minutes
  /** Tasks list - changes frequently */
  TASKS: 90,             // 1.5 minutes
  /** Invoices list - financial data */
  INVOICES: 120,         // 2 minutes
  /** Reports/dashboard - aggregated data */
  REPORTS: 300,          // 5 minutes
  /** BOQ items */
  BOQ: 180,              // 3 minutes
  /** Site reports/diary */
  SITE_REPORTS: 120,     // 2 minutes
  /** Defects */
  DEFECTS: 180,          // 3 minutes
  /** Contracts */
  CONTRACTS: 300,        // 5 minutes
  /** Team members */
  TEAM: 600,             // 10 minutes
  /** General lookups (e.g., dropdowns) */
  LOOKUP: 900,           // 15 minutes
  /** Default for unclassified queries */
  DEFAULT: 180,          // 3 minutes
} as const;

// Cache key prefix to avoid collisions
const CACHE_PREFIX = 'bp:query:';

// ============================================
// Core Functions
// ============================================

/**
 * Execute a database query with caching.
 * If the result is in cache, returns it immediately.
 * Otherwise, executes the query and caches the result.
 * 
 * @param key - Unique cache key (will be prefixed automatically)
 * @param queryFn - Function that returns the data to cache
 * @param ttlSeconds - Time to live in seconds (default: 180)
 * @returns The cached or freshly queried data
 * 
 * @example
 * // Cache project list for 2 minutes
 * const projects = await cachedQuery(
 *   `projects:list:${orgId}:p${page}:s${status}`,
 *   () => prisma.project.findMany({ where: { organizationId: orgId } }),
 *   CACHE_TTL.PROJECTS
 * );
 */
export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL.DEFAULT
): Promise<T> {
  try {
    const cacheManager = getCacheManager();
    const cacheKey = `${CACHE_PREFIX}${key}`;
    
    // Try to get from cache first
    const cached = await cacheManager.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    // Execute query and cache result
    const result = await queryFn();
    await cacheManager.set(cacheKey, result, { ttl: ttlSeconds });
    
    return result;
  } catch (error) {
    // On any cache error, execute the query directly (fail-open)
    log.error(`[Cache] Error for key "${key}", falling back to direct query:`, error);
    return queryFn();
  }
}

/**
 * Invalidate cache entries matching a pattern.
 * Use this after any data modification (create/update/delete).
 * 
 * @param entity - The entity type to invalidate (e.g., 'projects', 'clients')
 * 
 * @example
 * // After creating a project, invalidate all project caches
 * await invalidateCache('projects');
 * 
 * // After updating a task, invalidate task and project caches
 * await invalidateCache('tasks', 'projects');
 */
export async function invalidateCache(...entities: string[]): Promise<void> {
  const cacheManager = getCacheManager();
  
  const promises = entities.map(entity => 
    cacheManager.invalidate(`${CACHE_PREFIX}${entity}:*`)
  );
  
  try {
    await Promise.allSettled(promises);
  } catch (error) {
    // Cache invalidation failure is non-critical
    log.warn('[Cache] Invalidation warning:', { error });
  }
}

/**
 * Build a standardized cache key from parts.
 * Ensures consistent key formatting across the app.
 * 
 * @param parts - Key segments to join
 * @returns A normalized cache key string
 * 
 * @example
 * buildCacheKey('projects', 'list', orgId, 'page', page)
 * // => "projects:list:org123:page:1"
 */
export function buildCacheKey(...parts: string[]): string {
  return parts.join(':');
}
