"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ArrowRightLeft, CheckCheck, Flag, Trash, X } from "lucide-react";
import { COLUMNS, getColumnLabel } from "./types";

// ===== Bulk Action Bar Props =====
interface BulkActionBarProps {
  ar: boolean;
  selectedCount: number;
  onBulkStatusChange: (status: string) => void;
  onBulkPriorityChange: (priority: string) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  isBulkStatusPending: boolean;
  isBulkPriorityPending: boolean;
  isBulkDeletePending: boolean;
}

export function BulkActionBar({
  ar,
  selectedCount,
  onBulkStatusChange,
  onBulkPriorityChange,
  onBulkDelete,
  onClearSelection,
  isBulkStatusPending,
  isBulkPriorityPending,
  isBulkDeletePending,
}: BulkActionBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
      <div className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 border border-slate-700 dark:border-slate-600 rounded-full px-3 py-2 shadow-xl">
        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1">
          <CheckCheck className="h-3.5 w-3.5 text-teal-400" />
          <span className="text-xs font-bold text-white tabular-nums">{selectedCount}</span>
        </div>

        <Separator orientation="vertical" className="h-6 bg-slate-700 dark:bg-slate-600" />

        {/* Change Status */}
        <Select onValueChange={onBulkStatusChange} disabled={isBulkStatusPending}>
          <SelectTrigger className="h-8 w-[110px] text-[11px] border-0 bg-white/10 text-white hover:bg-white/20 rounded-lg">
            <ArrowRightLeft className="h-3 w-3 me-1" />
            {ar ? "الحالة" : "Status"}
          </SelectTrigger>
          <SelectContent>
            {COLUMNS.map((c) => (
              <SelectItem key={c.id} value={c.id}>{getColumnLabel(c.id, ar)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Change Priority */}
        <Select onValueChange={onBulkPriorityChange} disabled={isBulkPriorityPending}>
          <SelectTrigger className="h-8 w-[110px] text-[11px] border-0 bg-white/10 text-white hover:bg-white/20 rounded-lg">
            <Flag className="h-3 w-3 me-1" />
            {ar ? "الأولوية" : "Priority"}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NORMAL">{ar ? "عادي" : "Normal"}</SelectItem>
            <SelectItem value="MEDIUM">{ar ? "متوسط" : "Medium"}</SelectItem>
            <SelectItem value="HIGH">{ar ? "عالي" : "High"}</SelectItem>
            <SelectItem value="URGENT">{ar ? "عاجل" : "Urgent"}</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 bg-slate-700 dark:bg-slate-600" />

        {/* Delete */}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg"
          onClick={onBulkDelete}
          disabled={isBulkDeletePending}
        >
          <Trash className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-6 bg-slate-700 dark:bg-slate-600" />

        {/* Cancel */}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
          onClick={onClearSelection}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ===== Stats Calculation Helper =====
export function getTaskStats(tasks: { priority: string; dueDate: string | null; taskType: string }[]) {
  const now = new Date();
  const urgentCount = tasks.filter((t) => t.priority === "URGENT").length;
  const overdueCount = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now).length;
  const govCount = tasks.filter((t) => t.taskType === "GOVERNMENTAL" || t.taskType === "MANDATORY").length;
  return { urgentCount, overdueCount, govCount, total: tasks.length };
}
