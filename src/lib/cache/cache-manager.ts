// @ts-check
import { log } from '@/lib/logger';

/**
 * @module cache-manager
 * @description Production Redis cache manager for the BluePrint SaaS platform.
 * Provides a robust caching layer with Redis backing, graceful in-memory fallback,
 * cache tags/groups for bulk invalidation, namespaced keys, and cache statistics.
 *
 * @example
 * ```typescript
 * import { cacheManager, projectCache } from '@/lib/cache/cache-manager';
 *
 * // Direct usage
 * await cacheManager.set('key', { data: 'value' }, 3600);
 * const data = await cacheManager.get<{ data: string }>('key');
 *
 * // Feature-specific namespace
 * await projectCache.set('project-123', projectData);
 * await projectCache.invalidateAll(); // Clears all project-related cache
 * ```
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Cache entry stored in memory fallback */
interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  tags: string[];
}


/** Statistics about cache operations */
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  totalKeys: number;
  memoryEntries: number;
}

/** Configuration options for the CacheManager */
export interface CacheManagerConfig {
  /** Redis connection URL (e.g. redis://localhost:6379) */
  redisUrl?: string;
  /** Default TTL in seconds (default: 300 = 5 minutes) */
  defaultTtl?: number;
  /** Application key prefix (default: 'blueprint') */
  keyPrefix?: string;
  /** Whether to use in-memory fallback when Redis is unavailable (default: true) */
  enableFallback?: boolean;
  /** Maximum number of entries in memory cache (default: 10000) */
  maxMemoryEntries?: number;
}

/** Options for cache set operations */
export interface CacheSetOptions {
  /** TTL in seconds. Overrides the default TTL */
  ttl?: number;
  /** Tags for grouping cache entries. Used for bulk invalidation */
  tags?: string[];
}

/** A namespaced cache interface for feature-specific caching */
export interface CacheNamespace<T = unknown> {
  /** Get a value from the namespace cache */
  get(key: string): Promise<T | null>;
  /** Set a value in the namespace cache */
  set(key: string, value: T, ttl?: number): Promise<void>;
  /** Delete a specific key */
  delete(key: string): Promise<boolean>;
  /** Check if a key exists */
  exists(key: string): Promise<boolean>;
  /** Invalidate all cache entries in this namespace */
  invalidateAll(): Promise<number>;
  /** Get the namespace prefix string */
  readonly prefix: string;
}

// ─── In-Memory Cache ────────────────────────────────────────────────────────

/**
 * Simple in-memory cache used as a fallback when Redis is unavailable.
 * Supports TTL expiration and tag-based invalidation.
 */
class InMemoryCache {
  private store = new Map<string, CacheEntry>();
  private maxEntries: number;

