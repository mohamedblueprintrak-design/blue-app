/**
 * @module lib/utils/rtl
 * @description RTL (Right-to-Left) support utilities for the BluePrint SaaS platform.
 * Provides helper functions for direction detection, alignment flipping,
 * margin/padding mirroring, Tailwind class generation, and a React context
 * provider for the current text direction.
 *
 * Supports Arabic (ar) and other RTL locales.
 *
 * @example
 * ```tsx
 * // Check if a locale is RTL
 * const isArabic = isRTL('ar'); // true
 *
 * // Get direction
 * const dir = getDirection('en'); // 'ltr'
 * const dir = getDirection('ar'); // 'rtl'
 *
 * // Flip alignment for RTL
 * const align = flipAlignment('left', true); // 'right'
 *
 * // Use the RTL context in components
 * <RTLProvider locale="ar">
 *   <MyComponent />
 * </RTLProvider>
 * ```
 */

'use client';

import React, { createContext, useContext, useMemo } from 'react';

// ─── RTL Locale Detection ────────────────────────────────────────────────────

/** List of known RTL locales */
const RTL_LOCALES = new Set([
  'ar',     // Arabic
  'arc',    // Aramaic
  'dv',     // Divehi
  'fa',     // Persian
  'ha',     // Hausa
  'he',     // Hebrew
  'khw',    // Khowar
  'ks',     // Kashmiri
  'ku',     // Kurdish
  'ps',     // Pashto
  'ur',     // Urdu
  'yi',     // Yiddish
]);

/**
 * Check if a given locale is right-to-left.
 *
 * @param locale - Locale code (e.g., 'ar', 'en-US', 'ar-SA')
 * @returns true if the locale is RTL
 *
 * @example
 * ```typescript
 * isRTL('ar');       // true
 * isRTL('ar-SA');    // true
 * isRTL('en');       // false
 * isRTL('en-US');    // false
 * isRTL('he');       // true
 * ```
 */
export function isRTL(locale: string): boolean {
  // Extract the base language code (e.g., 'ar-SA' -> 'ar')
  const baseLocale = locale.split('-')[0].toLowerCase();
  return RTL_LOCALES.has(baseLocale);
}

/**
 * Get the text direction for a locale.
 *
 * @param locale - Locale code
 * @returns 'rtl' or 'ltr'
 *
 * @example
 * ```typescript
 * getDirection('ar');  // 'rtl'
 * getDirection('en');  // 'ltr'
 * ```
 */
export function getDirection(locale: string): 'rtl' | 'ltr' {
  return isRTL(locale) ? 'rtl' : 'ltr';
}

/**
 * Get the text alignment for a locale.
 *
 * @param locale - Locale code
 * @returns 'right' for RTL, 'left' for LTR
 *
 * @example
 * ```typescript
 * getTextAlign('ar');  // 'right'
 * getTextAlign('en');  // 'left'
 * ```
 */
export function getTextAlign(locale: string): 'right' | 'left' {
  return isRTL(locale) ? 'right' : 'left';
}

/**
 * Get the logical start/end alignment for a locale.
 * 'start' maps to 'left' in LTR and 'right' in RTL.
 * 'end' maps to 'right' in LTR and 'left' in RTL.
 *
 * @param logicalAlign - 'start' or 'end'
 * @param isRtl - Whether the layout is RTL
 * @returns The physical alignment: 'left' or 'right'
 *
 * @example
 * ```typescript
 * logicalToPhysical('start', false); // 'left'
 * logicalToPhysical('start', true);  // 'right'
 * logicalToPhysical('end', false);   // 'right'
 * logicalToPhysical('end', true);    // 'left'
 * ```
 */
export function logicalToPhysical(
  logicalAlign: 'start' | 'end',
  isRtl: boolean
): 'left' | 'right' {
  if (logicalAlign === 'start') {
    return isRtl ? 'right' : 'left';
  }
  return isRtl ? 'left' : 'right';
}

// ─── Alignment Flipping ──────────────────────────────────────────────────────

/**
 * Flip a physical alignment value for RTL layout.
 * Maps 'left' <-> 'right'. Passes through other values unchanged.
 *
 * @param align - The alignment value to flip
 * @param isRtl - Whether the layout is RTL
 * @returns The flipped alignment value
 *
 * @example
 * ```typescript
 * flipAlignment('left', true);   // 'right'
 * flipAlignment('right', true);  // 'left'
 * flipAlignment('center', true); // 'center'
 * flipAlignment('left', false);  // 'left'
 * ```
 */
