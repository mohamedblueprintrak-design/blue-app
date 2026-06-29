import { NextResponse } from 'next/server';

// ============================================
// TypeScript Interfaces and Types
// ============================================

/** Authenticated user type (from demo or database) */
export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  role: string;
  avatar: string | null;
  language: string;
  theme: string;
  organizationId: string | null;
  organization: { id: string; name: string; currency: string } | null;
  isActive?: boolean;
  password?: string;
  department?: string;
}

/** API success response type */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  timestamp?: string;
  requestId?: string;
}

/** API error response type */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  timestamp?: string;
  requestId?: string;
}

/** Combined API response type */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Rate limit store record */
export interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/** Pagination parameters */
export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
}

/** Pagination meta response */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  [key: string]: unknown;
}

// NOTE: The DbClient interface was removed — it was dead code (115 `any` usages,
// not imported by any route). Routes use the actual Prisma client via
// `import { db } from '@/lib/db'` which provides full type safety from
// @prisma/client generated types.

/** Handler context passed to each handler */
export interface HandlerContext {
  user: AuthenticatedUser | null;
  searchParams: URLSearchParams;
  body?: Record<string, unknown>;
}

/** Handler function type for GET requests */
export type GetHandler = (
  context: HandlerContext
) => Promise<NextResponse<ApiSuccessResponse<unknown> | ApiErrorResponse>>;

/** Handler function type for POST requests */
export type PostHandler = (
  context: HandlerContext
) => Promise<NextResponse<ApiSuccessResponse<unknown> | ApiErrorResponse>>;

/** Handler function type for PUT requests */
export type PutHandler = (
  context: HandlerContext
) => Promise<NextResponse<ApiSuccessResponse<unknown> | ApiErrorResponse>>;

/** Handler function type for DELETE requests */
export type DeleteHandler = (
  context: HandlerContext
) => Promise<NextResponse<ApiSuccessResponse<unknown> | ApiErrorResponse>>;

/** Action handlers map for GET */
export type GetActionHandlers = Map<string, GetHandler>;

/** Action handlers map for POST */
export type PostActionHandlers = Map<string, PostHandler>;

/** Action handlers map for PUT */
export type PutActionHandlers = Map<string, PutHandler>;

/** Action handlers map for DELETE */
export type DeleteActionHandlers = Map<string, DeleteHandler>;

/** Rate limit result */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}
