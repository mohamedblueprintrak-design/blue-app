"use client";
 


import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Eye,
  Pencil,
  Trash2,
  Timer,
  XCircle,
  AlertCircle,
  Inbox,
  Plus,
} from "lucide-react";
import { TenderItem } from "./types";
import { getStatusConfig, getAuthorityConfig } from "./types";

// ===== Countdown Component =====
function ClosingCountdown({ closingDate, ar }: { closingDate: string | null; ar: boolean }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!closingDate || now === null) return null;

  const target = new Date(closingDate).getTime();
  const diffMs = target - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
        <XCircle className="h-3 w-3" />
        {ar ? `انتهى منذ ${Math.abs(diffDays)} يوم` : `${Math.abs(diffDays)}d overdue`}
      </span>
    );
  }

  if (diffDays === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 animate-pulse">
        <AlertCircle className="h-3 w-3" />
        {ar ? "ينتهي اليوم" : "Ends today"}
      </span>
    );
  }

  if (diffDays <= 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 animate-pulse">
        <Timer className="h-3 w-3" />
        {ar ? `${diffDays} يوم متبقي` : `${diffDays}d left`}
      </span>
    );
  }

  if (diffDays <= 14) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
        <Timer className="h-3 w-3" />
        {ar ? `${diffDays} يوم` : `${diffDays}d`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
      <Timer className="h-3 w-3" />
      {ar ? `${diffDays} يوم` : `${diffDays}d`}
    </span>
  );
}

// ===== Table Component =====
interface TenderTableProps {
  tenders: TenderItem[];
  isLoading: boolean;
  isAr: boolean;
  selectedTenderId: string | null;
  onSelectTender: (tender: TenderItem) => void;
  onEditTender: (tender: TenderItem) => void;
  onDeleteTender: (tender: TenderItem) => void;
  onAddClick: () => void;
  hasSelectedTender: boolean;
}

export function TenderTable({
  tenders,
  isLoading,
  isAr,
  selectedTenderId,
  onSelectTender,
  onEditTender,
  onDeleteTender,
  onAddClick,
  hasSelectedTender,
}: TenderTableProps) {
  return (
    <div className={cn(
      "flex-1 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm",
      hasSelectedTender && "hidden lg:block"
    )}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
            <TableHead className="text-xs font-semibold">{isAr ? "الرقم" : "No."}</TableHead>
            <TableHead className="text-xs font-semibold">{isAr ? "العنوان" : "Title"}</TableHead>
            <TableHead className="text-xs font-semibold hidden md:table-cell">{isAr ? "الجهة" : "Authority"}</TableHead>
            <TableHead className="text-xs font-semibold hidden sm:table-cell">{isAr ? "الميزانية" : "Budget"}</TableHead>
            <TableHead className="text-xs font-semibold hidden sm:table-cell">{isAr ? "الإغلاق" : "Closing"}</TableHead>
            <TableHead className="text-xs font-semibold hidden lg:table-cell">{isAr ? "الحالة" : "Status"}</TableHead>
            <TableHead className="text-xs font-semibold text-start">{isAr ? "الإجراءات" : "Actions"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  {[...Array(7)].map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full max-w-[100px]" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </>
          )}
          {!isLoading && tenders.map((tender, idx) => {
            const statusCfg = getStatusConfig(tender.status);
            const authCfg = getAuthorityConfig(tender.authority);
            return (
              <TableRow
                key={tender.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                  idx % 2 === 0
                    ? "bg-white dark:bg-slate-900"
                    : "even:bg-slate-50/50 dark:even:bg-slate-800/20",
                  selectedTenderId === tender.id && "bg-teal-50/50 dark:bg-teal-950/20"
                )}
                onClick={() => onSelectTender(tender)}
              >
                <TableCell className="font-mono text-xs text-slate-500">
                  {tender.tenderNumber || "—"}
                </TableCell>
                <TableCell className="font-medium text-slate-900 dark:text-white max-w-[200px] truncate">
                  {tender.title}
                </TableCell>
                <TableCell className="hidden md:table-cell text-slate-600 dark:text-slate-300 text-xs">
                  {isAr ? authCfg.ar : authCfg.en}
                </TableCell>
                <TableCell className="hidden sm:table-cell font-medium text-slate-900 dark:text-white text-sm font-mono tabular-nums">
                  <span className="text-slate-400 dark:text-slate-500">{tender.currency} </span>
                  {tender.estimatedBudget.toLocaleString(isAr ? "ar-AE" : "en-US")}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="flex flex-col gap-1">
                    {tender.closingDate && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(tender.closingDate).toLocaleDateString(isAr ? "ar-AE" : "en-US")}
                      </span>
                    )}
                    <ClosingCountdown closingDate={tender.closingDate} ar={isAr} />
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium",
                    statusCfg.pill
                  )}>
                    {isAr ? statusCfg.ar : statusCfg.en}
                  </span>
                </TableCell>
                <TableCell className="text-start">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); onSelectTender(tender); }}
                      aria-label="View"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); onEditTender(tender); }}
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTender(tender);
                      }}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {!isLoading && tenders.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Inbox className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {isAr ? "لا توجد مناقصات" : "No tenders found"}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {isAr ? "أضف مناقصة جديدة للبدء" : "Add a new tender to get started"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
                    onClick={onAddClick}
                  >
                    <Plus className="h-3.5 w-3.5 me-1" />
                    {isAr ? "مناقصة جديدة" : "New Tender"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
