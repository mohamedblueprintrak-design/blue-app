/**
 * User Registration API Route
 * مسار تسجيل المستخدمين
 * 
 * POST /api/auth/register - Register a new user
 * 
 * SECURITY:
 * - Rate limiting on all auth endpoints to prevent brute force
 * - Input validation on all fields
 * - HTTP-only cookies for refresh tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth-service';
import { UserRoleValues } from '@/lib/auth/types';
import { successResponse, errorResponse } from '../../utils/response';
import { hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { validateRequest, registerSchema } from '@/lib/api-validation';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { AccountingService } from '@/lib/services/accounting.service';
import { validatePasswordStrength, checkPasswordBreached } from '@/lib/auth/modules/password';
import {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  normalizeRoleForClient,
  generateAuthToken,
  generateDbRefreshToken,
  getAuthCookieOptions,
} from '@/lib/auth/token-utils';

/**
 * POST - Handle user registration
 * SECURITY: Rate limited to prevent brute force attacks
 */
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: User registration
 *     description: Register a new user account. Creates organization if organizationName is provided (user becomes admin). Otherwise, user is assigned viewer role. Sends email verification. Sets HTTP-only auth cookies.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: Password (min 8 chars, uppercase, lowercase, number, special char)
 *               name:
 *                 type: string
 *                 description: User full name
 *                 example: "Ahmed Al Mansouri"
 *               fullName:
 *                 type: string
 *                 description: Alternative to name field
 *               organizationName:
 *                 type: string
 *                 description: Organization name. If provided, creates new org and user becomes admin.
 *                 example: "Al Rashid Engineering"
 *               department:
 *                 type: string
 *                 description: User department
 *                 example: "Engineering"
 *               action:
 *                 type: string
 *                 enum: [register, signup]
 *                 default: register
 *                 description: Action type (optional, defaults to register)
 *     responses:
 *       200:
 *         description: Registration successful. Returns user data, sets auth cookies, and sends verification email.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserResponse'
 *                     emailVerificationSent:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *         headers:
 *           Set-Cookie:
 *             description: "Sets blue_token (access token, 15 min) and blue_refresh_token (refresh token, 7 days)"
 *             schema:
 *               type: string
 *       400:
 *         description: Validation error, email already exists, or weak password
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - $ref: '#/components/schemas/ValidationError'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(request: NextRequest) {
  // Rate limiting — dedicated 'auth' limiter for account creation
  // Checked BEFORE any processing to reject abusive requests early
  const { result: rlResult } = await withRateLimit(request, 'auth');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  try {
    const body = await request.json();
    
    // Support both 'register' action and direct registration
    const action = body.action || 'register';
    
    if (action !== 'register' && action !== 'signup') {
      return errorResponse(`Invalid action: ${action}`, 'BAD_REQUEST', 400);
    }

    // Zod validation for registration fields
    const validation = validateRequest(registerSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    return await handleRegister(validation.data);
  } catch (error) {
    log.error('Register error:', error);
    return errorResponse('حدث خطأ غير متوقع', 'INTERNAL_ERROR', 500);
  }
}

/**
 * Handle user registration
 */
async function handleRegister(
  data: {
    email: string;
    password: string;
    name?: string;
    fullName?: string;
    organizationName?: string;
    role?: string;
    department?: string;
  },
): Promise<NextResponse> {
  // Determine the name field (support both 'name' and 'fullName')
  const userName = data.name || data.fullName || '';

  try {
    // Check if email already exists
    const existingUser = await db.user.findFirst({
      where: { email: data.email.toLowerCase() },
    });
    
    if (existingUser) {
      // SECURITY: Perform a dummy hash computation to prevent timing attacks (CWE-208)
      // by balancing execution time between existing and non-existing email flows.
      await hash(data.password, 12);

      // SECURITY: Return a generic message to prevent email enumeration (CWE-204)
      return NextResponse.json(
        { success: true, message: 'إذا كان هذا البريد غير مسجل، سيتم إرسال رسالة تحقق' },
        { status: 200 }
      );
    }

    // SECURITY: Validate password strength before hashing
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.valid) {
      return errorResponse(
        passwordValidation.errors.join('. '),
        'WEAK_PASSWORD',
        400
      );
    }

    // SECURITY: Check if the password has been found in known data breaches
    const isBreached = await checkPasswordBreached(data.password);
    if (isBreached) {
      return errorResponse(
        'This password has been found in a data breach. Please choose a different password.',
        'BREACHED_PASSWORD',
        400
      );
    }

    // Hash password
    const hashedPassword = await hash(data.password, 12);

    // Determine role - SECURITY FIX: Organization creators get MANAGER role (not ADMIN)
    // Regular registration always gets VIEWER role (no privilege escalation)
    const role = data.organizationName
      ? UserRoleValues.MANAGER
      : UserRoleValues.VIEWER;

    // Create organization and user atomically in a transaction
    let user;

    if (data.organizationName) {
      // Generate base slug — collision handling is performed INSIDE the
      // transaction below to eliminate the TOCTOU race condition.
      // (Previous implementation pre-checked slug availability outside the
      // transaction, which left a window for a concurrent request to grab
      // the same slug between the check and the create.)
      const baseSlug = data.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Wrap slug check + org + user creation in a single transaction.
      // The check + create are now atomic — no TOCTOU window.
      // Retry on unique-constraint violation (P2002) or internal SLUG_COLLISION
      // signal by appending an incrementing suffix to the slug.
      const maxSlugAttempts = 5;
      let slugAttempts = 0;
      let currentSlug = baseSlug;
      let suffix = 1;

      while (slugAttempts < maxSlugAttempts) {
        try {
          const result = await db.$transaction(async (tx) => {
            // INSIDE TRANSACTION: check slug availability atomically.
            // If a concurrent transaction has already taken this slug, this
            // findUnique will return the existing org — we throw a typed
            // error to retry with a new slug (rather than relying on the
            // unique-constraint error which would also work but is less explicit).
            const existing = await tx.organization.findUnique({
              where: { slug: currentSlug },
              select: { id: true },
            });
            if (existing) {
              const collisionErr = new Error('SLUG_COLLISION') as Error & {
                code?: string;
              };
              collisionErr.code = 'SLUG_COLLISION';
              throw collisionErr;
            }

            const org = await tx.organization.create({
              data: {
                name: data.organizationName!,
                slug: currentSlug,
                currency: 'AED',
              },
            });
            // Seed default Chart of Accounts for the new organization
            await AccountingService.seedDefaultAccounts(tx, org.id);
            const createdUser = await tx.user.create({
              data: {
                email: data.email.toLowerCase(),
                password: hashedPassword,
                name: userName,
                role: role as UserRole,
                department: data.department || '',
                organizationId: org.id,
              },
              include: {
                organization: {
                  select: { id: true, name: true },
                },
              },
            });
            return { org, user: createdUser };
          });

          user = result.user;
          break;
        } catch (error: unknown) {
          const err = error as Error & { code?: string };
          // Retry on our explicit SLUG_COLLISION signal OR Prisma's
          // unique-constraint violation (P2002) — both indicate the slug
          // was taken between the check and the create.
          if (err?.code === 'SLUG_COLLISION' || err?.code === 'P2002') {
            slugAttempts++;
            if (slugAttempts >= maxSlugAttempts) {
              throw error;
            }
            currentSlug = `${baseSlug}-${suffix}`;
            suffix++;
            continue;
          }
          // Any other error (DB connection, validation, etc.) — rethrow
          throw error;
        }
      }
    } else {
      // SECURITY FIX: Do NOT auto-assign user to the first organization in the DB.
      // Previously: `db.organization.findFirst()` (no WHERE clause) would pick an
      // arbitrary org from the entire tenant table and assign the new user to it —
      // leaking one tenant's org to a completely unrelated registrant.
      //
      // Correct behavior: create the user without an organization.
      // They must receive an invitation to join an org (sent by an existing admin).
      // Their role defaults to VIEWER and orgId is null until they accept an invite.
      user = await db.user.create({
        data: {
          email: data.email.toLowerCase(),
          password: hashedPassword,
          name: userName,
          role: UserRoleValues.VIEWER as UserRole,
          department: data.department || '',
          organizationId: null, // Will be stored as NULL in DB — user has no org until invited
        },
        include: {
          organization: {
            select: { id: true, name: true },
          },
        },
      });

    }

    // Safety check — user must exist at this point
    if (!user) {
      return errorResponse('فشل في إنشاء الحساب', 'REGISTRATION_FAILED', 500);
    }

    // Generate auth cookie token using centralized utility
    // SECURITY: emailVerified is false — user must verify email before full access
    const accessToken = await generateAuthToken({
      userId: user.id,
      email: user.email,
      name: user.name ?? "",
      role: user.role as string,
      twoFactorEnabled: false,
      organizationId: user.organizationId || "",
      passwordChangedAt: 0, // New user — no password change yet
      emailVerified: false, // User has not verified their email yet
    });

    // Generate refresh token using centralized utility
    const refreshToken = await generateDbRefreshToken(user.id);

    // Send verification email
    try {
      await authService.sendVerificationEmail(
        user.email,
        user.name ?? "",
        user.id
      );
    } catch (emailError) {
      log.error('Failed to send verification email:', emailError);
      // Continue anyway - user can request resend
    }

    // Build the response and set HTTP-only cookies
    // SECURITY: Do NOT include `token: accessToken` in the JSON body.
    // The access token is already set as an httpOnly cookie (below), which
    // JavaScript cannot read. Returning it in the body would expose it to XSS.
    const response = successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? "",
        role: normalizeRoleForClient(user.role as string),
        avatar: user.avatar,
        organizationId: user.organizationId,
        organization: (user as Record<string, unknown>).organization,
      },
      emailVerificationSent: true,
      message: 'تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني.',
    });

    // Set cookies on the response object
    if (response instanceof NextResponse) {
      response.cookies.set(AUTH_COOKIE_NAME, accessToken, getAuthCookieOptions(ACCESS_TOKEN_MAX_AGE));
      response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, getAuthCookieOptions(REFRESH_TOKEN_MAX_AGE));
    }

    return response;
  } catch (error) {
    log.error('Registration error:', error);
    return errorResponse('حدث خطأ أثناء إنشاء الحساب', 'REGISTRATION_FAILED', 500);
  }
}
