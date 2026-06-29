/**
 * Cache Service Index
 * Wrapper for cache-manager to provide a compatible API for services
 */

import { getCacheManager, CacheSetOptions } from './cache-manager';

export { getCacheManager, createCacheNamespace } from './cache-manager';
export type { CacheManager, CacheNamespace, CacheStats, CacheSetOptions as CacheSetOptionsType } from './cache-manager';

/**
 * CacheService provides a simplified API for caching operations
 * Compatible with the BluePrint services layer
 */
export const CacheService = {
  /**
   * Get a cached value or set it if not found
   * @param key - Cache key
   * @param factory - Function to generate the value if not cached
   * @param options - Cache options (ttl, prefix)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: { ttl?: number; prefix?: string }
  ): Promise<T> {
    const cache = getCacheManager();
    const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
    
    const cached = await cache.get<T>(fullKey);
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    const setOptions: CacheSetOptions = {
      ttl: options?.ttl,
    };
    await cache.set(fullKey, value, setOptions);
    
    return value;
  },

  /**
   * Get a cached value
   * @param key - Cache key
   * @param options - Cache options (prefix)
   */
  async get<T>(key: string, options?: { prefix?: string }): Promise<T | null> {
    const cache = getCacheManager();
    const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
    return cache.get<T>(fullKey);
  },

  /**
   * Set a cached value
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Cache options (ttl, prefix)
   */
  async set<T>(
    key: string,
    value: T,
    options?: { ttl?: number; prefix?: string; tags?: string[] }
  ): Promise<void> {
    const cache = getCacheManager();
    const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
    const setOptions: CacheSetOptions = {
      ttl: options?.ttl,
      tags: options?.tags,
    };
    await cache.set(fullKey, value, setOptions);
  },

  /**
   * Delete a cached value
   * @param key - Cache key
   * @param options - Cache options (prefix)
   */
  async delete(key: string, options?: { prefix?: string }): Promise<boolean> {
    const cache = getCacheManager();
    const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
    return cache.delete(fullKey);
  },

  /**
   * Check if a key exists in cache
   * @param key - Cache key
   * @param options - Cache options (prefix)
   */
  async exists(key: string, options?: { prefix?: string }): Promise<boolean> {
    const cache = getCacheManager();
    const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
    return cache.exists(fullKey);
  },

  /**
   * Invalidate cache entries matching a pattern
   * @param pattern - Glob pattern to match keys
   */
  async invalidate(pattern: string): Promise<number> {
    const cache = getCacheManager();
    return cache.invalidate(pattern);
  },

  /**
   * Invalidate cache entries by tags
   * @param tags - Array of tags to invalidate
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    const cache = getCacheManager();
    return cache.invalidateByTags(tags);
  },

  /**
   * Get cache statistics
   */
  getStats() {
    const cache = getCacheManager();
    return cache.getStats();
  },
};

export default CacheService;
