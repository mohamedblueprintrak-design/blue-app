import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';
import { getJwtSecretBytes as _getJwtSecretBytes } from '@/lib/auth/jwt-secret';
import { unauthorizedResponse, forbiddenResponse } from './response';
import { log } from '@/lib/logger';

// Re-export response helpers for convenience in route handlers
export { unauthorizedResponse, forbiddenResponse };

// ============================================
// Security Configuration
// ============================================

// JWT secret is now managed centrally in @/lib/auth/jwt-secret

// Export JWT_SECRET as a function that returns Uint8Array
// This allows lazy evaluation and prevents build-time errors
export function getJWTSecret(): Uint8Array {
  return _getJwtSecretBytes();
}

// JWT verification constants — must match proxy.ts and auth-service.ts
const JWT_ISSUER = 'blueprint-saas';
const JWT_AUDIENCE = 'blueprint-users';

// ============================================
// Auth Context — Defense-in-Depth
// ============================================

/**
 * Auth context extracted from middleware-set headers.
 * The middleware verifies the JWT and forwards user identity via headers.
 * This function provides a second layer of verification in route handlers.
 */
export interface AuthContext {
  userId: string;
  email: string;
  role: string;
  name: string;
  organizationId: string | null;
}

/**
 * Extract auth context from middleware-set headers.
 * Returns null if headers are missing (middleware didn't process the request).
 * 
 * USAGE: Call this at the start of every API route handler:
 *   const ctx = getAuthContext(request);
 *   if (!ctx) return unauthorizedResponse();
 */
export function getAuthContext(request: NextRequest): AuthContext | null {
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  const role = request.headers.get('x-user-role');
  const name = request.headers.get('x-user-name');
  const organizationId = request.headers.get('x-organization-id');

  if (!userId || !email || !role) {
    return null;
  }

  return {
    userId,
    email,
    role,
    name: name ? decodeURIComponent(name) : '',
    organizationId: organizationId || null,
  };
}

/**
 * Require authentication in a route handler.
 * Returns the auth context or an error response.
 * 
 * USAGE:
 *   const auth = requireAuthContext(request);
 *   if ('error' in auth) return auth.error;
 *   // auth.user is now typed as AuthContext
 */
export function requireAuthContext(request: NextRequest): 
  | { user: AuthContext } 
  | { error: NextResponse } {
  const ctx = getAuthContext(request);
  if (!ctx) {
    return { error: unauthorizedResponse() };
  }
  return { user: ctx };
}

/**
 * Build a Prisma where clause that filters by organizationId.
 * For single-tenant setups (no organizationId), returns empty filter.
 * For multi-tenant setups, adds organizationId filter.
 * 
 * USAGE:
 *   const where = { ...userFilters, ...orgFilter(ctx) };
 *   const data = await db.project.findMany({ where });
 */
export function orgFilter(ctx: AuthContext): Record<string, unknown> {
  if (ctx.organizationId) {
    return { organizationId: ctx.organizationId };
  }
  // In multi-tenant mode, users without an organizationId must NOT see cross-tenant data.
  // Using a sentinel value that matches no records prevents data leakage.
  if (process.env.MULTI_TENANT === 'true') {
    return { organizationId: '__DENIED__' };
  }
  // Single-tenant mode: no org filtering applied.
  // INTENTIONAL: In single-tenant deployments, all users belong to one organization
  // and the database contains data for only that org. Returning an empty filter
  // allows all authenticated users to see all data, which is the expected behavior
  // for single-tenant. Multi-tenant isolation is enforced by the branch above.
  return {};
}

/**
 * Get the organizationId for creating new records.
 * In multi-tenant mode, REQUIRES organizationId — returns __DENIED__ sentinel
 * if missing, which will cause a DB constraint error, preventing unscoped records.
 * In single-tenant mode, returns empty (no org scoping).
 *
 * USAGE:
 *   const data = await db.project.create({
 *     data: { ...body, ...orgCreate(ctx), createdById: ctx.userId }
 *   });
 */
