/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Sentry Error Monitoring Configuration
 * إعداد مراقبة الأخطاء مع Sentry
 *
 * This file is a server-side Sentry helper. Client-side Sentry init
 * is handled by instrumentation-client.ts (the new Next.js 16+ standard).
 *
 * This module provides:
 * - captureError() — capture errors with user/tags/extra context
 * - captureApiError() — capture API route errors
 * - captureDatabaseError() — capture database operation errors
 * - startSpan() — performance monitoring (replaces deprecated startTransaction)
 *
 * SECURITY: All imports are guarded with try/catch to prevent build failures
 * when @sentry/nextjs is not installed. This is safe for development/demo
 * environments where Sentry is not configured.
 */

import { log } from '@/lib/logger';

// Lazy-loaded Sentry reference — only loaded when needed
let _sentry: typeof import('@sentry/nextjs') | null = null;
let _sentryLoadAttempted = false;

/**
 * Get the Sentry module, loading it lazily on first call.
 * Returns null if @sentry/nextjs is not installed.
 */
function getSentry(): typeof import('@sentry/nextjs') | null {
  if (_sentry) return _sentry;
  if (_sentryLoadAttempted) return null;

  _sentryLoadAttempted = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _sentry = require('@sentry/nextjs') as typeof import('@sentry/nextjs');

    // Initialize if DSN is configured
    const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
    if (SENTRY_DSN) {
      const environment = process.env.NODE_ENV || 'development';

      _sentry.init({
        dsn: SENTRY_DSN,

        // Environment
        environment,

        // Release version
        release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

        // Performance monitoring
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

        // Session replay
        replaysSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
        replaysOnErrorSampleRate: 1.0,

        // Use modern integrations (v10+ API)
        integrations: [
          _sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],

        // Ignore specific errors
        ignoreErrors: [
          'NetworkError',
          'Network request failed',
          'Failed to fetch',
          'Load failed',
          'Non-Error promise rejection captured',
          'ResizeObserver loop limit exceeded',
          'Navigation cancelled',
        ],

        beforeSend,

        // Additional configuration
        debug: false,
        attachStacktrace: true,
        maxBreadcrumbs: 50,

        // Set user context
        initialScope: {
          tags: {
            app: 'blueprint-saas',
            version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
          },
        },
      });
    }
  } catch {
    // @sentry/nextjs not installed — Sentry monitoring disabled
    _sentry = null;
  }

  return _sentry;
}

// Initialize on module load (safe — returns null if not installed)
const Sentry = getSentry();

/**
 * Helper function to capture errors with context
 */
export function captureError(
  error: Error,
  context?: {
    user?: { id: string; email: string; role: string };
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
) {
  const activeSentry = getSentry();
  if (!activeSentry) {
    log.error('Error (Sentry not configured):', error);
    return;
  }

  activeSentry.withScope((scope) => {
    if (context?.user) {
      scope.setUser({
        id: context.user.id,
        email: context.user.email,
        username: context.user.role,
      });
    }

    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    activeSentry.captureException(error);
  });
}

/**
 * Helper function to capture API errors
 */
export function captureApiError(
  error: Error,
  request: {
    method: string;
    path: string;
    params?: Record<string, unknown>;
  }
) {
  captureError(error, {
    tags: {
      type: 'api_error',
      method: request.method,
    },
    extra: {
      path: request.path,
      params: request.params,
    },
  });
}

/**
 * Helper function to capture database errors
 */
export function captureDatabaseError(
  error: Error,
  context?: {
    model?: string;
    operation?: string;
    query?: string;
  }
) {
  captureError(error, {
    tags: {
      type: 'database_error',
      model: context?.model || '',
      operation: context?.operation || '',
    },
    extra: {
      query: context?.query,
    },
  });
}

/**
 * Performance monitoring helper — uses the modern Sentry.startSpan API
 * (replaces the deprecated startTransaction from v7)
 */
export function startSpan<T>(
  options: { name: string; op: string },
  callback: () => T
): T {
  const activeSentry = getSentry();
  if (!activeSentry) return callback();

  return activeSentry.startSpan(options, callback);
}

// Re-export Sentry for direct use (null-safe)
export { Sentry };

/**
 * Reset Sentry load state for testing purposes
 */
export function resetSentryForTesting() {
  _sentry = null;
  _sentryLoadAttempted = false;
}

export function setSentryForTesting(mockSentry: any) {
  _sentry = mockSentry;
  _sentryLoadAttempted = true;
}

/**
 * Filter sensitive data from Sentry events before sending
 */
export function beforeSend(event: any) {
  // Filter out sensitive data from headers
  if (event.request?.headers) {
    delete event.request.headers.authorization;
    delete event.request.headers.cookie;
    delete event.request.headers['x-csrf-token'];
    delete event.request.headers['x-api-key'];
  }

  // Filter out sensitive data from request body
  if (event.request?.data && typeof event.request.data === 'object') {
    const sensitiveFields = ['password', 'confirmPassword', 'newPassword', 'currentPassword', 'secret', 'token', 'apiKey', 'creditCard', 'cvv', 'iban', 'bankAccount'];
    for (const field of sensitiveFields) {
      if (field in (event.request.data as Record<string, unknown>)) {
        (event.request.data as Record<string, unknown>)[field] = '[REDACTED]';
      }
    }
  }

  // Don't send events in development unless explicitly enabled
  const environment = process.env.NODE_ENV || 'development';
  if (environment === 'development' && !process.env.SENTRY_ENABLE_DEV) {
    return null;
  }

  return event;
}
