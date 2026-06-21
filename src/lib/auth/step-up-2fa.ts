/**
 * Step-up 2FA Middleware for Sensitive Routes
 * طبقة تحقق إضافية للمسارات الحساسة
 *
 * ما هو الـ Step-up 2FA؟
 * - الـ 2FA العادي بيطلب كود في الـ login بس.
 * - الـ Step-up 2FA بيطلب كود تاني قبل العمليات الحساسة (billing, delete account, تغيير صلاحيات).
 * - ده بيحمي لو حد سرق session token — مش هيقدر يعمل عمليات حساسة بدون الكود.
 *
 * الاستخدام:
 *   import { requireStepUp2FA } from '@/lib/auth/step-up-2fa';
 *
 *   export async function POST(request: NextRequest) {
 *     const authResult = await requireVerifiedAuth(request);
 *     if ('error' in authResult) return authResult.error;
 *
 *     const stepUpResult = await requireStepUp2FA(request, authResult.user);
 *     if ('error' in stepUpResult) return stepUpResult.error;
 *
 *     // ... proceed with sensitive operation
 *   }
 *
 * الـ Frontend بيبعت الكود في header:
 *   X-2FA-Code: 123456
 *
 * لو الـ user مش مفعّل عنده 2FA، العملية بتمرر بدون طلب (graceful fallback).
 * ده عشان الـ users اللي لسه ما فعّلوش 2FA — بس الـ admin accounts مفروض يفعّلوه.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyTwoFactorCode, hasTwoFactorEnabled } from '@/lib/auth/modules/two-factor';
import { log } from '@/lib/logger';
import type { AuthContext } from '@/app/api/utils/auth';

// ============================================
// Constants
// ============================================

const STEP_UP_CODE_HEADER = 'x-2fa-code';

// Step-up session validity: 5 minutes
// بعد التحقق الناجح، الـ user مش محتاج يعيد الكود لمدة 5 دقايق
const STEP_UP_SESSION_MS = 5 * 60 * 1000;

// ============================================
// Types
// ============================================

export interface StepUpContext {
  /** هل التحقق اتعمل بنجاح؟ */
  verified: boolean;
  /** هل الـ user مفعّل عنده 2FA؟ */
  twoFactorEnabled: boolean;
  /** طريقة التحقق: code (أدخل كود)، session (داخل فترة الـ 5 دقايق)، أو bypass (مش مفعّل 2FA) */
  method: 'code' | 'session' | 'bypass';
  /** وقت التحقق (للـ session tracking) */
  verifiedAt?: number;
}

// ============================================
// In-memory step-up session tracker
// ============================================
// ملاحظة: ده in-memory بس — في production متعدد العقد، المفروض يتعمل عبر Redis.
// للمشروع ده (Docker single-instance)، in-memory كافي.

interface StepUpSession {
  userId: string;
  verifiedAt: number;
  // ممكن نضيف scope لو عاوزين نحدد step-up للـ billing بس بدل ما يكون عام
}

const stepUpSessions = new Map<string, StepUpSession>();

// Cleanup expired sessions كل دقيقة
let cleanupStarted = false;
function startCleanup() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, session] of stepUpSessions.entries()) {
      if (now - session.verifiedAt > STEP_UP_SESSION_MS) {
        stepUpSessions.delete(key);
      }
    }
  }, 60_000).unref(); // unref عشان ما يمنعش الـ process من الـ shutdown
}

// ============================================
// Main Function
// ============================================

/**
 * يتطلب تحقق إضافي (step-up 2FA) للمسارات الحساسة.
 *
 * السلوك:
 * 1. لو الـ user مش مفعّل عنده 2FA → بيمرر (bypass) + log warning
 * 2. لو الـ user مفعّل عنده 2FA وعنده session نشط (خلال 5 دقايق) → بيمرر (session)
 * 3. لو الـ user مفعّل عنده 2FA وما عندهوش session → لازم يبعت كود في header
 *    - لو الكود صح → بيمرر + ينشئ session جديد (code)
 *    - لو الكود غلط → بيرفض بـ 403
 *
 * @returns إما { verified: true, ... } أو { error: NextResponse }
 */
