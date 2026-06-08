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
    // SQLite doesn't support connection pooling in the same way as PostgreSQL,
    // but these settings help with graceful shutdown and resource management.
    // For PostgreSQL, add:
    //   datasources: { db: { url: process.env.DATABASE_URL } },
    //   connection_limit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  })

if (process.env.NODE_ENV !== 'production') globalThis.prisma = db

/**
 * Enable SQLite foreign key enforcement.
 * SQLite does NOT enforce foreign keys by default — this means onDelete: Cascade
 * in the Prisma schema is silently ignored, and orphaned records accumulate.
 * Enabling this PRAGMA ensures cascading deletes work and prevents data inconsistency.
 */
if (process.env.DATABASE_URL?.startsWith('file:')) {
  db.$executeRawUnsafe('PRAGMA foreign_keys = ON').catch((err) => {
    // Log but don't crash — FK enforcement is a safety net, not a hard requirement
    console.warn('[db] Failed to enable SQLite foreign key enforcement:', err);
  });
}

/**
 * Graceful shutdown handler — ensures PrismaClient disconnects properly
 * when the Node.js process exits, preventing dangling connections.
 *
 * FIX: Register in BOTH development and production.
 * Previously only registered in production, which meant dangling SQLite
 * connections and WAL lock issues during development restarts.
 */
let shutdownHandlersRegistered = false;

function setupGracefulShutdown() {
  if (shutdownHandlersRegistered) return;
  shutdownHandlersRegistered = true;

  const shutdown = async (signal: string) => {
    console.info(`[db] Received ${signal}, disconnecting Prisma...`)
    try {
      await db.$disconnect()
      console.info('[db] Prisma disconnected successfully')
    } catch (err) {
      console.error('[db] Error disconnecting Prisma:', err)
    }
    process.exit(0)
  }

  // Register in ALL environments (dev + production)
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

setupGracefulShutdown()

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
