/**
 * Unit Tests — API Route Utilities
 * Tests for auth, rate-limit, db, response, pagination, and demo-config helpers
 */

import {
  parsePaginationParams,
  buildPaginationMeta,
  calculateSkip,
  isPaginationRequested,
  buildSearchConditions,
  getEffectiveLimit,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '@/app/api/utils/pagination';

import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  conflictResponse,
  badRequestResponse,
} from '@/app/api/utils/response';

import {
  getClientIP,
  rateLimiters,
} from '@/lib/rate-limiter';

import {
  isAdmin,
  isHR,
  isAccountant,
  canApproveLeave,
  canApproveExpense,
} from '@/app/api/utils/auth';

// demo-config module removed — demo tests skipped

import { getEmptyPaginationResponse } from '@/lib/db';

// ─── Pagination Helpers ─────────────────────────────────────────────────────

describe('Pagination Utils', () => {
  describe('parsePaginationParams', () => {
    it('should return defaults when no params provided', () => {
      const params = parsePaginationParams(new URLSearchParams());
      expect(params.page).toBe(DEFAULT_PAGE);
      expect(params.limit).toBe(DEFAULT_LIMIT);
      expect(params.search).toBeUndefined();
    });

    it('should parse page parameter', () => {
      const params = parsePaginationParams(new URLSearchParams('page=5'));
      expect(params.page).toBe(5);
    });

    it('should clamp page to minimum of 1', () => {
      const params = parsePaginationParams(new URLSearchParams('page=0'));
      expect(params.page).toBe(1);
    });

    it('should clamp negative page to 1', () => {
      const params = parsePaginationParams(new URLSearchParams('page=-5'));
      expect(params.page).toBe(1);
    });

    it('should handle non-numeric page as default', () => {
      const params = parsePaginationParams(new URLSearchParams('page=abc'));
      expect(params.page).toBe(DEFAULT_PAGE);
    });

    it('should parse limit parameter', () => {
      const params = parsePaginationParams(new URLSearchParams('limit=50'));
      expect(params.limit).toBe(50);
    });

    it('should clamp limit to MAX_LIMIT', () => {
      const params = parsePaginationParams(new URLSearchParams('limit=999'));
      expect(params.limit).toBe(MAX_LIMIT);
    });

    it('should default to DEFAULT_LIMIT when limit is 0', () => {
      const params = parsePaginationParams(new URLSearchParams('limit=0'));
      expect(params.limit).toBe(DEFAULT_LIMIT);
    });

    it('should parse search parameter', () => {
      const params = parsePaginationParams(new URLSearchParams('search=test'));
      expect(params.search).toBe('test');
    });

    it('should handle all parameters together', () => {
      const params = parsePaginationParams(new URLSearchParams('page=3&limit=25&search=hello'));
      expect(params.page).toBe(3);
      expect(params.limit).toBe(25);
      expect(params.search).toBe('hello');
    });
  });

  describe('buildPaginationMeta', () => {
    it('should build correct meta for first page', () => {
      const meta = buildPaginationMeta(1, 10, 100);
      expect(meta.page).toBe(1);
      expect(meta.limit).toBe(10);
      expect(meta.total).toBe(100);
      expect(meta.totalPages).toBe(10);
      expect(meta.hasNextPage).toBe(true);
      expect(meta.hasPrevPage).toBe(false);
    });

    it('should build correct meta for last page', () => {
      const meta = buildPaginationMeta(10, 10, 100);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPrevPage).toBe(true);
    });

    it('should handle single page', () => {
      const meta = buildPaginationMeta(1, 10, 5);
      expect(meta.totalPages).toBe(1);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPrevPage).toBe(false);
    });

    it('should handle empty results', () => {
      const meta = buildPaginationMeta(1, 10, 0);
      expect(meta.totalPages).toBe(0);
      expect(meta.hasNextPage).toBe(false);
    });

    it('should handle partial last page', () => {
      const meta = buildPaginationMeta(2, 10, 15);
      expect(meta.totalPages).toBe(2);
      expect(meta.hasNextPage).toBe(false);
    });
  });

  describe('calculateSkip', () => {
    it('should return 0 for page 1', () => {
      expect(calculateSkip(1, 10)).toBe(0);
    });

    it('should calculate correct skip', () => {
      expect(calculateSkip(3, 20)).toBe(40);
    });

    it('should calculate correct skip for large pages', () => {
      expect(calculateSkip(100, 50)).toBe(4950);
    });
  });

  describe('isPaginationRequested', () => {
    it('should return true when page param exists', () => {
      expect(isPaginationRequested(new URLSearchParams('page=1'))).toBe(true);
    });

    it('should return true when limit param exists', () => {
      expect(isPaginationRequested(new URLSearchParams('limit=10'))).toBe(true);
    });

    it('should return false when no pagination params', () => {
      expect(isPaginationRequested(new URLSearchParams('search=test'))).toBe(false);
    });
  });

  describe('buildSearchConditions', () => {
    it('should return undefined when no search', () => {
      expect(buildSearchConditions(undefined, ['name'])).toBeUndefined();
    });

    it('should return conditions for each field', () => {
      const conditions = buildSearchConditions('test', ['name', 'email']);
      expect(conditions).toHaveLength(2);
      // Each condition should have a contains filter (mode depends on DB provider)
      expect(conditions![0]).toHaveProperty('name');
      expect(conditions![0].name).toHaveProperty('contains', 'test');
      expect(conditions![1]).toHaveProperty('email');
      expect(conditions![1].email).toHaveProperty('contains', 'test');
    });

    it('should return single condition for single field', () => {
      const conditions = buildSearchConditions('hello', ['title']);
      expect(conditions).toHaveLength(1);
    });
  });

  describe('getEffectiveLimit', () => {
    it('should return requested limit when pagination is used', () => {
      expect(getEffectiveLimit(true, 25)).toBe(25);
    });

    it('should return backward compat limit when pagination is not used', () => {
      expect(getEffectiveLimit(false, 25)).toBe(100);
    });
  });
});