export async function requireStepUp2FA(
  request: NextRequest,
  authCtx: AuthContext
): Promise<StepUpContext | { error: NextResponse }> {
  startCleanup();

  const userId = authCtx.userId;

  // Step 1: Check if user has 2FA enabled
  const twoFactorEnabled = await hasTwoFactorEnabled(userId);

  if (!twoFactorEnabled) {
    const userRole = authCtx.role?.toUpperCase();
    if (userRole === 'ADMIN' || userRole === 'MANAGER') {
      log.security('Step-up 2FA blocked — ADMIN/MANAGER does not have 2FA enabled', {
        userId,
        role: authCtx.role,
        path: request.nextUrl?.pathname,
      });
      return {
        error: NextResponse.json(
          {
            error: {
              code: 'STEP_UP_2FA_REQUIRED',
              message: 'هذه العملية تتطلب تفعيل المصادقة الثنائية (2FA) أولاً لحسابك.',
              requiresStepUp: true,
            },
          },
          { status: 403 }
        ),
      };
    }

    // User doesn't have 2FA enabled and is not ADMIN/MANAGER — allow operation but log warning
    log.security('Step-up 2FA bypassed — user does not have 2FA enabled', {
      userId,
      path: request.nextUrl?.pathname,
    });
    return {
      verified: true,
      twoFactorEnabled: false,
      method: 'bypass',
    };
  }

  // Step 2: Check for active step-up session (within last 5 minutes)
  const existingSession = stepUpSessions.get(userId);
  if (existingSession) {
    const sessionAge = Date.now() - existingSession.verifiedAt;
    if (sessionAge < STEP_UP_SESSION_MS) {
      // Active session — allow without re-prompting for code
      return {
        verified: true,
        twoFactorEnabled: true,
        method: 'session',
        verifiedAt: existingSession.verifiedAt,
      };
    } else {
      // Session expired — remove it
      stepUpSessions.delete(userId);
    }
  }

  // Step 3: Require 2FA code in header
  const code = request.headers.get(STEP_UP_CODE_HEADER)?.trim();

  if (!code) {
    // No code provided — request it
    return {
      error: NextResponse.json(
        {
          error: {
            code: 'STEP_UP_2FA_REQUIRED',
            message: 'هذه العملية تتطلب تحقق إضافي. الرجاء إدخال رمز المصادقة الثنائية.',
            requiresStepUp: true,
          },
        },
        { status: 403 }
      ),
    };
  }

  // Step 4: Verify the 2FA code
  const isValid = await verifyTwoFactorCode(userId, code);

  if (!isValid) {
    log.security('Step-up 2FA failed — invalid code', {
      userId,
      path: request.nextUrl?.pathname,
    });

    return {
      error: NextResponse.json(
        {
          error: {
            code: 'STEP_UP_2FA_INVALID',
            message: 'رمز المصادقة الثنائية غير صحيح أو منتهي الصلاحية.',
            requiresStepUp: true,
          },
        },
        { status: 403 }
      ),
    };
  }

  // Step 5: Code is valid — create step-up session
  const verifiedAt = Date.now();
  stepUpSessions.set(userId, { userId, verifiedAt });

  log.info('Step-up 2FA verified successfully', {
    userId,
    path: request.nextUrl?.pathname,
  });

  return {
    verified: true,
    twoFactorEnabled: true,
    method: 'code',
    verifiedAt,
  };
}

/**
 * مساعد لتنظيف الـ step-up session بعد عملية حساسة.
 * استخدمه بعد العمليات الـ one-shot (زي delete account) عشان تمنع إعادة الاستخدام.
 */
export function clearStepUpSession(userId: string): void {
  stepUpSessions.delete(userId);
}

/**
 * استخدمه للاختبارات — لمسح كل الـ sessions.
 */
export function _clearAllStepUpSessionsForTests(): void {
  stepUpSessions.clear();
}
