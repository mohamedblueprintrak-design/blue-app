/**
 * API Error Handling Utility — أداة معالجة أخطاء API
 *
 * SECURITY: Prevents information leakage in production by returning
 * generic error messages to clients while logging full details server-side.
 * أمان: يمنع تسريب المعلومات في الإنتاج بإرجاع رسائل خطأ عامة
 * مع تسجيل التفاصيل الكاملة على الخادم.
 */

import { NextResponse } from 'next/server';

/**
 * Safely handles API errors - returns generic message in production,
 * detailed message in development
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  // Log the full error server-side
  console.error(`[API Error${context ? ` - ${context}` : ''}]`, error);

  // In development, return detailed errors for debugging
  if (process.env.NODE_ENV === 'development') {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // In production, return generic error
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
