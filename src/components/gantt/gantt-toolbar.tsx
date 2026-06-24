import { useTranslations } from 'next-intl';
import React from "react";
import { ChevronLeft, ChevronRight, Layers, List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GanttToolbarProps {
  ar: boolean;
  viewMode: "day" | "week" | "month";
  onViewModeChange: (mode: "day" | "week" | "month") => void;
  showPhaseGroups: boolean;
  onShowPhaseGroupsChange: (show: boolean) => void;
  mobileView: "list" | "gantt";
  onMobileViewChange: (view: "list" | "gantt") => void;
  isMobile: boolean;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onToday: () => void;
}

export function GanttToolbar({
  ar,
  viewMode,
  onViewModeChange,
  showPhaseGroups,
  onShowPhaseGroupsChange,
  mobileView,
  onMobileViewChange,
  isMobile,
  onNavigatePrev,
  onNavigateNext,
  onToday,
}: GanttToolbarProps) {
  const tAuto = useTranslations();
  return (
    <div className="p-3 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mobile View Toggle (list/gantt) — only visible on small screens */}
          <div className="flex items-center md:hidden bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => onMobileViewChange("list")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                mobileView === "list"
                  ? "bg-brand-navy-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
              aria-label={tAuto('auto.listView')}
            >
              <List className="w-3.5 h-3.5" />
              {tAuto('auto.list')}
            </button>
            <button
              onClick={() => onMobileViewChange("gantt")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                mobileView === "gantt"
                  ? "bg-brand-navy-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
              aria-label={tAuto('auto.ganttView')}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {tAuto('auto.gantt')}
            </button>
          </div>

          {/* Phase Group Toggle */}
          <Button
            variant={showPhaseGroups ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 text-xs border-0",
              showPhaseGroups
                ? "bg-brand-navy-600 hover:bg-brand-navy-700 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            )}
            onClick={() => onShowPhaseGroupsChange(!showPhaseGroups)}
          >
            <Layers className="w-3.5 h-3.5 me-1.5" />
            {tAuto('auto.phased')}
          </Button>

          {/* View Mode Toggle — hidden on mobile when in list view */}
          <div className={cn(
            "flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700",
            isMobile && mobileView === "list" && "hidden"
          )}>
            {(["day", "week", "month"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  viewMode === mode
                    ? "bg-brand-navy-600 text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                {mode === "day" ? (tAuto('auto.day')) : mode === "week" ? (tAuto('auto.week')) : tAuto('auto.month')}
              </button>
            ))}
          </div>
        </div>

        <div className={cn(
          "flex items-center gap-1",
          isMobile && mobileView === "list" && "hidden"
        )}>
          {/* Navigation */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNavigatePrev} aria-label="Previous">
            {ar ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onToday}>
            {tAuto('auto.today')}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNavigateNext} aria-label="Next">
            {ar ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
