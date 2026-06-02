import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { orgFilter, orgCreate, requireVerifiedPermission } from '@/app/api/utils/auth';
import { Permission, UserRoleValues } from '@/lib/auth/types';
import { getRoleLevel, normalizeRole } from '@/lib/auth/modules/authorization';
import { cacheDeletePattern } from '@/lib/cache/redis';
import { cachedQuery, invalidateCache, CACHE_TTL, buildCacheKey } from '@/lib/cache/query-cache';
import { log } from '@/lib/logger';
import { handleApiError } from '@/lib/api-error';
import { forbiddenResponse } from '@/app/api/utils/response';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import * as crypto from 'crypto';

// Zod schema for user creation
const userCreateSchema = z.object({
  email: z.string().email('Invalid email format').min(1, 'Email is required'),
  name: z.string().min(1, 'Name is required').max(200),
  phone: z.string().max(50).optional().default(''),
  role: z.string().max(50).optional().default('VIEWER'),
  department: z.string().max(100).optional().default(''),
  position: z.string().max(100).optional().default(''),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export async function GET(request: NextRequest) {
  try {
    // RBAC CHECK - requires USER_READ permission (JWT-verified for user management)
    const rbac = await requireVerifiedPermission(request, Permission.USER_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    // Only expose salary to ADMIN and HR roles
    const canSeeSalary = ctx.role === 'ADMIN' || ctx.role === 'HR';

    const cacheKey = buildCacheKey('users', 'list', ctx.organizationId || 'global', `p${page}`, `l${limit}`);

    const { data: users, total } = await cachedQuery(cacheKey, async () => {
      const users = await db.user.findMany({
        where: { ...orgFilter(ctx) },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatar: true,
          role: true,
          department: true,
          position: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          employee: {
            select: {
              ...(canSeeSalary ? { salary: true } : {}),
              employmentStatus: true,
              hireDate: true,
            },
          },
        },
      });
      const total = await db.user.count({ where: { ...orgFilter(ctx) } });
      return { data: users, total };
    }, CACHE_TTL.USERS);

    return NextResponse.json({ data: users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error: unknown) {
    log.error('Error fetching users:', error);
    return handleApiError(error, 'Users GET');
  }
}

export async function POST(request: NextRequest) {
  try {
    // RBAC CHECK - requires USER_CREATE permission (JWT-verified for user management)
    const rbac = await requireVerifiedPermission(request, Permission.USER_CREATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const body = await request.json();

    // Zod validation
    const validation = userCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { email, name, phone, role, department, position, password } = validation.data;

    // ── Privilege escalation guard ──────────────────────────────────
    // A creator may only assign roles at or below their own level.
    // Without this check, a Manager (who has USER_CREATE permission)
    // could create an Admin user and escalate privileges.
    const requestedRole = normalizeRole(role || 'VIEWER');
    const validRoles = Object.values(UserRoleValues) as string[];
    if (!validRoles.includes(requestedRole)) {
      return NextResponse.json(
        { error: `Invalid role: ${requestedRole}. الدور غير صالح: ${requestedRole}` },
        { status: 400 }
      );
    }
    const creatorLevel = getRoleLevel(ctx.role);
    const requestedLevel = getRoleLevel(requestedRole);
    if (requestedLevel > creatorLevel) {
      return forbiddenResponse(
        `Cannot assign a role higher than your own. لا يمكنك تعيين دور أعلى من دورك`
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Always hash the password with bcrypt before storing
    const hashedPassword = await hash(password || crypto.randomUUID(), 12);

    const user = await db.user.create({
      data: {
        email,
        name,
        phone: phone || '',
        role: requestedRole as UserRole,
        department: department || '',
        position: position || '',
        password: hashedPassword,
        ...orgCreate(ctx),
      },
    });

    // Invalidate dashboard and user caches after user creation
    await cacheDeletePattern(`dashboard:${ctx.organizationId || 'global'}:*`);
    await invalidateCache('users');

    log.info('User created', { userId: user.id, email: user.email, role: user.role, createdBy: ctx.userId });

    return NextResponse.json(user, { status: 201 });
  } catch (error: unknown) {
    log.error('Error creating user:', error);
    return handleApiError(error, 'Users POST');
  }
}