// ─── Rate Limit Helpers ─────────────────────────────────────────────────────

describe('Rate Limit Utils', () => {
  describe('rateLimiters', () => {
    it('should have auth, api, and public limiters', () => {
      expect(rateLimiters).toHaveProperty('auth');
      expect(rateLimiters).toHaveProperty('api');
      expect(rateLimiters).toHaveProperty('public');
    });
  });

  describe('getClientIP', () => {
    it('should extract IP from x-forwarded-for (rightmost = trusted proxy)', () => {
      const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
      // SECURITY: Rightmost IP is trusted (appended by the proxy), not the leftmost (can be spoofed)
      expect(getClientIP(headers)).toBe('5.6.7.8');
    });

    it('should extract IP from x-real-ip', () => {
      const headers = new Headers({ 'x-real-ip': '10.0.0.1' });
      expect(getClientIP(headers)).toBe('10.0.0.1');
    });

    it('should return unknown when no headers present', () => {
      const headers = new Headers();
      expect(getClientIP(headers)).toBe('unknown');
    });
  });
});

// ─── Response Helpers ─────────────────────────────────────────────────────

describe('Response Utils', () => {
  // Helper: NextResponse.json() body is a ReadableStream — extract via headers
  async function getBody(res: Response): Promise<Record<string, unknown>> {
    if (typeof res.body === 'string') return JSON.parse(res.body);
    // ReadableStream: accumulate chunks
    const reader = res.body?.getReader();
    if (!reader) return {};
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const text = new TextDecoder().decode(Buffer.concat(chunks));
    return JSON.parse(text);
  }

  describe('successResponse', () => {
    it('should return status 200', () => {
      const res = successResponse({ id: 1, name: 'Test' });
      expect(res.status).toBe(200);
    });

    it('should have JSON content type', () => {
      const res = successResponse({ id: 1 });
      expect(res.headers.get('content-type')).toContain('application/json');
    });

    it('should normalize UPPERCASE enum values to lowercase', async () => {
      const res = successResponse({ status: 'ACTIVE', priority: 'HIGH', role: 'ADMIN' });
      const body = await getBody(res);
      expect((body as Record<string, Record<string, string>>).data.status).toBe('active');
      expect((body as Record<string, Record<string, string>>).data.priority).toBe('high');
      expect((body as Record<string, Record<string, string>>).data.role).toBe('ADMIN');
    });
  });

  describe('errorResponse', () => {
    it('should return status 400 by default', () => {
      const res = errorResponse('Something went wrong');
      expect(res.status).toBe(400);
    });

    it('should accept custom code and status', () => {
      const res = errorResponse('Not found', 'NOT_FOUND', 404);
      expect(res.status).toBe(404);
    });

    it('should return correct message for not found', () => {
      const res = notFoundResponse();
      expect(res.status).toBe(404);
    });

    it('should return 401 for unauthorized', () => {
      const res = unauthorizedResponse();
      expect(res.status).toBe(401);
    });

    it('should return 403 for forbidden', () => {
      const res = forbiddenResponse();
      expect(res.status).toBe(403);
    });
  });

  describe('validationErrorResponse', () => {
    it('should return 400 status', () => {
      const res = validationErrorResponse('Invalid email', 'email');
      expect(res.status).toBe(400);
    });
  });

  describe('conflictResponse', () => {
    it('should return 409 status', () => {
      const res = conflictResponse('Duplicate entry');
      expect(res.status).toBe(409);
    });
  });

  describe('badRequestResponse', () => {
    it('should return 400 status', () => {
      const res = badRequestResponse('Invalid input');
      expect(res.status).toBe(400);
    });
  });
});