export function flipAlignment(
  align: string,
  isRtl: boolean
): string {
  if (!isRtl) return align;

  switch (align) {
    case 'left':
      return 'right';
    case 'right':
      return 'left';
    case 'text-left':
      return 'text-right';
    case 'text-right':
      return 'text-left';
    case 'align-left':
      return 'align-right';
    case 'align-right':
      return 'align-left';
    case 'items-start':
      return 'items-end';
    case 'items-end':
      return 'items-start';
    case 'justify-start':
      return 'justify-end';
    case 'justify-end':
      return 'justify-start';
    case 'rounded-l':
      return 'rounded-r';
    case 'rounded-r':
      return 'rounded-l';
    case 'rounded-bl':
      return 'rounded-br';
    case 'rounded-br':
      return 'rounded-bl';
    case 'rounded-tl':
      return 'rounded-tr';
    case 'rounded-tr':
      return 'rounded-tl';
    case 'border-l':
      return 'border-r';
    case 'border-r':
      return 'border-l';
    case 'pl-':
      return 'pr-';
    case 'pr-':
      return 'pl-';
    case 'ml-':
      return 'mr-';
    case 'mr-':
      return 'ml-';
    default:
      return align;
  }
}

// ─── Margin/Padding Flipping ─────────────────────────────────────────────────

/**
 * Flip margin classes for RTL layout.
 * Converts 'ml-*' <-> 'mr-*' and 'mx-*' direction-aware values.
 *
 * @param marginClass - Tailwind margin class (e.g., 'ml-4', 'mr-auto')
 * @param isRtl - Whether the layout is RTL
 * @returns The flipped margin class
 *
 * @example
 * ```typescript
 * flipMargin('ml-4', true);    // 'mr-4'
 * flipMargin('mr-4', true);    // 'ml-4'
 * flipMargin('ml-4', false);   // 'ml-4'
 * flipMargin('mt-4', true);    // 'mt-4' (vertical margin unchanged)
 * ```
 */
export function flipMargin(marginClass: string, isRtl: boolean): string {
  if (!isRtl) return marginClass;

  return marginClass
    .replace(/^ml-/, 'mr-')
    .replace(/^mr-/, 'ml-')
    .replace(/ml-/g, 'MR-')
    .replace(/mr-/g, 'ML-')
    .replace(/MR-/g, 'ml-')
    .replace(/ML-/g, 'mr-');
}

/**
 * Flip padding classes for RTL layout.
 * Converts 'pl-*' <-> 'pr-*' and 'px-*' direction-aware values.
 *
 * @param paddingClass - Tailwind padding class (e.g., 'pl-4', 'pr-6')
 * @param isRtl - Whether the layout is RTL
 * @returns The flipped padding class
 *
 * @example
 * ```typescript
 * flipPadding('pl-4', true);   // 'pr-4'
 * flipPadding('pr-4', true);   // 'pl-4'
 * flipPadding('pl-4', false);  // 'pl-4'
 * flipPadding('pt-4', true);   // 'pt-4' (vertical padding unchanged)
 * ```
 */
export function flipPadding(paddingClass: string, isRtl: boolean): string {
  if (!isRtl) return paddingClass;

  return paddingClass
    .replace(/^pl-/, 'pr-')
    .replace(/^pr-/, 'pl-')
    .replace(/pl-/g, 'PR-')
    .replace(/pr-/g, 'PL-')
    .replace(/PR-/g, 'pl-')
    .replace(/PL-/g, 'pr-');
}

// ─── Tailwind RTL Classes ────────────────────────────────────────────────────

/**
 * Generate common Tailwind CSS classes for RTL/LTR support.
 * Returns classes that handle text direction, alignment, and spacing.
 *
 * @param isRtl - Whether the layout is RTL
 * @returns String of Tailwind classes for the given direction
 *
 * @example
 * ```typescript
 * // For an RTL layout
 * rtlClassName(true);
 * // Returns classes optimized for RTL
 *
 * // For an LTR layout
 * rtlClassName(false);
 * // Returns standard LTR classes
 * ```
 */
export function rtlClassName(isRtl: boolean): string {
  if (isRtl) {
    return 'rtl:text-right rtl:font-arabic';
  }
  return '';
}

/**
 * Generate a className string with logical properties support.
 * Uses CSS logical properties for automatic RTL handling.
 *
 * @param baseClasses - Base Tailwind classes
 * @param logicalClasses - Classes that should be flipped in RTL
 * @param isRtl - Whether the layout is RTL
 * @returns Combined className string
 *
 * @example
 * ```typescript
 * getLogicalClassName(
 *   'flex items-center gap-2',
 *   'pl-4 border-l ml-2',
 *   true // RTL
 * );
 * // Returns: 'flex items-center gap-2 pr-4 border-r mr-2'
 * ```
 */
