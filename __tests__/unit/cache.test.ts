/**
 * Unit Tests — Cache Layer
 * Tests CacheManager, InMemoryCache, query cache, and cache namespaces
 */

import { CacheManager, createCacheNamespace } from '@/lib/cache/cache-manager';
import { buildCacheKey, CACHE_TTL } from '@/lib/cache/query-cache';

// ─── CacheManager — In-Memory Operations ────────────────────────────────

describe('CacheManager — In-Memory Operations', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager({ enableFallback: true, defaultTtl: 300 });
  });

  afterEach(() => {
    cache.close();
  });

  it('should create CacheManager with default config', () => {
    const c = new CacheManager();
    expect(c).toBeDefined();
    c.close();
  });

  it('should set and get a value', async () => {
    await cache.set('test:key', { data: 'hello' });
    const result = await cache.get<{ data: string }>('test:key');
    expect(result).toEqual({ data: 'hello' });
  });

  it('should return null for missing key', async () => {
    const result = await cache.get('nonexistent:key');
    expect(result).toBeNull();
  });

  it('should delete a key', async () => {
    await cache.set('test:del', 'value');
    const deleted = await cache.delete('test:del');
    expect(deleted).toBe(true);
    const result = await cache.get('test:del');
    expect(result).toBeNull();
  });

  it('should return false when deleting nonexistent key', async () => {
    const deleted = await cache.delete('nonexistent:key');
    expect(deleted).toBe(false);
  });

  it('should check if key exists', async () => {
    await cache.set('test:exists', 'value');
    expect(await cache.exists('test:exists')).toBe(true);
    expect(await cache.exists('test:nope')).toBe(false);
  });

  it('should overwrite existing key', async () => {
    await cache.set('test:overwrite', 'first');
    await cache.set('test:overwrite', 'second');
    const result = await cache.get('test:overwrite');
    expect(result).toBe('second');
  });

  it('should track hits and misses in stats', async () => {
    await cache.set('test:stats', 'value');
    await cache.get('test:stats'); // hit
    await cache.get('test:stats'); // hit
    await cache.get('nonexistent'); // miss

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
  });

  it('should track sets and deletes in stats', async () => {
    await cache.set('test:a', '1');
    await cache.set('test:b', '2');
    await cache.delete('test:a');

    const stats = cache.getStats();
    expect(stats.sets).toBe(2);
    expect(stats.deletes).toBe(1);
  });

  it('should calculate hit rate', async () => {
    await cache.set('test:rate', 'value');
    await cache.get('test:rate'); // hit
    await cache.get('nonexistent'); // miss

    const stats = cache.getStats();
    expect(stats.hitRate).toBe(50);
  });

  it('should return 0% hit rate with no operations', () => {
    const stats = cache.getStats();
    expect(stats.hitRate).toBe(0);
  });

  it('should reset stats', async () => {
    await cache.set('test:a', '1');
    await cache.get('test:a');
    cache.resetStats();
    const stats = cache.getStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.sets).toBe(0);
  });

  it('should store complex objects', async () => {
    const complex = {
      id: '123',
      nested: { items: [1, 2, 3] },
      date: '2024-01-01',
      nullable: null,
    };
    await cache.set('test:complex', complex);
    const result = await cache.get<typeof complex>('test:complex');
    expect(result).toEqual(complex);
    expect(result?.nested.items).toHaveLength(3);
  });

  it('should store arrays', async () => {
    await cache.set('test:array', [1, 2, 3, 4, 5]);
    const result = await cache.get<number[]>('test:array');
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  it('should build namespaced keys', () => {
    const key = cache.buildKey('projects', 'list');
    expect(key).toContain('blueprint');
    expect(key).toContain('projects');
    expect(key).toContain('list');
  });

  it('should invalidate by pattern', async () => {
    await cache.set('blueprint:projects:list', 'list');
    await cache.set('blueprint:projects:detail:1', 'detail1');
    await cache.set('blueprint:tasks:list', 'tasks');

    const count = await cache.invalidate('blueprint:projects:*');
    expect(count).toBeGreaterThanOrEqual(2);

    expect(await cache.get('blueprint:projects:list')).toBeNull();
    expect(await cache.get('blueprint:tasks:list')).toEqual('tasks');
  });

  it('should invalidate by tags', async () => {
    await cache.set('tagged:a', 'valueA', { tags: ['projects'] });
    await cache.set('tagged:b', 'valueB', { tags: ['tasks'] });
    await cache.set('tagged:c', 'valueC', { tags: ['projects', 'important'] });

    const count = await cache.invalidateByTags(['projects']);
    expect(count).toBeGreaterThanOrEqual(2);

    expect(await cache.get('tagged:a')).toBeNull();
    expect(await cache.get('tagged:b')).toEqual('valueB');
  });

  it('should warm cache with multiple entries', async () => {
    const entries = [
      { key: 'warm:a', value: 1 },
      { key: 'warm:b', value: 2 },
      { key: 'warm:c', value: 3 },
    ];
    const warmed = await cache.warm(entries);
    expect(warmed).toBe(3);
    expect(await cache.get('warm:a')).toBe(1);
    expect(await cache.get('warm:b')).toBe(2);
    expect(await cache.get('warm:c')).toBe(3);
  });

  it('isRedisAvailable should return false without Redis', () => {
    expect(cache.isRedisAvailable()).toBe(false);
  });
});

