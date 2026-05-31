// @ts-check
/**
 * Redis Cache Service
 * خدمة التخزين المؤقت باستخدام Redis
 */

import { createClient, RedisClientType } from 'redis';
import { log } from '@/lib/logger';

// Redis client instance
let redisClient: RedisClientType | null = null;

// Connection status
let isConnected = false;
let hasFailed = false; // Track if Redis connection has permanently failed

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PREFIX = process.env.REDIS_PREFIX || 'blueprint:';

// Check if Redis should be enabled - only if REDIS_URL is explicitly set
const REDIS_ENABLED = !!process.env.REDIS_URL;

/**
 * Initialize Redis connection
 */
export async function initRedis(): Promise<RedisClientType | null> {
  if (redisClient && isConnected) {
    return redisClient;
  }

  // Skip Redis entirely if not explicitly enabled
  // NOTE: We deliberately do NOT set hasFailed = true here. When Redis is
  // disabled (no REDIS_URL), we simply return null without marking it as
  // permanently failed. This ensures that if REDIS_URL becomes available
  // (e.g., env var change + process restart), the cache will work on the
  // next attempt. Only actual connection errors set hasFailed (with a 60s
  // auto-recovery timer) so that temporary outages are retried.
  if (!REDIS_ENABLED) {
    return null;
  }

  // If Redis has permanently failed, don't retry (saves time on every request)
  // Reset after 60 seconds to allow reconnection if Redis comes back
  if (hasFailed) {
    return null;
  }

  try {
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 3) {
            log.error('[Redis] Connection failed after 3 retries — disabling Redis');
            hasFailed = true;
            // Auto-recover after 60 seconds
            setTimeout(() => { hasFailed = false; }, 60000);
            return new Error('Redis connection failed');
          }
          // Fast backoff
          return Math.min(retries * 50, 500);
        },
        connectTimeout: 2000,
      },
      database: parseInt(process.env.REDIS_DB || '0'),
    });

    redisClient.on('connect', () => {
      isConnected = true;
      hasFailed = false;
      log.info('[Redis] Connected successfully');
    });

    redisClient.on('disconnect', () => {
      isConnected = false;
      log.warn('[Redis] Disconnected');
    });

    redisClient.on('error', (err: Error) => {
      log.error('[Redis] Error:', err);
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    log.error('[Redis] Failed to initialize:', error);
    hasFailed = true;
    // Auto-recover after 60 seconds
    setTimeout(() => { hasFailed = false; }, 60000);
    return null;
  }
}

/**
 * Get Redis client (lazy initialization)
 */
export async function getRedis(): Promise<RedisClientType | null> {
  if (hasFailed) return null;
  if (!redisClient || !isConnected) {
    return initRedis();
  }
  return redisClient;
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return isConnected && redisClient !== null;
}

/**
 * Generate cache key with prefix
 */
function getKey(key: string): string {
  return `${REDIS_PREFIX}${key}`;
}

// ============================================
// Cache Operations
// ============================================

/**
 * Get value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (hasFailed) return null;
  try {
    const client = await getRedis();
    if (!client) return null;

    const value = await client.get(getKey(key));
    if (!value) return null;

    return JSON.parse(value) as T;
  } catch (error) {
    log.error(`[Redis] Cache get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set value in cache
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = 3600 // Default 1 hour
): Promise<boolean> {
  try {
    const client = await getRedis();
    if (!client) return false;

    await client.setEx(
      getKey(key),
      ttlSeconds,
      JSON.stringify(value)
    );
    return true;
  } catch (error) {
    log.error(`[Redis] Cache set error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete value from cache
 */
