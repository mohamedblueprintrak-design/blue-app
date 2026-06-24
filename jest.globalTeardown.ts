/**
 * Jest Global Teardown
 * Runs once after all test suites complete.
 *
 * Purpose: cleanly disconnect long-lived connections (Prisma, Redis) that would
 * otherwise keep the Jest process alive (open handles), which previously forced
 * us to use `forceExit: true` — masking real resource leaks.
 *
 * With this teardown in place, `forceExit` can be `false` and
 * `detectOpenHandles` can be `true`, so any future leak surfaces as a warning
 * instead of being silently killed.
 */

async function globalTeardown() {
  // Disconnect Prisma client (singleton in src/lib/db.ts via globalThis.prisma)
  try {
    const prisma = (globalThis as { prisma?: { $disconnect: () => Promise<void> } }).prisma;
    if (prisma) {
      await prisma.$disconnect();
    }
  } catch {
    // Ignore — process is exiting anyway
  }

  // Close Redis connections if the redis module was loaded
  try {
    const redis = (globalThis as { __redisClient?: { quit: () => Promise<void> } }).__redisClient;
    if (redis) {
      await redis.quit();
    }
  } catch {
    // Ignore
  }
}

export default globalTeardown;
