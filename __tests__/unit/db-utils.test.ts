/**
 * Tests for database utility functions
 * Cross-provider compatibility for SQLite and PostgreSQL
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { isPostgreSQL, insensitiveContains } from '@/app/api/utils/db';

describe('DB Utilities — isPostgreSQL', () => {
  const originalDbUrl = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.DATABASE_URL = originalDbUrl;
  });

  it('should return true for postgresql:// URL', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
    expect(isPostgreSQL()).toBe(true);
  });

  it('should return true for postgres:// URL', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@host:5432/db';
    expect(isPostgreSQL()).toBe(true);
  });

  it('should return false for file: SQLite URL', () => {
    process.env.DATABASE_URL = 'file:./dev.db';
    expect(isPostgreSQL()).toBe(false);
  });

  it('should return false for empty DATABASE_URL', () => {
    delete process.env.DATABASE_URL;
    expect(isPostgreSQL()).toBe(false);
  });

  it('should return false for undefined DATABASE_URL', () => {
    process.env.DATABASE_URL = undefined;
    expect(isPostgreSQL()).toBe(false);
  });
});

describe('DB Utilities — insensitiveContains', () => {
  const originalDbUrl = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.DATABASE_URL = originalDbUrl;
  });

  it('should return mode: insensitive for PostgreSQL', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
    const result = insensitiveContains('test');
    expect(result).toEqual({ contains: 'test', mode: 'insensitive' });
  });

  it('should return simple contains for SQLite', () => {
    process.env.DATABASE_URL = 'file:./dev.db';
    const result = insensitiveContains('test');
    expect(result).toEqual({ contains: 'test' });
  });

  it('should return simple contains when DATABASE_URL is not set', () => {
    delete process.env.DATABASE_URL;
    const result = insensitiveContains('search term');
    expect(result).toEqual({ contains: 'search term' });
  });

  it('should handle empty search string for PostgreSQL', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
    const result = insensitiveContains('');
    expect(result).toEqual({ contains: '', mode: 'insensitive' });
  });

  it('should handle empty search string for SQLite', () => {
    process.env.DATABASE_URL = 'file:./dev.db';
    const result = insensitiveContains('');
    expect(result).toEqual({ contains: '' });
  });
});
