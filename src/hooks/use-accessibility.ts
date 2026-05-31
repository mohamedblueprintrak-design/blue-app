/**
 * @module hooks/use-accessibility
 * @description Accessibility React hooks for the Blue platform.
 * Provides utilities for screen reader announcements, focus management,
 * keyboard navigation, motion preferences, and accessibility checks.
 *
 * @example
 * ```tsx
 * // Announce changes to screen readers
 * useAnnounce('3 new tasks loaded', 'polite');
 *
 * // Focus trap for modals
 * const modalRef = useRef<HTMLDivElement>(null);
 * useFocusTrap(modalRef);
 *
 * // Keyboard navigation in a list
 * const [selectedIndex, setSelectedIndex] = useKeyboardNav(items, (item) => handleSelect(item));
 *
 * // Detect reduced motion preference
 * const prefersReducedMotion = useReducedMotion();
 * ```
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── useAnnounce ─────────────────────────────────────────────────────────────

/**
 * Announce a message to screen readers using an aria-live region.
 * Useful for informing users about dynamic content changes (e.g., search results count,
 * form validation errors, loading status).
 *
 * @param message - The message to announce. Can be a string or null (to clear).
 * @param politeness - ARIA live politeness level: 'polite' (waits for idle) or 'assertive' (interrupts)
 *
 * @example
 * ```tsx
 * function SearchResults() {
 *   useAnnounce(`Found ${results.length} results`);
 *   return <ul>{results.map(r => <li key={r.id}>{r.name}</li>)}</ul>;
 * }
 *
 * // Assertive announcement for important changes
 * useAnnounce('Payment successful!', 'assertive');
 * ```
 */
export function useAnnounce(
  message: string | null,
  politeness: 'polite' | 'assertive' = 'polite',
): void {
  const regionRef = useRef<HTMLElement | null>(null);
  const regionId = `a11y-announce-${politeness}`;

  useEffect(() => {
    // Find or create the aria-live region
    let region = document.getElementById(regionId) as HTMLElement | null;

    if (!region) {
      region = document.createElement('div');
      region.id = regionId;
      region.setAttribute('aria-live', politeness);
      region.setAttribute('aria-atomic', 'true');
      region.setAttribute('role', 'status');

      // Visually hide but keep accessible
      Object.assign(region.style, {
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: '0',
      });

      document.body.appendChild(region);
    }

    regionRef.current = region;

    return () => {
      // Only remove if we created it and it's still in the DOM
      if (region && document.body.contains(region)) {
        // Keep the region in DOM for reuse, just clear it
        region.textContent = '';
      }
    };
  }, [politeness, regionId]);

  useEffect(() => {
    if (regionRef.current && message !== null) {
      // Clear first to force screen reader to re-announce even if same message
      regionRef.current.textContent = '';
      // Use requestAnimationFrame to ensure the clear is processed first
      requestAnimationFrame(() => {
        if (regionRef.current) {
          regionRef.current.textContent = message;
        }
      });
    }
  }, [message]);
}

// ─── useFocusTrap ────────────────────────────────────────────────────────────

/**
 * Trap focus within a container element. Essential for modals, dialogs, and drawers.
 * When the trap is active, Tab and Shift+Tab cycle through focusable elements
 * within the container. When deactivated, focus returns to the previously focused element.
 *
 * @param containerRef - React ref pointing to the container HTML element
 * @param isActive - Whether the focus trap should be active (default: true)
 *
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose, children }) {
 *   const modalRef = useRef<HTMLDivElement>(null);
 *   useFocusTrap(modalRef, isOpen);
 *
 *   return isOpen ? (
 *     <div ref={modalRef} role="dialog" aria-modal="true">
 *       {children}
 *       <button onClick={onClose}>Close</button>
 *     </div>
 *   ) : null;
 * }
 * ```
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isActive: boolean = true,
): void {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Get all focusable elements within a container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    const container = containerRef.current;
    if (!container) return [];

    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null,
    );
  }, [containerRef]);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    // Save the previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the first focusable element
    const focusFirst = () => {
      const elements = getFocusableElements();
      if (elements.length > 0) {
        elements[0].focus();
      } else {
        // If no focusable elements, focus the container itself
        container.setAttribute('tabindex', '-1');
        container.focus();
      }
    };

    // Slight delay to allow modal animation to complete
    const timer = setTimeout(focusFirst, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to previously focused element
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        // Small delay to avoid focus conflicts during unmount
        requestAnimationFrame(() => {
          previousFocusRef.current?.focus();
        });
      }
    };
  }, [isActive, containerRef, getFocusableElements]);
}

// ─── useFocusReturn ──────────────────────────────────────────────────────────

/**
 * Returns focus to a previously focused element when a component unmounts
 * or when a condition becomes false. Useful for dialogs and dropdowns.
 *
 * @param previousFocusRef - React ref pointing to the element to return focus to
 * @param shouldReturn - Whether focus should be returned (default: true)
 *
 * @example
 * ```tsx
 * function Dropdown({ isOpen, onClose }) {
 *   const triggerRef = useRef<HTMLButtonElement>(null);
 *   useFocusReturn(triggerRef, !isOpen);
 *
 *   return (
 *     <>
 *       <button ref={triggerRef} onClick={() => setOpen(!isOpen)}>Toggle</button>
 *       {isOpen && <DropdownMenu onClose={onClose} />}
 *     </>
 *   );
 * }
 * ```
 */
