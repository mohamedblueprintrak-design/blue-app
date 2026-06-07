"use client";

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
// Singleton queryClient for client-side usage (e.g., in auth-store.ts for logout)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  // We use the singleton directly. In App Router, since this is a "use client" file,
  // this is safe as long as it's only imported on the client.


  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
