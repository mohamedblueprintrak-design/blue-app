import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters } from '@/lib/rate-limiter';
import { log } from '@/lib/logger';
import { timingSafeCompare } from '@/lib/middleware/security';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    // SECURITY: INTERNAL_API_SECRET is required INDEPENDENTLY of JWT_SECRET.
    // Previously this fell back to JWT_SECRET, which meant a leaked JWT secret
    // could also bypass rate limiting (secret reuse). Now the operator MUST set
    // INTERNAL_API_SECRET explicitly — if missing, the endpoint 503s instead of
    // silently falling back to a weaker secret.
    const internalSecret = process.env.INTERNAL_API_SECRET;

    if (!internalSecret) {
      log.error('INTERNAL_API_SECRET is not configured — internal rate-limit API disabled');
      return NextResponse.json(
        { error: 'Internal rate-limit API not configured' },
        { status: 503 }
      );
    }

    if (!authHeader || !(await timingSafeCompare(authHeader, `Bearer ${internalSecret}`))) {
      log.security('Unauthorized access attempt to internal rate-limit API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ip, tier } = await request.json();
    if (!ip || !tier) {
      return NextResponse.json({ error: 'Missing ip or tier' }, { status: 400 });
    }

    const limiter = rateLimiters[tier as keyof typeof rateLimiters];
    if (!limiter) {
      return NextResponse.json({ error: 'Invalid rate-limit tier' }, { status: 400 });
    }

    const result = await limiter.check(ip);
    return NextResponse.json(result);
  } catch (error) {
    log.error('Error in internal rate-limit API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
