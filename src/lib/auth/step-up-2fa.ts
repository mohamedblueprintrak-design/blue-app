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
import { getRedis } from '@/lib/cache/redis';
import type { AuthContext } from '@/app/api/utils/auth';

// ============================================
// Constants
// ============================================

const STEP_UP_CODE_HEADER = 'x-2fa-code';

// Step-up session validity: 5 minutes
// بعد التحقق الناجح، الـ user مش محتاج يعيد الكود لمدة 5 دقايق
const STEP_UP_SESSION_MS = 5 * 60 * 1000;
const STEP_UP_SESSION_TTL_SEC = Math.floor(STEP_UP_SESSION_MS / 1000);

// Redis key prefix for step-up sessions
const REDIS_KEY_PREFIX = 'blueprint:stepup2fa:';

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
// Step-up session storage — Redis (multi-instance) with in-memory fallback
// ============================================
//
// SECURITY FIX: Previously this was an in-memory Map only. On multi-instance
// deployments (Docker Swarm, k8s, multiple app replicas), a user who verified
// step-up 2FA on instance A would be re-prompted on instance B — breaking
// the 5-minute session window and degrading UX. Worse, clearStepUpSession()
// only cleared locally, so a stolen-token attacker could reuse a session on
// a different instance even after the user logged out.
//
// Now: sessions are stored in Redis (shared across all instances) with TTL.
// If Redis is unavailable, we fall back to in-memory (single-instance mode)
// so the feature still works in dev/low-availability setups.

interface StepUpSession {
  userId: string;
  verifiedAt: number;
}

// In-memory fallback (used when Redis is not configured/unavailable)
const stepUpSessionsMemory = new Map<string, StepUpSession>();

let cleanupStarted = false;
function startCleanup() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, session] of stepUpSessionsMemory.entries()) {
      if (now - session.verifiedAt > STEP_UP_SESSION_MS) {
        stepUpSessionsMemory.delete(key);
      }
    }
  }, 60_000).unref();
}

/**
 * Get a step-up session for the user. Tries Redis first, falls back to memory.
 */
async function getStepUpSession(userId: string): Promise<StepUpSession | null> {
  // Try Redis first (shared across instances)
  try {
    const redis = await getRedis();
    if (redis) {
      const data = await redis.get(REDIS_KEY_PREFIX + userId);
      if (data) {
        const parsed = JSON.parse(data) as StepUpSession;
        // Check TTL expiry (Redis should handle this, but double-check)
        if (Date.now() - parsed.verifiedAt < STEP_UP_SESSION_MS) {
          return parsed;
        }
        await redis.del(REDIS_KEY_PREFIX + userId);
        return null;
      }
      return null;
    }
  } catch (error) {
    log.warn('Step-up 2FA: Redis get failed, falling back to in-memory', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Fallback: in-memory
  const session = stepUpSessionsMemory.get(userId);
  if (!session) return null;
  if (Date.now() - session.verifiedAt > STEP_UP_SESSION_MS) {
    stepUpSessionsMemory.delete(userId);
    return null;
  }
  return session;
}

/**
 * Set a step-up session for the user. Stores in Redis (with TTL) + in-memory.
 */
async function setStepUpSession(userId: string): Promise<void> {
  const session: StepUpSession = { userId, verifiedAt: Date.now() };

  // Always store in memory as a fallback for when Redis is unavailable
  stepUpSessionsMemory.set(userId, session);

  // Try Redis for multi-instance sharing
  try {
    const redis = await getRedis();
    if (redis) {
      await redis.set(
        REDIS_KEY_PREFIX + userId,
        JSON.stringify(session),
        { EX: STEP_UP_SESSION_TTL_SEC }
      );
    }
  } catch (error) {
    log.warn('Step-up 2FA: Redis set failed, using in-memory only', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Clear a step-up session. Clears from BOTH Redis and memory.
 * Used after one-shot operations (delete account) to prevent reuse.
 */
export async function clearStepUpSession(userId: string): Promise<void> {
  // Always clear memory
  stepUpSessionsMemory.delete(userId);

  // Clear Redis
  try {
    const redis = await getRedis();
    if (redis) {
      await redis.del(REDIS_KEY_PREFIX + userId);
    }
  } catch {
    // Ignore — best-effort cleanup
  }
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
  const cookieLang = request.cookies.get('blueprint-lang')?.value;
  const acceptLang = request.headers.get('accept-language');
  const isAr = cookieLang === 'ar' || (acceptLang?.startsWith('ar') ?? false);

  // Step 1: Check if user has 2FA enabled
  const twoFactorEnabled = await hasTwoFactorEnabled(userId);

  if (!twoFactorEnabled) {
    const userRole = authCtx.role?.toUpperCase();
    if (userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'ACCOUNTANT') {
      log.security('Step-up 2FA blocked — sensitive role does not have 2FA enabled', {
        userId,
        role: authCtx.role,
        path: request.nextUrl?.pathname,
      });
      return {
        error: NextResponse.json(
          {
            error: {
              code: 'STEP_UP_2FA_REQUIRED',
              message: isAr
                ? 'هذه العملية تتطلب تفعيل المصادقة الثنائية (2FA) أولاً لحسابك.'
                : 'This operation requires two-factor authentication (2FA) to be enabled first for your account.',
              requiresStepUp: true,
            },
          },
          { status: 403 }
        ),
      };
    }

    // User doesn't have 2FA enabled and is not ADMIN/MANAGER/ACCOUNTANT — allow operation but log warning
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
  const existingSession = await getStepUpSession(userId);
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
      await clearStepUpSession(userId);
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
            message: isAr
              ? 'هذه العملية تتطلب تحقق إضافي. الرجاء إدخال رمز المصادقة الثنائية.'
              : 'This operation requires additional verification. Please enter your two-factor authentication code.',
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
            message: isAr
              ? 'رمز المصادقة الثنائية غير صحيح أو منتهي الصلاحية.'
              : 'The two-factor authentication code is invalid or has expired.',
            requiresStepUp: true,
          },
        },
        { status: 403 }
      ),
    };
  }

  // Step 5: Code is valid — create step-up session
  const verifiedAt = Date.now();
  await setStepUpSession(userId);

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
 * Clears from BOTH Redis and in-memory storage.
 */
// Note: clearStepUpSession is now async (above) — it clears both Redis and memory.
// The old sync version is removed. Callers must `await clearStepUpSession(userId)`.
// This is handled in the routes that import it (profile/delete-account, profile/password, stripe/subscriptions).

/**
 * استخدمه للاختبارات — لمسح كل الـ sessions.
 */
export function _clearAllStepUpSessionsForTests(): void {
  stepUpSessionsMemory.clear();
}
