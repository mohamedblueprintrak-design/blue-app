import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateRequest, employeeUpdateSchema, validateIdParam } from '@/lib/api-validation';
import { log } from '@/lib/logger';
import { sanitizeObject } from '@/lib/security/sanitize';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

// GET /api/employees/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireVerifiedPermission(request, Permission.EMPLOYEE_READ);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const employee = await db.employee.findFirst({
      where: { id, deletedAt: null, user: { ...orgFilter(ctx) } },
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
            department: true,
            position: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Remove salary from response for non-HR/Admin users
    const canSeeSalary = ctx.role === 'ADMIN' || ctx.role === 'HR';
    const sanitizedEmployee = canSeeSalary
      ? employee
      : (() => { const { salary: _salary, ...rest } = employee; return rest; })();

    return NextResponse.json(sanitizedEmployee);
  } catch (error) {
    log.error("GET /api/employees/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch employee" }, { status: 500 });
  }
}

// PUT /api/employees/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const authResult = await requireVerifiedPermission(request, Permission.EMPLOYEE_UPDATE);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify employee belongs to user's org
    const existing = await db.employee.findFirst({
      where: { id, user: { ...orgFilter(ctx) } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateRequest(employeeUpdateSchema, body);

    // Zod validation for employee update fields
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const sanitizedBody = sanitizeObject(validation.data);

    const validatedData = validation.data;

    const employee = await db.employee.update({
      where: { id },
      data: {
        ...(validatedData.department !== undefined && { department: validatedData.department }),
        ...(validatedData.position !== undefined && { position: validatedData.position }),
        ...(validatedData.salary !== undefined && { salary: validatedData.salary }),
        ...(validatedData.employmentStatus !== undefined && { employmentStatus: validatedData.employmentStatus }),
        ...(validatedData.hireDate !== undefined && {
          hireDate: validatedData.hireDate ? new Date(validatedData.hireDate) : null,
        }),
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

    // Also update the linked user if department/position changed
    if (validatedData.department !== undefined || validatedData.position !== undefined) {
      await db.user.update({
        where: { id: employee.userId },
        data: {
          ...(validatedData.department !== undefined && { department: validatedData.department }),
          ...(validatedData.position !== undefined && { position: validatedData.position }),
        },
      });
    }

    return NextResponse.json(employee);
  } catch (error) {
    log.error("PUT /api/employees/[id] error:", error);
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}

// DELETE /api/employees/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const authResult = await requireVerifiedPermission(request, Permission.USER_DELETE);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify employee belongs to user's org
    const existing = await db.employee.findFirst({
      where: { id, user: { ...orgFilter(ctx) } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    await db.employee.update({ where: { id }, data: { deletedAt: new Date() } });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("DELETE /api/employees/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}
