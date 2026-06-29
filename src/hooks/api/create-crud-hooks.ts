/**
 * Generic CRUD Hook Factory — Blue Edition
 *
 * Adapted from BluePrint's factory to work with Blue's RESTful API paths:
 *   - LIST:   GET  /api/{basePath}
 *   - ONE:    GET  /api/{basePath}/{id}
 *   - CREATE: POST /api/{basePath}
 *   - UPDATE: PUT  /api/{basePath}/{id}
 *   - DELETE: DELETE /api/{basePath}/{id}
 *
 * Uses standard fetch with Blue's existing apiGet/apiPost/apiPut/apiDelete helpers
 * from @/lib/api/fetch-client. No custom auth context dependency.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/fetch-client';
import { useAuthStore } from '@/store/auth-store';

// ── Types ────────────────────────────────────────────────────────────────────

/** Minimal response wrapper returned by Blue API routes */
export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

/** Configuration for the CRUD hook factory */
export interface CrudHooksConfig<_TEntity = unknown> {
  /** REST base path, e.g. '/api/tasks' */
  basePath: string;
  /** TanStack Query cache key (usually the plural entity name, e.g. 'tasks') */
  queryKey: string;
  /** Additional query keys to invalidate on every mutation */
  invalidateKeys?: string[][];
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a standard set of CRUD hooks for a given entity.
 *
 * @example
 * ```ts
 * const taskHooks = createCrudHooks<Task>({
 *   basePath: '/api/tasks',
 *   queryKey: 'tasks',
 *   invalidateKeys: [['dashboard']],
 * });
 *
 * // Use them:
 * const { data } = taskHooks.useAll({ status: 'pending' });
 * const { data } = taskHooks.useOne('task-123');
 * const create = taskHooks.useCreate();
 * ```
 */
export function createCrudHooks<TEntity>(config: CrudHooksConfig<TEntity>) {
  const { basePath, queryKey, invalidateKeys = [] } = config;

  /** Helper: invalidate relevant caches after a successful mutation */
  function invalidateAll(
    queryClient: ReturnType<typeof useQueryClient>,
    extraKeys?: string[][],
  ) {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
    for (const key of invalidateKeys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
    for (const key of extraKeys || []) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  }

  return {
    /**
     * Fetch a paginated / filtered list of entities.
     * GET /api/{basePath}?key=value&...
     */
    useAll: (filters?: Record<string, string | number | boolean | undefined>) => {
      const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

      return useQuery({
        queryKey: [queryKey, JSON.stringify(filters)],
        queryFn: () => apiGet<TEntity[]>(basePath, filters),
        enabled: isAuthenticated,
      });
    },

    /**
     * Fetch a single entity by ID.
     * GET /api/{basePath}/{id}
     */
    useOne: (id: string | null) => {
      const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

      return useQuery({
        queryKey: [queryKey, id],
        queryFn: () => apiGet<TEntity>(`${basePath}/${id}`),
        enabled: isAuthenticated && !!id,
      });
    },

    /**
     * Create a new entity.
     * POST /api/{basePath}
     */
    useCreate: (options?: { invalidateExtra?: string[][] }) => {
      const queryClient = useQueryClient();

      return useMutation({
        mutationFn: (data: Partial<TEntity>) =>
          apiPost<TEntity>(basePath, data as Record<string, unknown>),
        onSuccess: () => invalidateAll(queryClient, options?.invalidateExtra),
      });
    },

    /**
     * Update an existing entity.
     * PUT /api/{basePath}/{id}
     */
    useUpdate: (options?: { invalidateExtra?: string[][] }) => {
      const queryClient = useQueryClient();

      return useMutation({
        mutationFn: (variables: { id: string } & Partial<TEntity>) =>
          apiPut<TEntity>(
            `${basePath}/${variables.id}`,
            variables as Record<string, unknown>,
          ),
        onSuccess: (_data, variables) => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
          queryClient.invalidateQueries({ queryKey: [queryKey, variables.id] });
          for (const key of invalidateKeys) {
            queryClient.invalidateQueries({ queryKey: key });
          }
          for (const key of options?.invalidateExtra || []) {
            queryClient.invalidateQueries({ queryKey: key });
          }
        },
      });
    },

    /**
     * Delete an entity by ID.
     * DELETE /api/{basePath}/{id}
     */
    useDelete: (options?: { invalidateExtra?: string[][] }) => {
      const queryClient = useQueryClient();

      return useMutation({
        mutationFn: (id: string) =>
          apiDelete<TEntity>(`${basePath}/${id}`),
        onSuccess: () => invalidateAll(queryClient, options?.invalidateExtra),
      });
    },
  };
}
