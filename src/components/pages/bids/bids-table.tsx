"use client";


import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, CheckCircle, XCircle, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import type { BidItem } from "./types";
import { getStatusConfig } from "./types";
import { DeadlineBadge } from "./deadline-badge";

interface BidsTableProps {
  ar: boolean;
  filtered: BidItem[];
  showDetailId: string | null;
  onShowDetail: (bid: BidItem) => void;
  onEvaluateBid: (bid: BidItem) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function BidsTable({
  ar,
  filtered,
  showDetailId,
  onShowDetail,
  onEvaluateBid,
  onStatusChange,
}: BidsTableProps) {
  const tAuto = useTranslations();
  return (
    <div className={`flex-1 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm ${showDetailId ? "hidden lg:block" : ""}`}>
      <ScrollArea className="max-h-[calc(100vh-420px)]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
              <TableHead className="text-xs font-semibold">{tAuto('auto.project')}</TableHead>
              <TableHead className="text-xs font-semibold">{tAuto('auto.contractor')}</TableHead>
              <TableHead className="text-xs font-semibold text-end">{tAuto('auto.amount')}</TableHead>
              <TableHead className="text-xs font-semibold text-end">{tAuto('auto.score')}</TableHead>
              <TableHead className="text-xs font-semibold">{tAuto('auto.deadline')}</TableHead>
              <TableHead className="text-xs font-semibold">{tAuto('auto.status1')}</TableHead>
              <TableHead className="text-xs font-semibold text-start">{tAuto('auto.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((bid, idx) => {
              const sc = getStatusConfig(bid.status);
              return (
                <TableRow
                  key={bid.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20",
                    showDetailId === bid.id && "bg-teal-50/50 dark:bg-teal-950/20"
                  )}
                  onClick={() => onShowDetail(bid)}
                >
                  <TableCell className="text-sm font-medium text-slate-900 dark:text-white">
                    {ar ? bid.project.name : bid.project.nameEn || bid.project.name}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm text-slate-900 dark:text-white">{bid.contractorName}</div>
                      {bid.contractor && (
                        <span className="text-[10px] text-teal-600 dark:text-teal-400">{ar ? bid.contractor.companyName : bid.contractor.companyEn || bid.contractor.companyName}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-900 dark:text-white text-end font-mono tabular-nums">
                    {formatCurrency(bid.amount, ar)}
                  </TableCell>
                  <TableCell className="text-end">
                    {bid.totalScore > 0 ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={cn(
                          "text-xs font-bold tabular-nums",
                          bid.totalScore >= 70 ? "text-emerald-600 dark:text-emerald-400" :
                          bid.totalScore >= 40 ? "text-amber-600" : "text-red-500"
                        )}>
                          {Math.round(bid.totalScore)}
                        </span>
                        <Progress value={bid.totalScore} className="w-14 h-1 [&>div]:bg-teal-500" />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DeadlineBadge deadline={bid.deadline} ar={ar} />
                  </TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", sc.color)}>
                      {ar ? sc.ar : sc.en}
                    </span>
                  </TableCell>
                  <TableCell className="text-start">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onShowDetail(bid); }} aria-label="View"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={(e) => { e.stopPropagation(); onEvaluateBid(bid); }} title={tAuto('auto.evaluate')} aria-label="Evaluate">
                        <ClipboardCheck className="h-3.5 w-3.5" />
                      </Button>
                      {(bid.status === "SUBMITTED" || bid.status === "UNDER_REVIEW") && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={(e) => { e.stopPropagation(); onStatusChange(bid.id, "ACCEPTED"); }} aria-label="Accept"><CheckCircle className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={(e) => { e.stopPropagation(); onStatusChange(bid.id, "REJECTED"); }} aria-label="Reject"><XCircle className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400">{tAuto('auto.noBidsFound')}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
