/**
 * @module components/common/error-boundary
 * @description React Error Boundary component for the BluePrint SaaS platform.
 * Catches unhandled JavaScript errors in component trees, displays a user-friendly
 * fallback UI, and provides options to retry, navigate home, or report issues.
 * Supports Arabic (RTL) and English with full bilingual error messages.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With custom fallback
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // Using the HOC
 * const SafeComponent = withErrorBoundary(MyComponent);
 * ```
 */

'use client';

import * as React from 'react';
import { AlertTriangleIcon, RefreshCwIcon, HomeIcon, BugIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Bilingual text content for the error boundary */
interface ErrorMessages {
  title: string;
  description: string;
  retry: string;
  goHome: string;
  reportIssue: string;
  showError: string;
}

/** Props for the ErrorBoundary component */
export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: React.ReactNode;
  /** Custom fallback UI. If provided, replaces the default error UI. */
  fallback?: React.ReactNode;
  /** Custom error handler called when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Locale for error messages: 'en' | 'ar' (default: 'en') */
  locale?: 'en' | 'ar';
  /** Additional CSS classes for the error container */
  className?: string;
}

/** State for the ErrorBoundary component */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/** Props for the default fallback UI */
interface DefaultFallbackProps {
  error: Error | null;
  onRetry: () => void;
  onGoHome: () => void;
  onReportIssue: () => void;
  messages: ErrorMessages;
  showStack: boolean;
  className?: string;
}

// ─── Bilingual Error Messages ────────────────────────────────────────────────

const ERROR_MESSAGES: Record<'en' | 'ar', ErrorMessages> = {
  en: {
    title: 'Something went wrong',
    description:
      'An unexpected error occurred. Please try again or navigate back to the home page.',
    retry: 'Try Again',
    goHome: 'Go Home',
    reportIssue: 'Report Issue',
    showError: 'Show Error Details',
  },
  ar: {
    title: 'حدث خطأ غير متوقع',
    description:
      'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية.',
    retry: 'إعادة المحاولة',
    goHome: 'الصفحة الرئيسية',
    reportIssue: 'الإبلاغ عن مشكلة',
    showError: 'عرض تفاصيل الخطأ',
  },
};

// ─── Default Fallback UI ─────────────────────────────────────────────────────

/**
 * Default error fallback UI component.
 * Displays a user-friendly error message with action buttons.
 */
