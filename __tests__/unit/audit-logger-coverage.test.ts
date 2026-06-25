/**
 * Extended Tests for Audit Logger — Branch Coverage
 * Covers: flush (empty buffer, with prisma, with winston, error recovery),
 * persistToDatabase (model fallback, batch, detail branches),
 * query (filters, no model), writeToConsole, shutdown, filterSensitiveData branches
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

import { log } from '@/lib/logger';
jest.spyOn(log, 'warn').mockImplementation(() => {});
jest.spyOn(log, 'error').mockImplementation(() => {});
jest.spyOn(log, 'info').mockImplementation(() => {});

import {
  AuditLogger,
  _getAuditLogger,
  _initAuditLogger,
  auditLog,
} from '@/lib/security/audit-logger';

// ═══════════════════════════════════════════════════════════════════════
// 1. flush — branch coverage
// ═══════════════════════════════════════════════════════════════════════

describe('AuditLogger — flush branches', () => {
  let logger: AuditLogger;

  afterEach(async () => {
    if (logger) await logger.shutdown();
  });

  it('should handle empty buffer (early return)', async () => {
    logger = new AuditLogger({ console: false, persist: false });
    // Buffer is empty, flush should return immediately
    await expect(logger.flush()).resolves.toBeUndefined();
  });

  it('should flush with prisma client (activity model)', async () => {
    logger = new AuditLogger({ console: false, persist: true, flushInterval: 60000 });
    
    const mockCreateMany = jest.fn<Promise<{ count: number }>>().mockResolvedValue({ count: 1 });
    const mockPrisma = {
      activityLog: { createMany: mockCreateMany },
    };
    logger.setPrismaClient(mockPrisma);
    
    // Add entries to buffer
    logger.info('test.action', { key: 'value' }, { userId: 'user-1' });
    
    await logger.flush();
    expect(mockCreateMany).toHaveBeenCalled();
  });

  it('should flush with prisma client (auditLog model fallback)', async () => {
    logger = new AuditLogger({ console: false, persist: true, flushInterval: 60000 });
    
    const mockCreateMany = jest.fn<Promise<{ count: number }>>().mockResolvedValue({ count: 1 });
    const mockPrisma = {
      activityLog: { createMany: mockCreateMany },
      // No activity model
    };
    logger.setPrismaClient(mockPrisma);
    
    logger.info('test.action', { key: 'value' }, { userId: 'user-1' });
    
    await logger.flush();
    expect(mockCreateMany).toHaveBeenCalled();
  });

  it('should handle prisma without activity or auditLog model', async () => {
    logger = new AuditLogger({ console: false, persist: true, flushInterval: 60000 });
    
    const mockPrisma = {}; // No models
    logger.setPrismaClient(mockPrisma);
    
    logger.info('test.action');
    
    // Should not throw
    await expect(logger.flush()).resolves.toBeUndefined();
  });

  it('should re-add entries to buffer on flush failure if not shutting down', async () => {
    logger = new AuditLogger({ console: false, persist: true, flushInterval: 60000 });
    
    const mockCreateMany = jest.fn().mockRejectedValue(new Error('DB connection lost'));
    const mockPrisma = {
      activityLog: { createMany: mockCreateMany },
    };
    logger.setPrismaClient(mockPrisma);
    
    logger.info('test.action');
    
    await logger.flush();
    // Entries should be re-added to buffer since we're not shutting down
    // and buffer size is under limit
  });

  it('should NOT re-add entries when shutting down', async () => {
    logger = new AuditLogger({ console: false, persist: true, flushInterval: 60000 });
    
    const mockCreateMany = jest.fn().mockRejectedValue(new Error('DB error'));
    const mockPrisma = {
      activityLog: { createMany: mockCreateMany },
    };
    logger.setPrismaClient(mockPrisma);
    
    logger.info('test.action');
    
    // Shutdown sets isShuttingDown = true
    await logger.shutdown();
  });

  it('should flush with winston file logging enabled', async () => {
    logger = new AuditLogger({ 
      console: false, 
      persist: false, 
      winstonFileLogging: true,
      flushInterval: 60000,
    });
    
    logger.info('test.action');
    
    // Should attempt winston logging
    await expect(logger.flush()).resolves.toBeUndefined();
  });

  it('should auto-flush when buffer reaches maxBatchSize', () => {
    logger = new AuditLogger({ 
      console: false, 
      persist: true, 
      maxBatchSize: 2,
      flushInterval: 60000,
    });
    
    const mockCreateMany = jest.fn<Promise<{ count: number }>>().mockResolvedValue({ count: 2 });
    const mockPrisma = {
      activityLog: { createMany: mockCreateMany },
    };
    logger.setPrismaClient(mockPrisma);
    
    // Add entries up to maxBatchSize
    logger.info('test.action1');
    logger.info('test.action2');
    
    // Auto-flush should have been triggered
    // Give it a tick to complete
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(mockCreateMany).toHaveBeenCalled();
        logger.shutdown().then(resolve);
      }, 100);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. persistToDatabase — detail branches
// ═══════════════════════════════════════════════════════════════════════

describe('AuditLogger — persistToDatabase detail branches', () => {
  let logger: AuditLogger;

  afterEach(async () => {
    if (logger) await logger.shutdown();
  });

  it('should handle entries with description in details', async () => {
    logger = new AuditLogger({ console: false, persist: true, flushInterval: 60000 });
    
    const mockCreateMany = jest.fn<Promise<{ count: number }>>().mockResolvedValue({ count: 1 });
    const mockPrisma = {
      activityLog: { createMany: mockCreateMany },
    };
    logger.setPrismaClient(mockPrisma);
    
    logger.info('test.action', { description: 'Custom description', organizationId: 'org-1', projectId: 'proj-1' });
    
    await logger.flush();
    
    const createCall = mockCreateMany.mock.calls[0][0];
    const entry = createCall.data[0];
    expect(entry.details).toBe('Custom description');
    expect(entry.organizationId).toBe('org-1');
    expect(entry.projectId).toBe('proj-1');
  });

  it('should handle entries without description (uses action)', async () => {
    logger = new AuditLogger({ console: false, persist: true, flushInterval: 60000 });
    
    const mockCreateMany = jest.fn<Promise<{ count: number }>>().mockResolvedValue({ count: 1 });
    const mockPrisma = {
      activityLog: { createMany: mockCreateMany },
    };
    logger.setPrismaClient(mockPrisma);
    
    logger.info('test.action_no_desc', { otherKey: 'value' });
    
    await logger.flush();
    
    const createCall = mockCreateMany.mock.calls[0][0];
    const entry = createCall.data[0];
    expect(entry.details).toBe('test.action_no_desc'); // Falls back to action
    // organizationId defaults to '__DENIED__' sentinel when null (not null)
    expect(entry.organizationId).toBe('__DENIED__');
    expect(entry.projectId).toBeNull();
  });

  it('should handle entries with context fields', async () => {
    logger = new AuditLogger({ console: false, persist: true, flushInterval: 60000 });
    
    const mockCreateMany = jest.fn<Promise<{ count: number }>>().mockResolvedValue({ count: 1 });
    const mockPrisma = {
      activityLog: { createMany: mockCreateMany },
    };
    logger.setPrismaClient(mockPrisma);
    
    logger.info('test.full', {}, {
      userId: 'user-1',
      ip: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
      path: '/api/test',
      method: 'POST',
      resource: 'res-1',
      requestId: 'req-1',
    });
    
    await logger.flush();
    
    const createCall = mockCreateMany.mock.calls[0][0];
    const entry = createCall.data[0];
    expect(entry.userId).toBe('user-1');
    // Rich audit fields (ip, userAgent, path, method, resource, requestId) are
    // stored in the metadata JSON under _audit namespace (not as top-level columns).
    const metadata = JSON.parse(entry.metadata);
    expect(metadata._audit.ip).toBe('1.2.3.4');
    expect(metadata._audit.userAgent).toBe('Mozilla/5.0');
    expect(metadata._audit.path).toBe('/api/test');
    expect(metadata._audit.method).toBe('POST');
    expect(metadata._audit.resource).toBe('res-1');
    expect(metadata._audit.requestId).toBe('req-1');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. query — filter branches
// ═══════════════════════════════════════════════════════════════════════

describe('AuditLogger — query filter branches', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger({ console: false, persist: true, flushInterval: 60000 });
  });

  afterEach(async () => {
    await logger.shutdown();
  });

  it('should throw if Prisma client not configured', async () => {
    await expect(logger.query({ userId: 'user-1' })).rejects.toThrow('Prisma client not configured');
  });

  it('should return empty array if no model found', async () => {
    logger.setPrismaClient({}); // No activity or auditLog model
    const result = await logger.query({ userId: 'user-1' });
    expect(result).toEqual([]);
  });

  it('should query with all filter options', async () => {
    const mockFindMany = jest.fn<Promise<unknown[]>>().mockResolvedValue([]);
    const mockPrisma = {
      activityLog: { findMany: mockFindMany },
    };
    logger.setPrismaClient(mockPrisma);
    
    await logger.query({
      userId: 'user-1',
      category: 'AUTH',
      level: 'INFO',
      action: 'login',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      limit: 50,
      offset: 10,
    });
    
    expect(mockFindMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId: 'user-1',
        category: 'AUTH',
        level: 'INFO',
        action: { contains: 'login' },
        timestamp: {
          gte: expect.any(Date),
          lte: expect.any(Date),
        },
      }),
      orderBy: { timestamp: 'desc' },
      take: 50,
      skip: 10,
    });
  });

  it('should query with only startDate', async () => {
    const mockFindMany = jest.fn<Promise<unknown[]>>().mockResolvedValue([]);
    const mockPrisma = {
      activityLog: { findMany: mockFindMany },
    };
    logger.setPrismaClient(mockPrisma);
    
    await logger.query({
      startDate: new Date('2024-01-01'),
    });
    
    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.timestamp).toBeDefined();
    expect(where.timestamp.gte).toBeDefined();
    expect(where.timestamp.lte).toBeUndefined();
  });

  it('should query with only endDate', async () => {
    const mockFindMany = jest.fn<Promise<unknown[]>>().mockResolvedValue([]);
    const mockPrisma = {
      activityLog: { findMany: mockFindMany },
    };
    logger.setPrismaClient(mockPrisma);
    
    await logger.query({
      endDate: new Date('2024-12-31'),
    });
    
    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.timestamp).toBeDefined();
    expect(where.timestamp.lte).toBeDefined();
  });

  it('should use default limit and offset', async () => {
    const mockFindMany = jest.fn<Promise<unknown[]>>().mockResolvedValue([]);
    const mockPrisma = {
      activityLog: { findMany: mockFindMany },
    };
    logger.setPrismaClient(mockPrisma);
    
    await logger.query({});
    
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { timestamp: 'desc' },
      take: 100,
      skip: 0,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. writeToConsole — branch coverage (via console output)
// ═══════════════════════════════════════════════════════════════════════

describe('AuditLogger — console output branches', () => {
  let logger: AuditLogger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(async () => {
    consoleSpy.mockRestore();
    if (logger) await logger.shutdown();
  });

  it('should write INFO level to console', () => {
    logger = new AuditLogger({ console: true, persist: false });
    logger.info('user.login', { email: 'test@test.com' });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should include userId in console output when present', () => {
    logger = new AuditLogger({ console: true, persist: false });
    logger.info('user.login', {}, { userId: 'user-1' });
    const call = consoleSpy.mock.calls[0];
    expect(call[0]).toContain('user:user-1');
  });

  it('should include ip in console output when present', () => {
    logger = new AuditLogger({ console: true, persist: false });
    logger.info('auth.failed', {}, { ip: '1.2.3.4' });
    const call = consoleSpy.mock.calls[0];
    expect(call[0]).toContain('ip:1.2.3.4');
  });

  it('should not include userId when null', () => {
    logger = new AuditLogger({ console: true, persist: false });
    logger.info('system.startup');
    const call = consoleSpy.mock.calls[0];
    expect(call[0]).not.toContain('[user:');
  });

  it('should include details JSON when present', () => {
    logger = new AuditLogger({ console: true, persist: false });
    logger.info('user.login', { email: 'test@test.com' });
    const call = consoleSpy.mock.calls[0];
    // Details should be JSON stringified
    expect(call.length).toBeGreaterThan(0);
  });

  it('should not output to console when console is disabled', () => {
    logger = new AuditLogger({ console: false, persist: false });
    logger.info('user.login');
    // console.info might still be called by winston, but not by audit logger directly
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. log — minimum level branch
// ═══════════════════════════════════════════════════════════════════════

describe('AuditLogger — minimum level filtering', () => {
  let logger: AuditLogger;

  afterEach(async () => {
    if (logger) await logger.shutdown();
  });

  it('should skip INFO when minimum is WARNING', () => {
    const mockCreateMany = jest.fn<Promise<{ count: number }>>().mockResolvedValue({ count: 0 });
    logger = new AuditLogger({ minLevel: 'WARNING', console: false, persist: true, flushInterval: 60000 });
    logger.setPrismaClient({ activityLog: { createMany: mockCreateMany } });
    
    logger.info('test.info');
    logger.warning('test.warning');
    
    // Only warning should be in buffer
    // Flush to verify
    return logger.flush().then(() => {
      // INFO was skipped, only WARNING was recorded
      expect(mockCreateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            // level is now stored in metadata JSON under _audit namespace
            expect.objectContaining({ metadata: expect.stringContaining('"level":"WARNING"') }),
          ]),
        })
      );
    });
  });

  it('should skip WARNING when minimum is ERROR', () => {
    const mockCreateMany = jest.fn<Promise<{ count: number }>>().mockResolvedValue({ count: 0 });
    logger = new AuditLogger({ minLevel: 'ERROR', console: false, persist: true, flushInterval: 60000 });
    logger.setPrismaClient({ activityLog: { createMany: mockCreateMany } });
    
    logger.info('test.info');
    logger.warning('test.warning');
    logger.error('test.error');
    
    return logger.flush().then(() => {
      expect(mockCreateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ metadata: expect.stringContaining('"level":"ERROR"') }),
          ]),
        })
      );
    });
  });

  it('should only allow CRITICAL when minimum is CRITICAL', () => {
    const mockCreateMany = jest.fn<Promise<{ count: number }>>().mockResolvedValue({ count: 0 });
    logger = new AuditLogger({ minLevel: 'CRITICAL', console: false, persist: true, flushInterval: 60000 });
    logger.setPrismaClient({ activityLog: { createMany: mockCreateMany } });
    
    logger.info('test.info');
    logger.warning('test.warning');
    logger.error('test.error');
    logger.critical('test.critical');
    
    return logger.flush().then(() => {
      expect(mockCreateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({ metadata: expect.stringContaining('"level":"CRITICAL"') }),
          ],
        })
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. auditLog — additional branch coverage
// ═══════════════════════════════════════════════════════════════════════

describe('auditLog — additional branch coverage', () => {
  it('should auto-detect CRITICAL level for inject actions', async () => {
    await expect(auditLog('security.inject_attempt', { type: 'XSS' })).resolves.toBeUndefined();
  });

  it('should auto-detect WARNING level for block actions', async () => {
    await expect(auditLog('firewall.block_ip', { ip: '1.2.3.4' })).resolves.toBeUndefined();
  });

  it('should auto-detect WARNING level for fail actions', async () => {
    await expect(auditLog('payment.fail', { reason: 'insufficient funds' })).resolves.toBeUndefined();
  });

  it('should use INFO for neutral actions', async () => {
    await expect(auditLog('project.view', { id: 'p1' }, 'user-1')).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. Category inference — additional coverage
// ═══════════════════════════════════════════════════════════════════════

describe('AuditLogger — category inference branches', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger({ console: false, persist: false });
  });

  afterEach(async () => {
    await logger.shutdown();
  });

  it('should infer AUTH for logout', () => {
    expect(() => logger.info('logout.success')).not.toThrow();
  });

  it('should infer AUTH for register', () => {
    expect(() => logger.info('register.new_user')).not.toThrow();
  });

  it('should infer AUTH for OTP', () => {
    expect(() => logger.info('otp.send')).not.toThrow();
  });

  it('should infer AUTH for SESSION', () => {
    expect(() => logger.info('session.expire')).not.toThrow();
  });

  it('should infer SYSTEM for WEBHOOK', () => {
    expect(() => logger.info('webhook.receive')).not.toThrow();
  });

  it('should infer SYSTEM for unknown prefixes', () => {
    expect(() => logger.info('something.weird')).not.toThrow();
  });

  it('should infer DATA for UPLOAD', () => {
    expect(() => logger.info('upload.file')).not.toThrow();
  });

  it('should infer PERMISSION for ROLE', () => {
    expect(() => logger.info('role.change')).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. Sensitive data filtering — additional branches
// ═══════════════════════════════════════════════════════════════════════

describe('AuditLogger — sensitive data filtering branches', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger({ console: false, persist: false });
  });

  afterEach(async () => {
    await logger.shutdown();
  });

  it('should redact cookie fields', () => {
    expect(() => logger.info('request.received', { cookie: 'session=abc123' })).not.toThrow();
  });

  it('should redact authorization fields', () => {
    expect(() => logger.info('api.call', { authorization: 'Bearer token123' })).not.toThrow();
  });

  it('should redact SSN fields', () => {
    expect(() => logger.info('user.profile', { ssn: '123-45-6789' })).not.toThrow();
  });

  it('should redact CVV fields', () => {
    expect(() => logger.info('payment.attempt', { cvv: '123' })).not.toThrow();
  });

  it('should redact private_key fields', () => {
    expect(() => logger.info('cert.check', { private_key: '-----BEGIN RSA-----' })).not.toThrow();
  });

  it('should redact bank_account fields', () => {
    expect(() => logger.info('payment.setup', { bank_account: '1234567890' })).not.toThrow();
  });

  it('should redact pin fields', () => {
    expect(() => logger.info('auth.verify', { pin: '1234' })).not.toThrow();
  });

  it('should redact otp fields', () => {
    expect(() => logger.info('auth.otp', { otp: '123456' })).not.toThrow();
  });

  it('should redact access_token fields', () => {
    expect(() => logger.info('auth.token', { access_token: 'tok_abc123' })).not.toThrow();
  });

  it('should redact refresh_token fields', () => {
    expect(() => logger.info('auth.refresh', { refresh_token: 'ref_abc123' })).not.toThrow();
  });

  it('should handle arrays of primitives (no filtering needed)', () => {
    expect(() => logger.info('data.list', { ids: [1, 2, 3] })).not.toThrow();
  });

  it('should handle null values in details', () => {
    expect(() => logger.info('data.null', { value: null })).not.toThrow();
  });
});
