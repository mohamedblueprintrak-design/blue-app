/**
 * @module components/common/accessible-components
 * @description Enhanced accessible wrapper components for the BluePrint SaaS platform.
 * Provides reusable components for common accessibility patterns including
 * visually hidden content, skip navigation, accessible dialog/accordion/tabs wrappers,
 * live regions, focus guards, and keyboard shortcut display.
 *
 * @example
 * ```tsx
 * // Skip navigation links (add at top of layout)
 * <SkipNavLink>Skip to main content</SkipNavLink>
 * <SkipNavContent />
 *
 * // Visually hidden text for screen readers
 * <VisuallyHidden>Loading 3 new projects</VisuallyHidden>
 *
 * // Announce dynamic changes
 * <LiveRegion>3 new tasks have been assigned to you</LiveRegion>
 * ```
 */

'use client';


import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// ─── VisuallyHidden ──────────────────────────────────────────────────────────

/**
 * Renders content that is visually hidden but accessible to screen readers.
 * Uses the `sr-only` class from Tailwind CSS.
 *
 * @example
 * ```tsx
 * <button>
 *   <CloseIcon />
 *   <VisuallyHidden>Close dialog</VisuallyHidden>
 * </button>
 * ```
 */
export function VisuallyHidden({
  children,
  as: Component = 'span',
  ...props
}: {
  children: React.ReactNode;
  /** The HTML element to render as (default: 'span') */
  as?: React.ElementType;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Component
      className="absolute size-px overflow-hidden whitespace-nowrap p-0 [clip:rect(0,0,0,0)] [clip-path:inset(50%)] [height:1px] [margin:-1px] [border:0] [white-space:nowrap] [width:1px]"
      {...props}
    >
      {children}
    </Component>
  );
}

// ─── Skip Navigation ─────────────────────────────────────────────────────────

/**
 * Skip navigation link component.
 * Place at the very top of your layout. Becomes visible when focused via Tab.
 * Links to the main content area, allowing keyboard users to skip repetitive navigation.
 *
 * Supports RTL layout — the link appears on the right side in RTL mode.
 * Supports bilingual text (Arabic/English) via the `lang` prop.
 *
 * @example
 * ```tsx
 * // In your root layout:
 * <body>
 *   <SkipNavLink lang="ar">تخطي إلى المحتوى الرئيسي</SkipNavLink>
 *   <header>...</header>
 *   <SkipNavContent />
 *   <main>Page content here</main>
 * </body>
 * ```
 */
export function SkipNavLink({
  children,
  className,
  contentId = 'skip-nav-content',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
        lang = 'ar',
}: {
  /** Link text (default: bilingual based on lang prop) */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** ID of the element to skip to (default: 'skip-nav-content') */
  contentId?: string;
  /** Language for default text: 'ar' or 'en' (default: 'ar') */
  lang?: 'ar' | 'en';
}) {
  const tAuto = useTranslations();
  const defaultText = tAuto('auto.skipToMainContent');
  return (
    <a
      href={`#${contentId}`}
      aria-label={tAuto('auto.skipToMainContent')}
      className={cn(
        'fixed z-[9999] -translate-y-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        // Position: right side in RTL, left side in LTR
        'start-4 top-4',
        className
      )}
    >
      {children || defaultText}
    </a>
  );
}

/**
 * Content target for the skip navigation link.
 * Place this component at the beginning of your main content area.
 * It renders an invisible element that receives focus when the skip link is activated.
 *
 * @example
 * ```tsx
 * <main>
 *   <SkipNavContent />
 *   <h1>Page Title</h1>
 *   ...
 * </main>
 * ```
 */
export function SkipNavContent({
  id = 'skip-nav-content',
  className,
}: {
  /** ID that matches the SkipNavLink contentId (default: 'skip-nav-content') */
  id?: string;
  /** Additional CSS classes */
  className?: string;
}) {
  return (
    <div
      id={id}
      tabIndex={-1}
      className={cn('outline-none', className)}
      style={{ outline: 'none' }}
    />
  );
}

// ─── AccessibleDialog ────────────────────────────────────────────────────────

/**
 * Enhanced accessible dialog wrapper built on top of Radix Dialog.
 * Ensures proper ARIA attributes, focus management, and keyboard handling.
 *
 * @example
 * ```tsx
 * <AccessibleDialog
 *   title="Delete Project"
 *   description="Are you sure you want to delete this project? This action cannot be undone."
 *   trigger={<Button variant="destructive">Delete</Button>}
 *   onConfirm={handleDelete}
 *   confirmLabel="Delete"
 *   cancelLabel="Cancel"
 * />
 * ```
 */
