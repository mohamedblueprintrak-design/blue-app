/**
 * Redis-based Rate Limiter — محدد معدل الطلبات باستخدام Redis
 * 
 * This is a production-ready rate limiter that:
 * - Uses Redis for distributed rate limiting
 * - Falls back to in-memory when Redis is not available
 * - Supports multiple rate limit windows
 * - Provides sliding window algorithm
 */

import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { log } from '@/lib/logger';

// ============================================
// Types
// ============================================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// ============================================
// Redis Client Singleton
// ============================================

let redisClient: RedisClientType | null = null;
let redisConnectionPromise: Promise<void> | null = null;

async function getRedisClient(): Promise<RedisClientType | null> {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  if (redisConnectionPromise) {
    await redisConnectionPromise;
    return redisClient;
  }

  redisConnectionPromise = (async () => {
    try {
      redisClient = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries: number) => {
            if (retries > 10) {
              log.error('[RateLimiter] Redis connection failed after 10 retries');
              return new Error('Redis connection failed');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      redisClient.on('error', (err: Error) => {
        log.error('[RateLimiter] Redis client error:', err);
      });

      await redisClient.connect();
      log.info('[RateLimiter] Redis rate limiter connected');
    } catch (error) {
      log.error('[RateLimiter] Failed to connect to Redis:', error);
      redisClient = null;
    }
  })();

  await redisConnectionPromise;
  return redisClient;
}

// ============================================
// In-Memory Fallback
// ============================================

interface MemoryRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, MemoryRecord>();

/** Timestamp of the last in-memory store cleanup pass */
let lastMemoryCleanup = Date.now();

/**
 * Remove expired entries from the in-memory fallback store to prevent unbounded memory growth.
 * Runs at most once every 60 seconds.
 */
function cleanupMemoryStore(): void {
  const now = Date.now();
  if (now - lastMemoryCleanup < 60_000) return;
  lastMemoryCleanup = now;
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetTime) {
      memoryStore.delete(key);
    }
  }
}

function checkMemoryRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupMemoryStore();
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetTime) {
    memoryStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

// ============================================
// Redis Rate Limiting (Sliding Window)
// ============================================

async function checkRedisRateLimit(
  client: RedisClientType,
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Use Lua script for atomic sliding window operation
  const luaScript = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local windowStart = tonumber(ARGV[2])
    local maxRequests = tonumber(ARGV[3])
    local windowMs = tonumber(ARGV[4])
    
    -- Remove old entries
    redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
    
    -- Get current count
    local count = redis.call('ZCARD', key)
    
    if count >= maxRequests then
      return {0, count, redis.call('ZSCORE', key, redis.call('ZRANGE', key, 0, 0)[1]) or now}
    end
    
    -- Add new entry with unique member using ARGV[5] to avoid math.random() collisions
    redis.call('ZADD', key, now, now .. ':' .. ARGV[5])
    redis.call('PEXPIRE', key, windowMs)
    
    return {1, count + 1, now + windowMs}
  `;

  try {
    const result = await client.eval(luaScript, {
      keys: [key],
      arguments: [now.toString(), windowStart.toString(), config.maxRequests.toString(), config.windowMs.toString(), crypto.randomUUID()],
    }) as [number, number, number];

    const [allowed, count, resetTime] = result;

    return {
      allowed: allowed === 1,
      remaining: Math.max(0, config.maxRequests - count),
      resetTime,
      retryAfter: allowed === 0 ? Math.ceil((resetTime - now) / 1000) : undefined,
    };
  } catch (error) {
    log.error('[RateLimiter] Redis rate limit error:', error);
    // Fallback to memory
    return checkMemoryRateLimit(key, config);
  }
}

// ============================================
// Main Rate Limiter Class
// ============================================

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: 'ratelimit',
      ...config,
    };
  }

  /**
   * Check rate limit for a given identifier
   * @param identifier - Usually IP address or user ID
   * @returns Rate limit result
   */
  async check(identifier: string): Promise<RateLimitResult> {
    const key = `${this.config.keyPrefix}:${identifier}`;

    // Try Redis first
    const client = await getRedisClient();
    if (client) {
      return checkRedisRateLimit(client, key, this.config);
    }

    // Fallback to in-memory
    return checkMemoryRateLimit(key, this.config);
  }

  /**
   * Reset rate limit for a given identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = `${this.config.keyPrefix}:${identifier}`;

    const client = await getRedisClient();
    if (client) {
      await client.del(key);
    } else {
      memoryStore.delete(key);
    }
  }

  /**
   * Get remaining requests for a given identifier
   */
  async getRemaining(identifier: string): Promise<number> {
    const result = await this.check(identifier);
    return result.remaining;
  }
}

// ============================================
// Pre-configured Rate Limiters
// ============================================

// In development/demo mode, use a more generous rate limit to avoid blocking
// legitimate testing and demo usage. In production, these limits are enforced strictly.
const isDev = process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true';

export const rateLimiters = {
  /**
   * Auth rate limiter: 30 req/min in dev/demo, 10 req/min in production
   * Used for login, signup, password reset
   */
  auth: new RateLimiter({
    maxRequests: isDev ? 60 : 10,
    windowMs: 60000,
    keyPrefix: 'auth',
  }),

  /**
   * API rate limiter: 300 req/min in dev/demo, 100 req/min in production
   * General API endpoints
   */
  api: new RateLimiter({
    maxRequests: isDev ? 300 : 100,
    windowMs: 60000,
    keyPrefix: 'api',
  }),

  /**
   * Public rate limiter: 200 requests per minute
   * Used for public endpoints like webhooks, health checks
   */
  public: new RateLimiter({
    maxRequests: 200,
    windowMs: 60000,
    keyPrefix: 'public',
  }),

  /**
   * Public form rate limiter: 10 requests per minute
   * Used for public form submissions (quote requests, contact forms)
   */
  publicForm: new RateLimiter({
    maxRequests: 10,
    windowMs: 60000,
    keyPrefix: 'publicform',
  }),

  /**
   * Strict rate limiter: 30 req/min in dev/demo, 5 req/min in production
   * Used for sensitive operations
   */
  strict: new RateLimiter({
    maxRequests: isDev ? 30 : 5,
    windowMs: 60000,
    keyPrefix: 'strict',
  }),

  /**
   * Password reset rate limiter: 3 requests per hour
   */
  passwordReset: new RateLimiter({
    maxRequests: 3,
    windowMs: 3600000, // 1 hour
    keyPrefix: 'pwdreset',
  }),

  /**
   * Email verification rate limiter: 5 requests per hour
   */
  emailVerification: new RateLimiter({
    maxRequests: 5,
    windowMs: 3600000, // 1 hour
    keyPrefix: 'emailverify',
  }),

  /**
   * AI rate limiter: 10 requests per minute
   * Used for AI chat, image analysis, document analysis
   */
  ai: new RateLimiter({
    maxRequests: 10,
    windowMs: 60000,
    keyPrefix: 'ai',
  }),

  /**
   * Export rate limiter: 10 requests per minute
   * Used for PDF/Excel report generation and exports
   */
  export: new RateLimiter({
    maxRequests: 10,
    windowMs: 60000,
    keyPrefix: 'export',
  }),
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get client IP from request headers
 * 
 * Accepts either:
 * - A Headers object
 * - A Request-like object with a headers property
 *
 * SECURITY NOTE: In production with a trusted proxy, only the rightmost IP in
 * X-Forwarded-For (the one appended by the trusted proxy) should be trusted.
 * This sanitization is a baseline defense; configure TRUSTED_PROXY_IPS for full protection.
 */
export function getClientIP(headersOrRequest: Headers | { headers: Headers }): string {
  const ipRegex = /^[0-9a-fA-F.:]+$/;
  const maxIPLength = 45; // Max IPv6 address length

  function sanitize(ip: string): string {
    const cleaned = ip.trim();
    if (cleaned.length > maxIPLength || !ipRegex.test(cleaned)) return 'unknown';
    return cleaned;
  }

  // Extract headers from either Headers object or Request-like object
  const headers = 'headers' in headersOrRequest ? headersOrRequest.headers : headersOrRequest;

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // SECURITY: Trust rightmost IP in X-Forwarded-For (appended by the trusted proxy).
    // The leftmost IP can be spoofed by the client.
    const parts = forwarded.split(',');
    const candidate = parts[parts.length - 1].trim();
    const sanitized = sanitize(candidate);
    if (sanitized !== 'unknown') return sanitized;
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    const sanitized = sanitize(realIP);
    if (sanitized !== 'unknown') return sanitized;
  }

  const cfIP = headers.get('cf-connecting-ip');
  if (cfIP) {
    const sanitized = sanitize(cfIP);
    if (sanitized !== 'unknown') return sanitized;
  }

  return 'unknown';
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  type: 'auth' | 'api' | 'public' | 'publicForm' | 'strict' | 'passwordReset' | 'emailVerification' | 'ai' | 'export',
  language: 'ar' | 'en' = 'ar'
): Response {
  const messages: Record<string, Record<string, string>> = {
    auth: {
      ar: 'عدد محاولات تسجيل الدخول تجاوز الحد المسموح. يرجى المحاولة بعد دقيقة.',
      en: 'Too many login attempts. Please try again later.',
    },
    api: {
      ar: 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً.',
      en: 'Rate limit exceeded. Please try again later.',
    },
    public: {
      ar: 'تم تجاوز الحد المسموح من الطلبات العامة. يرجى المحاولة لاحقاً.',
      en: 'Public endpoint rate limit exceeded. Please try again later.',
    },
    publicForm: {
      ar: 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة بعد دقيقة.',
      en: 'Too many form submissions. Please try again in a minute.',
    },
    strict: {
      ar: 'تم تجاوز الحد المسموح من العمليات الحساسة. يرجى الانتظار.',
      en: 'Too many sensitive operations. Please wait.',
    },
    passwordReset: {
      ar: 'تم تجاوز الحد المسموح من طلبات إعادة تعيين كلمة المرور. يرجى المحاولة بعد ساعة.',
      en: 'Too many password reset requests. Please try again in an hour.',
    },
    emailVerification: {
      ar: 'تم تجاوز الحد المسموح من طلبات التحقق. يرجى المحاولة لاحقاً.',
      en: 'Too many verification requests. Please try again later.',
    },
    ai: {
      ar: 'تم تجاوز الحد المسموح من طلبات الذكاء الاصطناعي. يرجى المحاولة لاحقاً.',
      en: 'Too many AI requests. Please try again later.',
    },
    export: {
      ar: 'تم تجاوز الحد المسموح من طلبات التصدير. يرجى المحاولة لاحقاً.',
      en: 'Too many export requests. Please try again later.',
    },
  };

  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: messages[type]?.[language] || messages.api[language],
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': result.retryAfter?.toString() || '60',
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toString(),
      },
    }
  );
}

// Export singleton instance getter
export async function getRedisRateLimiter(): Promise<RedisClientType | null> {
  return getRedisClient();
}
