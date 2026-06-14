/**
 * Tests for BaseRepository
 * Tests the generic CRUD repository pattern implementation
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Create a mock PrismaClient
const mockDelegate = {
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn().mockResolvedValue({ _count: 0 }),
  groupBy: jest.fn().mockResolvedValue([]),
};

const mockPrisma = {
  user: mockDelegate,
  $transaction: jest.fn().mockImplementation(fn => fn({})),
} as unknown as import('@prisma/client').PrismaClient;

import { BaseRepository, IRepository, FindManyOptions } from '@/lib/repositories/base.repository';

// Create a concrete implementation for testing
class TestRepository extends BaseRepository<Record<string, unknown>> {
  constructor() {
    super(mockPrisma, 'user', true);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 1. findById
// ═══════════════════════════════════════════════════════════════════════

describe('BaseRepository — findById', () => {
  let repo: TestRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new TestRepository();
  });

  it('should find entity by ID with soft delete filter', async () => {
    mockDelegate.findFirst.mockResolvedValue({ id: '1', name: 'Test', deletedAt: null });
    const result = await repo.findById('1');
    expect(result).not.toBeNull();
    expect(mockDelegate.findFirst).toHaveBeenCalledWith({
      where: { id: '1', deletedAt: null },
    });
  });

  it('should return null when entity not found', async () => {
    mockDelegate.findFirst.mockResolvedValue(null);
    const result = await repo.findById('nonexistent');
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. findOne
// ═══════════════════════════════════════════════════════════════════════

describe('BaseRepository — findOne', () => {
  let repo: TestRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new TestRepository();
  });

  it('should find entity by conditions with soft delete filter', async () => {
    mockDelegate.findFirst.mockResolvedValue({ id: '1', email: 'test@example.com', deletedAt: null });
    const result = await repo.findOne({ email: 'test@example.com' });
    expect(result).not.toBeNull();
    const call = mockDelegate.findFirst.mock.calls[0][0];
    expect(call.where.deletedAt).toBeNull();
  });

  it('should return null when no entity matches', async () => {
    mockDelegate.findFirst.mockResolvedValue(null);
    const result = await repo.findOne({ email: 'none@example.com' });
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. findMany
// ═══════════════════════════════════════════════════════════════════════

describe('BaseRepository — findMany', () => {
  let repo: TestRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new TestRepository();
  });

  it('should find multiple entities with soft delete filter', async () => {
    mockDelegate.findMany.mockResolvedValue([{ id: '1' }, { id: '2' }]);
    const result = await repo.findMany();
    expect(result).toHaveLength(2);
    const call = mockDelegate.findMany.mock.calls[0][0];
    expect(call.where.deletedAt).toBeNull();
  });

  it('should apply pagination options', async () => {
    mockDelegate.findMany.mockResolvedValue([]);
    await repo.findMany({ skip: 10, take: 5 });
    const call = mockDelegate.findMany.mock.calls[0][0];
    expect(call.skip).toBe(10);
    expect(call.take).toBe(5);
  });

  it('should apply where conditions', async () => {
    mockDelegate.findMany.mockResolvedValue([]);
    await repo.findMany({ where: { role: 'ADMIN' } });
    const call = mockDelegate.findMany.mock.calls[0][0];
    expect(call.where.role).toBe('ADMIN');
    expect(call.where.deletedAt).toBeNull();
  });

  it('should apply ordering', async () => {
    mockDelegate.findMany.mockResolvedValue([]);
    await repo.findMany({ orderBy: { name: 'asc' } });
    const call = mockDelegate.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ name: 'asc' });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. findManyIncludingDeleted
// ═══════════════════════════════════════════════════════════════════════

describe('BaseRepository — findManyIncludingDeleted', () => {
  let repo: TestRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new TestRepository();
  });

  it('should not filter by deletedAt', async () => {
    mockDelegate.findMany.mockResolvedValue([{ id: '1' }]);
    await repo.findManyIncludingDeleted();
    const call = mockDelegate.findMany.mock.calls[0][0];
    expect(call.where).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. create
// ═══════════════════════════════════════════════════════════════════════

describe('BaseRepository — create', () => {
  let repo: TestRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new TestRepository();
  });

  it('should create a new entity', async () => {
    mockDelegate.create.mockResolvedValue({ id: '1', name: 'New' });
    const result = await repo.create({ name: 'New' });
    expect(result.id).toBe('1');
    expect(mockDelegate.create).toHaveBeenCalledWith({ data: { name: 'New' } });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. update
// ═══════════════════════════════════════════════════════════════════════

describe('BaseRepository — update', () => {
  let repo: TestRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new TestRepository();
  });

  it('should update entity by ID', async () => {
    mockDelegate.update.mockResolvedValue({ id: '1', name: 'Updated' });
    const result = await repo.update('1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
    expect(mockDelegate.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { name: 'Updated' },
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. delete
// ═══════════════════════════════════════════════════════════════════════

describe('BaseRepository — delete', () => {
  let repo: TestRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new TestRepository();
  });

  it('should delete entity by ID', async () => {
    mockDelegate.delete.mockResolvedValue(undefined);
    await repo.delete('1');
    expect(mockDelegate.delete).toHaveBeenCalledWith({ where: { id: '1' } });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. count
// ═══════════════════════════════════════════════════════════════════════

describe('BaseRepository — count', () => {
  let repo: TestRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new TestRepository();
  });

  it('should count entities with soft delete filter', async () => {
    mockDelegate.count.mockResolvedValue(5);
    const result = await repo.count();
    expect(result).toBe(5);
    const call = mockDelegate.count.mock.calls[0][0];
    expect(call.where.deletedAt).toBeNull();
  });

  it('should count with additional where conditions', async () => {
    mockDelegate.count.mockResolvedValue(2);
    const result = await repo.count({ role: 'ADMIN' });
    expect(result).toBe(2);
    const call = mockDelegate.count.mock.calls[0][0];
    expect(call.where.role).toBe('ADMIN');
    expect(call.where.deletedAt).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. exists
// ═══════════════════════════════════════════════════════════════════════

describe('BaseRepository — exists', () => {
  let repo: TestRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new TestRepository();
  });

  it('should return true when entity exists', async () => {
    mockDelegate.count.mockResolvedValue(1);
    const result = await repo.exists('1');
    expect(result).toBe(true);
  });

  it('should return false when entity does not exist', async () => {
    mockDelegate.count.mockResolvedValue(0);
    const result = await repo.exists('nonexistent');
    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 10. softDelete
// ═══════════════════════════════════════════════════════════════════════

describe('BaseRepository — softDelete', () => {
  let repo: TestRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new TestRepository();
  });

  it('should set deletedAt timestamp', async () => {
    mockDelegate.update.mockResolvedValue({ id: '1', deletedAt: new Date() });
    const result = await repo.softDelete('1');
    expect(mockDelegate.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { deletedAt: expect.any(Date) },
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 11. Repository without soft delete
// ═══════════════════════════════════════════════════════════════════════

class NoSoftDeleteRepo extends BaseRepository<Record<string, unknown>> {
  constructor() {
    super(mockPrisma, 'user', false);
  }
}

describe('BaseRepository — without soft delete', () => {
  let repo: NoSoftDeleteRepo;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new NoSoftDeleteRepo();
  });

  it('should not add deletedAt filter in findById', async () => {
    mockDelegate.findFirst.mockResolvedValue({ id: '1' });
    await repo.findById('1');
    const call = mockDelegate.findFirst.mock.calls[0][0];
    expect(call.where.deletedAt).toBeUndefined();
  });

  it('should not add deletedAt filter in findMany', async () => {
    mockDelegate.findMany.mockResolvedValue([]);
    await repo.findMany();
    const call = mockDelegate.findMany.mock.calls[0][0];
    expect(call.where.deletedAt).toBeUndefined();
  });

  it('should not add deletedAt filter in count', async () => {
    mockDelegate.count.mockResolvedValue(10);
    await repo.count();
    const call = mockDelegate.count.mock.calls[0][0];
    expect(call.where.deletedAt).toBeUndefined();
  });
});
