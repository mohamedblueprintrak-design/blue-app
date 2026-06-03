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

/** Shape of the Microsoft Graph /me response */
interface MicrosoftGraphUser {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
  givenName?: string | null;
  surname?: string | null;
}

/** Shape of the Microsoft OAuth token response */
interface MicrosoftTokenResponse {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

/**
 * GET /api/auth/microsoft/callback
 *
 * Handles Microsoft Entra ID (Azure AD) OAuth 2.0 callback.
 * - Validates the state parameter (CSRF protection)
 * - Exchanges the authorization code for tokens
 * - Fetches user info from Microsoft Graph
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
      log.info('Microsoft OAuth: user denied consent', { error });
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('تم رفض تسجيل الدخول عبر Microsoft')}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      log.warn('Microsoft OAuth callback: missing code or state');
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('بيانات غير صالحة من Microsoft')}`
      );
    }

    // ── CSRF Protection: Validate state parameter ──────────────────
    const storedState = request.cookies.get('microsoft_oauth_state')?.value;
    if (!storedState || storedState !== state) {
      log.security('Microsoft OAuth callback: state mismatch (CSRF)', { state, storedState });
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('رمز الأمان غير صالح')}`
      );
    }

    // ── Exchange authorization code for tokens ─────────────────────
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      log.error('Microsoft OAuth callback: missing credentials');
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('تسجيل الدخول عبر Microsoft غير مفعل')}`
      );
    }

    const redirectUri = `${baseUrl}/api/auth/microsoft/callback`;

    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
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
      log.error('Microsoft OAuth: token exchange failed', { status: tokenResponse.status, error: errorData });
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('فشل التحقق من Microsoft')}`
      );
    }

    const tokenData: MicrosoftTokenResponse = await tokenResponse.json();
    const { access_token: microsoftAccessToken } = tokenData;

    if (!microsoftAccessToken) {
      log.error('Microsoft OAuth: no access token in response');
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('فشل الحصول على رمز من Microsoft')}`
      );
    }

    // ── Fetch user info from Microsoft Graph ───────────────────────
    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${microsoftAccessToken}` },
    });

    if (!userInfoResponse.ok) {
      log.error('Microsoft OAuth: failed to fetch user info', { status: userInfoResponse.status });
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('فشل الحصول على معلومات المستخدم من Microsoft')}`
      );
    }

    const msUser: MicrosoftGraphUser = await userInfoResponse.json();
    const microsoftId = msUser.id;
    // Microsoft Graph may return null for mail; fall back to userPrincipalName
    const microsoftEmail = msUser.mail || msUser.userPrincipalName;
    const microsoftName = msUser.displayName || '';

    if (!microsoftId || !microsoftEmail) {
      log.error('Microsoft OAuth: missing required user info from Microsoft');
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('معلومات Microsoft غير مكتملة')}`
      );
    }

    log.info('Microsoft OAuth: user authenticated', { microsoftEmail, microsoftId });

    // ── Find or create user ────────────────────────────────────────
    let user;
    let isNewUser = false;

    // 1. Try to find user by microsoftId
    user = await db.user.findUnique({
      where: { microsoftId },
    });

    if (user) {
      // User found by Microsoft ID — update their info
      await db.user.update({
        where: { id: user.id },
        data: {
          name: microsoftName || user.name,
          lastLogin: new Date(),
          emailVerified: user.emailVerified || new Date(), // Microsoft verified the email
        },
      });
      log.info('Microsoft OAuth: existing user logged in', { userId: user.id });
    } else {
      // 2. Try to find user by email (link existing account)
      user = await db.user.findUnique({
        where: { email: microsoftEmail },
      });

      if (user) {
        // Link the Microsoft ID to the existing account
        await db.user.update({
          where: { id: user.id },
          data: {
            microsoftId,
            name: microsoftName || user.name,
            lastLogin: new Date(),
            emailVerified: user.emailVerified || new Date(),
          },
        });
        log.info('Microsoft OAuth: linked Microsoft account to existing user', { userId: user.id });
      } else {
        // 3. Create a new user account
        isNewUser = true;
        user = await db.user.create({
          data: {
            email: microsoftEmail,
            microsoftId,
            name: microsoftName,
            role: 'ENGINEER',
            isActive: true,
            emailVerified: new Date(), // Microsoft already verified the email
            password: '', // No password — social login only
            lastLogin: new Date(),
          },
        });
        log.info('Microsoft OAuth: new user created', { userId: user.id, email: microsoftEmail });
      }
    }

    // Check if user is active
    if (!user.isActive) {
      log.security('Microsoft OAuth: login attempt on inactive account', { email: microsoftEmail });
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
      action: isNewUser ? 'microsoft_signup' : 'microsoft_login',
      description: isNewUser
        ? 'User signed up with Microsoft'
        : 'User logged in with Microsoft',
    });

    log.info('Microsoft OAuth: login successful', { userId: user.id, isNewUser });

    // ── Redirect to dashboard with cookies set ─────────────────────
    const response = NextResponse.redirect(`${baseUrl}/dashboard`);

    // Clear the OAuth state cookie
    response.cookies.set('microsoft_oauth_state', '', {
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
    log.error('Microsoft OAuth callback error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent('حدث خطأ أثناء تسجيل الدخول عبر Microsoft')}`
    );
  }
}
