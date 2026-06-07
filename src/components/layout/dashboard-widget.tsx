"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  EyeOff,
  MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLang } from "@/hooks/use-lang";

interface DashboardWidgetProps {
  id: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onHide?: () => void;
  className?: string;
}

export function DashboardWidget({
  id,
  title,
  icon: Icon,
  children,
  isCollapsed = false,
  onToggleCollapse,
  onHide,
  className,
}: DashboardWidgetProps) {
  const lang = useLang();
  const ar = lang === "ar";
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: false });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl",
        isDragging && "z-50 opacity-90",
        className
      )}
    >
      {/* Widget Header Bar */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 mb-2 rounded-lg transition-colors",
          isDragging
            ? "bg-teal-50 dark:bg-teal-950/20 shadow-lg shadow-slate-200/60 dark:shadow-slate-900/60 ring-2 ring-teal-500/30 dark:ring-teal-400/20"
            : "hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
        )}
      >
        {/* Drag Handle - right side in RTL, left in LTR */}
        <button
          {...attributes}
          {...listeners}
          className={cn(
            "cursor-grab active:cursor-grabbing p-1 rounded-md transition-colors",
            "hover:bg-slate-200/60 dark:hover:bg-slate-700/60",
            "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
            "focus:outline-none focus:ring-2 focus:ring-teal-500/30",
            isDragging && "text-teal-600 dark:text-teal-400 bg-teal-100/60 dark:bg-teal-900/30"
          )}
          aria-label={ar ? "اسحب لإعادة الترتيب" : "Drag to reorder"}
          tabIndex={0}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Icon + Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide truncate">
            {title}
          </h3>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          {/* Collapse/Expand */}
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? (ar ? "توسيع العنصر" : "Expand widget") : (ar ? "طي العنصر" : "Collapse widget")}
            >
              {isCollapsed ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
            </Button>
          )}

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={ar ? "خيارات أخرى" : "More options"}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={onHide || undefined}
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 cursor-pointer"
              >
                <EyeOff className="h-3.5 w-3.5 me-2" />
                {ar ? "إخفاء العنصر" : "Hide widget"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Widget Content */}
      {!isCollapsed && (
        <div
          className={cn(
            "transition-all duration-200",
            isDragging && "scale-[1.01]"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
