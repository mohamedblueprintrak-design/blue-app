import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isRedisAvailable, getRedis } from '@/lib/cache/redis';
import { log } from '@/lib/logger';
import { requireVerifiedAuth } from '@/app/api/utils/auth';

export async function GET(request: NextRequest) {
  // SECURITY: For unauthenticated requests, only return basic status.
  // Previously, the x-user-id header was trusted without JWT verification,
  // allowing an attacker who bypasses the proxy to see infrastructure details.
  // Now we use requireVerifiedAuth() which re-verifies the JWT from the cookie.
  const authResult = await requireVerifiedAuth(request);
  const authenticated = 'user' in authResult;

  if (!authenticated) {
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  // Full health details for authenticated users
  const start = Date.now();
  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };

  try {
    await db.user.count({ take: 1 });
    health.database = { status: 'connected' };
  } catch (err) {
    log.error('Health check: database error', err);
    health.database = { status: 'disconnected' };
    health.status = 'degraded';
  }

  // Check Redis availability (skip connection attempt if not enabled)
  if (isRedisAvailable()) {
    try {
      const redis = await getRedis();
      if (redis) {
        await redis.ping();
        health.redis = { status: 'connected' };
      } else {
        health.redis = { status: 'not_configured' };
      }
    } catch {
      health.redis = { status: 'error' };
      health.status = 'degraded';
    }
  } else {
    health.redis = { status: 'not_configured' };
  }

  health.responseTime = `${Date.now() - start}ms`;

  return NextResponse.json(health, { status: health.status === 'ok' ? 200 : 503 });
}
