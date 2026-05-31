import { PaginationParams, PaginationMeta } from '../types';
import { insensitiveContains } from './db';

// Pagination constants
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const BACKWARD_COMPAT_LIMIT = 100;

/**
 * Parse pagination params from query string
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit');
  const searchParam = searchParams.get('search');
  
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || DEFAULT_PAGE) : DEFAULT_PAGE;
  const limit = limitParam 
    ? Math.min(MAX_LIMIT, Math.max(1, parseInt(limitParam, 10) || DEFAULT_LIMIT))
    : DEFAULT_LIMIT;
  
  return {
    page,
    limit,
    search: searchParam || undefined
  };
}

/**
 * Check if pagination is requested
 */
export function isPaginationRequested(searchParams: URLSearchParams): boolean {
  return searchParams.has('page') || searchParams.has('limit');
}

/**
 * Build pagination meta response
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
}

/**
 * Calculate skip value for pagination
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Get effective limit based on pagination request
 */
export function getEffectiveLimit(
  usePagination: boolean,
  requestedLimit: number
): number {
  return usePagination ? requestedLimit : BACKWARD_COMPAT_LIMIT;
}

/**
 * Build search OR conditions for common fields
 */
export function buildSearchConditions(
  search: string | undefined,
  fields: string[]
): Record<string, unknown>[] | undefined {
  if (!search) return undefined;
  
  return fields.map(field => ({
    [field]: insensitiveContains(search)
  }));
}
