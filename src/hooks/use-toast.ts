"use client";

// =============================================================================
// @deprecated — Backwards-compatibility wrapper around Sonner.
// =============================================================================
// The original implementation of this file (removed in task P1-15) was a
// hand-rolled Radix-based toast store (~194 LOC) with a global reducer,
// in-memory `listeners[]`, `toastTimeouts` Map, etc. It competed with the
// `sonner` library that was already in `package.json` and was being used
// directly in several components (`workflow-tab`, `contractor-rfq-tab`,
// `websocket-context`).
//
// The audit (see `/home/z/my-project/worklog.md`) found ~65 call sites of
// `useToast` / `useToastFeedback` and ~68 direct `sonner` usages — two
// parallel systems. We unified on Sonner (the more modern, simpler library).
//
// To avoid touching all 65 call sites, this module keeps the same exports
// (`useToast`, `toast`) and the same payload shape (`{ title, description,
// variant, action, duration }`) but delegates to `sonner.toast` internally.
// New code should import `toast` from `sonner` directly, or use
// `useToastFeedback` from `@/hooks/use-toast-feedback` for the i18n-aware
// helpers (`created` / `updated` / `deleted` / `error`).
// =============================================================================

import type { ReactElement } from "react";
import { toast as sonnerToast } from "sonner";

export type ToastVariant = "default" | "destructive" | "success";

/**
 * Legacy Radix `<ToastAction altText="…" onClick={…} />` element. Sonner does
 * not render caller-provided nodes for the action button — it only accepts
 * `{ label, onClick }` — so we extract those two props and forward them.
 */
type LegacyToastActionElement = ReactElement<{
  altText?: string;
  onClick?: () => void;
}>;

export interface ToastPayload {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  action?: LegacyToastActionElement;
  duration?: number;
}

function extractAction(
  action?: LegacyToastActionElement,
): { label: string; onClick: () => void } | undefined {
  if (!action) return undefined;
  const { altText, onClick } = action.props ?? {};
  if (!altText) return undefined;
  // The legacy `onClick` is optional on the `<ToastAction>` element; we fall
  // back to a no-op so the returned object always satisfies Sonner's
  // required-`onClick` `Action` type.
  return { label: altText, onClick: onClick ?? (() => {}) };
}

/**
 * Emit a toast using the legacy Radix-style payload shape. Picks the Sonner
 * method based on `variant`:
 *   - `"destructive"` → `sonner.error`
 *   - `"success"`     → `sonner.success`
 *   - default / unset → `sonner(message)`
 *
 * `action` is converted from a React element to Sonner's `{ label, onClick }`
 * action spec so existing `<ToastAction altText="Undo" onClick={…} />` usage
 * in `tasks/index.tsx`, `projects/index.tsx`, and `invoices.tsx` keeps working.
 */
export function toast(payload: ToastPayload): void {
  const { title, description, variant, action, duration } = payload;
  const options = {
    description,
    duration,
    action: extractAction(action),
  };
  const message = title ?? "";
  if (variant === "destructive") {
    sonnerToast.error(message, options);
  } else if (variant === "success") {
    sonnerToast.success(message, options);
  } else {
    sonnerToast(message, options);
  }
}

/**
 * @deprecated Use `toast` from `sonner` directly, or `useToastFeedback` for
 * the i18n-aware helpers. Kept only so existing call sites that do
 * `const { toast } = useToast()` keep compiling.
 *
 * Sonner manages its own internal store, so there is no `toasts` array to
 * expose — we return an empty array (the only historical consumer was the
 * Radix `<Toaster />` component, which has been removed). `dismiss` proxies
 * to `sonner.dismiss`.
 */
export function useToast() {
  return {
    toasts: [] as Array<Record<string, unknown>>,
    toast,
    dismiss: (toastId?: string) => {
      if (toastId) sonnerToast.dismiss(toastId);
      else sonnerToast.dismiss();
    },
  };
}

// Re-export Sonner's factory for callers that want the full modern API
// without changing their import path. This is intentionally not the primary
// export — it exists to ease incremental migration.
export { sonnerToast as sonnerToast };
