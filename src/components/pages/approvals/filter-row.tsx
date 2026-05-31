"use client";

import { Separator } from "@/components/ui/separator";
import { ClipboardCheck, FileText, CreditCard, ShoppingCart, RefreshCw, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { entityFilters, dateFilters, type EntityFilter, type DateFilter } from "./types";
import { getEntityFilterLabel, getDateFilterLabel } from "./helpers";

// Stable component to avoid react-hooks/static-components lint error
function EntityTypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "invoice": return <FileText className={className} />;
    case "payment": return <CreditCard className={className} />;
    case "purchase_order": return <ShoppingCart className={className} />;
    case "change_order": return <RefreshCw className={className} />;
    case "LEAVE": return <CalendarOff className={className} />;
    default: return <FileText className={className} />;
  }
}

interface FilterRowProps {
  ar: boolean;
  activeEntityFilter: EntityFilter;
  setActiveEntityFilter: (f: EntityFilter) => void;
  activeDateFilter: DateFilter;
  setActiveDateFilter: (f: DateFilter) => void;
}

export function FilterRow({ ar, activeEntityFilter, setActiveEntityFilter, activeDateFilter, setActiveDateFilter }: FilterRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Entity type filter chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {entityFilters.map((f) => {
          const isActive = activeEntityFilter === f;
          return (
            <button
              key={f}
              onClick={() => setActiveEntityFilter(f)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-200 shrink-0",
                isActive
                  ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              {f === "all" ? <ClipboardCheck className="h-3 w-3" /> : <EntityTypeIcon type={f} className="h-3 w-3" />}
              {getEntityFilterLabel(f, ar)}
            </button>
          );
        })}
      </div>

      <Separator orientation="vertical" className="h-6 hidden sm:block" />

      {/* Date range filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {dateFilters.map((f) => {
          const isActive = activeDateFilter === f;
          return (
            <button
              key={f}
              onClick={() => setActiveDateFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-200 shrink-0 border",
                isActive
                  ? "bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              {getDateFilterLabel(f, ar)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
