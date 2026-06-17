import React from "react";
import { Diamond } from "lucide-react";

interface GanttLegendProps {
  ar: boolean;
}

export function GanttLegend({ ar }: GanttLegendProps) {
  return (
    <div className="p-3 border-t border-slate-200 dark:border-slate-700/50 flex items-center gap-4 flex-wrap text-xs bg-slate-50 dark:bg-slate-800/30">
      <span className="text-slate-400 dark:text-slate-500">{ar ? "الحالة:" : "Status:"}</span>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-teal-500" />
        <span className="text-slate-500 dark:text-slate-400">{ar ? "قيد التنفيذ" : "In Progress"}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-emerald-500" />
        <span className="text-slate-500 dark:text-slate-400">{ar ? "مكتمل" : "Completed"}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-red-500" />
        <span className="text-slate-500 dark:text-slate-400">{ar ? "متأخر" : "Delayed"}</span>
      </div>
      <span className="text-slate-300 dark:text-slate-600 mx-1">|</span>
      <div className="flex items-center gap-1.5">
        <Diamond className="w-3 h-3 text-amber-400 fill-amber-400" />
        <span className="text-slate-500 dark:text-slate-400">{ar ? "معلم" : "Milestone"}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-0 border-t-2 border-teal-500" />
        <span className="text-slate-500 dark:text-slate-400">{ar ? "اليوم" : "Today"}</span>
      </div>
    </div>
  );
}
