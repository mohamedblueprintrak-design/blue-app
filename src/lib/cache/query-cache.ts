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
  /** Users/employees list */
  USERS: 300,            // 5 minutes
  /** Payments list - financial data */
  PAYMENTS: 120,         // 2 minutes
  /** Proposals/quotes */
  PROPOSALS: 180,        // 3 minutes
  /** Budget data */
  BUDGETS: 180,          // 3 minutes
  /** Change orders */
  CHANGE_ORDERS: 180,    // 3 minutes
  /** Purchase orders */
  PURCHASE_ORDERS: 180,  // 3 minutes
  /** RFI (Requests for Information) */
  RFI: 180,              // 3 minutes
  /** Site diary entries */
  SITE_DIARY: 120,       // 2 minutes
  /** Inspections */
  INSPECTIONS: 180,      // 3 minutes
  /** Progress claims */
  PROGRESS_CLAIMS: 180,  // 3 minutes
  /** Recurring invoices */
  RECURRING_INVOICES: 300, // 5 minutes
  /** Guarantee letters */
  GUARANTEE_LETTERS: 300,  // 5 minutes
  /** Transmittals */
  TRANSMITTALS: 300,     // 5 minutes
  /** Tenders */
  TENDERS: 300,          // 5 minutes
  /** Notifications */
  NOTIFICATIONS: 60,     // 1 minute (real-time feel)
  /** Feature flags - rarely change */
  FEATURE_FLAGS: 1800,   // 30 minutes
  /** Dashboard layout/presets */
  DASHBOARD_CONFIG: 600, // 10 minutes
  /** Activity log */
  ACTIVITY_LOG: 120,     // 2 minutes
  /** Timesheets */
  TIMESHEETS: 180,       // 3 minutes
  /** Leave requests */
  LEAVE: 180,            // 3 minutes
  /** Attendance */
  ATTENDANCE: 60,        // 1 minute (real-time)
  /** Contractors */
  CONTRACTORS: 300,      // 5 minutes
  /** Design drawings/phases */
  DESIGN: 300,           // 5 minutes
  /** Violations */
  VIOLATIONS: 180,       // 3 minutes
  /** Commissions */
  COMMISSIONS: 180,      // 3 minutes
  /** Meetings */
  MEETINGS: 180,         // 3 minutes
  /** Retainage */
  RETAINAGE: 180,        // 3 minutes
  /** Marketing campaigns */
  MARKETING: 300,        // 5 minutes
  /** Referrals */
  REFERRALS: 300,        // 5 minutes
  /** Gantt chart data */
  GANTT: 120,            // 2 minutes
  /** Project assignments */
  ASSIGNMENTS: 180,      // 3 minutes
  /** Company settings - rarely change */
  SETTINGS: 1800,        // 30 minutes
  /** Currency settings - rarely change */
  CURRENCY: 1800,        // 30 minutes
  /** Approvals */
  APPROVALS: 120,        // 2 minutes
  /** Workflow templates */
  WORKFLOW_TEMPLATES: 600, // 10 minutes
  /** Report builder */
  REPORT_BUILDER: 300,   // 5 minutes
  /** Automations */
  AUTOMATIONS: 300,      // 5 minutes
  /** Webhooks */
  WEBHOOKS: 300,         // 5 minutes
  /** Project templates */
  PROJECT_TEMPLATES: 600, // 10 minutes
  /** Municipality correspondence */
  MUNICIPALITY: 300,     // 5 minutes
  /** Supervision checklists */
  SUPERVISION: 300,      // 5 minutes
  /** Auto-assignment rules */
  AUTO_ASSIGNMENT: 300,  // 5 minutes
  /** Suppliers */
  SUPPLIERS: 300,        // 5 minutes
  /** Inventory */
  INVENTORY: 180,        // 3 minutes
  /** Equipment */
  EQUIPMENT: 180,        // 3 minutes
  /** Submittals */
  SUBMITTALS: 180,       // 3 minutes
  /** Knowledge base */
  KNOWLEDGE: 300,        // 5 minutes
  /** Risks */
  RISKS: 180,            // 3 minutes
  /** Site visits */
  SITE_VISITS: 180,      // 3 minutes
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

/**
 * Reusable cache wrapper utility for API route handlers.
 * Wraps an async data-fetching function with Redis caching and graceful fallback.
 * 
 * - If Redis is available, caches the result with the given key and TTL.
 * - If Redis is unavailable, falls through to the fetcher (fail-open).
 * - Always includes organizationId in cache keys for multi-tenant isolation.
 * 
 * @param key - Cache key (should include organizationId for multi-tenant safety)
 * @param fetcher - Async function that fetches the data
 * @param ttlSeconds - Time-to-live in seconds (default: CACHE_TTL.DEFAULT = 180)
 * @returns The cached or freshly fetched data
 * 
 * @example
 * // In an API route:
 * const data = await withCache(
 *   `invoices:list:${orgId}:p${page}:s${status}`,
 *   () => db.invoice.findMany({ where: { organizationId: orgId } }),
 *   CACHE_TTL.INVOICES
 * );
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL.DEFAULT
): Promise<T> {
  return cachedQuery(key, fetcher, ttlSeconds);
}

/**
 * Invalidate cache for one or more entity types, plus optionally the dashboard.
 * This is a convenience wrapper that also invalidates related caches.
 * 
 * @param entities - Entity types to invalidate (e.g., 'invoices', 'projects')
 * @param relatedEntities - Optional additional entity types (e.g., 'dashboard' when invoice changes)
 * 
 * @example
 * // After creating an invoice, invalidate invoices and dashboard caches
 * await invalidateEntityCache('invoices', 'dashboard');
 */
export async function invalidateEntityCache(
  entities: string[],
  ...relatedEntities: string[]
): Promise<void> {
  await invalidateCache(...entities, ...relatedEntities);
}
