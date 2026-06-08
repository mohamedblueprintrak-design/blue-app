import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { requireVerifiedAdmin } from '@/app/api/utils/auth';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { log } from '@/lib/logger';

const execFileAsync = promisify(execFile);

/**
 * POST /api/demo/reset — Reset demo database to seed data
 *
 * SECURITY: Requires admin privileges. Only available in DEMO_MODE.
 * Uses execFile() (not exec()) to prevent shell injection.
 */
export async function POST(request: NextRequest) {
  // SECURITY: Require verified admin — this endpoint wipes and re-seeds the entire DB
  const authResult = await requireVerifiedAdmin(request);
  if ('error' in authResult) return authResult.error;

  // Rate limiting — strict limiter to prevent abuse
  const { result: rlResult } = await withRateLimit(request, 'strict');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Demo mode is not enabled' },
      { status: 403 }
    );
  }

  try {
    // Determine which package manager is available, prioritize bun since it's the default runtime for BluePrint
    // SECURITY: Use execFile() instead of exec() to prevent shell injection.
    // execFile() executes the binary directly without a shell interpreter.
    const cwd = process.cwd();
    const isBun = process.env.npm_execpath?.includes('bun');
    const cmd = isBun ? 'bunx' : 'npx';
    await execFileAsync(cmd, ['tsx', 'prisma/seed.ts'], { cwd });

    return NextResponse.json({ success: true, message: 'Demo data reset successfully' });
  } catch (error: unknown) {
    log.error('Failed to reset demo data:', error);
    return NextResponse.json(
      { error: 'Failed to reset demo data' },
      { status: 500 }
    );
  }
}