  constructor(maxEntries: number = 10000) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number, tags: string[] = []): void {
    // Evict oldest entries if at capacity
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tags,
    });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /** Invalidate all entries matching given tags */
  invalidateByTags(tags: string[]): number {
    let count = 0;
    for (const [key, entry] of this.store) {
      if (entry.tags.some((tag) => tags.includes(tag))) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /** Invalidate all entries matching a key pattern (glob-style) */
  invalidateByPattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  exists(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  get size(): number {
    this.cleanup();
    return this.store.size;
  }

  /** Remove all expired entries */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// ─── Cache Manager ───────────────────────────────────────────────────────────

/**
 * Production Redis cache manager with graceful in-memory fallback.
 *
 * Features:
 * - Generic get/set/delete with JSON serialization
 * - TTL management with configurable defaults
 * - Cache tags/groups for bulk invalidation
 * - Namespaced keys: `blueprint:{feature}:{id}`
 * - Cache statistics (hits, misses, hit rate)
 * - Automatic fallback to in-memory cache when Redis is down
 * - Cache warming utility
 *
 * @example
 * ```typescript
 * const cache = new CacheManager({ redisUrl: 'redis://localhost:6379' });
 * await cache.set('projects:list', projects, 600);
 * const projects = await cache.get('projects:list');
 * ```
 */
export class CacheManager {
  private memoryCache: InMemoryCache;
  // Redis client type varies by loaded modules (JSON, search, etc.) and the
  // `redis` package's exported types are unstable across versions, so we use
  // a narrow assertion here instead of `any`.
  private redisClient: ReturnType<typeof import('redis')['createClient']> | null = null;
  private redisAvailable = false;
  private redisConnecting = false;
  private keyPrefix: string;
  private defaultTtl: number;
  private enableFallback: boolean;

  // Statistics
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private deletes = 0;

  /** Public getter for key prefix — needed by namespace factory and external consumers */
  get prefix(): string { return this.keyPrefix; }

  constructor(config: CacheManagerConfig = {}) {
    this.keyPrefix = config.keyPrefix ?? 'blueprint';
    this.defaultTtl = config.defaultTtl ?? 300; // 5 minutes
    this.enableFallback = config.enableFallback ?? true;
    this.memoryCache = new InMemoryCache(config.maxMemoryEntries ?? 10000);

    if (config.redisUrl) {
      this.connectRedis(config.redisUrl).catch(() => {
        log.warn('[CacheManager] Redis connection failed, using in-memory fallback');
      });
    }
  }

  // ─── Redis Connection ────────────────────────────────────────────────────

  /**
   * Connect to Redis asynchronously. If the connection fails, falls back
   * silently to the in-memory cache.
   */
  private async connectRedis(url: string): Promise<void> {
    if (this.redisConnecting) return;
    this.redisConnecting = true;

    try {
      // Dynamic import to avoid bundling Redis in client code
      const { createClient } = await import('redis');
      this.redisClient = createClient({ url });

      this.redisClient.on('error', (err: Error) => {
        log.warn('[CacheManager] Redis error:', { message: err.message });
        this.redisAvailable = false;
      });

      this.redisClient.on('reconnecting', () => {
        log.info('[CacheManager] Attempting to reconnect to Redis...');
      });

      await this.redisClient.connect();
      this.redisAvailable = true;
      log.info('[CacheManager] Connected to Redis');
    } catch (error) {
      log.warn('[CacheManager] Redis not available:', { error: String(error) });
      this.redisAvailable = false;
    } finally {
      this.redisConnecting = false;
    }
  }

  // ─── Key Management ──────────────────────────────────────────────────────

  /**
   * Build a namespaced cache key.
   * Format: `{prefix}:{feature}:{id}`
   *
   * @example
   * buildKey('projects', 'list') => 'blueprint:projects:list'
   * buildKey('tasks', 'task-123') => 'blueprint:tasks:task-123'
   */
  buildKey(feature: string, id: string): string {
    return `${this.keyPrefix}:${feature}:${id}`;
  }

  // ─── Core Methods ────────────────────────────────────────────────────────

  /**
   * Retrieve a cached value by key.
   * Tries Redis first, falls back to in-memory cache.
   *
   * @typeParam T - The expected type of the cached value
   * @param key - Cache key (will be namespaced automatically if not already)
   * @returns The cached value, or null if not found/expired
   */
  async get<T>(key: string): Promise<T | null> {
    const namespacedKey = key.startsWith(this.keyPrefix) ? key : this.buildKey('cache', key);

    // Try Redis first
    if (this.redisAvailable && this.redisClient) {
      try {
        const data = await this.redisClient.get(namespacedKey);
        if (data) {
          this.hits++;
          try {
            return JSON.parse(data) as T;
          } catch {
            return data as T;
          }
        }
      } catch (error) {
        log.warn('[CacheManager] Redis get error, falling back to memory:', { error: String(error) });
      }
    }

    // Fallback to in-memory
    if (this.enableFallback) {
      const value = this.memoryCache.get<T>(namespacedKey);
      if (value !== null) {
        this.hits++;
        return value;
      }
    }

    this.misses++;
    return null;
  }

  /**
   * Store a value in cache.
   * Writes to both Redis and in-memory cache.
   *
   * @param key - Cache key (will be namespaced automatically if not already)
   * @param value - The value to cache (will be JSON-serialized)
   * @param options - Optional TTL and tags
   */
  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    const namespacedKey = key.startsWith(this.keyPrefix) ? key : this.buildKey('cache', key);
    const ttl = options?.ttl ?? this.defaultTtl;
    const tags = options?.tags ?? [];
    const serialized = JSON.stringify(value);

    this.sets++;

    // Write to Redis
    if (this.redisAvailable && this.redisClient) {
      try {
        await this.redisClient.set(namespacedKey, serialized, {
          EX: ttl,
        });
        // Store tags in a Redis set for bulk invalidation
        if (tags.length > 0) {
          for (const tag of tags) {
            await this.redisClient.sAdd(`tag:${tag}`, namespacedKey);
          }
        }
      } catch (error) {
        log.warn('[CacheManager] Redis set error, storing in memory only:', { error: String(error) });
      }
    }

    // Also store in memory for fast access and fallback
    if (this.enableFallback) {
      this.memoryCache.set(namespacedKey, value, ttl, tags);
    }
  }

  /**
   * Delete a specific key from cache.
   *
   * @param key - Cache key to delete
   * @returns True if the key was deleted, false otherwise
   */
  async delete(key: string): Promise<boolean> {
    const namespacedKey = key.startsWith(this.keyPrefix) ? key : this.buildKey('cache', key);
    this.deletes++;

    // Delete from Redis
    if (this.redisAvailable && this.redisClient) {
      try {
        await this.redisClient.del(namespacedKey);
      } catch (error) {
        log.warn('[CacheManager] Redis delete error:', { error: String(error) });
      }
    }

    // Delete from memory
    return this.memoryCache.delete(namespacedKey);
  }

  /**
   * Invalidate all cache entries matching a key pattern.
   * Supports glob-style patterns (e.g., `blueprint:projects:*`).
   *
   * @param pattern - Glob pattern to match keys
   * @returns Number of keys invalidated
   */
  async invalidate(pattern: string): Promise<number> {
    let count = 0;

    // Invalidate in Redis using SCAN instead of KEYS
    // KEYS is O(N) and blocks Redis — dangerous in production
    if (this.redisAvailable && this.redisClient) {
      try {
        // Convert glob pattern to regex for SCAN matching
        const regexPattern = new RegExp(
          '^' + pattern.replace(/\+/g, '\\+').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
        );
        let cursor = '0';
        do {
          const result = await this.redisClient.scan(cursor, {
            MATCH: pattern,
            COUNT: 100,
          });
          cursor = result.cursor as string;
          const keys = result.keys;
          if (keys.length > 0) {
            // Verify keys match the pattern (SCAN can return false positives)
            const matchingKeys = keys.filter((k: string) => regexPattern.test(k));
            if (matchingKeys.length > 0) {
              await this.redisClient.del(matchingKeys);
              count += matchingKeys.length;
            }
          }
        } while (cursor !== '0');
      } catch (error) {
        log.warn('[CacheManager] Redis invalidate error:', { error: String(error) });
      }
    }

    // Invalidate in memory
    if (this.enableFallback) {
      count += this.memoryCache.invalidateByPattern(pattern);
    }

    return count;
  }

  /**
   * Invalidate all cache entries with specific tags.
   * Useful for bulk invalidation of related data (e.g., all project-related cache).
   *
   * @param tags - Array of tags to invalidate
   * @returns Number of keys invalidated
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let count = 0;

    // Invalidate in Redis
    if (this.redisAvailable && this.redisClient) {
      try {
        for (const tag of tags) {
          const keys = await this.redisClient.sMembers(`tag:${tag}`);
          if (keys.length > 0) {
            await this.redisClient.del(keys);
            await this.redisClient.del(`tag:${tag}`);
            count += keys.length;
          }
        }
      } catch (error) {
        log.warn('[CacheManager] Redis tag invalidation error:', { error: String(error) });
      }
    }

    // Invalidate in memory
    if (this.enableFallback) {
      count += this.memoryCache.invalidateByTags(tags);
    }

    return count;
  }

  /**
   * Check if a key exists in cache.
   *
   * @param key - Cache key to check
   * @returns True if the key exists and hasn't expired
   */
  async exists(key: string): Promise<boolean> {
    const namespacedKey = key.startsWith(this.keyPrefix) ? key : this.buildKey('cache', key);

    if (this.redisAvailable && this.redisClient) {
      try {
        const result = await this.redisClient.exists(namespacedKey);
        if (result > 0) return true;
      } catch (error) {
        log.warn('[CacheManager] Redis exists error:', { error: String(error) });
      }
    }

    if (this.enableFallback) {
      return this.memoryCache.exists(namespacedKey);
    }

    return false;
  }

  // ─── Cache Warming ───────────────────────────────────────────────────────

  /**
   * Warm the cache by pre-loading multiple key-value pairs.
   * Useful for pre-populating frequently accessed data on startup.
   *
   * @param entries - Array of { key, value, ttl?, tags? } objects
   * @returns Number of entries warmed
   */
  async warm(
    entries: Array<{
      key: string;
      value: unknown;
      ttl?: number;
      tags?: string[];
    }>
  ): Promise<number> {
    let warmed = 0;
    for (const entry of entries) {
      try {
        await this.set(entry.key, entry.value, {
          ttl: entry.ttl,
          tags: entry.tags,
        });
        warmed++;
      } catch (error) {
        log.warn(`[CacheManager] Failed to warm key "${entry.key}":`, { error: String(error) });
      }
    }
    log.info(`[CacheManager] Warmed ${warmed}/${entries.length} cache entries`);
    return warmed;
  }

  // ─── Statistics ──────────────────────────────────────────────────────────

  /**
   * Get current cache statistics.
   *
   * @returns Object with hit rate, counts, and memory usage
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      deletes: this.deletes,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
      totalKeys: this.memoryCache.size,
      memoryEntries: this.memoryCache.size,
    };
  }

  /** Reset all statistics counters */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.deletes = 0;
  }

  /** Check if Redis is currently available */
  isRedisAvailable(): boolean {
    return this.redisAvailable;
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  /**
   * Gracefully close the Redis connection.
   * Call this on application shutdown.
   */
  async close(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
        log.info('[CacheManager] Redis connection closed');
      } catch (error) {
        log.warn('[CacheManager] Error closing Redis connection:', { error: String(error) });
      }
    }
  }
}

