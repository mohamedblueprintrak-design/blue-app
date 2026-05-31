"use client";

import React from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  FileEdit,
  AlertTriangle,
  AlertCircle,
  Pause,
  Send,
  Loader2,
  Ban,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Maps status strings to appropriate Lucide icons for color-blind accessibility.
 * This ensures status badges convey meaning through BOTH color AND shape,
 * satisfying WCAG 1.4.1 (Use of Color).
 *
 * Categories:
 * - Success/Complete: CheckCircle (✓)
 * - Negative/Cancelled: XCircle (✗) or Ban (🚫)
 * - Waiting/Pending: Clock (⏳)
 * - In Progress: Loader2 (⟳) or Clock
 * - Draft: FileEdit (📝)
 * - Warning/Overdue: AlertTriangle (⚠)
 * - Attention/Open: AlertCircle (ℹ)
 * - On Hold: Pause (⏸)
 * - Sent: Send (→)
 */
export const statusIconMap: Record<string, LucideIcon> = {
  // Success / Complete
  active: CheckCircle,
  completed: CheckCircle,
  approved: CheckCircle,
  paid: CheckCircle,
  resolved: CheckCircle,
  received: CheckCircle,
  present: CheckCircle,

  // Negative / Cancelled
  inactive: XCircle,
  cancelled: Ban,
  rejected: XCircle,
  expired: XCircle,
  terminated: XCircle,
  closed: XCircle,
  absent: XCircle,

  // Waiting / Pending
  pending: Clock,
  submitted: Clock,
  partially_paid: Clock,
  on_hold: Pause,
  on_leave: Pause,
  leave: Pause,
  late: Clock,
  paused: Pause,

  // In Progress
  in_progress: Loader2,
  mitigating: Loader2,
  construction: Loader2,

  // Draft
  draft: FileEdit,
  design: FileEdit,

  // Warning
  overdue: AlertTriangle,
  delayed: AlertTriangle,

  // Attention / Open
  open: AlertCircle,
  warning: AlertCircle,
  high: AlertTriangle,
  critical: AlertTriangle,
  medium: AlertCircle,

  // Sent
  sent: Send,
  submission: Send,

  // Lifecycle phases
  approval: Clock,

  // Default fallback
  not_started: Clock,
  locked: Pause,
  returned: XCircle,
};

/**
 * Get the icon component for a given status string.
 * Case-insensitive lookup — tries both uppercase and lowercase variants.
 * Falls back to AlertCircle for unknown statuses.
 */
export function getStatusIcon(status: string): LucideIcon {
  if (!status) return AlertCircle;
  return statusIconMap[status.toLowerCase()] || statusIconMap[status.toUpperCase()] || AlertCircle;
}

/**
 * StatusIcon — renders a small icon appropriate for the given status string.
 * Use inside Badge or status spans for color-blind accessibility.
 *
 * @example
 * <Badge className={...}>
 *   <StatusIcon status="ACTIVE" />
 *   Active
 * </Badge>
 */
export function StatusIcon({
  status,
  className = "h-3 w-3",
  spinning = false,
}: {
  status: string;
  className?: string;
  /** Whether to spin the icon (auto-detected for IN_PROGRESS) */
  spinning?: boolean;
}) {
  const shouldSpin = spinning || status.toUpperCase() === "IN_PROGRESS";
  const iconType = getStatusIcon(status);
  return React.createElement(iconType, {
    className: `${className}${shouldSpin ? " animate-spin" : ""}`,
  });
}

export { CheckCircle, XCircle, Clock, FileEdit, AlertTriangle, AlertCircle, Pause, Send, Loader2, Ban };
