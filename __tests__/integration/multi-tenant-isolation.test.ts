/**
 * Multi-Tenant Isolation Integration Tests
 * اختبارات تكامل عزل المستأجرين المتعددين
 *
 * Tests that verify data isolation between organizations (tenants).
 * These tests ensure that a user from one organization cannot access
 * data belonging to another organization.
 *
 * Key areas tested:
 * - orgFilter() produces correct where clauses per org context
 * - orgFilterNested() correctly filters through parent relations
 * - orgCheck() correctly blocks cross-tenant access
 * - orgCreate() enforces organizationId on new records
 * - Multi-tenant mode (MULTI_TENANT=true) behavior
 * - Single-tenant mode (MULTI_TENANT=false) behavior
 * - Cross-tenant data leakage prevention
 */

import { describe, it, expect, beforeAll, afterEach } from '@jest/globals';

// ═══════════════════════════════════════════════════════════════════════
// 1. orgFilter — Tenant Isolation in Queries
// ═══════════════════════════════════════════════════════════════════════

describe('Multi-Tenant Isolation — orgFilter', () => {
  let orgFilter: typeof import('@/app/api/utils/auth').orgFilter;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/auth');
    orgFilter = mod.orgFilter;
  });

  it('should filter by organizationId when user has an organization', () => {
    const ctx = {
      userId: 'user-1',
      email: 'admin@blueprint.ae',
      role: 'ADMIN',
      name: 'Admin',
      organizationId: 'org-blueprint-rak',
    };
    const filter = orgFilter(ctx);
    expect(filter).toEqual({ organizationId: 'org-blueprint-rak' });
  });

  it('should return empty filter for users without organization in single-tenant mode', () => {
    const originalMultiTenant = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'false';

    const ctx = {
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      name: 'Test',
      organizationId: null,
    };
    const filter = orgFilter(ctx);
    expect(filter).toEqual({});

    process.env.MULTI_TENANT = originalMultiTenant;
  });

  it('should return sentinel filter for users without organization in multi-tenant mode', () => {
    const originalMultiTenant = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'true';

    const ctx = {
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      name: 'Test',
      organizationId: null,
    };
    const filter = orgFilter(ctx);
    // In multi-tenant mode, users without org should see NO data
    expect(filter).toEqual({ organizationId: '__DENIED__' });

    process.env.MULTI_TENANT = originalMultiTenant;
  });

  it('should filter by correct org even when two orgs exist', () => {
    const ctx1 = {
      userId: 'user-1',
      email: 'admin@blueprint.ae',
      role: 'ADMIN',
      name: 'Admin RAK',
      organizationId: 'org-blueprint-rak',
    };
    const ctx2 = {
      userId: 'user-2',
      email: 'admin@blueprintdxb.ae',
      role: 'ADMIN',
      name: 'Admin DXB',
      organizationId: 'org-blueprint-dxb',
    };

    const filter1 = orgFilter(ctx1);
    const filter2 = orgFilter(ctx2);

    expect(filter1).toEqual({ organizationId: 'org-blueprint-rak' });
    expect(filter2).toEqual({ organizationId: 'org-blueprint-dxb' });
    expect(filter1).not.toEqual(filter2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. orgFilterNested — Filtering Through Parent Relations
// ═══════════════════════════════════════════════════════════════════════

describe('Multi-Tenant Isolation — orgFilterNested', () => {
  let orgFilterNested: typeof import('@/app/api/utils/auth').orgFilterNested;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/auth');
    orgFilterNested = mod.orgFilterNested;
  });

  it('should create nested filter through "project" relation', () => {
    const ctx = {
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      name: 'Test',
      organizationId: 'org-1',
    };
    const filter = orgFilterNested(ctx, 'project');
    expect(filter).toEqual({ project: { organizationId: 'org-1' } });
  });

  it('should create nested filter through "task" relation', () => {
    const ctx = {
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      name: 'Test',
      organizationId: 'org-1',
    };
    const filter = orgFilterNested(ctx, 'task');
    expect(filter).toEqual({ task: { organizationId: 'org-1' } });
  });

  it('should return sentinel nested filter in multi-tenant mode without org', () => {
    const originalMultiTenant = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'true';

    const ctx = {
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      name: 'Test',
      organizationId: null,
    };
    const filter = orgFilterNested(ctx, 'project');
    expect(filter).toEqual({ project: { organizationId: '__DENIED__' } });

    process.env.MULTI_TENANT = originalMultiTenant;
  });

  it('should return empty nested filter in single-tenant mode without org', () => {
    const originalMultiTenant = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'false';

    const ctx = {
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      name: 'Test',
      organizationId: null,
    };
    const filter = orgFilterNested(ctx, 'project');
    expect(filter).toEqual({});

    process.env.MULTI_TENANT = originalMultiTenant;
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. orgCheck — Cross-Tenant Access Blocking
// ═══════════════════════════════════════════════════════════════════════

describe('Multi-Tenant Isolation — orgCheck', () => {
  let orgCheck: typeof import('@/app/api/utils/auth').orgCheck;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/auth');
    orgCheck = mod.orgCheck;
  });

  it('should block access to a record from a different organization', () => {
    const originalMultiTenant = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'true';

    const ctx = {
      userId: 'user-1',
      email: 'admin@blueprint.ae',
      role: 'ADMIN',
      name: 'Admin RAK',
      organizationId: 'org-blueprint-rak',
    };
    // This record belongs to a different organization
    const record = { organizationId: 'org-blueprint-dxb' };

    const error = orgCheck(ctx, record);
    expect(error).not.toBeNull();
    expect(error!.status).toBe(403);

    process.env.MULTI_TENANT = originalMultiTenant;
  });

  it('should allow access to a record from the same organization', () => {
    const originalMultiTenant = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'true';

    const ctx = {
      userId: 'user-1',
      email: 'admin@blueprint.ae',
      role: 'ADMIN',
      name: 'Admin RAK',
      organizationId: 'org-blueprint-rak',
    };
    const record = { organizationId: 'org-blueprint-rak' };

    const error = orgCheck(ctx, record);
    expect(error).toBeNull(); // No error = access allowed

    process.env.MULTI_TENANT = originalMultiTenant;
  });

  it('should allow access in single-tenant mode regardless of organizationId', () => {
    const originalMultiTenant = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'false';

    const ctx = {
      userId: 'user-1',
      email: 'admin@blueprint.ae',
      role: 'ADMIN',
      name: 'Admin',
      organizationId: 'org-1',
    };
    // Even though record has different org, single-tenant mode should allow access
    const record = { organizationId: 'org-2' };

    const error = orgCheck(ctx, record);
    expect(error).toBeNull();

    process.env.MULTI_TENANT = originalMultiTenant;
  });

  it('should return null for non-existent records (let caller handle 404)', () => {
    const originalMultiTenant = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'true';

    const ctx = {
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      name: 'Test',
      organizationId: 'org-1',
    };

    const error = orgCheck(ctx, null);
    expect(error).toBeNull(); // Caller handles 404

    process.env.MULTI_TENANT = originalMultiTenant;
  });

  it('should block users without organization from accessing org-scoped records', () => {
    const originalMultiTenant = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'true';

    const ctx = {
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      name: 'Test',
      organizationId: null,
    };
    const record = { organizationId: 'org-1' };

    const error = orgCheck(ctx, record);
    expect(error).not.toBeNull();
    expect(error!.status).toBe(403);

    process.env.MULTI_TENANT = originalMultiTenant;
  });

  it('should allow access to records with null organizationId when user has no org', () => {
    const originalMultiTenant = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'true';

    const ctx = {
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      name: 'Test',
      organizationId: null,
    };
    // Record also has no organizationId
    const record = { organizationId: null };

    const error = orgCheck(ctx, record);
    // Both have null org, should be allowed (or at least not blocked by org mismatch)
    expect(error).toBeNull();

    process.env.MULTI_TENANT = originalMultiTenant;
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. orgCreate — Enforcing organizationId on New Records
// ═══════════════════════════════════════════════════════════════════════

describe('Multi-Tenant Isolation — orgCreate', () => {
  let orgCreate: typeof import('@/app/api/utils/auth').orgCreate;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/auth');
    orgCreate = mod.orgCreate;
  });

  it('should include organizationId for users with an organization', () => {
    const ctx = {
      userId: 'user-1',
      email: 'admin@blueprint.ae',
      role: 'ADMIN',
      name: 'Admin',
      organizationId: 'org-blueprint-rak',
    };
    const create = orgCreate(ctx);
    expect(create).toEqual({ organizationId: 'org-blueprint-rak' });
  });

  it('should include sentinel organizationId in multi-tenant mode without org', () => {
    const originalMultiTenant = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'true';

    const ctx = {
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      name: 'Test',
      organizationId: null,
    };
    const create = orgCreate(ctx);
    // In multi-tenant mode, records MUST have an orgId
    // Using sentinel prevents creation of orphaned records
    expect(create).toEqual({ organizationId: '__DENIED__' });

    process.env.MULTI_TENANT = originalMultiTenant;
  });

  it('should return empty object in single-tenant mode without org', () => {
    const originalMultiTenant = process.env.MULTI_TENANT;
    process.env.MULTI_TENANT = 'false';

    const ctx = {
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      name: 'Test',
      organizationId: null,
    };
    const create = orgCreate(ctx);
    expect(create).toEqual({});

    process.env.MULTI_TENANT = originalMultiTenant;
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. Cross-Tenant Data Leakage Scenarios
// ═══════════════════════════════════════════════════════════════════════

describe('Multi-Tenant Isolation — Cross-Tenant Leakage Prevention', () => {
  let orgFilter: typeof import('@/app/api/utils/auth').orgFilter;
  let orgFilterNested: typeof import('@/app/api/utils/auth').orgFilterNested;
  let orgCheck: typeof import('@/app/api/utils/auth').orgCheck;
  let orgCreate: typeof import('@/app/api/utils/auth').orgCreate;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/auth');
    orgFilter = mod.orgFilter;
    orgFilterNested = mod.orgFilterNested;
    orgCheck = mod.orgCheck;
    orgCreate = mod.orgCreate;
  });

  afterEach(() => {
    // Reset MULTI_TENANT env var
    delete (process.env as Record<string, string>).MULTI_TENANT;
  });

  it('should prevent Org1 admin from querying Org2 projects', () => {
    process.env.MULTI_TENANT = 'true';

    const org1Ctx = {
      userId: 'user-1',
      email: 'admin@blueprint.ae',
      role: 'ADMIN',
      name: 'Admin RAK',
      organizationId: 'org-blueprint-rak',
    };

    // If orgFilter is applied to db.project.findMany(), only org1 projects are returned
    const filter = orgFilter(org1Ctx);
    expect(filter).toEqual({ organizationId: 'org-blueprint-rak' });
    // This filter would exclude all org-blueprint-dxb projects
  });

  it('should prevent Org1 user from accessing Org2 project by ID', () => {
    process.env.MULTI_TENANT = 'true';

    const org1Ctx = {
      userId: 'user-1',
      email: 'admin@blueprint.ae',
      role: 'ADMIN',
      name: 'Admin RAK',
      organizationId: 'org-blueprint-rak',
    };

    // Simulate fetching a project that belongs to org2
    const org2Project = { organizationId: 'org-blueprint-dxb' };

    // orgCheck should block this access
    const error = orgCheck(org1Ctx, org2Project);
    expect(error).not.toBeNull();
    expect(error!.status).toBe(403);
  });

  it('should prevent Org1 user from counting Org2 task comments', () => {
    process.env.MULTI_TENANT = 'true';

    const org1Ctx = {
      userId: 'user-1',
      email: 'admin@blueprint.ae',
      role: 'ADMIN',
      name: 'Admin RAK',
      organizationId: 'org-blueprint-rak',
    };

    // orgFilterNested on "task" would filter comments through their parent task's org
    const nestedFilter = orgFilterNested(org1Ctx, 'task');
    expect(nestedFilter).toEqual({ task: { organizationId: 'org-blueprint-rak' } });
    // This ensures only comments belonging to org1's tasks are counted
  });

  it('should prevent Org1 user from creating records in Org2 context', () => {
    process.env.MULTI_TENANT = 'true';

    const org1Ctx = {
      userId: 'user-1',
      email: 'admin@blueprint.ae',
      role: 'ADMIN',
      name: 'Admin RAK',
      organizationId: 'org-blueprint-rak',
    };

    // orgCreate should set organizationId to org1, NOT org2
    const createData = orgCreate(org1Ctx);
    expect(createData).toEqual({ organizationId: 'org-blueprint-rak' });
    // Even if the user tries to pass a different orgId in the request body,
    // orgCreate ensures the correct org is set from the auth context
  });

  it('should prevent users without org from accessing any data in multi-tenant mode', () => {
    process.env.MULTI_TENANT = 'true';

    const noOrgCtx = {
      userId: 'user-no-org',
      email: 'noorg@test.com',
      role: 'ADMIN',
      name: 'No Org User',
      organizationId: null,
    };

    // orgFilter should return sentinel that matches no records
    const filter = orgFilter(noOrgCtx);
    expect(filter).toEqual({ organizationId: '__DENIED__' });

    // orgCheck should block access to any record with an orgId
    const error = orgCheck(noOrgCtx, { organizationId: 'org-1' });
    expect(error).not.toBeNull();
    expect(error!.status).toBe(403);
  });

  it('should handle edge case: record with null organizationId in multi-tenant mode', () => {
    process.env.MULTI_TENANT = 'true';

    const org1Ctx = {
      userId: 'user-1',
      email: 'admin@blueprint.ae',
      role: 'ADMIN',
      name: 'Admin RAK',
      organizationId: 'org-blueprint-rak',
    };

    // A record without organizationId (legacy data or system record)
    const legacyRecord = { organizationId: null };

    // orgCheck should allow access since the record has no org restriction
    const error = orgCheck(org1Ctx, legacyRecord);
    expect(error).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. Environment Configuration — MULTI_TENANT Flag
// ═══════════════════════════════════════════════════════════════════════

describe('Multi-Tenant Isolation — Environment Configuration', () => {
  let orgFilter: typeof import('@/app/api/utils/auth').orgFilter;
  let orgCheck: typeof import('@/app/api/utils/auth').orgCheck;

  beforeAll(async () => {
    const mod = await import('@/app/api/utils/auth');
    orgFilter = mod.orgFilter;
    orgCheck = mod.orgCheck;
  });

  afterEach(() => {
    delete (process.env as Record<string, string>).MULTI_TENANT;
  });

  it('should enforce tenant isolation when MULTI_TENANT=true', () => {
    process.env.MULTI_TENANT = 'true';

    const ctx = {
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      name: 'Test',
      organizationId: null,
    };

    const filter = orgFilter(ctx);
    expect(filter).toEqual({ organizationId: '__DENIED__' });
  });

  it('should NOT enforce tenant isolation when MULTI_TENANT=false', () => {
    process.env.MULTI_TENANT = 'false';

    const ctx = {
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      name: 'Test',
      organizationId: null,
    };

    const filter = orgFilter(ctx);
    expect(filter).toEqual({});
  });

  it('should NOT enforce tenant isolation when MULTI_TENANT is not set (single-tenant default)', () => {
    delete (process.env as Record<string, string>).MULTI_TENANT;

    const ctx = {
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      name: 'Test',
      organizationId: null,
    };

    const filter = orgFilter(ctx);
    expect(filter).toEqual({});
  });

  it('should always filter by orgId for users with organization regardless of MULTI_TENANT flag', () => {
    // When MULTI_TENANT=false (single tenant mode)
    process.env.MULTI_TENANT = 'false';

    const ctx = {
      userId: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      name: 'Test',
      organizationId: 'org-1',
    };

    const filter = orgFilter(ctx);
    expect(filter).toEqual({ organizationId: 'org-1' });

    // When MULTI_TENANT=true (multi tenant mode)
    process.env.MULTI_TENANT = 'true';

    const filter2 = orgFilter(ctx);
    expect(filter2).toEqual({ organizationId: 'org-1' });
  });
});
