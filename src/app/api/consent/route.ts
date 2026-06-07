import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/app/api/utils/auth';
import { successResponse } from '@/app/api/utils/response';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

export async function POST(request: NextRequest) {
  try {
    const { allowed: _allowed, result: rlResult } = await withRateLimit(request, 'public');
    const blocked = rateLimitResponse(rlResult);
    if (blocked) return blocked;

    const body = await request.json();
    const consentGiven = body.consent === true;

    // Set cookie
    const response = successResponse({ consent: consentGiven });
    response.cookies.set('gdpr_consent', consentGiven ? 'true' : 'false', {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    // Optionally save to database if user is logged in
    const authCtx = getAuthContext(request);
    if (authCtx && authCtx.userId) {
      log.info(`User ${authCtx.userId} set GDPR consent to ${consentGiven}`);
    }

    return response;
  } catch (error) {
    log.error('Error saving GDPR consent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
