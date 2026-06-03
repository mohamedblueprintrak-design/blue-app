import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { log } from '@/lib/logger';

/**
 * GET /api/auth/microsoft
 *
 * Initiates Microsoft Entra ID (Azure AD) OAuth 2.0 flow.
 * Generates a CSRF state token, stores it in a short-lived cookie,
 * and redirects the user to Microsoft's consent screen.
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      log.warn('Microsoft OAuth attempted without configured credentials');
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('تسجيل الدخول عبر Microsoft غير مفعل')}`
      );
    }

    // Generate CSRF state token
    const state = randomBytes(32).toString('hex');

    // Build redirect URI — must match what's registered in Azure AD / Entra ID
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const redirectUri = `${baseUrl}/api/auth/microsoft/callback`;

    // Construct Microsoft Entra ID OAuth URL
    const microsoftAuthUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    microsoftAuthUrl.searchParams.set('client_id', clientId);
    microsoftAuthUrl.searchParams.set('redirect_uri', redirectUri);
    microsoftAuthUrl.searchParams.set('response_type', 'code');
    microsoftAuthUrl.searchParams.set('scope', 'openid profile email User.Read');
    microsoftAuthUrl.searchParams.set('state', state);
    microsoftAuthUrl.searchParams.set('response_mode', 'query');

    // Redirect to Microsoft's consent screen
    const response = NextResponse.redirect(microsoftAuthUrl.toString());

    // Store state in a short-lived cookie for CSRF verification in the callback
    response.cookies.set('microsoft_oauth_state', state, {
      path: '/',
      maxAge: 10 * 60, // 10 minutes
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    log.error('Error initiating Microsoft OAuth:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent('حدث خطأ أثناء تسجيل الدخول عبر Microsoft')}`
    );
  }
}
