/**
 * Unit Tests — Formatters & Localization
 * اختبارات التنسيق والترجمة
 */

import { describe, it, expect } from '@jest/globals';

// ═══════════════════════════════════════════════════════════════════════
// Currency Formatting
// ═══════════════════════════════════════════════════════════════════════

function formatCurrency(amount: number, currency = 'AED', locale = 'ar-AE'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Date Formatting
// ═══════════════════════════════════════════════════════════════════════

function formatDate(date: Date | string, locale = 'ar-AE'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  return formatDate(d);
}

// ═══════════════════════════════════════════════════════════════════════
// Number Formatting
// ═══════════════════════════════════════════════════════════════════════

function formatNumber(num: number, locale = 'ar-AE'): string {
  return new Intl.NumberFormat(locale).format(num);
}

function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

// ═══════════════════════════════════════════════════════════════════════
// String Formatting
// ═══════════════════════════════════════════════════════════════════════

function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

describe('Formatters — Currency', () => {
  it('should format AED currency', () => {
    const result = formatCurrency(1500.5);
    // Arabic locale may format as "1,500" with comma separator
    expect(result).toMatch(/1[,]?500/);
  });

  it('should format zero amount', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('should handle large amounts', () => {
    const result = formatCurrency(1000000);
    expect(result).toBeTruthy();
  });

  it('should handle negative amounts', () => {
    const result = formatCurrency(-500);
    expect(result).toMatch(/500/);
  });
});

describe('Formatters — Dates', () => {
  it('should format a date in Arabic locale', () => {
    const result = formatDate('2024-06-15');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should format relative time for recent dates', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('الآن');
  });

  it('should format relative time for minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = formatRelativeTime(fiveMinAgo);
    expect(result).toContain('دقيقة');
  });

  it('should format relative time for hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const result = formatRelativeTime(threeHoursAgo);
    expect(result).toContain('ساعة');
  });

  it('should format relative time for days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(twoDaysAgo);
    expect(result).toContain('يوم');
  });
});

describe('Formatters — Numbers', () => {
  it('should format numbers with locale', () => {
    const result = formatNumber(1500);
    expect(result).toBeTruthy();
  });

  it('should format percentages', () => {
    expect(formatPercentage(85.5)).toBe('85.5%');
    expect(formatPercentage(100)).toBe('100.0%');
    expect(formatPercentage(33.33, 2)).toBe('33.33%');
  });

  it('should format file sizes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1048576)).toBe('1.0 MB');
    expect(formatFileSize(1073741824)).toBe('1.0 GB');
  });
});

describe('Formatters — Strings', () => {
  it('should truncate long strings', () => {
    expect(truncate('Hello World', 5)).toBe('He...');
    expect(truncate('Hello', 10)).toBe('Hello');
    expect(truncate('Hello World', 8, '!')).toBe('Hello W!');
  });

  it('should slugify strings', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('  Test   String  ')).toBe('test-string');
    expect(slugify('UPPER CASE')).toBe('upper-case');
  });

  it('should capitalize strings', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('HELLO')).toBe('Hello');
    expect(capitalize('')).toBe('');
  });
});
