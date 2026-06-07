import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { requireVerifiedAuth } from '@/app/api/utils/auth';

const execAsync = promisify(exec);

// RATE LIMITING: This endpoint should be rate-limited at the infrastructure level
// (e.g., via Nginx/Cloudflare) to prevent abuse. Consider adding application-level
// rate limiting with withRateLimit() if infrastructure-level protection is insufficient.

export async function POST(request: NextRequest) {
  // SECURITY: Require authenticated user before any operation
  const authResult = await requireVerifiedAuth(request);
  if ('error' in authResult) return authResult.error;

  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Demo mode is not enabled' },
      { status: 403 }
    );
  }

  try {
    // Determine which package manager is available, prioritize bun since it's the default runtime for BluePrint
    // If not bun, fallback to npx
    const command = process.env.npm_execpath?.includes('bun') 
      ? 'bunx tsx prisma/seed.ts' 
      : 'npx tsx prisma/seed.ts';
      
    // Execute the seed script
    const cwd = process.cwd();
    await execAsync(command, { cwd });

    return NextResponse.json({ success: true, message: 'Demo data reset successfully' });
  } catch (error: any) {
    console.error('Failed to reset demo data:', error);
    return NextResponse.json(
      { error: 'Failed to reset demo data' },
      { status: 500 }
    );
  }
}
