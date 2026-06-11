import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedAuth } from '@/app/api/utils/auth';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import * as crypto from 'crypto';

/**
 * GET /api/auth/link-oauth
 * Returns the current OAuth link status for the authenticated user.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireVerifiedAuth(request);
  if ('error' in authResult) return authResult.error;

  try {
    const user = await db.user.findUnique({
      where: { id: authResult.user.userId },
      select: { googleId: true, microsoftId: true },
    });

    return NextResponse.json({
      google: !!user?.googleId,
      microsoft: !!user?.microsoftId,
    });
  } catch (error) {
    log.error('Error fetching OAuth link status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OAuth link status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/link-oauth
 * Initiate OAuth linking by returning the authorization URL.
 * Body: { provider: "google" | "microsoft" }
 */
export async function POST(request: NextRequest) {
  const authResult = await requireVerifiedAuth(request);
  if ('error' in authResult) return authResult.error;

  try {
    const body = await request.json();
    const { provider } = body;

    if (!provider || !['google', 'microsoft'].includes(provider)) {
      return NextResponse.json(
        { error: 'Provider must be "google" or "microsoft"' },
        { status: 400 }
      );
    }

    // Generate state with link flag
    const state = crypto.randomBytes(32).toString('base64url');
    // Generate PKCE verifier
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Encode linking info into state (userId + provider + random)
    const linkState = Buffer.from(
      JSON.stringify({ state, userId: authResult.user.userId, provider })
    ).toString('base64url');

    let authorizationUrl: string;
    const isProduction = process.env.NODE_ENV === 'production';

    if (provider === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return NextResponse.json(
          { error: 'Google OAuth is not configured' },
          { status: 503 }
        );
      }

      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || (isProduction ? '' : 'http://localhost:3000')}/api/auth/google/callback`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
        state: linkState,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

      // Store state and verifier in cookies (10-min TTL, same as existing OAuth routes)
      const cookieOptions = {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        maxAge: 60 * 10,
      };

      const response = NextResponse.json({ url: authorizationUrl });
      response.cookies.set('google_oauth_state', linkState, cookieOptions);
      response.cookies.set('google_oauth_verifier', codeVerifier, cookieOptions);
      // Store linking intent
      response.cookies.set('oauth_link_intent', provider, {
        ...cookieOptions,
        httpOnly: true,
      });
      return response;
    } else {
      // Microsoft
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return NextResponse.json(
          { error: 'Microsoft OAuth is not configured' },
          { status: 503 }
        );
      }

      const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || (isProduction ? '' : 'http://localhost:3000')}/api/auth/microsoft/callback`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile User.Read',
        response_mode: 'query',
        state: linkState,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      authorizationUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`;

      const cookieOptions = {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        maxAge: 60 * 10,
      };

      const response = NextResponse.json({ url: authorizationUrl });
      response.cookies.set('microsoft_oauth_state', linkState, cookieOptions);
      response.cookies.set('microsoft_oauth_verifier', codeVerifier, cookieOptions);
      response.cookies.set('oauth_link_intent', provider, {
        ...cookieOptions,
        httpOnly: true,
      });
      return response;
    }
  } catch (error) {
    log.error('Error initiating OAuth link:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth linking' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/link-oauth
 * Unlink an OAuth provider from the current account.
 * Body: { provider: "google" | "microsoft" }
 */
export async function DELETE(request: NextRequest) {
  const authResult = await requireVerifiedAuth(request);
  if ('error' in authResult) return authResult.error;

  try {
    const body = await request.json();
    const { provider } = body;

    if (!provider || !['google', 'microsoft'].includes(provider)) {
      return NextResponse.json(
        { error: 'Provider must be "google" or "microsoft"' },
        { status: 400 }
      );
    }

    // SECURITY: Prevent unlinking if the user has no password set
    // (would lock them out of their account)
    const user = await db.user.findUnique({
      where: { id: authResult.user.userId },
      select: {
        password: true,
        googleId: true,
        microsoftId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const field = provider === 'google' ? 'googleId' : 'microsoftId';
    if (!user[field]) {
      return NextResponse.json(
        { error: `${provider} account is not linked` },
        { status: 400 }
      );
    }

    // Check that the user won't be locked out
    const hasPassword = user.password && !user.password.startsWith('!oauth_');
    const hasOtherProvider =
      (provider === 'google' && !!user.microsoftId) ||
      (provider === 'microsoft' && !!user.googleId);

    if (!hasPassword && !hasOtherProvider) {
      return NextResponse.json(
        {
          error:
            'Cannot unlink: you would be locked out. Set a password first.',
        },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: authResult.user.userId },
      data: { [field]: null },
    });

    log.info('OAuth provider unlinked', {
      userId: authResult.user.userId,
      provider,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Error unlinking OAuth provider:', error);
    return NextResponse.json(
      { error: 'Failed to unlink OAuth provider' },
      { status: 500 }
    );
  }
}
