import { PrismaClient } from '@prisma/client'
import { registerShutdownCallback } from './shutdown'

/**
 * Global Prisma singleton — standard Next.js pattern to avoid multiple
 * PrismaClient instances during hot-reloading in development.
 *
 * We extend the globalThis type instead of using `as unknown as` to keep
 * the type system intact while still attaching the prisma instance.
 */
declare global {
  var prisma: PrismaClient | undefined
  var __dbShutdownRegistered: boolean | undefined
  var __dbInitPromise: Promise<void> | undefined
}

const _dbInstance =
  globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : [],
    // SQLite doesn't support connection pooling in the same way as PostgreSQL,
    // but these settings help with graceful shutdown and resource management.
    // For PostgreSQL, add:
    //   datasources: { db: { url: process.env.DATABASE_URL } },
    //   connection_limit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  })

if (process.env.NODE_ENV !== 'production') globalThis.prisma = _dbInstance

/**
 * SQLite foreign-key enforcement — initialization promise.
 *
 * SQLite does NOT enforce foreign keys by default. Without this PRAGMA,
 * `onDelete: Cascade` in the Prisma schema is silently ignored, and orphaned
 * records accumulate.
 *
 * SECURITY/DATA-INTEGRITY FIX (previously fire-and-forget):
 * The PRAGMA is now executed as an awaited Promise at module load time.
 * The promise is exposed via `dbReady` (and the `ensureDbReady()` helper)
 * AND every Prisma operation is automatically gated through `$extends` to
 * await this promise first. This guarantees FK enforcement is active before
 * any query executes, even if a caller fires a query immediately at startup.
 *
 * Note: after the promise resolves once, subsequent `await dbReady` calls
 * are essentially free (single microtask tick).
 */
const _dbInitPromise =
  globalThis.__dbInitPromise ??
  (async () => {
    if (process.env.DATABASE_URL?.startsWith('file:')) {
      try {
        await _dbInstance.$executeRaw`PRAGMA foreign_keys = ON`
        console.info('[db] SQLite foreign key enforcement enabled')
      } catch (err) {
        // Log but don't crash — FK enforcement is a safety net, not a hard requirement
        console.warn('[db] Failed to enable SQLite foreign key enforcement:', err)
      }
    }
  })()

if (process.env.NODE_ENV !== 'production') globalThis.__dbInitPromise = _dbInitPromise

/**
 * Gated Prisma client — every operation automatically awaits `dbReady` first.
 * This makes FK enforcement race-free without requiring callers to remember
 * to await anything.
 *
 * NOTE: The extended client returned by `$extends` is structurally compatible
 * with PrismaClient for all methods used in this codebase ($transaction,
 * model delegates like db.user, db.project, etc.). It omits only `$on` and
 * `$use`, which are not used anywhere. Callers that explicitly type their
 * parameter as `PrismaClient` should cast via `as unknown as PrismaClient`.
 */
export const db = _dbInstance.$extends({
  query: {
    async $allOperations({ args, query }) {
      await _dbInitPromise
      return query(args)
    },
  },
})

/**
 * Promise that resolves once the database is fully initialized
 * (FK PRAGMA applied for SQLite). Useful for tests or startup hooks
 * that need to know initialization is complete.
 */
export const dbReady: Promise<void> = _dbInitPromise

/**
 * Convenience helper — awaits database initialization.
 * Call this from startup hooks or critical write paths if you need
 * explicit ordering guarantees.
 */
export async function ensureDbReady(): Promise<void> {
  await _dbInitPromise
}

/**
 * Graceful shutdown handler — ensures PrismaClient disconnects properly
 * when the Node.js process exits, preventing dangling connections.
 *
 * Uses globalThis flag to prevent duplicate handler registration during
 * Next.js hot-reloading, which would cause MaxListenersExceededWarning.
 */
function setupGracefulShutdown() {
  if (globalThis.__dbShutdownRegistered) return
  globalThis.__dbShutdownRegistered = true

  registerShutdownCallback('Prisma Client Disconnect', async () => {
    console.info('[db] Disconnecting Prisma...')
    try {
      await _dbInstance.$disconnect()
      console.info('[db] Prisma disconnected successfully')
    } catch (err) {
      console.error('[db] Error disconnecting Prisma:', err)
    }
  })
}

setupGracefulShutdown()

/**
 * Check if database is available by running a simple query.
 * This actually tests the connection (unlike the old sync version which
 * only checked if the PrismaClient was initialized).
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await _dbInstance.$queryRaw`SELECT 1`
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
      hasPrevPage: false,
    },
  }
}
