import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { validateBody, employeeCreateSchema } from '@/lib/api-validation';
import { requireVerifiedPermission, orgFilter, orgCreate, isAdmin, isHR } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';

import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { parsePaginationParams, buildPaginationMeta, calculateSkip } from '../utils/pagination';
import { insensitiveContains } from '../utils/db';
import { cachedQuery, invalidateCache, CACHE_TTL, buildCacheKey } from '@/lib/cache/query-cache';

// GET /api/employees
export async function GET(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK - require EMPLOYEE_READ permission
    const result = await requireVerifiedPermission(request, Permission.EMPLOYEE_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department");
    const { page, limit, search } = parsePaginationParams(searchParams);

    const where: Record<string, unknown> = {
      deletedAt: null,
      user: { ...orgFilter(ctx) },
    };
    if (department && department !== "all") {
      where.department = department;
    }
    if (search) {
      where.OR = [
        { position: insensitiveContains(search) },
        { department: insensitiveContains(search) },
        { user: { name: insensitiveContains(search) } },
        { user: { email: insensitiveContains(search) } },
      ];
    }

    const cacheKey = buildCacheKey('employees', 'list', ctx.organizationId || 'global', `p${page}`, `l${limit}`, department || 'all', search || '');

    const { employees: rawEmployees, total } = await cachedQuery(cacheKey, async () => {
      const [employees, total] = await Promise.all([
        db.employee.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
                role: true,
                isActive: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: calculateSkip(page, limit),
          take: limit,
        }),
        db.employee.count({ where }),
      ]);
      return { employees, total };
    }, CACHE_TTL.USERS);

    // Remove salary from response for non-HR/Admin users
    const canSeeSalary = isAdmin(ctx.role) || isHR(ctx.role);
    const sanitizedEmployees = canSeeSalary
      ? rawEmployees
      : rawEmployees.map(({ salary: _salary, ...rest }) => rest);

    return NextResponse.json({ data: sanitizedEmployees, pagination: buildPaginationMeta(page, limit, total) });
  } catch (error) {
    log.error("GET /api/employees error:", error);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

// POST /api/employees
export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK - require EMPLOYEE_UPDATE permission
    const result = await requireVerifiedPermission(request, Permission.EMPLOYEE_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const body = await validateBody(request, employeeCreateSchema);
    if (body instanceof NextResponse) return body;
    const { userId, department, position, salary, employmentStatus, hireDate } = body;

    // Validate employmentStatus enum value
    const validStatuses = ['ACTIVE', 'ON_LEAVE', 'TERMINATED', 'PROBATION'];
    const resolvedStatus = employmentStatus && validStatuses.includes(employmentStatus) ? employmentStatus : 'ACTIVE';

    // Verify user belongs to same organization
    const targetUser = await db.user.findFirst({
      where: { id: userId, ...orgFilter(ctx) },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found in your organization' }, { status: 403 });
    }

    // Check if employee already exists for this user
    const existing = await db.employee.findUnique({
      where: { userId },
    });

    if (existing) {
      return NextResponse.json({ error: "Employee already exists for this user" }, { status: 400 });
    }

    const employee = await db.employee.create({
      data: {
        userId,
        department: department || "",
        position: position || "",
        salary: salary || 0,
        employmentStatus: resolvedStatus,
        hireDate: hireDate ? new Date(hireDate) : null,
        ...orgCreate(ctx),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    // Invalidate employee caches after creation
    await invalidateCache('employees');

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    log.error("POST /api/employees error:", error);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}