export function AccessibleDialog({
  title,
  description,
  trigger,
  children,
  onOpenChange,
  open,
  className,
}: {
  /** Dialog title (required for accessibility) */
  title: string;
  /** Optional dialog description */
  description?: string;
  /** Trigger element that opens the dialog */
  trigger?: React.ReactNode;
  /** Dialog content (overrides default confirm/cancel pattern) */
  children?: React.ReactNode;
  /** Called when the dialog open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Controlled open state */
  open?: boolean;
  /** Additional CSS classes for the dialog content */
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn('max-w-md', className)}
        aria-describedby={description ? 'accessible-dialog-desc' : undefined}
      >
        <DialogTitle className="text-left">{title}</DialogTitle>
        {description && (
          <DialogDescription id="accessible-dialog-desc">
            {description}
          </DialogDescription>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}

// ─── AccessibleAccordion ─────────────────────────────────────────────────────

/**
 * Enhanced accessible accordion built on top of Radix Accordion.
 * Provides proper keyboard navigation, ARIA states, and collapsible behavior.
 *
 * @example
 * ```tsx
 * <AccessibleAccordion
 *   items={[
 *     {
 *       id: 'item-1',
 *       title: 'What is BluePrint?',
 *       content: 'BluePrint is a construction project management platform.',
 *     },
 *     {
 *       id: 'item-2',
 *       title: 'How do I create a project?',
 *       content: 'Navigate to Projects and click "Create Project".',
 *     },
 *   ]}
 * />
 * ```
 */
export function AccessibleAccordion({
  items,
  type = 'single',
  collapsible = true,
  className,
}: {
  /** Array of accordion items */
  items: Array<{
    /** Unique identifier for the item */
    id: string;
    /** Trigger title */
    title: string;
    /** Content to display when expanded */
    content: React.ReactNode;
    /** Optional ARIA description for the trigger */
    description?: string;
  }>;
  /** Accordion type: 'single' or 'multiple' (default: 'single') */
  type?: 'single' | 'multiple';
  /** Whether single items can be collapsed (default: true) */
  collapsible?: boolean;
  /** Additional CSS classes */
  className?: string;
}) {
  return (
    <Accordion
      type={type}
      collapsible={collapsible}
      className={className}
    >
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger
            aria-describedby={item.description ? `accordion-desc-${item.id}` : undefined}
          >
            {item.title}
          </AccordionTrigger>
          <AccordionContent>
            {item.description && (
              <VisuallyHidden id={`accordion-desc-${item.id}`}>
                {item.description}
              </VisuallyHidden>
            )}
            {item.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

// ─── AccessibleTabs ──────────────────────────────────────────────────────────

/**
 * Enhanced accessible tabs component built on top of Radix Tabs.
 * Ensures proper ARIA roles, keyboard navigation, and focus management.
 *
 * @example
 * ```tsx
 * <AccessibleTabs
 *   tabs={[
 *     { id: 'overview', label: 'Overview', content: <OverviewPanel /> },
 *     { id: 'tasks', label: 'Tasks', content: <TasksPanel /> },
 *     { id: 'settings', label: 'Settings', content: <SettingsPanel /> },
 *   ]}
 *   defaultValue="overview"
 * />
 * ```
 */
export function AccessibleTabs({
  tabs,
  defaultValue,
  value,
  onValueChange,
  className,
}: {
  /** Array of tab definitions */
  tabs: Array<{
    /** Unique identifier for the tab */
    id: string;
    /** Tab trigger label */
    label: string;
    /** Tab content */
    content: React.ReactNode;
    /** Optional icon component */
    icon?: React.ReactNode;
    /** Whether this tab is disabled */
    disabled?: boolean;
  }>;
  /** Default active tab */
  defaultValue?: string;
  /** Controlled active tab */
  value?: string;
  /** Called when the active tab changes */
  onValueChange?: (value: string) => void;
  /** Additional CSS classes */
  className?: string;
}) {
  return (
    <Tabs
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      className={className}
    >
      <TabsList aria-label="Tab navigation">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
            aria-controls={`tabpanel-${tab.id}`}
          >
            {tab.icon && (
              <span className="mr-1.5" aria-hidden="true">
                {tab.icon}
              </span>
            )}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent
          key={tab.id}
          value={tab.id}
          id={`tabpanel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={tab.id}
          tabIndex={0}
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

// ─── LiveRegion ──────────────────────────────────────────────────────────────

/**
 * ARIA live region for announcing dynamic content changes to screen readers.
 * Use this component to wrap content that changes dynamically (search results,
 * notifications, loading states).
 *
 * @example
 * ```tsx
 * // Announce search results count
 * <LiveRegion politeness="polite">
 *   Found {results.length} results for "{query}"
 * </LiveRegion>
 *
 * // Announce important alerts immediately
 * <LiveRegion politeness="assertive">
 *   Connection lost! Check your internet connection.
 * </LiveRegion>
 * ```
 */
export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = true,
  relevant = 'additions',
  className,
}: {
  /** Content to announce */
  children: React.ReactNode;
  /** ARIA live politeness: 'polite' (waits) or 'assertive' (immediate) */
  politeness?: 'polite' | 'assertive' | 'off';
  /** Whether the entire region should be announced as a whole (default: true) */
  atomic?: boolean;
  /** What types of changes are relevant (default: 'additions') */
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  /** Additional CSS classes */
  className?: string;
}) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      role="status"
      className={cn('sr-only', className)}
    >
      {children}
    </div>
  );
}

// ─── FocusGuard ──────────────────────────────────────────────────────────────

/**
 * Invisible focus guard element for modal/drawer focus management.
 * Place at the beginning and end of modal content to catch Tab focus
 * and redirect it appropriately.
 *
 * @example
 * ```tsx
 * function MyModal({ children }) {
 *   return (
 *     <div role="dialog" aria-modal="true">
 *       <FocusGuard onFocusMove="last" />
 *       {children}
 *       <FocusGuard onFocusMove="first" />
 *     </div>
 *   );
 * }
 * ```
 */
export function FocusGuard({
  onFocusMove,
  containerRef,
}: {
  /** Direction to move focus: 'first' or 'last' focusable element in container */
  onFocusMove: 'first' | 'last';
  /** Ref to the container element */
  containerRef?: React.RefObject<HTMLElement | null>;
}) {
  const handleFocus = useCallback(() => {
    const container = containerRef?.current ?? document.activeElement?.closest('[role="dialog"]') ?? document.body;

    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const focusableElements = Array.from(
      container.querySelectorAll<HTMLElement>(focusableSelector)
    );

    if (focusableElements.length === 0) return;

    if (onFocusMove === 'first') {
      focusableElements[0].focus();
    } else {
      focusableElements[focusableElements.length - 1].focus();
    }
  }, [containerRef, onFocusMove]);

  return (
    <div
      tabIndex={0}
      onFocus={handleFocus}
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: '0',
      }}
      aria-hidden="true"
    />
  );
}

// ─── KeyboardShortcut ────────────────────────────────────────────────────────

/**
 * Displays a keyboard shortcut with visual key indicators and optional trigger handler.
 * Useful for showing available shortcuts in help panels and tooltips.
 *
 * @example
 * ```tsx
 * // Display-only shortcut
 * <KeyboardShortcut keys={['Ctrl', 'K']} description="Search" />
 *
 * // Interactive shortcut that triggers an action
 * <KeyboardShortcut
 *   keys={['Ctrl', 'N']}
 *   description="New Project"
 *   onTrigger={() => openNewProjectDialog()}
 * />
 * ```
 */
export function KeyboardShortcut({
  keys,
  description,
  onTrigger,
  className,
}: {
  /** Array of key names to display (e.g., ['Ctrl', 'K'], ['⌘', 'Shift', 'P']) */
  keys: string[];
  /** Optional description text shown next to the keys */
  description?: string;
  /** Optional handler that's called when the shortcut key combination is pressed */
  onTrigger?: () => void;
  /** Additional CSS classes */
  className?: string;
}) {
  // Register global keydown listener for the shortcut
  useEffect(() => {
    if (!onTrigger) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't intercept when typing in input fields
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isModifierKey = (key: string) =>
        key === 'Ctrl' || key === 'Alt' || key === 'Shift' || key === 'Meta';

      // Build expected key state
      const expectedModifierKeys = keys.filter(isModifierKey);
      const expectedActionKey = keys.find((k) => !isModifierKey(k));

      if (!expectedActionKey) return;

      const ctrlMatch = !expectedModifierKeys.includes('Ctrl') || event.ctrlKey || event.metaKey;
      const altMatch = !expectedModifierKeys.includes('Alt') || event.altKey;
      const shiftMatch = !expectedModifierKeys.includes('Shift') || event.shiftKey;

      // Normalize the action key
      const pressedKey = event.key.toLowerCase();
      const normalizedExpected = expectedActionKey.toLowerCase().replace(/^⌘$/, 'meta').replace(/^⌥$/, 'alt').replace(/^⇧$/, 'shift');

      if (ctrlMatch && altMatch && shiftMatch && pressedKey === normalizedExpected) {
        event.preventDefault();
        onTrigger();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [keys, onTrigger]);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5',
        className
      )}
    >
      {/* Description (left side in LTR, right side in RTL) */}
      {description && (
        <span className="text-muted-foreground text-xs">{description}</span>
      )}

      {/* Key indicators */}
      <div className="flex items-center gap-0.5" role="group" aria-label={`Keyboard shortcut: ${keys.join(' + ')}`}>
        {keys.map((key, index) => (
          <React.Fragment key={key}>
            {index > 0 && (
              <span className="text-muted-foreground/50 text-xs">+</span>
            )}
            <kbd
              className={cn(
                'inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5',
                'font-mono text-[10px] font-medium leading-none text-muted-foreground',
                'shadow-[0_1px_0_1px_rgba(0,0,0,0.05)]',
                'min-w-[20px]'
              )}
            >
              {key}
            </kbd>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── ScreenReaderOnly ────────────────────────────────────────────────────────

/**
 * Alias for VisuallyHidden with semantic clarity.
 * Content is only accessible to screen readers and not visually rendered.
 *
 * @example
 * ```tsx
 * <span className="relative">
 *   <EnvelopeIcon />
 *   <ScreenReaderOnly>3 unread messages</ScreenReaderOnly>
 * </span>
 * ```
 */
export const ScreenReaderOnly = VisuallyHidden;