export function orgCreate(ctx: AuthContext): { organizationId: string } {
  if (ctx.organizationId) {
    return { organizationId: ctx.organizationId };
  }
  // SECURITY: In multi-tenant mode, records MUST have an organizationId.
  // Without this, created records are invisible to orgFilter() and leak across tenants.
  if (process.env.MULTI_TENANT === 'true') {
    return { organizationId: '__DENIED__' };
  }
  // Return a default org id for single-tenant mode where it is mandatory in schema but we just use 'default'
  return { organizationId: 'default' };
}

/**
 * Build a Prisma where clause for nested org filtering (e.g., through a parent relation).
 * Used when the model itself doesn't have organizationId but its parent does.
 *
 * USAGE:
 *   const where = { ...filters, ...orgFilterNested(ctx, 'project') };
 *   const data = await db.taskComment.findMany({ where });
 */
export function orgFilterNested(ctx: AuthContext, parentRelation: string): Record<string, unknown> {
  if (ctx.organizationId) {
    return { [parentRelation]: { organizationId: ctx.organizationId } };
  }
  if (process.env.MULTI_TENANT === 'true') {
    return { [parentRelation]: { organizationId: '__DENIED__' } };
  }
  return {};
}

/**
 * Verify that a fetched resource belongs to the user's organization.
 * Returns a 403 response if the resource crosses org boundaries.
 * Use this for single-record lookups where orgFilter wasn't applied in the query.
 *
 * USAGE:
 *   const record = await db.invoice.findUnique({ where: { id } });
 *   const orgError = orgCheck(ctx, record);
 *   if (orgError) return orgError;
 */
export function orgCheck(ctx: AuthContext, record: { organizationId?: string | null } | null): NextResponse | null {
  if (!record) return null; // Record not found — let the caller handle 404
  if (process.env.MULTI_TENANT !== 'true') return null; // Single-tenant: no org check needed
  
  // If user has no org, they can only access records that also have no org
  if (!ctx.organizationId) {
    if (!record.organizationId) return null;
    return forbiddenResponse('No organization assigned');
  }
  
  if (record.organizationId && record.organizationId !== ctx.organizationId) {
    return forbiddenResponse('Resource does not belong to your organization');
  }
  return null; // OK — same org or no org on record (legacy)
}

/**
 * Extract JWT token from request headers
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Skip the 'httpOnly' placeholder — real JWT is in the cookie
    if (token === 'httpOnly') {
      const tokenCookie = request.cookies.get('blue_token');
      return tokenCookie?.value || null;
    }
    return token;
  }
  // Fall back to httpOnly cookie
  const tokenCookie = request.cookies.get('blue_token');
  return tokenCookie?.value || null;
}

/**
 * Generate a JWT token for a user
 * Uses 15m expiry — consistent with auth-service.ts and token-utils.ts
 */
