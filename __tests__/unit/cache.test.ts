/**
 * Unit Tests — Cache Management
 * اختبارات إدارة التخزين المؤقت
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// ═══════════════════════════════════════════════════════════════════════
// In-Memory Cache Implementation (for testing patterns)
// ═══════════════════════════════════════════════════════════════════════

class SimpleCache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();
  private defaultTTL: number;

  constructor(defaultTTL = 60000) {
    this.defaultTTL = defaultTTL;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.defaultTTL),
    });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    // Clean expired entries first
    for (const [key, entry] of this.store) {
      if (Date.now() > entry.expiresAt) {
        this.store.delete(key);
      }
    }
    return this.store.size;
  }
}

describe('Cache — Basic Operations', () => {
  let cache: SimpleCache<string>;

  beforeEach(() => {
    cache = new SimpleCache(1000); // 1 second TTL for testing
  });

  it('should store and retrieve values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for missing keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should overwrite existing values', () => {
    cache.set('key1', 'value1');
    cache.set('key1', 'value2');
    expect(cache.get('key1')).toBe('value2');
  });

  it('should delete values', () => {
    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeUndefined();
  });

  it('should return false for deleting non-existent key', () => {
    expect(cache.delete('nonexistent')).toBe(false);
  });

  it('should check if key exists', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('should clear all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});

describe('Cache — TTL & Expiration', () => {
  it('should expire entries after TTL', async () => {
    const cache = new SimpleCache<string>(100); // 100ms TTL
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');

    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(cache.get('key1')).toBeUndefined();
  });

  it('should support custom TTL per entry', async () => {
    const cache = new SimpleCache<string>(5000); // 5s default
    cache.set('short', 'value1', 100); // 100ms custom
    cache.set('long', 'value2', 5000); // 5s custom

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(cache.get('short')).toBeUndefined();
    expect(cache.get('long')).toBe('value2');
  });
});

describe('Cache — Concurrent Access Patterns', () => {
  it('should handle multiple keys independently', () => {
    const cache = new SimpleCache<number>();
    for (let i = 0; i < 100; i++) {
      cache.set(`key-${i}`, i);
    }
    for (let i = 0; i < 100; i++) {
      expect(cache.get(`key-${i}`)).toBe(i);
    }
  });

  it('should store complex objects', () => {
    const cache = new SimpleCache<object>();
    const data = {
      id: '1',
      name: 'Test',
      nested: { items: [1, 2, 3] },
    };
    cache.set('complex', data);
    expect(cache.get('complex')).toEqual(data);
  });
});
