import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  cachedQuery,
  invalidateCache,
  buildCacheKey,
  withCache,
  invalidateEntityCache,
  CACHE_TTL
} from '../../src/lib/cache/query-cache';
import { CacheManager } from '../../src/lib/cache/cache-manager';

// Mock logger
jest.mock('../../src/lib/logger', () => ({
  log: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Query Cache Utilities', () => {
  let mockGet: jest.SpiedFunction<typeof CacheManager.prototype.get>;
  let mockSet: jest.SpiedFunction<typeof CacheManager.prototype.set>;
  let mockInvalidate: jest.SpiedFunction<typeof CacheManager.prototype.invalidate>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup fresh mocks for each test
    mockGet = jest.spyOn(CacheManager.prototype, 'get').mockResolvedValue(null as any);
    mockSet = jest.spyOn(CacheManager.prototype, 'set').mockResolvedValue(undefined);
    mockInvalidate = jest.spyOn(CacheManager.prototype, 'invalidate').mockResolvedValue(0);
  });

  describe('cachedQuery', () => {
    it('returns cached data if available', async () => {
      const cachedData = { id: 1, name: 'Test' };
      mockGet.mockResolvedValue(cachedData);
      
      const queryFn = (jest.fn() as jest.MockedFunction<() => Promise<{ id: number; name: string }>>).mockResolvedValue({ id: 2, name: 'New' });
      
      const result = await cachedQuery('test-key', queryFn);
      
      expect(result).toEqual(cachedData);
      expect(mockGet).toHaveBeenCalledWith('blueprint:query:test-key');
      expect(queryFn).not.toHaveBeenCalled();
      expect(mockSet).not.toHaveBeenCalled();
    });

    it('executes query and caches result if not in cache', async () => {
      mockGet.mockResolvedValue(null);
      
      const freshData = { id: 2, name: 'New' };
      const queryFn = (jest.fn() as jest.MockedFunction<() => Promise<{ id: number; name: string }>>).mockResolvedValue(freshData);
      
      const result = await cachedQuery('test-key', queryFn, 120);
      
      expect(result).toEqual(freshData);
      expect(mockGet).toHaveBeenCalledWith('blueprint:query:test-key');
      expect(queryFn).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith('blueprint:query:test-key', freshData, { ttl: 120 });
    });

    it('falls back to direct query on cache error', async () => {
      mockGet.mockRejectedValue(new Error('Redis connection failed'));
      
      const freshData = { id: 3, name: 'Fallback' };
      const queryFn = (jest.fn() as jest.MockedFunction<() => Promise<{ id: number; name: string }>>).mockResolvedValue(freshData);
      
      const result = await cachedQuery('test-key', queryFn);
      
      expect(result).toEqual(freshData);
      expect(queryFn).toHaveBeenCalled();
      // Should not attempt to set if get failed
    });
  });

  describe('withCache', () => {
    it('is a wrapper around cachedQuery', async () => {
      mockGet.mockResolvedValue(null);
      const freshData = [1, 2, 3];
      const queryFn = (jest.fn() as jest.MockedFunction<() => Promise<number[]>>).mockResolvedValue(freshData);
      
      const result = await withCache('test-with-cache', queryFn, CACHE_TTL.PROJECTS);
      
      expect(result).toEqual(freshData);
      expect(mockSet).toHaveBeenCalledWith('blueprint:query:test-with-cache', freshData, { ttl: CACHE_TTL.PROJECTS });
    });
  });

  describe('buildCacheKey', () => {
    it('joins parts with colons', () => {
      expect(buildCacheKey('projects', 'list', 'org123')).toBe('projects:list:org123');
      expect(buildCacheKey('users', 'profile')).toBe('users:profile');
    });
  });

  describe('invalidateCache', () => {
    it('invalidates multiple entity prefixes', async () => {
      mockInvalidate.mockResolvedValue(1);
      
      await invalidateCache('projects', 'tasks');
      
      expect(mockInvalidate).toHaveBeenCalledTimes(2);
      expect(mockInvalidate).toHaveBeenCalledWith('blueprint:query:projects:*');
      expect(mockInvalidate).toHaveBeenCalledWith('blueprint:query:tasks:*');
    });

    it('handles invalidation errors gracefully', async () => {
      mockInvalidate.mockRejectedValue(new Error('Invalidation failed'));
      
      // Should not throw
      await expect(invalidateCache('projects')).resolves.not.toThrow();
    });
  });

  describe('invalidateEntityCache', () => {
    it('combines primary entities and related entities', async () => {
      mockInvalidate.mockResolvedValue(1);
      
      await invalidateEntityCache(['invoices'], 'dashboard', 'projects');
      
      expect(mockInvalidate).toHaveBeenCalledTimes(3);
      expect(mockInvalidate).toHaveBeenCalledWith('blueprint:query:invoices:*');
      expect(mockInvalidate).toHaveBeenCalledWith('blueprint:query:dashboard:*');
      expect(mockInvalidate).toHaveBeenCalledWith('blueprint:query:projects:*');
    });
  });
});