export async function generateToken(userId: string): Promise<string> {
  return new jose.SignJWT({ userId, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('blueprint-saas')
    .setAudience('blueprint-users')
    .setExpirationTime('15m')
    .setIssuedAt()
    .sign(getJWTSecret());
}

/**
 * Check if user has admin role
 * Uses toUpperCase() to handle both 'ADMIN' and 'admin' (proxy normalizes to lowercase)
 */
export function isAdmin(role: string): boolean {
  return role?.toUpperCase() === 'ADMIN';
}

/**
 * Check if user has HR role
 * Uses toUpperCase() to handle both 'HR' and 'hr' (proxy normalizes to lowercase)
 */
export function isHR(role: string): boolean {
  return role?.toUpperCase() === 'HR';
}

/**
 * Check if user has accountant role
 * Uses toUpperCase() to handle both 'ACCOUNTANT' and 'accountant' (proxy normalizes to lowercase)
 */
export function isAccountant(role: string): boolean {
  return role?.toUpperCase() === 'ACCOUNTANT';
}

/**
 * Check if user can approve leaves
 */
export function canApproveLeave(role: string): boolean {
  const r = role?.toUpperCase();
  return r === 'ADMIN' || r === 'HR' || r === 'MANAGER';
}

/**
 * Check if user can approve expenses
 */
export function canApproveExpense(role: string): boolean {
  const r = role?.toUpperCase();
  return r === 'ADMIN' || r === 'ACCOUNTANT' || r === 'MANAGER';
}

// ============================================
// RBAC Permission Check for API Routes
// ============================================

import { hasPermission, canAccessFinancials, canAccessHR, isAdmin as isAdminCheck } from '@/lib/auth/modules/authorization';
import { Permission } from '@/lib/auth/types';

/**
 * Require a specific permission for an API route.
 * Returns the auth context if permission granted, or a forbidden response.
 *
 * USAGE:
 *   const result = requirePermission(request, Permission.INVOICE_CREATE);
 *   if ('error' in result) return result.error;
 *   // result.user is now typed as AuthContext
 */
export function requirePermission(
  request: NextRequest,
  permission: Permission
): { user: AuthContext } | { error: NextResponse } {
  const ctx = getAuthContext(request);
  if (!ctx) {
    return { error: unauthorizedResponse() };
  }
  if (!hasPermission(ctx.role, permission)) {
    return { error: forbiddenResponse() };
  }
  return { user: ctx };
}

/**
 * Require admin role for an API route.
 */
export function requireAdmin(
  request: NextRequest
): { user: AuthContext } | { error: NextResponse } {
  const ctx = getAuthContext(request);
  if (!ctx) {
    return { error: unauthorizedResponse() };
  }
  if (!isAdminCheck(ctx.role)) {
    return { error: forbiddenResponse() };
  }
  return { user: ctx };
}

/**
 * Require financial access for an API route.
 */
export function requireFinancialAccess(
  request: NextRequest
): { user: AuthContext } | { error: NextResponse } {
  const ctx = getAuthContext(request);
  if (!ctx) {
    return { error: unauthorizedResponse() };
  }
  if (!canAccessFinancials(ctx.role)) {
    return { error: forbiddenResponse() };
  }
  return { user: ctx };
}

/**
 * Require HR access for an API route.
 */
export function requireHRAccess(
  request: NextRequest
): { user: AuthContext } | { error: NextResponse } {
  const ctx = getAuthContext(request);
  if (!ctx) {
    return { error: unauthorizedResponse() };
  }
  if (!canAccessHR(ctx.role)) {
    return { error: forbiddenResponse() };
  }
  return { user: ctx };
}

// ============================================
// JWT-Re-Verified Auth (Critical Routes)
// ============================================

/**
 * SECURITY FIX: Header Forgery Prevention
 *
 * `getAuthContext()` reads x-user-id / x-user-email / x-user-role from headers
 * set by the proxy after JWT verification. If the proxy is bypassed (e.g., direct
 * access to the Node.js port), an attacker can forge these headers and assume
 * any identity.
 *
 * `requireVerifiedAuth()` provides defense-in-depth for critical routes by:
 *   1. Reading the header-based auth context (fast path)
 *   2. Re-verifying the JWT from the cookie / Authorization header
 *   3. Cross-checking that JWT claims match the x-user-* headers
 *
 * If the headers were forged (claims don't match the JWT), the request is
 * rejected with 401. This makes header forgery ineffective even if the
 * proxy is bypassed.
 *
 * Use this for critical operations: user management, backups, payments,
 * settings, password changes, and any route where identity forgery would
 * cause significant damage.
 *
 * For non-critical read-only routes, `getAuthContext()` / `requirePermission()`
 * remain appropriate for performance reasons.
 */
export async function requireVerifiedAuth(
  request: NextRequest
): Promise<{ user: AuthContext } | { error: NextResponse }> {
  // Step 1: Read header-based auth context
  const ctx = getAuthContext(request);
  if (!ctx) {
    return { error: unauthorizedResponse() };
  }

  // DEMO MODE PROTECTION: Protect core data from modification
  if (process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'development') {
    const method = request.method;
    const path = request.nextUrl.pathname;
    
    // Prevent modification or deletion of users in Demo Mode
    if ((method === 'DELETE' || method === 'PUT') && path.startsWith('/api/users')) {
      return { error: forbiddenResponse('Modification of users is disabled in Demo Mode.') };
    }
    // Prevent deletion of projects in Demo Mode
    if (method === 'DELETE' && path.startsWith('/api/projects')) {
      return { error: forbiddenResponse('Deletion of projects is disabled in Demo Mode.') };
    }
  }

  // Step 2: Extract and verify the JWT
  const token = getTokenFromRequest(request);
  if (!token) {
    // Headers claim auth but no JWT present — likely forged headers
    log.security('requireVerifiedAuth: x-user-* headers present but no JWT token found — possible header forgery', {
      path: request.nextUrl.pathname,
      userId: ctx.userId,
    });
    return { error: unauthorizedResponse() };
  }

  try {
    const { payload } = await jose.jwtVerify(token, getJWTSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    // Step 3: Cross-check JWT claims against x-user-* headers
    const jwtUserId = payload.userId as string;
    const jwtEmail = payload.email as string;
    const jwtRole = payload.role as string;
    const jwtOrganizationId = payload.organizationId as string | null | undefined;

    if (
      jwtUserId !== ctx.userId ||
      jwtEmail !== ctx.email ||
      jwtRole !== ctx.role ||
      jwtOrganizationId !== ctx.organizationId
    ) {
      // JWT claims don't match the headers — headers were likely forged
      log.security('requireVerifiedAuth: JWT claims do not match x-user-* headers — header forgery detected', {
        path: request.nextUrl.pathname,
        headerUserId: ctx.userId,
        jwtUserId,
        headerEmail: ctx.email,
        jwtEmail,
        headerRole: ctx.role,
        jwtRole,
        headerOrganizationId: ctx.organizationId,
        jwtOrganizationId: jwtOrganizationId ?? null,
      });
      return { error: unauthorizedResponse() };
    }

    // Step 4: Check password-changed-after-token-issued
    // If the user changed their password after this token was issued,
    // the token should be considered invalid
    const iat = payload.iat as number | undefined;
    const passwordChangedAt = payload.passwordChangedAt as number | undefined;
    if (iat && passwordChangedAt && passwordChangedAt > iat) {
      return { error: unauthorizedResponse() };
    }

    // Step 5: Reject 2FA-pending tokens
    // A user who has completed only the password step but not the 2FA step
    // has a token with type='2fa-pending'. This token must not grant access
    // to protected routes — the user must complete 2FA verification first.
    const tokenType = payload.type as string | undefined;
    if (tokenType && tokenType !== 'access') {
      log.security('requireVerifiedAuth: Rejected non-access token type', {
        path: request.nextUrl.pathname,
        tokenType,
        userId: ctx.userId,
      });
      return { error: unauthorizedResponse() };
    }

    // JWT is valid and claims match — return verified auth context
    return { user: ctx };
  } catch (error) {
    // JWT verification failed (expired, invalid signature, etc.)
    log.security('requireVerifiedAuth: JWT verification failed — possible forged or expired token', {
      path: request.nextUrl.pathname,
      error: error instanceof Error ? error.message : String(error),
    });
    return { error: unauthorizedResponse() };
  }
}

/**
 * Require a specific permission WITH JWT re-verification for critical routes.
 * Combines `requireVerifiedAuth()` + permission check.
 *
 * Use this instead of `requirePermission()` for routes where identity
 * forgery would be catastrophic (user management, payments, etc.).
 */
export async function requireVerifiedPermission(
  request: NextRequest,
  permission: Permission
): Promise<{ user: AuthContext } | { error: NextResponse }> {
  const result = await requireVerifiedAuth(request);
  if ('error' in result) return result;

  if (!hasPermission(result.user.role, permission)) {
    return { error: forbiddenResponse() };
  }
  return result;
}

/**
 * Require admin role WITH JWT re-verification for critical routes.
 * Use this instead of `requireAdmin()` for admin-only destructive operations.
 */
export async function requireVerifiedAdmin(
  request: NextRequest
): Promise<{ user: AuthContext } | { error: NextResponse }> {
  const result = await requireVerifiedAuth(request);
  if ('error' in result) return result;

  if (!isAdminCheck(result.user.role)) {
    return { error: forbiddenResponse() };
  }
  return result;
}

/**
 * Require financial access WITH JWT re-verification for critical routes.
 * Use this instead of `requireFinancialAccess()` for payment/financial operations.
 */
export async function requireVerifiedFinancialAccess(
  request: NextRequest
): Promise<{ user: AuthContext } | { error: NextResponse }> {
  const result = await requireVerifiedAuth(request);
  if ('error' in result) return result;

  if (!canAccessFinancials(result.user.role)) {
    return { error: forbiddenResponse() };
  }
  return result;
}
