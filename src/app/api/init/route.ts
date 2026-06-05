import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { DEMO_CREDENTIALS, isDemoMode, validateDemoMode } from '@/lib/demo-credentials';
import { UserRole } from '@prisma/client';
import { log } from '@/lib/logger';
import { requireVerifiedAdmin } from '@/app/api/utils/auth';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { PASSWORD_CONFIG } from '@/lib/auth/modules/password';

/**
 * POST /api/init - Sync demo user passwords (ADMIN ONLY)
 *
 * SECURITY:
 * - Requires authenticated admin user
 * - Rate limited (strict: 5 requests/minute)
 * - NEVER exposes passwords in the response
 * - Only syncs passwords, does NOT seed data
 *
 * All seeding is handled by prisma/seed.ts (run with `bun run db:seed`).
 *
 * Password syncing is critical because:
 * - Old seed data may have stale bcrypt hashes
 * - DEMO_CREDENTIALS passwords may have been updated
 * - Demo users may be missing if the DB was partially initialized
 */

export async function POST(request: NextRequest) {
  try {
    validateDemoMode();
    // ============================================
    // 1. Rate limiting — strict limiter (5 req/min)
    // ============================================

    const { result: rateLimitResult } = await withRateLimit(request, 'strict');
    const rlBlocked = rateLimitResponse(rateLimitResult);
    if (rlBlocked) return rlBlocked;

    // ============================================
    // 2. Authentication check - only ADMIN users (JWT-verified)
    // SECURITY FIX: Use requireVerifiedAdmin() instead of getAuthContext()
    // to prevent header forgery attacks on this admin-only endpoint.
    // ============================================
    const adminResult = await requireVerifiedAdmin(request);
    if ('error' in adminResult) return adminResult.error;
    const authCtx = adminResult.user;

    // ============================================
    // 3. Sync demo user passwords
    // ============================================
    const userCount = await db.user.count();

    const demoEmails = DEMO_CREDENTIALS.map(c => c.email);
    const existingUsers = await db.user.findMany({
      where: { email: { in: demoEmails } },
      select: { id: true, email: true, password: true },
    });

    let syncedCount = 0;
    const org = await db.organization.findFirst();
    for (const cred of DEMO_CREDENTIALS) {
      const existing = existingUsers.find(u => u.email === cred.email);
      if (existing) {
        // Check if the current password hash is valid
        let needsUpdate = false;
        if (!existing.password || !existing.password.startsWith('$2')) {
          needsUpdate = true;
        } else {
          const matches = await bcrypt.compare(cred.password, existing.password);
          if (!matches) needsUpdate = true;
        }

        if (needsUpdate) {
          const hash = await bcrypt.hash(cred.password, PASSWORD_CONFIG.bcryptRounds);
          await db.user.update({
            where: { id: existing.id },
            data: {
              password: hash,
              isActive: true,
              organizationId: org?.id || "",
              role: cred.role as UserRole,
            },
          });
          syncedCount++;
        }
      } else {
        // Demo user doesn't exist yet — create them
        const hash = await bcrypt.hash(cred.password, PASSWORD_CONFIG.bcryptRounds);
        try {
          await db.user.create({
            data: {
              email: cred.email,
              password: hash,
              name: cred.nameAr,
              phone: '',
              role: cred.role as UserRole,
              department: '',
              position: '',
              isActive: true,
              organizationId: (await db.organization.findFirst())?.id || "",
            },
          });
          syncedCount++;
        } catch {
          // User may have been created concurrently — try update
          try {
            await db.user.updateMany({
              where: { email: cred.email },
              data: { password: hash, isActive: true, role: cred.role as UserRole },
            });
          } catch {
            // Ignore — best effort
          }
        }
      }
    }

    // ============================================
    // 4. Build response — NEVER expose passwords
    // ============================================
    const response: Record<string, unknown> = {
      initialized: userCount > 0,
      message: syncedCount > 0
        ? `Synced ${syncedCount} demo user passwords`
        : userCount > 0
          ? 'Database already has users'
          : 'Database is empty — run `bun run db:seed` to seed data',
      userCount,
      syncedCount,
    };

    // Show demo user emails and roles only (NEVER passwords), only in demo mode
    if (isDemoMode()) {
      response.demoUsers = DEMO_CREDENTIALS.map(c => ({
        email: c.email,
        role: c.role === 'PROJECT_MANAGER' ? 'project_manager' : c.role.toLowerCase(),
        labelAr: c.labelAr,
        labelEn: c.labelEn,
      }));
    }

    log.info('Demo user password sync completed', {
      syncedCount,
      userCount,
      triggeredBy: authCtx.userId,
    });

    return NextResponse.json(response);
  } catch (error) {
    log.error('Init error:', error);
    return NextResponse.json(
      { initialized: false, error: 'Failed to sync demo users' },
      { status: 500 },
    );
  }
}
