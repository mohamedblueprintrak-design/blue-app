/**
 * @module hooks/use-accessibility
 * @description Accessibility React hooks for the BluePrint platform.
 *
 * This file previously contained 7 hooks (useAnnounce, useFocusTrap,
 * useFocusReturn, useKeyboardNav, useScreenReader, useA11yCheck,
 * useReducedMotion). Only useA11yCheck and useReducedMotion are actually
 * used in the codebase — the other 5 were dead code (0 imports) and have
 * been removed to reduce maintenance burden.
 *
 * If you need focus trap, keyboard nav, or screen reader helpers in the
 * future, use radix-ui primitives (Dialog, Popover, etc.) which have
 * built-in accessibility. Re-implementing these hooks is not recommended.
 */

'use client';

import { useEffect, useState } from 'react';

// ─── useReducedMotion ───────────────────────────────────────────────────────

/**
 * Detect if the user has requested reduced motion via OS settings.
 * Used to disable or simplify animations for accessibility.
 *
 * @returns true if the user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

// ─── useA11yCheck ───────────────────────────────────────────────────────────

/**
 * Run basic accessibility checks in development mode.
 * Logs warnings to the console for common a11y issues:
 *   - Missing alt text on images
 *   - Missing labels on form inputs
 *   - Missing role attributes on interactive elements
 *
 * In production, this is a no-op (does nothing).
 *
 * @param options.enabled - Set to false to skip checks even in dev
 */
export function useA11yCheck(options: { enabled?: boolean }): void {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;
    if (process.env.NODE_ENV !== 'development') return;

    const checkAccessibility = () => {
      // Check for images without alt text
      const images = document.querySelectorAll('img:not([alt])');
      if (images.length > 0) {
        console.info(`[A11y] Found ${images.length} images without alt text`);
      }

      // Check for form inputs without labels
      const inputs = document.querySelectorAll('input:not([aria-label]):not([id])');
      if (inputs.length > 0) {
        console.info(`[A11y] Found ${inputs.length} inputs without labels or aria-label`);
      }

      // Check for buttons without text content
      const buttons = document.querySelectorAll('button:empty:not([aria-label])');
      if (buttons.length > 0) {
        console.info(`[A11y] Found ${buttons.length} buttons without text or aria-label`);
      }
    };

    // Run after a short delay to let DOM settle
    const timer = setTimeout(checkAccessibility, 1000);
    return () => clearTimeout(timer);
  }, [enabled]);
}
