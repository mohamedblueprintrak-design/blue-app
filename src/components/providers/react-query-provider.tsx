"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * React Query Provider — wraps the app with QueryClientProvider.
 * Placed in the root layout so ALL pages (including standalone routes
 * like /timesheets) have access to React Query.
 *
 * The QueryClient is created per-browser-session (not per-request) via
 * useState + lazy initializer, which is the recommended pattern for
 * Next.js App Router to avoid shared state on the server.
 */
export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