export function useFocusReturn(
  previousFocusRef: React.RefObject<HTMLElement | null>,
  shouldReturn: boolean = true,
): void {
  const hasReturned = useRef(false);

  useEffect(() => {
    if (!shouldReturn && !hasReturned.current) {
      hasReturned.current = true;
      requestAnimationFrame(() => {
        previousFocusRef.current?.focus();
      });
    }

    if (shouldReturn) {
      hasReturned.current = false;
    }
  }, [shouldReturn, previousFocusRef]);
}

// ─── useKeyboardNav ──────────────────────────────────────────────────────────

/**
 * Hook for arrow key navigation through a list of items.
 * Supports both vertical (ArrowUp/Down) and horizontal (ArrowLeft/Right) navigation.
 *
 * @param items - Array of items to navigate through
 * @param onSelect - Callback when an item is selected (Enter or Space)
 * @param options - Navigation options
 * @returns Tuple of [selectedIndex, setSelectedIndex]
 *
 * @example
 * ```tsx
 * function CommandPalette({ commands }) {
 *   const [selectedIndex, setSelectedIndex] = useKeyboardNav(
 *     commands,
 *     (cmd) => executeCommand(cmd),
 *     { orientation: 'vertical', loop: true }
 *   );
 *
 *   return (
 *     <ul role="listbox">
 *       {commands.map((cmd, i) => (
 *         <li
 *           key={cmd.id}
 *           role="option"
 *           aria-selected={i === selectedIndex}
 *           onClick={() => setSelectedIndex(i)}
 *         >
 *           {cmd.label}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useKeyboardNav<T>(
  items: T[],
  onSelect: (item: T, index: number) => void,
  options: {
    /** Navigation orientation: 'vertical' (default) or 'horizontal' */
    orientation?: 'vertical' | 'horizontal';
    /** Whether to wrap around at the boundaries (default: false) */
    loop?: boolean;
    /** Initial selected index (default: -1, none selected) */
    initialIndex?: number;
    /** Callback when the selected index changes */
    onIndexChange?: (index: number) => void;
  } = {},
): [number, (index: number) => void] {
  const {
    orientation = 'vertical',
    loop = false,
    initialIndex = -1,
    onIndexChange,
  } = options;

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  const updateIndex = useCallback(
    (newIndex: number) => {
      if (newIndex === selectedIndex) return;
      setSelectedIndex(newIndex);
      onIndexChange?.(newIndex);
    },
    [selectedIndex, onIndexChange],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't intercept when typing in input fields
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (items.length === 0) return;

      const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
      const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';

      let newIndex = selectedIndex;

      switch (event.key) {
        case nextKey:
          event.preventDefault();
          newIndex = selectedIndex + 1;
          if (newIndex >= items.length) {
            newIndex = loop ? 0 : items.length - 1;
          }
          updateIndex(newIndex);
          break;

        case prevKey:
          event.preventDefault();
          newIndex = selectedIndex - 1;
          if (newIndex < 0) {
            newIndex = loop ? items.length - 1 : 0;
          }
          updateIndex(newIndex);
          break;

        case 'Home':
          event.preventDefault();
          updateIndex(0);
          break;

        case 'End':
          event.preventDefault();
          updateIndex(items.length - 1);
          break;

        case 'Enter':
        case ' ':
          if (selectedIndex >= 0 && selectedIndex < items.length) {
            event.preventDefault();
            onSelect(items[selectedIndex], selectedIndex);
          }
          break;
      }
    },
    [items, selectedIndex, orientation, loop, onSelect, updateIndex],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset index when items change
  useEffect(() => {
    if (items.length === 0) {
      const id = requestAnimationFrame(() => updateIndex(-1));
      return () => cancelAnimationFrame(id);
    } else if (selectedIndex >= items.length) {
      const id = requestAnimationFrame(() => updateIndex(items.length - 1));
      return () => cancelAnimationFrame(id);
    }
  }, [items.length, selectedIndex, updateIndex]);

  return [selectedIndex, setSelectedIndex];
}

// ─── useReducedMotion ────────────────────────────────────────────────────────

