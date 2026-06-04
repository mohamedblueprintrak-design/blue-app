import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST() {
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
      { error: 'Failed to reset demo data', details: error.message },
      { status: 500 }
    );
  }
}
