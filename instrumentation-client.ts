/**
 * Next.js Client Instrumentation — Sentry Client Initialization
 *
 * In Next.js 16+, this file replaces `sentry.client.config.ts`.
 * The old file can be safely deleted.
 *
 * Required exports:
 * - `onRouterTransitionStart` — Required by @sentry/nextjs for navigation instrumentation
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 *
 * SECURITY: This file uses a dynamic import with try/catch to prevent
 * build failures when @sentry/nextjs is not installed or configured.
 */

let onRouterTransitionStart: ((href: string, navigationType: string) => void) | undefined;

// Initialize Sentry asynchronously — avoids top-level await warning in browser
// The init runs as a microtask; Sentry will be ready shortly after module load.
(async () => {
  try {
    // Dynamic import to avoid build failure when @sentry/nextjs is not installed
    const Sentry = await import('@sentry/nextjs');

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Only enable Sentry in production or when explicitly enabled
      enabled:
        process.env.NODE_ENV === 'production' ||
        process.env.SENTRY_ENABLE_DEV === 'true',

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Setting this option to true will print useful information to the console while you're setting up Sentry
      debug: false,

      replaysOnErrorSampleRate: 1.0,

      // This sets the sample rate to be 10%. You may want this to be 100% while
      // in development and sample at a lower rate in production
      replaysSessionSampleRate: 0.1,

      // You can remove this option if you're not planning to use the Sentry Session Replay feature
      integrations: [
        Sentry.replayIntegration({
          // Additional Replay configuration goes in here, for example:
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      // Ignore common browser errors that aren't actionable
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'Network request failed',
        'Failed to fetch',
        'Load failed',
        'Non-Error promise rejection captured',
        ' cancelled',
      ],
    });

    // Required by @sentry/nextjs for automatic navigation instrumentation
    onRouterTransitionStart = Sentry.captureRouterTransitionStart;
  } catch {
    // @sentry/nextjs not installed — Sentry monitoring disabled
    // This is safe for development/demo environments where Sentry is not configured
    if (process.env.NODE_ENV === 'development') {
      console.info('[Sentry] @sentry/nextjs not installed — monitoring disabled');
    }
  }
})();

export { onRouterTransitionStart };
