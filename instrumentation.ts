/**
 * Next.js Instrumentation — Sentry Server & Edge Initialization
 *
 * In Next.js 16+, the instrumentation file's `register()` function is the
 * canonical place to initialise Sentry on the server and at the Edge.
 *
 * This replaces the old `sentry.server.config.ts` and `sentry.edge.config.ts`.
 * Those files can be safely deleted.
 *
 * Required exports:
 * - `register()` — Sentry initialization for server/edge runtimes
 * - `onRequestError()` — Captures errors from nested React Server Components
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 */

export async function register() {
  // Only import and init Sentry on the server/edge, never on the client
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs');

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Enable in production or when explicitly enabled in dev
      enabled:
        process.env.NODE_ENV === 'production' ||
        process.env.SENTRY_ENABLE_DEV === 'true',

      // Sample rate for performance traces
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      debug: false,

      // Ignore common server/edge errors that aren't actionable
      ignoreErrors: [
        'PrismaClientInitializationError',
        'connect ECONNREFUSED',
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
      ],
    });
  }
}

/**
 * Capture errors from nested React Server Components.
 *
 * When an error is thrown inside a nested RSC that's caught by an error boundary,
 * Next.js calls this hook so Sentry can capture it.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#errors-from-nested-react-server-components
 */
export const onRequestError = async (
  error: unknown,
  request: {
    path: string;
    method: string;
    headers: Record<string, string>;
  },
  context: {
    routerKind: 'App Router' | 'Pages Router';
    routePath: string;
    routeType: string;
  },
) => {
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(error, request, context);
};
