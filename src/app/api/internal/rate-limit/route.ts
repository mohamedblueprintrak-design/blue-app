import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters } from '@/lib/rate-limiter';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const internalSecret = process.env.INTERNAL_API_SECRET || process.env.JWT_SECRET;
    
    if (!internalSecret || authHeader !== `Bearer ${internalSecret}`) {
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
