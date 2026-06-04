import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { logAudit } from '@/lib/services/audit.service';
import {
  generateAuthToken,
  generateDbRefreshToken,
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  getAuthCookieOptions,
} from '@/lib/auth/token-utils';

/**
 * GET /api/auth/google/callback
 *
 * Handles Google OAuth 2.0 callback.
 * - Validates the state parameter (CSRF protection)
 * - Exchanges the authorization code for tokens
 * - Fetches user info from Google
 * - Finds or creates a user in the database
 * - Sets auth cookies and redirects to /dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    // Handle user denying consent
    if (error) {
      log.info('Google OAuth: user denied consent', { error });
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('تم رفض تسجيل الدخول عبر جوجل')}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      log.warn('Google OAuth callback: missing code or state');
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('بيانات غير صالحة من جوجل')}`
      );
    }

    // ── CSRF Protection: Validate state parameter ──────────────────
    const storedState = request.cookies.get('google_oauth_state')?.value;
    if (!storedState || storedState !== state) {
      log.security('Google OAuth callback: state mismatch (CSRF)', { state, storedState });
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('رمز الأمان غير صالح')}`
      );
    }

    // ── Exchange authorization code for tokens ─────────────────────
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      log.error('Google OAuth callback: missing credentials');
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('تسجيل الدخول عبر جوجل غير مفعل')}`
      );
    }

    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      log.error('Google OAuth: token exchange failed', { status: tokenResponse.status, error: errorData });
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('فشل التحقق من جوجل')}`
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token: googleAccessToken, id_token } = tokenData;

    if (!googleAccessToken && !id_token) {
      log.error('Google OAuth: no access token in response');
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('فشل الحصول على رمز من جوجل')}`
      );
    }

    // ── Fetch user info from Google ────────────────────────────────
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    });

    if (!userInfoResponse.ok) {
      log.error('Google OAuth: failed to fetch user info', { status: userInfoResponse.status });
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('فشل الحصول على معلومات المستخدم من جوجل')}`
      );
    }

    const googleUser = await userInfoResponse.json();
    const googleId = googleUser.sub as string;
    const googleEmail = googleUser.email as string;
    const googleName = (googleUser.name as string) || '';
    const googlePicture = (googleUser.picture as string) || '';

    if (!googleId || !googleEmail) {
      log.error('Google OAuth: missing required user info from Google');
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('معلومات جوجل غير مكتملة')}`
      );
    }

    log.info('Google OAuth: user authenticated', { googleEmail, googleId });

    // ── Find or create user ────────────────────────────────────────
    let user;
    let isNewUser = false;

    // 1. Try to find user by googleId
    user = await db.user.findUnique({
      where: { googleId },
    });

    if (user) {
      // User found by Google ID — update their info
      await db.user.update({
        where: { id: user.id },
        data: {
          name: googleName || user.name,
          avatar: googlePicture || user.avatar,
          lastLogin: new Date(),
          emailVerified: user.emailVerified || new Date(), // Google verified the email
        },
      });
      log.info('Google OAuth: existing user logged in', { userId: user.id });
    } else {
      // 2. Try to find user by email (link existing account)
      user = await db.user.findFirst({
        where: { email: googleEmail },
      });

      if (user) {
        // Link the Google ID to the existing account
        await db.user.update({
          where: { id: user.id },
          data: {
            googleId,
            name: googleName || user.name,
            avatar: googlePicture || user.avatar,
            lastLogin: new Date(),
            emailVerified: user.emailVerified || new Date(),
          },
        });
        log.info('Google OAuth: linked Google account to existing user', { userId: user.id });
      } else {
        // 3. Create a new user account
        isNewUser = true;
        user = await db.user.create({
          data: {
            email: googleEmail,
            googleId,
            name: googleName,
            avatar: googlePicture,
            role: 'ENGINEER',
            isActive: true,
            emailVerified: new Date(), // Google already verified the email
            password: '', // No password — social login only
            lastLogin: new Date(),
          },
        });
        log.info('Google OAuth: new user created', { userId: user.id, email: googleEmail });
      }
    }

    // Check if user is active
    if (!user.isActive) {
      log.security('Google OAuth: login attempt on inactive account', { email: googleEmail });
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('الحساب غير نشط. تواصل مع الإدارة.')}`
      );
    }

    // ── Create JWT and set cookies (same pattern as regular login) ──
    const token = await generateAuthToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      organizationId: user.organizationId,
      passwordChangedAt: user.passwordChangedAt
        ? Math.floor(new Date(user.passwordChangedAt).getTime() / 1000)
        : 0,
    });

    const rawRefreshToken = await generateDbRefreshToken(user.id);

    // ── Audit log ──────────────────────────────────────────────────
    await logAudit({
      userId: user.id,
      organizationId: user.organizationId ?? undefined,
      entityType: 'user',
      entityId: user.id,
      action: isNewUser ? 'google_signup' : 'google_login',
      description: isNewUser
        ? 'User signed up with Google'
        : 'User logged in with Google',
    });

    log.info('Google OAuth: login successful', { userId: user.id, isNewUser });

    // ── Redirect to dashboard with cookies set ─────────────────────
    const response = NextResponse.redirect(`${baseUrl}/dashboard`);

    // Clear the OAuth state cookie
    response.cookies.set('google_oauth_state', '', {
      path: '/',
      maxAge: 0,
    });

    // Set access token cookie
    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions(ACCESS_TOKEN_MAX_AGE));

    // Set refresh token cookie
    response.cookies.set(REFRESH_COOKIE_NAME, rawRefreshToken, getAuthCookieOptions(REFRESH_TOKEN_MAX_AGE));

    // Generate a CSRF token for the new session
    const csrfToken = crypto.randomUUID().replace(/-/g, '');
    response.cookies.set('csrf_token', csrfToken, {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    log.error('Google OAuth callback error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent('حدث خطأ أثناء تسجيل الدخول عبر جوجل')}`
    );
  }
}
