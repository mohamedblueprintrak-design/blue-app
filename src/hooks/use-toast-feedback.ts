"use client";

import type { ReactElement } from "react";
import { toast as sonnerToast } from "sonner";
import { useTranslations } from "next-intl";

interface ToastFeedbackOptions {
  ar: boolean;
}

/**
 * Shape of the legacy Radix `<ToastAction altText="…" onClick={…} />` element
 * that callers historically passed as the `action` field of the toast payload.
 * Sonner does not render a caller-provided React node for the action button —
 * it only accepts `{ label, onClick }` — so we extract those two props from the
 * element and forward them to Sonner's native action API.
 */
type LegacyToastActionElement = ReactElement<{
  altText?: string;
  onClick?: () => void;
}>;

/**
 * Backwards-compatible payload accepted by `toast.toast({ ... })`.
 *
 * Historically this came from the Radix-based `useToast` hook (`@/hooks/use-toast`).
 * All existing call sites pass a subset of these fields, so we keep the same
 * shape and translate it into a Sonner call internally.
 */
export interface LegacyToastPayload {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  action?: LegacyToastActionElement;
  duration?: number;
}

/**
 * Converts a legacy `<ToastAction altText="…" onClick={…} />` React element
 * into Sonner's `{ label, onClick }` action spec. Returns `undefined` when no
 * `altText` is provided so Sonner simply renders the toast without an action
 * button. The legacy `onClick` is optional; we fall back to a no-op so the
 * returned object always satisfies Sonner's required-`onClick` `Action` type.
 */
function extractAction(
  action?: LegacyToastActionElement,
): { label: string; onClick: () => void } | undefined {
  if (!action) return undefined;
  const { altText, onClick } = action.props ?? {};
  if (!altText) return undefined;
  return { label: altText, onClick: onClick ?? (() => {}) };
}

/**
 * Routes a legacy `{ title, description, variant, action, duration }` payload
 * to the appropriate Sonner method. Kept in sync with the wrapper in
 * `use-toast.ts` so the same translation logic powers both entry points.
 */
function emitLegacyToast(payload: LegacyToastPayload) {
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
 * `useToastFeedback` — thin wrapper around Sonner.
 *
 * The legacy API (`showSuccess`, `showError`, `created`, `updated`, `deleted`,
 * `error`, `toast`) is preserved so existing call sites keep working. New code
 * should prefer importing `toast` from `sonner` directly.
 */
export function useToastFeedback({ ar: _ar }: ToastFeedbackOptions) {
  const t = useTranslations("toast");

  const showSuccess = (message: string, description?: string) => {
    sonnerToast.success(message, { description });
  };

  const showError = (message: string, description?: string) => {
    sonnerToast.error(message, { description });
  };

  const created = (itemName: string) =>
    showSuccess(t("created"), t("createdItem", { item: itemName }));

  const updated = (itemName: string) =>
    showSuccess(t("updated"), t("updatedItem", { item: itemName }));

  const deleted = (itemName: string) =>
    showSuccess(t("deleted"), t("deletedItem", { item: itemName }));

  const error = (operation?: string) =>
    showError(
      t("error"),
      operation
        ? t("operationFailedWith", { operation })
        : t("operationFailed"),
    );

  const toast = (payload: LegacyToastPayload) => emitLegacyToast(payload);

  return {
    showSuccess,
    showError,
    created,
    updated,
    deleted,
    error,
    toast,
    // Expose the raw Sonner factory for callers that want the full API.
    sonner: sonnerToast,
  };
}