// ─── Namespace Factory ──────────────────────────────────────────────────────

/**
 * Create a feature-specific cache namespace.
 * All keys are automatically prefixed with `blueprint:{prefix}:`.
 *
 * @param prefix - The feature namespace (e.g., 'projects', 'tasks')
 * @param cacheManager - The CacheManager instance to use
 * @returns A CacheNamespace interface scoped to the feature
 *
 * @example
 * ```typescript
 * const projectCache = createCacheNamespace('projects', cacheManager);
 * await projectCache.set('list', allProjects);
 * await projectCache.set('detail:123', project123);
 * await projectCache.invalidateAll(); // Clears blueprint:projects:*
 * ```
 */
export function createCacheNamespace<T = unknown>(
  prefix: string,
  cacheManager: CacheManager
): CacheNamespace<T> {
  const keyPrefix = `${cacheManager.prefix}:${prefix}`;

  return {
    prefix,

    async get(key: string): Promise<T | null> {
      const fullKey = `${keyPrefix}:${key}`;
      return cacheManager.get<T>(fullKey);
    },

    async set(key: string, value: T, ttl?: number): Promise<void> {
      const fullKey = `${keyPrefix}:${key}`;
      await cacheManager.set(fullKey, value, {
        ttl,
        tags: [prefix],
      });
    },

    async delete(key: string): Promise<boolean> {
      const fullKey = `${keyPrefix}:${key}`;
      return cacheManager.delete(fullKey);
    },

    async exists(key: string): Promise<boolean> {
      const fullKey = `${keyPrefix}:${key}`;
      return cacheManager.exists(fullKey);
    },

    async invalidateAll(): Promise<number> {
      return cacheManager.invalidate(`${keyPrefix}:*`);
    },
  };
}

