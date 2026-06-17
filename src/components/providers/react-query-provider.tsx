"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * React Query Provider — wraps the app with QueryClientProvider.
 * Placed in the root layout so ALL pages (including standalone routes
 * like /timesheets) have access to React Query.
 *
 * The QueryClient is created per-browser-session (not per-request) via
 * useState + lazy initializer, which is the recommended pattern for
 * Next.js App Router to avoid shared state on the server.
 *
 * IMPORTANT: The QueryClient instance is created ONLY inside the
 * ReactQueryProvider via useState. The getQueryClient() function
 * returns the same instance after the provider mounts. If called
 * before mount (e.g., in a module-scope zustand store), it creates
 * a temporary instance that will be replaced once the provider mounts.
 */

// Reference to the provider's QueryClient — set on mount
let _queryClientInstance: QueryClient | null = null;

const DEFAULT_OPTIONS = {
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
};

/**
 * Get the shared QueryClient instance.
 * Safe for use in non-React code (e.g., zustand stores).
 * After the provider mounts, this returns the provider's instance.
 * Before mount, creates a temporary instance (SSR-safe).
 */
export function getQueryClient(): QueryClient {
  if (!_queryClientInstance) {
    // SSR or before provider mount: create a temporary instance
    if (typeof window === 'undefined') {
      // Server-side: always create a new instance per request
      return new QueryClient(DEFAULT_OPTIONS);
    }
    // Client-side before mount: create instance and store for reuse
    _queryClientInstance = new QueryClient(DEFAULT_OPTIONS);
  }
  return _queryClientInstance;
}

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    // Reuse existing instance if available, otherwise create new one
    const client = _queryClientInstance ?? new QueryClient(DEFAULT_OPTIONS);
    _queryClientInstance = client;
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
