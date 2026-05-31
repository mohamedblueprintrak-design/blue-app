import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateRequest, userUpdateSchema, validateIdParam } from '@/lib/api-validation';
import { orgFilter, requireVerifiedPermission } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { handleApiError } from '@/lib/api-error';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.USER_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const user = await db.user.findFirst({
      where: { id, ...orgFilter(ctx) },
      include: {
        employee: true,
        projects: {
          include: { project: { select: { id: true, name: true, number: true } } },
        },
        _count: {
          select: {
            tasks: true,
            activities: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: unknown) {
    return handleApiError(error, 'User GET');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC: requires USER_UPDATE permission (JWT-verified for user management)
    const rbac = await requireVerifiedPermission(request, Permission.USER_UPDATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify user belongs to same org
    const existingUser = await db.user.findFirst({
      where: { id, ...orgFilter(ctx) },
    });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    const validation = validateRequest(userUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const validatedData = validation.data;

    const updateData: Record<string, unknown> = {
      ...(validatedData.name !== undefined && { name: validatedData.name }),
      ...(validatedData.email !== undefined && { email: validatedData.email }),
      ...(validatedData.phone !== undefined && { phone: validatedData.phone }),
      ...(validatedData.department !== undefined && { department: validatedData.department }),
      ...(validatedData.position !== undefined && { position: validatedData.position }),
      ...(validatedData.avatar !== undefined && { avatar: validatedData.avatar }),
      // NOTE: role is excluded from userUpdateSchema for security (privilege escalation prevention).
      // Role changes must go through a dedicated admin-only endpoint.
      ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
    };

    const user = await db.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(user);
  } catch (error: unknown) {
    return handleApiError(error, 'User PUT');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'strict');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC: requires USER_DELETE permission (JWT-verified for user management)
    const rbac = await requireVerifiedPermission(request, Permission.USER_DELETE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    // Cannot delete yourself
    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    if (ctx.userId === id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Verify user belongs to same org
    const existingUser = await db.user.findFirst({
      where: { id, ...orgFilter(ctx) },
    });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Soft delete instead of hard delete
    await db.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, 'User DELETE');
  }
}
