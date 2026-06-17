/**
 * Backup Verification API Route
 * مسار التحقق من النسخ الاحتياطي
 *
 * POST /api/backup/verify — Verify a backup file's integrity
 * Admin only, rate limited (3 req/hour)
 */

import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/backup-service';
import { requireVerifiedAdmin } from '@/app/api/utils/auth';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Zod schema for verification request
const verifyBackupSchema = z.object({
  filename: z.string()
    .min(1, 'اسم الملف مطلوب')
    .max(255, 'اسم الملف طويل جداً')
    .regex(/^blueprint_backup_[\w-]+\.(\db|sql\.gz)$/, 'اسم ملف النسخة الاحتياطية غير صالح'),
});

/**
 * POST — Verify a backup file's integrity
 * التحقق من سلامة ملف النسخة الاحتياطية
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting — 3 req/hour (reuse passwordReset limiter which is 3/hour)
    const { result: rlResult } = await withRateLimit(request, 'passwordReset');
    const rlBlocked = rateLimitResponse(rlResult);
    if (rlBlocked) return rlBlocked;

    // RBAC CHECK — Admin only (JWT-verified for backup operations)
    const rbac = await requireVerifiedAdmin(request);
    if ('error' in rbac) return rbac.error;

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'جسم الطلب غير صالح' },
        { status: 400 }
      );
    }

    const validation = verifyBackupSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: firstError?.message || 'بيانات غير صالحة',
          errors: Object.fromEntries(
            validation.error.issues.map((issue) => [
              issue.path.join('.') || '_root',
              [issue.message],
            ])
          ),
        },
        { status: 400 }
      );
    }

    const { filename } = validation.data;

    // Run backup verification
    const result = await backupService.verifyBackup(filename);

    log.info(`[Backup Verify] Admin ${rbac.user.userId} verified backup: ${filename}, valid=${result.valid}`);

    // If valid backup, also check for expected tables
    let tables: string[] = [];
    const recordCounts: Record<string, number> = {};
    const isRunningSQLite = process.env.DATABASE_URL?.startsWith('file:');

    if (result.valid) {
      try {
        const { db } = await import('@/lib/db');

        if (isRunningSQLite) {
          // Query SQLite master table for list of tables
          const tableRows = await db.$queryRaw<Array<{ name: string }>>`
            SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'
          `;
          tables = tableRows.map((row) => row.name);
        } else {
          // Query PostgreSQL catalog for list of tables
          const tableRows = await db.$queryRaw<Array<{ tablename: string }>>`
            SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma_%'
          `;
          tables = tableRows.map((row) => row.tablename);
        }

        // Count records in key tables
        const keyTables = ['User', 'Organization', 'Project', 'Task', 'Client', 'Invoice', 'Contract'];
        for (const table of keyTables) {
          if (tables.includes(table)) {
            try {
              const countRows = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM ${Prisma.raw(`"${table}"`)}`;
              recordCounts[table] = Number(countRows[0]?.count ?? 0);
            } catch {
              recordCounts[table] = -1; // Error reading count
            }
          }
        }
      } catch (error) {
        log.warn('[Backup Verify] Could not inspect database tables:', { error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        valid: result.valid,
        checksum: result.checksum,
        size: result.size,
        isSQLite: result.isSQLite,
        headerValid: result.headerValid,
        tables,
        recordCounts,
        verifiedAt: result.verifiedAt,
        ...(result.error && { error: result.error }),
      },
    });
  } catch (error) {
    log.error('Error verifying backup:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء التحقق من النسخة الاحتياطية' },
      { status: 500 }
    );
  }
}