// ─── Cache Namespace ───────────────────────────────────────────────────

describe('CacheManager — Namespaces', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager({ enableFallback: true, defaultTtl: 300 });
  });

  afterEach(() => {
    cache.close();
  });

  it('should create a namespace with prefix', () => {
    const ns = createCacheNamespace('projects', cache);
    expect(ns.prefix).toBe('projects');
  });

  it('should set and get within namespace', async () => {
    const ns = createCacheNamespace('tasks', cache);
    await ns.set('list', [1, 2, 3]);
    const result = await ns.get('list') as number[] | undefined;
    expect(result).toEqual([1, 2, 3]);
  });

  it('should delete within namespace', async () => {
    const ns = createCacheNamespace('invoices', cache);
    await ns.set('inv-1', { id: 1 });
    const deleted = await ns.delete('inv-1');
    expect(deleted).toBe(true);
  });

  it('should check existence within namespace', async () => {
    const ns = createCacheNamespace('users', cache);
    await ns.set('user-1', { name: 'Test' });
    expect(await ns.exists('user-1')).toBe(true);
    expect(await ns.exists('user-999')).toBe(false);
  });

  it('should invalidate all entries in namespace', async () => {
    const ns = createCacheNamespace('projects', cache);
    await ns.set('p1', 'project1');
    await ns.set('p2', 'project2');
    await ns.set('p3', 'project3');

    const count = await ns.invalidateAll();
    expect(count).toBeGreaterThanOrEqual(3);
    expect(await ns.get('p1')).toBeNull();
  });
});

// ─── Query Cache ───────────────────────────────────────────────────────

describe('Query Cache — CACHE_TTL Constants', () => {
  it('should have PROJECTS TTL defined', () => {
    expect(CACHE_TTL.PROJECTS).toBe(120);
  });

  it('should have CLIENTS TTL defined', () => {
    expect(CACHE_TTL.CLIENTS).toBe(300);
  });

  it('should have TASKS TTL defined', () => {
    expect(CACHE_TTL.TASKS).toBe(90);
  });

  it('should have INVOICES TTL defined', () => {
    expect(CACHE_TTL.INVOICES).toBe(120);
  });

  it('should have REPORTS TTL defined', () => {
    expect(CACHE_TTL.REPORTS).toBe(300);
  });

  it('should have DEFAULT TTL defined', () => {
    expect(CACHE_TTL.DEFAULT).toBe(180);
  });

  it('should have LOOKUP TTL defined', () => {
    expect(CACHE_TTL.LOOKUP).toBe(900);
  });

  it('TASKS TTL should be shorter than CLIENTS TTL', () => {
    expect(CACHE_TTL.TASKS).toBeLessThan(CACHE_TTL.CLIENTS);
  });

  it('LOOKUP TTL should be longest', () => {
    expect(CACHE_TTL.LOOKUP).toBeGreaterThan(CACHE_TTL.PROJECTS);
    expect(CACHE_TTL.LOOKUP).toBeGreaterThan(CACHE_TTL.DEFAULT);
  });
});

describe('Query Cache — buildCacheKey', () => {
  it('should join parts with colon', () => {
    expect(buildCacheKey('projects', 'list')).toBe('projects:list');
  });

  it('should join multiple parts', () => {
    expect(buildCacheKey('projects', 'list', 'org123', 'page', '1')).toBe('projects:list:org123:page:1');
  });

  it('should handle single part', () => {
    expect(buildCacheKey('test')).toBe('test');
  });

  it('should handle empty strings', () => {
    expect(buildCacheKey('a', '', 'b')).toBe('a::b');
  });
});
