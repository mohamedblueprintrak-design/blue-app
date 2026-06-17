"use client";

// =============================================================================
// @deprecated — Radix toast UI primitives removed in task P1-15.
// =============================================================================
// This file previously wrapped `@radix-ui/react-toast` and exported
// `Toast`, `ToastProvider`, `ToastViewport`, `ToastTitle`, `ToastDescription`,
// `ToastClose`, and `ToastAction`. The toast system is now backed by `sonner`
// (see `src/hooks/use-toast-feedback.ts` and `src/hooks/use-toast.ts`), and the
// Sonner `<Toaster />` is mounted globally in `src/app/layout.tsx`.
//
// All of the Radix primitives have been removed EXCEPT `ToastAction`, which is
// kept as a no-op stub because three call sites still pass
// `<ToastAction altText="Undo" onClick={…}>Undo</ToastAction>` as the `action`
// field of a legacy `toast({ … })` payload. The Sonner wrapper inspects
// `props.altText` and `props.onClick` and forwards them to Sonner's native
// `{ label, onClick }` action API — the element itself is never rendered.
// =============================================================================

import * as React from "react";

import { cn } from "@/lib/utils";

export interface ToastActionProps {
  altText?: string;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * @deprecated Stop passing `<ToastAction>` to `toast({ action })`. Instead, use
 * Sonner's native action API directly:
 *
 *   import { toast } from "sonner";
 *   toast("Message", { action: { label: "Undo", onClick: () => {} } });
 *
 * Kept here only so existing JSX in `tasks/index.tsx`, `projects/index.tsx`,
 * and `invoices.tsx` continues to compile. This component is never rendered —
 * the Sonner wrapper in `use-toast.ts` / `use-toast-feedback.ts` reads
 * `props.altText` and `props.onClick` from the element and passes them to
 * Sonner as `{ label, onClick }`.
 */
export const ToastAction = React.forwardRef<
  HTMLButtonElement,
  ToastActionProps
>(({ className, children, altText: _altText, onClick: _onClick, ...rest }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...rest}
  >
    {children}
  </button>
));
ToastAction.displayName = "ToastAction";

// Type aliases retained for backwards compatibility with any consumer that
// imports them (only the now-deleted `toaster.tsx` and the old `use-toast.ts`
// did, but we keep them to be safe).
export type ToastProps = Record<string, unknown>;
export type ToastActionElement = React.ReactElement<typeof ToastAction>;
