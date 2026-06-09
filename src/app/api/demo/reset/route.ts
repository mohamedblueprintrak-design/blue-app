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
    const isBun = process.env.npm_execpath?.includes('bun') || process.versions?.bun;

    // Try multiple command paths for resilience:
    // 1. bunx tsx (if running under bun)
    // 2. npx tsx (if running under node)
    // 3. Direct tsx execution via node_modules
    const attempts: Array<{ cmd: string; args: string[] }> = isBun
      ? [
          { cmd: 'bunx', args: ['tsx', 'prisma/seed.ts'] },
          { cmd: 'bun', args: ['run', 'db:seed'] },
        ]
      : [
          { cmd: 'npx', args: ['tsx', 'prisma/seed.ts'] },
          { cmd: 'node', args: ['--import', 'tsx', 'prisma/seed.ts'] },
        ];

    let lastError: Error | null = null;
    for (const { cmd, args } of attempts) {
      try {
        log.info('Demo reset: attempting seed script', { cmd, args, cwd });
        const { stdout, stderr } = await execFileAsync(cmd, args, { cwd, timeout: 120_000 });
        if (stderr && !stderr.includes('warning')) {
          log.warn('Demo reset seed script produced stderr:', { stderr });
        }
        log.info('Demo reset: seed script completed', { stdout: stdout?.slice(0, 200) });
        return NextResponse.json({ success: true, message: 'Demo data reset successfully' });
      } catch (attemptErr) {
        lastError = attemptErr instanceof Error ? attemptErr : new Error(String(attemptErr));
        log.warn('Demo reset: command failed, trying next', { cmd, args, error: lastError.message });
      }
    }

    // All attempts failed
    throw lastError || new Error('All seed attempts failed');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Failed to reset demo data:', message);
    return NextResponse.json(
      { error: 'Failed to reset demo data', detail: message },
      { status: 500 }
    );
  }
}
