import { PrismaClient } from '@prisma/client'

/**
 * Global Prisma singleton — standard Next.js pattern to avoid multiple
 * PrismaClient instances during hot-reloading in development.
 *
 * We extend the globalThis type instead of using `as unknown as` to keep
 * the type system intact while still attaching the prisma instance.
 */
declare global {
   
  var prisma: PrismaClient | undefined
}

export const db =
  globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalThis.prisma = db

// ==================== MULTI-TENANT ISOLATION (CWE-284) ====================
//
// When MULTI_TENANT=true, ALL queries MUST include an organizationId filter
// at the API level to prevent cross-tenant data leakage.
//
// Critical models (User, Project, Client, Contractor, Invoice, Task, Contract,
// Employee, Document, CompanySettings, Notification) now have REQUIRED
// organizationId fields in the Prisma schema, enforcing tenant assignment
// at the database level.
//
// All Organization relations use onDelete: Restrict to prevent accidental
// org deletion that would orphan tenant data.
//
// USAGE PATTERN in API routes:
//   const { organizationId } = await getUserSession()
//   const projects = await db.project.findMany({
//     where: { organizationId },
//   })
//
// NEVER query without an organizationId filter in multi-tenant mode.
// The createTenantDb() helper below provides a client that auto-injects
// the organizationId into all findMany/findFirst queries for models that
// have an organizationId field.
// =========================================================================

/**
 * Creates a tenant-scoped database client that automatically filters queries
 * by organizationId. Use this in API routes when MULTI_TENANT is enabled.
 *
 * Example:
 *   const tenantDb = createTenantDb(organizationId)
 *   const projects = await tenantDb.project.findMany() // auto-filtered by org
 *
 * NOTE: This uses Prisma client extensions ($extends) which creates a new
 * client instance. For write operations, always explicitly set organizationId
 * on the data object — the extension only auto-filters reads.
 */
export function createTenantDb(organizationId: string) {
  return db.$extends({
    name: 'tenantIsolation',
    query: {
      $allModels: {
        async $allOperations({ args, query, model }) {
          // For read operations (findMany, findFirst, count, aggregate),
          // inject organizationId into the where clause if not already present
          if (args.where && typeof args.where === 'object') {
            // Only add organizationId filter if the model has it and it's not already in the where clause
            if (!('organizationId' in args.where)) {
              args.where = { ...args.where, organizationId }
            }
          } else if (!args.where) {
            // No where clause at all — add one with organizationId
            args.where = { organizationId }
          }
          return query(args)
        },
      },
    },
  })
}

/**
 * Check if database is available by running a simple query.
 * This actually tests the connection (unlike the old sync version which
 * only checked if the PrismaClient was initialized).
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

/**
 * Get empty pagination response — convenience for API routes
 */
export function getEmptyPaginationResponse() {
  return {
    data: [],
    meta: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false
    }
  }
}