function DefaultFallback({
  error,
  onRetry,
  onGoHome,
  onReportIssue,
  messages,
  showStack,
  className,
}: DefaultFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  const isRtl = typeof window !== 'undefined' && (localStorage.getItem('blueprint-lang') || 'ar') === 'ar';

  return (
    <div
      role="alert"
      dir={isRtl ? 'rtl' : 'ltr'}
      className={cn(
        'flex min-h-[50vh] flex-col items-center justify-center gap-6 p-8 text-center',
        className
      )}
    >
      {/* Error Icon */}
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangleIcon className="text-destructive size-8" />
      </div>

      {/* Error Message */}
      <div className="max-w-md space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">{messages.title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {messages.description}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={onRetry} variant="default" className="gap-2">
          <RefreshCwIcon className="size-4" />
          {messages.retry}
        </Button>
        <Button onClick={onGoHome} variant="outline" className="gap-2">
          <HomeIcon className="size-4" />
          {messages.goHome}
        </Button>
        <Button onClick={onReportIssue} variant="ghost" className="gap-2">
          <BugIcon className="size-4" />
          {messages.reportIssue}
        </Button>
      </div>

      {/* Error Details (Development Only) */}
      {showStack && error && (
        <div className="w-full max-w-lg">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-muted-foreground hover:text-foreground mb-2 text-xs underline transition-colors"
          >
            {showDetails ? 'Hide' : messages.showError}
          </button>
          {showDetails && (
            <pre className="bg-muted text-destructive max-h-48 overflow-auto rounded-lg p-4 text-xs text-left">
              <code>{error.stack ?? error.message}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Error Boundary Component ────────────────────────────────────────────────

/**
 * React Error Boundary that catches runtime errors in its child component tree.
 *
 * Features:
 * - User-friendly fallback UI with bilingual support (Arabic/English)
 * - "Try Again" button that resets the error boundary
 * - "Go Home" button for navigation recovery
 * - "Report Issue" button for error logging
 * - Error logging integration
 * - Stack trace capture in development mode only
 * - Custom fallback support
 * - HOC for wrapping individual components
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   locale="ar"
 *   onError={(error, info) => console.error(error, info)}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /** Called when a child component throws an error */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /** Called after an error is caught. Logs the error information. */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });

    // Development: log to console for debugging
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Send to error tracking service (Sentry) in all environments
    this.logErrorToService(error, errorInfo);
  }

  /** Log the error to Sentry (or fallback) via the audit API endpoint */
  private async logErrorToService(error: Error, errorInfo: React.ErrorInfo): Promise<void> {
    try {
      // Send to Sentry if available (loaded via @sentry/nextjs client config)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const windowAny = window as unknown as Record<string, any>;
      const Sentry = windowAny.Sentry as {
        captureException?: (err: Error, ctx?: Record<string, unknown>) => string;
      } | undefined;
      if (Sentry?.captureException) {
        Sentry.captureException(error, {
          contexts: { react: { componentStack: errorInfo.componentStack } },
        });
        return;
      }

      // Fallback: send to server-side audit endpoint
      const errorPayload = {
        message: error.message,
        name: error.name,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      };

      fetch('/api/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'error', data: errorPayload }),
      }).catch(() => {
        // Fail silently — don't throw in the error boundary
      });
    } catch {
      // Fail silently — never throw in an error boundary
    }
  }

  /** Reset the error boundary and retry rendering children */
  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /** Navigate to the home page */
  handleGoHome = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.href = '/dashboard';
  };

  /** Open a mailto link or navigate to an issue reporting page */
  handleReportIssue = (): void => {
    const error = this.state.error;
    const subject = encodeURIComponent(
      `Blue Error: ${error?.message ?? 'Unknown error'}`
    );
    const body = encodeURIComponent(
      `Error Details:\n\n` +
      `Message: ${error?.message}\n` +
      `Stack: ${error?.stack}\n` +
      `URL: ${typeof window !== 'undefined' ? window.location.href : 'unknown'}\n` +
      `Time: ${new Date().toISOString()}\n` +
      `User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}`
    );

    window.open(`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@blueprint.app'}?subject=${subject}&body=${body}`, '_self');
  };

  render(): React.ReactNode {
    const { hasError, error, errorInfo: _errorInfo } = this.state;
    const { children, fallback, locale = 'en', className } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Use default fallback UI
      return (
        <DefaultFallback
          error={error}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
          onReportIssue={this.handleReportIssue}
          messages={ERROR_MESSAGES[locale]}
          showStack={typeof process !== 'undefined' && process.env.NODE_ENV === 'development'}
          className={className}
        />
      );
    }

    return children;
  }
}

// ─── Higher-Order Component ──────────────────────────────────────────────────

/**
 * HOC that wraps a component with an ErrorBoundary.
 * Useful for protecting individual components from crashing the entire page.
 *
 * @param Component - The React component to wrap
 * @param fallback - Optional custom fallback UI
 * @param options - Optional ErrorBoundary configuration
 * @returns A new component wrapped with ErrorBoundary
 *
 * @example
 * ```tsx
 * // Wrap a component for error protection
 * const SafeProjectList = withErrorBoundary(ProjectList);
 *
 * // With custom fallback
 * const SafeProjectList = withErrorBoundary(ProjectList, (
 *   <div>Custom error UI here</div>
 * ));
 *
 * // With options
 * const SafeProjectList = withErrorBoundary(ProjectList, undefined, {
 *   locale: 'ar',
 *   onError: (err) => trackError(err),
 * });
 * ```
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode,
  options?: Omit<ErrorBoundaryProps, 'children' | 'fallback'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...options} fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  // Set display name for better debugging
  const componentName = Component.displayName ?? Component.name ?? 'Component';
  WrappedComponent.displayName = `withErrorBoundary(${componentName})`;

  return WrappedComponent;
}

export default ErrorBoundary;