export function getLogicalClassName(
  baseClasses: string,
  logicalClasses: string,
  isRtl: boolean
): string {
  if (!isRtl) {
    return `${baseClasses} ${logicalClasses}`.trim();
  }

  // Flip each logical class
  const flippedClasses = logicalClasses
    .split(' ')
    .map((cls) => {
      if (cls.startsWith('ml-')) return cls.replace('ml-', 'mr-');
      if (cls.startsWith('mr-')) return cls.replace('mr-', 'ml-');
      if (cls.startsWith('pl-')) return cls.replace('pl-', 'pr-');
      if (cls.startsWith('pr-')) return cls.replace('pr-', 'pl-');
      if (cls === 'text-left') return 'text-right';
      if (cls === 'text-right') return 'text-left';
      if (cls === 'border-l') return 'border-r';
      if (cls === 'border-r') return 'border-l';
      if (cls === 'rounded-l') return 'rounded-r';
      if (cls === 'rounded-r') return 'rounded-l';
      if (cls === 'rounded-bl') return 'rounded-br';
      if (cls === 'rounded-br') return 'rounded-bl';
      if (cls === 'rounded-tl') return 'rounded-tr';
      if (cls === 'rounded-tr') return 'rounded-tl';
      return cls;
    })
    .join(' ');

  return `${baseClasses} ${flippedClasses}`.trim();
}

// ─── RTL Context Provider ────────────────────────────────────────────────────

/** Context type for RTL provider */
interface RTLContextValue {
  /** Whether the current layout is RTL */
  isRTL: boolean;
  /** Current locale */
  locale: string;
  /** Current text direction: 'rtl' or 'ltr' */
  direction: 'rtl' | 'ltr';
  /** Current text alignment: 'right' or 'left' */
  textAlign: 'right' | 'left';
  /** Flip an alignment value for the current direction */
  flipAlign: (align: string) => string;
  /** Flip a margin class for the current direction */
  flipMarginClass: (margin: string) => string;
  /** Flip a padding class for the current direction */
  flipPaddingClass: (padding: string) => string;
  /** Get logical class names */
  getLogicalClass: (base: string, logical: string) => string;
}

const RTLContext = createContext<RTLContextValue | null>(null);

/**
 * RTL Context Provider for the BluePrint application.
 * Wraps your component tree to provide RTL-aware utilities to all children.
 *
 * @example
 * ```tsx
 * // In your root layout
 * import { RTLProvider } from '@/lib/utils/rtl';
 *
 * export default function RootLayout({ children, params: { locale } }) {
 *   return (
 *     <RTLProvider locale={locale}>
 *       {children}
 *     </RTLProvider>
 *   );
 * }
 *
 * // In any child component
 * function MyComponent() {
 *   const { isRTL, direction, flipAlign, getLogicalClass } = useRTL();
 *
 *   return (
 *     <div dir={direction} className={getLogicalClass('flex', 'pl-4')}>
 *       <span style={{ textAlign: isRTL ? 'right' : 'left' }}>
 *         Content
 *       </span>
 *     </div>
 *   );
 * }
 * ```
 */
export function RTLProvider({
  locale = 'en',
  children,
}: {
  /** Current locale (e.g., 'en', 'ar') */
  locale?: string;
  /** Child components */
  children: React.ReactNode;
}) {
  const rtl = isRTL(locale);

  const contextValue = useMemo<RTLContextValue>(
    () => ({
      isRTL: rtl,
      locale,
      direction: rtl ? 'rtl' : 'ltr',
      textAlign: rtl ? 'right' : 'left',
      flipAlign: (align: string) => flipAlignment(align, rtl),
      flipMarginClass: (margin: string) => flipMargin(margin, rtl),
      flipPaddingClass: (padding: string) => flipPadding(padding, rtl),
      getLogicalClass: (base: string, logical: string) =>
        getLogicalClassName(base, logical, rtl),
    }),
    [rtl, locale]
  );

  return (
    <RTLContext.Provider value={contextValue}>
      {children}
    </RTLContext.Provider>
  );
}

/**
 * Hook to access the RTL context values.
 * Must be used within a RTLProvider.
 *
 * @returns RTLContextValue with all RTL utilities
 * @throws Error if used outside of RTLProvider
 *
 * @example
 * ```tsx
 * function Sidebar() {
 *   const { isRTL, direction, flipAlign } = useRTL();
 *
 *   return (
 *     <aside dir={direction} className={flipAlign('border-l')}>
 *       {isRTL ? <ArrowRightIcon /> : <ArrowLeftIcon />}
 *       <Navigation />
 *     </aside>
 *   );
 * }
 * ```
 */
export function useRTL(): RTLContextValue {
  const context = useContext(RTLContext);
  if (!context) {
    throw new Error('useRTL must be used within a RTLProvider');
  }
  return context;
}
