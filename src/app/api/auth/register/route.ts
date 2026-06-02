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
import { validatePasswordStrength } from '@/lib/auth/modules/password';
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
    const existingEmail = await db.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    
    if (existingEmail) {
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

    // Hash password
    const hashedPassword = await hash(data.password, 12);

    // Create organization if name provided
    let organizationId: string | null = null;
    if (data.organizationName) {
      // Generate a unique slug with collision handling
      const baseSlug = data.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      let slug = baseSlug;
      let suffix = 1;

      // Check for slug collisions and append suffix counter if needed
      while (await db.organization.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${suffix}`;
        suffix++;
      }

      const org = await db.organization.create({
        data: {
          name: data.organizationName,
          slug,
          currency: 'AED',
        },
      });
      organizationId = org.id;
    }

    // Determine role - SECURITY FIX: Only admin-created orgs get admin role
    // Regular registration always gets VIEWER role (no privilege escalation)
    const role = organizationId
      ? UserRoleValues.ADMIN
      : UserRoleValues.VIEWER;

    // Create user
    const user = await db.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: hashedPassword,
        name: userName,
        role: role as UserRole,
        department: data.department || '',
        organizationId,
      },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    // Generate auth cookie token using centralized utility
    const accessToken = await generateAuthToken({
      userId: user.id,
      email: user.email,
      name: user.name ?? "",
      role: user.role as string,
      twoFactorEnabled: false,
      organizationId: user.organizationId || undefined,
      passwordChangedAt: 0, // New user — no password change yet
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
