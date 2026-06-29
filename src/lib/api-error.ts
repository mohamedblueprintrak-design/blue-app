/**
 * API Error Handling Utility — أداة معالجة أخطاء API
 *
 * SECURITY: Prevents information leakage in production by returning
 * generic error messages to clients while logging full details server-side.
 * أمان: يمنع تسريب المعلومات في الإنتاج بإرجاع رسائل خطأ عامة
 * مع تسجيل التفاصيل الكاملة على الخادم.
 */

import { NextResponse } from 'next/server';
import { serverErrorResponse } from '@/app/api/utils/response';
import { log } from '@/lib/logger';

/**
 * Safely handles API errors - returns generic message in production,
 * detailed message in development
 *
 * NOTE: This function has a different signature than `handleApiError` in
 * `@/app/api/utils/response.ts`. That version takes (message, error, code, status, requestId).
 * This version takes (error, context) and uses serverErrorResponse internally.
 * To avoid confusion, this is renamed to `handleApiErrorWithLogging`.
 */
export function handleApiErrorWithLogging(error: unknown, context?: string): NextResponse {
  // Log the full error server-side using Winston
  const message = error instanceof Error ? error.message : 'Unknown error';
  log.error(`[API Error${context ? ` - ${context}` : ''}] ${message}`, { error });

  if (process.env.NODE_ENV === 'development') {
    return serverErrorResponse(message);
  }

  return serverErrorResponse('Internal server error');
}
