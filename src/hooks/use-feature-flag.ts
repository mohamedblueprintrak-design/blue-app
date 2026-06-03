"use client";

import { useState, useEffect, useRef } from "react";

// Client-side in-memory cache for feature flags
const flagCache = new Map<string, { enabled: boolean; timestamp: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * Client-side hook for checking if a feature flag is enabled.
 * Calls /api/feature-flags/check?key=xxx on mount and caches the result.
 *
 * Usage:
 *   const { enabled, loading } = useFeatureFlag("google_login");
 *   if (enabled) return <GoogleLoginButton />;
 */
export function useFeatureFlag(key: string): { enabled: boolean; loading: boolean } {
  // Initialize from cache synchronously
  const cached = flagCache.get(key);
  const isCacheValid = cached && Date.now() - cached.timestamp < CACHE_TTL_MS;

  const [enabled, setEnabled] = useState(isCacheValid ? cached.enabled : false);
  const [loading, setLoading] = useState(!isCacheValid);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    // Check cache first — state was already initialized from cache, nothing to do
    const cachedEntry = flagCache.get(key);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      return () => {
        controller.abort();
      };
    }

    // Fetch from server — state updates happen in async callbacks (allowed)
    fetch(`/api/feature-flags/check?key=${encodeURIComponent(key)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to check flag");
        return res.json();
      })
      .then((data) => {
        const isEnabled = data.enabled === true;
        setEnabled(isEnabled);
        setLoading(false);
        flagCache.set(key, { enabled: isEnabled, timestamp: Date.now() });
      })
      .catch((_err) => {
        if (!controller.signal.aborted) {
          setEnabled(false);
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [key]);

  return { enabled, loading };
}

/**
 * Invalidate the client-side cache for a specific key or all keys.
 */
export function invalidateFeatureFlagCache(key?: string): void {
  if (key) {
    flagCache.delete(key);
  } else {
    flagCache.clear();
  }
}
