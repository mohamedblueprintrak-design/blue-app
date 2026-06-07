import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { startAllWorkers, getWorkersStatus, closeAllWorkers } from '@/lib/queue';
import { timingSafeEqual } from 'crypto';

/**
 * POST /api/cron/workers — Start all BullMQ workers
 *
 * Security: Requires CRON_SECRET header to prevent unauthorized access.
 * Call with: curl -X POST -H "Authorization: Bearer $CRON_SECRET" /api/cron/workers
 *
 * Starts workers for:
 * 1. Email queue — processes email sending jobs
 * 2. Notification queue — processes notification delivery jobs
 * 3. Automation queue — processes automation trigger jobs
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.error('[Cron/Workers] CRON_SECRET not configured — workers endpoint disabled');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }

  // SECURITY: Use timing-safe comparison to prevent timing attacks
  const expectedAuth = `Bearer ${cronSecret}`;
  if (!authHeader || authHeader.length !== expectedAuth.length || !timingSafeEqual(Buffer.from(authHeader, 'utf8'), Buffer.from(expectedAuth, 'utf8'))) {
    log.security('[Cron/Workers] Unauthorized workers start attempt', {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if Redis is available
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return NextResponse.json(
        {
          error: 'Redis not configured',
          message: 'Set REDIS_URL environment variable to enable job processing',
        },
        { status: 503 }
      );
    }

    // Start all workers
    await startAllWorkers();

    // Get worker status
    const status = await getWorkersStatus();

    log.info('[Cron/Workers] Workers started successfully', {
      workerCount: status.length,
    });

    return NextResponse.json({
      success: true,
      message: 'All workers started',
      timestamp: new Date().toISOString(),
      workers: status.map((w) => ({
        queue: w.queueName,
        isRunning: w.isRunning,
        isPaused: w.isPaused,
      })),
    });
  } catch (error) {
    log.error('[Cron/Workers] Failed to start workers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start workers',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/workers — Get worker status
 *
 * Returns the current status of all running workers.
 * Also protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ status: 'disabled' }, { status: 200 });
  }

  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${cronSecret}`;
  if (!authHeader || authHeader.length !== expectedAuth.length || !timingSafeEqual(Buffer.from(authHeader, 'utf8'), Buffer.from(expectedAuth, 'utf8'))) {
    // Return 404 instead of revealing the endpoint exists
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const status = await getWorkersStatus();

    return NextResponse.json({
      status: 'running',
      timestamp: new Date().toISOString(),
      workers: status.map((w) => ({
        queue: w.queueName,
        isRunning: w.isRunning,
        isPaused: w.isPaused,
      })),
      redis: {
        configured: !!process.env.REDIS_URL,
        url: process.env.REDIS_URL ? '(configured)' : '(not set)',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cron/workers — Stop all workers gracefully
 *
 * Gracefully shuts down all active workers.
 * Protected by CRON_SECRET.
 */
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }

  const expectedAuth = `Bearer ${cronSecret}`;
  if (!authHeader || authHeader.length !== expectedAuth.length || !timingSafeEqual(Buffer.from(authHeader, 'utf8'), Buffer.from(expectedAuth, 'utf8'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await closeAllWorkers();

    log.info('[Cron/Workers] All workers stopped');

    return NextResponse.json({
      success: true,
      message: 'All workers stopped gracefully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[Cron/Workers] Failed to stop workers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stop workers' },
      { status: 500 }
    );
  }
}
