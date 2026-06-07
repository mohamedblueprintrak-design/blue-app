/**
 * Redis Connection Helper for BullMQ
 *
 * Provides a shared Redis connection configuration for all BullMQ queues and workers.
 * Reads connection settings from environment variables (REDIS_URL or individual params).
 */

import { Redis } from 'ioredis';
import { log } from '@/lib/logger';

let sharedConnection: Redis | null = null;

/**
 * Get Redis connection options for BullMQ.
 * BullMQ uses ioredis under the hood, so we return an ioredis-compatible config.
 */
export function getRedisConnectionConfig(): {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: null;
} {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname || 'localhost',
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        db: parseInt(url.pathname.slice(1)) || 0,
        maxRetriesPerRequest: null, // Required by BullMQ
      };
    } catch {
      log.warn('[Queue/Redis] Invalid REDIS_URL, falling back to defaults');
    }
  }

  // No REDIS_URL — fall back to individual env vars
  // In production, require at least REDIS_URL or REDIS_HOST to be set
  const redisHost = process.env.REDIS_HOST || (process.env.NODE_ENV === 'development' ? 'localhost' : '');
  if (!redisHost) {
    throw new Error(
      '[Queue/Redis] No Redis configuration found. Set REDIS_URL or REDIS_HOST environment variable.'
    );
  }

  return {
    host: redisHost,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: null, // Required by BullMQ
  };
}

/**
 * Get or create a shared Redis connection for BullMQ.
 * BullMQ recommends sharing connections across queues/workers
 * in the same process to avoid connection overhead.
 */
export function getSharedRedisConnection(): Redis {
  if (sharedConnection) {
    return sharedConnection;
  }

  const config = getRedisConnectionConfig();

  sharedConnection = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    retryStrategy(times) {
      if (times > 10) {
        log.error('[Queue/Redis] Connection failed after 10 retries — giving up');
        return null; // Stop retrying
      }
      const delay = Math.min(times * 200, 5000);
      log.warn(`[Queue/Redis] Retrying connection in ${delay}ms (attempt ${times})`);
      return delay;
    },
    lazyConnect: true, // Don't connect immediately — connect on first command
  });

  sharedConnection.on('connect', () => {
    log.info('[Queue/Redis] Connected successfully');
  });

  sharedConnection.on('error', (err) => {
    log.error('[Queue/Redis] Connection error:', err);
  });

  sharedConnection.on('close', () => {
    log.warn('[Queue/Redis] Connection closed');
  });

  return sharedConnection;
}

/**
 * Close the shared Redis connection.
 * Call this when gracefully shutting down the process.
 */
export async function closeSharedRedisConnection(): Promise<void> {
  if (sharedConnection) {
    await sharedConnection.quit();
    sharedConnection = null;
    log.info('[Queue/Redis] Shared connection closed');
  }
}
