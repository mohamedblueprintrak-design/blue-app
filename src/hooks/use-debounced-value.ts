'use client';
import { useState, useEffect } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms
 * have elapsed without changes. Useful for search inputs that trigger
 * expensive queries (API calls, filtering).
 *
 * @param value The value to debounce
 * @param delayMs Delay in milliseconds (default: 300ms)
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
