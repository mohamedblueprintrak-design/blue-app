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
 */

// Lazy singleton for non-React consumers (e.g., zustand stores)
let _queryClientInstance: QueryClient | null = null;

/**
 * Get the shared QueryClient instance.
 * Safe for use in non-React code (e.g., zustand stores).
 * After the provider mounts, this returns the same instance.
 */
export function getQueryClient(): QueryClient {
  if (!_queryClientInstance) {
    _queryClientInstance = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  return _queryClientInstance;
}

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    });
    _queryClientInstance = client;
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