// ─── Singleton & Pre-built Namespaces ────────────────────────────────────────

/**
 * Singleton CacheManager instance.
 * Configure via environment variables:
 * - REDIS_URL: Redis connection URL
 * - CACHE_DEFAULT_TTL: Default TTL in seconds
 * - CACHE_KEY_PREFIX: Key prefix (default: 'blueprint')
 */
let _instance: CacheManager | null = null;

/**
 * Get or create the singleton CacheManager instance.
 * Uses environment variables for configuration.
 */
export function getCacheManager(): CacheManager {
  if (!_instance) {
    _instance = new CacheManager({
      redisUrl: process.env.REDIS_URL,
      defaultTtl: process.env.CACHE_DEFAULT_TTL
        ? parseInt(process.env.CACHE_DEFAULT_TTL, 10)
        : undefined,
      keyPrefix: process.env.CACHE_KEY_PREFIX,
      enableFallback: true,
      maxMemoryEntries: 10000,
    });
  }
  return _instance;
}

/** Reset the singleton instance (useful for testing) */
export function resetCacheManager(): void {
  if (_instance) {
    _instance.close();
    _instance = null;
  }
}

// ─── Pre-built Feature Namespaces ────────────────────────────────────────────

/** Project-related cache namespace */
export const projectCache: CacheNamespace = new Proxy({} as CacheNamespace, {
  get(_target, prop) {
    const manager = getCacheManager();
    const ns = createCacheNamespace('projects', manager);
    return (ns as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/** Task-related cache namespace */
export const taskCache: CacheNamespace = new Proxy({} as CacheNamespace, {
  get(_target, prop) {
    const manager = getCacheManager();
    const ns = createCacheNamespace('tasks', manager);
    return (ns as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/** Invoice-related cache namespace */
export const invoiceCache: CacheNamespace = new Proxy({} as CacheNamespace, {
  get(_target, prop) {
    const manager = getCacheManager();
    const ns = createCacheNamespace('invoices', manager);
    return (ns as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/** User-related cache namespace */
export const userCache: CacheNamespace = new Proxy({} as CacheNamespace, {
  get(_target, prop) {
    const manager = getCacheManager();
    const ns = createCacheNamespace('users', manager);
    return (ns as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/** Dashboard-related cache namespace */
export const dashboardCache: CacheNamespace = new Proxy({} as CacheNamespace, {
  get(_target, prop) {
    const manager = getCacheManager();
    const ns = createCacheNamespace('dashboard', manager);
    return (ns as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ─── Default Export ──────────────────────────────────────────────────────────

/** Convenience alias for getCacheManager() */
export const cacheManager: CacheManager = new Proxy({} as CacheManager, {
  get(_target, prop) {
    const manager = getCacheManager();
    const value = (manager as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return value.bind(manager);
    }
    return value;
  },
});
