import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { timingSafeCompare } from '@/lib/middleware/security';
import { checkRedisHealth } from '@/lib/cache/redis';
import { isStripeConfigured, getStripe } from '@/lib/stripe';
import { getStorageProvider } from '@/lib/storage';
import { log } from '@/lib/logger';
import { getWorkersStatus, WorkerStatus } from '@/lib/queue';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface HealthCheckResult {
  status: 'up' | 'down' | 'degraded' | 'not_configured';
  latencyMs?: number;
  error?: string;
}

interface MemoryInfo {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    stripe: HealthCheckResult;
    storage: HealthCheckResult;
    queues: HealthCheckResult & { workers?: WorkerStatus[] };
    chatService: HealthCheckResult;
  };
  memory: MemoryInfo;
}

// ─────────────────────────────────────────────────────────────────────────────
// Version from package.json (read once at module load)
// ─────────────────────────────────────────────────────────────────────────────

let _version = 'unknown';
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pkg = require('../../../../package.json');
  _version = pkg.version || 'unknown';
} catch {
  // Fallback — package.json not readable
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual Checks
// ─────────────────────────────────────────────────────────────────────────────

async function checkDatabase(): Promise<HealthCheckResult> {
  try {
    const start = Date.now();
    await db.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return { status: 'up', latencyMs };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown database error';
    log.error('Health check: database error', err);
    return { status: 'down', error };
  }
}

async function checkRedis(): Promise<HealthCheckResult> {
  // If Redis is not enabled (no REDIS_URL), report not_configured (non-critical)
  if (!process.env.REDIS_URL) {
    return { status: 'not_configured' };
  }

  try {
    const health = await checkRedisHealth();
    if (health.status === 'healthy') {
      return { status: 'up', latencyMs: health.latency };
    }
    if (health.status === 'degraded') {
      return { status: 'degraded', latencyMs: health.latency };
    }
    // unhealthy
    return { status: 'down', error: health.error || 'Redis unhealthy' };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown Redis error';
    log.error('Health check: Redis error', err);
    return { status: 'down', error };
  }
}

async function checkStripe(): Promise<HealthCheckResult> {
  if (!isStripeConfigured) {
    return { status: 'not_configured' };
  }

  try {
    const start = Date.now();
    const stripe = getStripe();
    await stripe.products.list({ limit: 1 });
    const latencyMs = Date.now() - start;
    return { status: 'up', latencyMs };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown Stripe error';
    log.error('Health check: Stripe error', err);
    return { status: 'down', error };
  }
}

async function checkStorage(): Promise<HealthCheckResult> {
  try {
    const storageType = process.env.STORAGE_TYPE || 'local';

    if (storageType === 'local') {
      // For local storage, check if the upload directory is writable
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const resolvedDir = path.resolve(uploadDir);

      // Check if directory exists and is writable
      if (!fs.existsSync(resolvedDir)) {
        // Try to create it
        fs.mkdirSync(resolvedDir, { recursive: true });
      }

      // Write a tiny temp file to verify write access
      const testFile = path.join(resolvedDir, `.health-check-${Date.now()}`);
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);

      return { status: 'up' };
    }

    // For S3 storage, try to instantiate the provider (existence check)
    const provider = getStorageProvider();
    if (provider) {
      return { status: 'up' };
    }

    return { status: 'down', error: 'Storage provider not available' };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown storage error';
    log.error('Health check: Storage error', err);
    return { status: 'down', error };
  }
}

async function checkQueues(): Promise<HealthCheckResult & { workers?: WorkerStatus[] }> {
  try {
    const statuses = await getWorkersStatus();
    const allRunning = statuses.length > 0 && statuses.every((w) => w.isRunning && !w.isPaused);
    return {
      status: allRunning ? 'up' : statuses.length === 0 ? 'not_configured' : 'degraded',
      workers: statuses,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown Queue error';
    log.error('Health check: Queue error', err);
    return { status: 'down', error };
  }
}

async function checkChatService(): Promise<HealthCheckResult> {
  const chatServiceUrl = process.env.CHAT_SERVICE_URL || 'http://localhost:3003';
  const healthUrl = `${chatServiceUrl}/health`;

  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout
    
    const response = await fetch(healthUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const latencyMs = Date.now() - start;

    if (!response.ok) {
      return { status: 'down', error: `HTTP status ${response.status}` };
    }

    const data = (await response.json()) as { status: string };
    if (data.status === 'ok') {
      return { status: 'up', latencyMs };
    }

    return { status: 'degraded', error: 'Chat service health status is not ok' };
  } catch (err) {
    const error =
      err instanceof Error
        ? err.name === 'AbortError'
          ? 'Timeout'
          : err.message
        : 'Unknown chat service error';
    log.error('Health check: chat service error', err);
    return { status: 'down', error };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Determine overall status
// ─────────────────────────────────────────────────────────────────────────────

function computeOverallStatus(
  checks: HealthResponse['checks']
): 'healthy' | 'degraded' | 'unhealthy' {
  // Database is critical — if down, entire system is unhealthy
  if (checks.database.status === 'down') {
    return 'unhealthy';
  }

  // Storage is critical — if down, system is unhealthy
  if (checks.storage.status === 'down') {
    return 'unhealthy';
  }

  // Non-critical checks that indicate degradation
  const nonCriticalDegraded =
    checks.redis.status === 'down' ||
    checks.stripe.status === 'down' ||
    checks.queues.status === 'down' ||
    checks.chatService.status === 'down';

  if (nonCriticalDegraded) {
    return 'degraded';
  }

  // If any check is "degraded" (e.g., high latency Redis)
  const anyDegraded = Object.values(checks).some(
    (c) => c.status === 'degraded'
  );

  if (anyDegraded) {
    return 'degraded';
  }

  return 'healthy';
}

// ─────────────────────────────────────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── Authentication ──
  // The detailed health info is only available with a valid
  // Authorization: Bearer <HEALTH_CHECK_SECRET> header.
  const healthCheckSecret = process.env.HEALTH_CHECK_SECRET;
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  const isAuthenticated =
    healthCheckSecret && bearerToken && await timingSafeCompare(bearerToken, healthCheckSecret);

  // Unauthenticated: check database connectivity and return basic status
  if (!isAuthenticated) {
    const dbCheck = await checkDatabase();
    if (dbCheck.status === 'down') {
      return NextResponse.json({
        status: 'error',
        message: 'Database connectivity check failed',
        timestamp: new Date().toISOString(),
      }, { status: 503 });
    }
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }

  // ── Authenticated: run all checks ──
  const [database, redis, stripe, storage, queues, chatService] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkStripe(),
    checkStorage(),
    checkQueues(),
    checkChatService(),
  ]);

  const checks: HealthResponse['checks'] = {
    database,
    redis,
    stripe,
    storage,
    queues,
    chatService,
  };

  const overallStatus = computeOverallStatus(checks);

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: _version,
    uptime: Math.floor(process.uptime()),
    checks,
    memory: process.memoryUsage(),
  };

  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, { status: httpStatus });
}