/**
 * Detect whether the user prefers reduced motion.
 * Returns true if the user has enabled "reduce motion" in their OS settings.
 * Use this to disable or simplify animations for users who prefer reduced motion.
 *
 * @returns true if the user prefers reduced motion
 *
 * @example
 * ```tsx
 * function AnimatedCard({ children }) {
 *   const prefersReducedMotion = useReducedMotion();
 *
 *   return (
 *     <motion.div
 *       animate={prefersReducedMotion ? {} : { scale: [1, 1.02, 1] }}
 *       transition={prefersReducedMotion ? { duration: 0 } : { duration: 2 }}
 *     >
 *       {children}
 *     </motion.div>
 *   );
 * }
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Use addListener pattern for initial sync + subscription in one step
    const handler = (event: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(event.matches);
    };

    // Set initial value via the subscription handler
    handler(mediaQuery);

    mediaQuery.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () => mediaQuery.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
  }, []);

  return prefersReducedMotion;
}

// ─── useScreenReader ─────────────────────────────────────────────────────────

/**
 * Attempt to detect if a screen reader is active.
 * Uses a combination of heuristics since there's no definitive way to detect screen readers.
 *
 * NOTE: Detection is not 100% reliable. Always build accessible interfaces regardless
 * of this detection result.
 *
 * @returns Object with detection state and methods
 *
 * @example
 * ```tsx
 * const { isScreenReaderActive } = useScreenReader();
 *
 * // Adjust behavior for screen reader users
 * if (isScreenReaderActive) {
 *   useAnnounce('Page content has been updated');
 * }
 * ```
 */
export function useScreenReader(): {
  /** Whether a screen reader is likely active (best-effort detection) */
  isScreenReaderActive: boolean;
} {
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(false);

  useEffect(() => {
    // Detection heuristics:
    // 1. Check if the user is navigating with keyboard only
    // 2. Check for screen reader-specific ARIA settings
    // 3. Use the a11y detection technique (visual focus tracking)

    let hasUsedMouse = false;
    let hasUsedKeyboard = false;

    const handleMouseDown = () => {
      hasUsedMouse = true;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') {
        hasUsedKeyboard = true;
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);

    // Check after a short delay
    const timer = setTimeout(() => {
      const likelyScreenReader = hasUsedKeyboard && !hasUsedMouse;
      setIsScreenReaderActive(likelyScreenReader);
    }, 5000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return { isScreenReaderActive };
}

// ─── useA11yCheck ────────────────────────────────────────────────────────────

/**
 * Runs basic accessibility checks on mount.
 * Logs warnings for common accessibility issues in the document.
 * Intended for development use only.
 *
 * Checks:
 * - Images without alt text
 * - Form inputs without labels
 * - Buttons without accessible text
 * - Missing document language
 * - Missing page title
 *
 * @param options - Check configuration
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   useA11yCheck({ logToConsole: true, enabled: process.env.NODE_ENV === 'development' });
 *
 *   return <div>My page content</div>;
 * }
 * ```
 */
export function useA11yCheck(options: {
  /** Whether to log results to console (default: true in development) */
  logToConsole?: boolean;
  /** Whether the checks are enabled (default: true in development) */
  enabled?: boolean;
} = {}): void {
  const { logToConsole = true, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;
    if (typeof document === 'undefined') return;

    const issues: string[] = [];

    // Check: Document language
    const lang = document.documentElement.getAttribute('lang');
    if (!lang) {
      issues.push('Missing "lang" attribute on <html> element');
    }

    // Check: Page title
    if (!document.title || document.title.trim() === '') {
      issues.push('Missing or empty <title> element');
    }

    // Check: Images without alt text
    const images = document.querySelectorAll('img');
    images.forEach((img, index) => {
      if (!img.hasAttribute('alt')) {
        issues.push(`Image #${index + 1} is missing "alt" attribute`);
      }
    });

    // Check: Form inputs without labels
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach((input, index) => {
      const id = input.getAttribute('id');
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        if (!label && !ariaLabel && !ariaLabelledBy) {
          const type = input.getAttribute('type') ?? input.tagName.toLowerCase();
          issues.push(
            `Input #${index + 1} (type: ${type}) has no associated label, aria-label, or aria-labelledby`,
          );
        }
      } else {
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        if (!ariaLabel && !ariaLabelledBy) {
          issues.push(
            `Input #${index + 1} has no id, label, aria-label, or aria-labelledby`,
          );
        }
      }
    });

    // Check: Buttons without accessible text
    const buttons = document.querySelectorAll('button, [role="button"]');
    buttons.forEach((button, index) => {
      const hasText = button.textContent?.trim().length > 0;
      const hasAriaLabel = button.hasAttribute('aria-label');
      const hasTitle = button.hasAttribute('title');
      const hasChildWithAlt = button.querySelector('img[alt], svg[aria-label]');

      if (!hasText && !hasAriaLabel && !hasTitle && !hasChildWithAlt) {
        issues.push(`Button #${index + 1} has no accessible text`);
      }
    });

    // Log results
    if (logToConsole && issues.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.info('%c♿ Accessibility Issues Detected', 'color: #f59e0b; font-weight: bold;');
        issues.forEach((issue) => {
          console.warn(`⚠️  ${issue}`);
        });
      }
      // End accessibility issues group
    }

    if (logToConsole && issues.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.info(
          '%c✅ No common accessibility issues detected',
          'color: #22c55e; font-weight: bold;',
        );
      }
    }
  }, [enabled, logToConsole]);
}
