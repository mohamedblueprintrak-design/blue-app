"use client";

import { useEffect, useCallback } from "react";
import { useNavStore } from "@/store/nav-store";

interface KeyboardShortcutsOptions {
  /** Whether shortcuts are active (default: true) */
  enabled?: boolean;
  /** Custom handler for Ctrl+K (overrides default open search) */
  onCtrlK?: () => void;
  /** Custom handler for Escape (overrides default go to dashboard) */
  onEscape?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { enabled = true, onCtrlK, onEscape } = options;
  const { setCurrentPage, currentPage } = useNavStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Ctrl+K / Cmd+K: Open global search (works everywhere, even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (onCtrlK) {
          onCtrlK();
        } else {
          // Toggle: if already on search, go to dashboard; otherwise open search
          if (currentPage === "search") {
            setCurrentPage("dashboard");
          } else {
            setCurrentPage("search");
          }
        }
        return;
      }

      // Escape: Close current view / go back to dashboard
      // Only fires when NOT in an input (except when search is open)
      if (e.key === "Escape") {
        if (isInputFocused && currentPage !== "search") return;
        e.preventDefault();
        if (onEscape) {
          onEscape();
        } else {
          setCurrentPage("dashboard");
        }
        return;
      }
    },
    [enabled, onCtrlK, onEscape, currentPage, setCurrentPage]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