// ─── Auth Helpers ─────────────────────────────────────────────────────────

describe('Auth Utils', () => {
  describe('isAdmin', () => {
    it('should return true for ADMIN (uppercase)', () => {
      expect(isAdmin('ADMIN')).toBe(true);
    });

    it('should return true for admin (lowercase)', () => {
      expect(isAdmin('admin')).toBe(true);
    });

    it('should return false for other roles', () => {
      expect(isAdmin('MANAGER')).toBe(false);
      expect(isAdmin('VIEWER')).toBe(false);
    });
  });

  describe('isHR', () => {
    it('should return true for HR (uppercase)', () => {
      expect(isHR('HR')).toBe(true);
    });

    it('should return true for hr (lowercase)', () => {
      expect(isHR('hr')).toBe(true);
    });

    it('should return false for other roles', () => {
      expect(isHR('ADMIN')).toBe(false);
    });
  });

  describe('isAccountant', () => {
    it('should return true for ACCOUNTANT', () => {
      expect(isAccountant('ACCOUNTANT')).toBe(true);
    });

    it('should return true for accountant', () => {
      expect(isAccountant('accountant')).toBe(true);
    });

    it('should return false for other roles', () => {
      expect(isAccountant('ENGINEER')).toBe(false);
    });
  });

  describe('canApproveLeave', () => {
    it('should allow admin to approve', () => {
      expect(canApproveLeave('ADMIN')).toBe(true);
    });

    it('should allow HR to approve', () => {
      expect(canApproveLeave('HR')).toBe(true);
    });

    it('should allow manager to approve', () => {
      expect(canApproveLeave('MANAGER')).toBe(true);
    });

    it('should not allow engineer to approve', () => {
      expect(canApproveLeave('ENGINEER')).toBe(false);
    });

    it('should not allow viewer to approve', () => {
      expect(canApproveLeave('VIEWER')).toBe(false);
    });

    it('should handle lowercase roles', () => {
      expect(canApproveLeave('admin')).toBe(true);
      expect(canApproveLeave('manager')).toBe(true);
    });
  });

  describe('canApproveExpense', () => {
    it('should allow admin to approve', () => {
      expect(canApproveExpense('ADMIN')).toBe(true);
    });

    it('should allow accountant to approve', () => {
      expect(canApproveExpense('ACCOUNTANT')).toBe(true);
    });

    it('should allow manager to approve', () => {
      expect(canApproveExpense('MANAGER')).toBe(true);
    });

    it('should not allow HR to approve expenses', () => {
      expect(canApproveExpense('HR')).toBe(false);
    });
  });
});

// ─── DB Utils ──────────────────────────────────────────────────────────

describe('DB Utils', () => {
  describe('getEmptyPaginationResponse', () => {
    it('should return empty pagination response', () => {
      const response = getEmptyPaginationResponse();
      expect(response.data).toEqual([]);
      expect(response.meta.page).toBe(1);
      expect(response.meta.limit).toBe(20);
      expect(response.meta.total).toBe(0);
      expect(response.meta.totalPages).toBe(0);
      expect(response.meta.hasNextPage).toBe(false);
      expect(response.meta.hasPrevPage).toBe(false);
    });
  });
});
