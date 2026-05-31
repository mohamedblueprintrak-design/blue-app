import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { validateBody, employeeCreateSchema } from '@/lib/api-validation';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { canAccessHR } from '@/lib/auth/modules/authorization';
import { log } from '@/lib/logger';
import { sanitizeObject } from '@/lib/security/sanitize';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { parsePaginationParams, buildPaginationMeta, calculateSkip } from '../utils/pagination';

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
    const { page, limit } = parsePaginationParams(searchParams);

    const where: Record<string, unknown> = {
      user: { ...orgFilter(ctx) },
    };
    if (department && department !== "all") {
      where.department = department;
    }

    // SECURITY: Only expose salary to privileged roles (ADMIN, HR, ACCOUNTANT)
    // Other roles with EMPLOYEE_READ should see employee info but NOT salary
    const userCanSeeSalary = canAccessHR(ctx.role) || ctx.role.toUpperCase() === 'ACCOUNTANT';

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

    // Strip salary from response for non-privileged roles
    const sanitizedEmployees = userCanSeeSalary
      ? employees
      : employees.map(({ salary: _s, ...rest }) => rest);

    return NextResponse.json({ employees: sanitizedEmployees, pagination: buildPaginationMeta(page, limit, total) });
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
    const sanitizedBody = sanitizeObject(body);
    const { userId, department, position, salary, employmentStatus, hireDate } = sanitizedBody;

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
        employmentStatus: (employmentStatus || "ACTIVE") as any, // eslint-disable-line @typescript-eslint/no-explicit-any
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

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    log.error("POST /api/employees error:", error);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}