export async function cacheDelete(key: string): Promise<boolean> {
  try {
    const client = await getRedis();
    if (!client) return false;

    await client.del(getKey(key));
    return true;
  } catch (error) {
    log.error(`[Redis] Cache delete error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete multiple keys matching pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  try {
    const client = await getRedis();
    if (!client) return 0;

    const fullPattern = getKey(pattern);
    let cursor = '0';
    let totalDeleted = 0;

    do {
      const result = await client.scan(cursor, { MATCH: fullPattern, COUNT: 100 });
      const nextCursor = String(result.cursor);
      const keys = result.keys;
      if (keys.length > 0) {
        await client.del(keys);
        totalDeleted += keys.length;
      }
      cursor = nextCursor;
    } while (cursor !== '0');

    return totalDeleted;
  } catch (error) {
    log.error(`[Redis] Cache delete pattern error for ${pattern}:`, error);
    return 0;
  }
}

/**
 * Get or set cache value
 * If Redis is unavailable, just runs the fetch function directly (no caching)
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  // If Redis has permanently failed, skip cache entirely
  if (hasFailed) {
    return fetchFn();
  }

  // Try to get from cache
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  const value = await fetchFn();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

// ============================================
// Rate Limiting
// ============================================

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

// ============================================
// In-Memory Rate Limiting Fallback
// ============================================

const memoryRateLimits = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryRateLimits.entries()) {
    if (value.resetAt <= now) {
      memoryRateLimits.delete(key);
    }
  }
}, 60000);

/**
 * In-memory rate limit fallback when Redis is unavailable.
 * Uses a simple sliding window with Map-based storage.
 * NOTE: This is per-process only — in multi-instance deployments,
 * each instance tracks independently (less accurate but better than nothing).
 */
function inMemoryRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const key = `mem:${identifier}`;
  const now = Date.now();
  const existing = memoryRateLimits.get(key);

  if (!existing || existing.resetAt <= now) {
    // No record or expired window — start fresh
    const resetAt = now + windowSeconds * 1000;
    memoryRateLimits.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetAt: new Date(resetAt),
    };
  }

  // Increment count
  existing.count++;

  if (existing.count > limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: new Date(existing.resetAt),
    };
  }

  return {
    allowed: true,
    limit,
    remaining: limit - existing.count,
    resetAt: new Date(existing.resetAt),
  };
}

/**
 * Rate limit check using Redis
 */
export async function rateLimit(
  identifier: string,
  limit: number = 100,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const client = await getRedis();
  
  if (!client) {
    // Fallback: Use in-memory rate limiter when Redis is unavailable
    return inMemoryRateLimit(identifier, limit, windowSeconds);
  }

  try {
    const current = await client.incr(getKey(key));
    
    // Set expiry on first request
    if (current === 1) {
      await client.expire(getKey(key), windowSeconds);
    }

    const ttl = await client.ttl(getKey(key));
    const resetAt = new Date(Date.now() + ttl * 1000);

    return {
      allowed: current <= limit,
      limit,
      remaining: Math.max(0, limit - current),
      resetAt,
    };
  } catch (error) {
    log.error('[Redis] Rate limit error:', error);
    // Fallback: Use in-memory rate limiter on Redis error
    return inMemoryRateLimit(identifier, limit, windowSeconds);
  }
}

/**
 * Sliding window rate limit
 */
export async function slidingWindowRateLimit(
  identifier: string,
  limit: number = 100,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const key = `ratelimit:sliding:${identifier}`;
  const client = await getRedis();
  
  if (!client) {
    // Fallback: Use in-memory rate limiter when Redis is unavailable
    return inMemoryRateLimit(identifier, limit, windowSeconds);
  }

  try {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Remove old entries
    await client.zRemRangeByScore(getKey(key), 0, windowStart);
    
    // Count current entries
    const count = await client.zCard(getKey(key));
    
    if (count >= limit) {
      const ttl = await client.ttl(getKey(key));
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetAt: new Date(Date.now() + (ttl || windowSeconds) * 1000),
      };
    }

    // Add current request
    await client.zAdd(getKey(key), { score: now, value: `${now}-${Math.random()}` });
    await client.expire(getKey(key), windowSeconds);

    return {
      allowed: true,
      limit,
      remaining: limit - count - 1,
      resetAt: new Date(now + windowSeconds * 1000),
    };
  } catch (error) {
    log.error('[Redis] Sliding window rate limit error:', error);
    // Fallback: Use in-memory rate limiter on Redis error
    return inMemoryRateLimit(identifier, limit, windowSeconds);
  }
}

// ============================================
// Session Storage
// ============================================

interface SessionData {
  userId: string;
  email: string;
  role: string;
  organizationId?: string;
  createdAt: number;
  lastAccessedAt: number;
}

/**
 * Store session in Redis
 */
export async function sessionSet(
  sessionId: string,
  data: SessionData,
  ttlSeconds: number = 86400 // 24 hours
): Promise<boolean> {
  return cacheSet(`session:${sessionId}`, data, ttlSeconds);
}

/**
 * Get session from Redis
 */
export async function sessionGet(sessionId: string): Promise<SessionData | null> {
  return cacheGet<SessionData>(`session:${sessionId}`);
}

/**
 * Delete session from Redis
 */
export async function sessionDelete(sessionId: string): Promise<boolean> {
  return cacheDelete(`session:${sessionId}`);
}

/**
 * Refresh session TTL
 */
export async function sessionRefresh(
  sessionId: string,
  ttlSeconds: number = 86400
): Promise<boolean> {
  const client = await getRedis();
  if (!client) return false;

  try {
    await client.expire(getKey(`session:${sessionId}`), ttlSeconds);
    return true;
  } catch (error) {
    log.error('[Redis] Session refresh error:', error);
    return false;
  }
}

// ============================================
// Query Caching Helpers
// ============================================

/**
 * Cache database query result
 */
export async function cacheQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  ttlSeconds: number = 300 // 5 minutes
): Promise<T> {
  return cacheGetOrSet(`query:${queryKey}`, queryFn, ttlSeconds);
}

/**
 * Invalidate query cache by pattern
 */
export async function invalidateQueryCache(pattern: string = '*'): Promise<number> {
  return cacheDeletePattern(`query:${pattern}`);
}

// ============================================
// Health Check
// ============================================

/**
 * Check Redis health
 */
export async function checkRedisHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
}> {
  try {
    const client = await getRedis();
    if (!client) {
      return {
        status: 'unhealthy',
        error: 'Redis client not initialized',
      };
    }

    const start = Date.now();
    await client.ping();
    const latency = Date.now() - start;

    return {
      status: latency < 100 ? 'healthy' : 'degraded',
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export types
export type { SessionData, RateLimitResult };
