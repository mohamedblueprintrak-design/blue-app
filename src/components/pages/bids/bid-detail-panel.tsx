"use client";


import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, CheckCircle, XCircle, ClipboardCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import type { BidItem } from "./types";
import { getStatusConfig } from "./types";
import { DeadlineBadge } from "./deadline-badge";

interface BidDetailPanelProps {
  bid: BidItem;
  ar: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onEvaluateBid: (bid: BidItem) => void;
  onDelete: (id: string) => void;
}

export function BidDetailPanel({
  bid,
  ar,
  onClose,
  onStatusChange,
  onEvaluateBid,
  onDelete,
}: BidDetailPanelProps) {
  const tAuto = useTranslations();
  return (
    <div className="w-full lg:w-[380px] flex-shrink-0 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{tAuto('auto.bidDetails')}</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10" onClick={onClose} aria-label="Close">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <ScrollArea className="h-[300px] lg:h-[calc(100vh-420px)]">
        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <div>
              <span className="text-xs text-slate-400">{tAuto('auto.project')}</span>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{ar ? bid.project.name : bid.project.nameEn || bid.project.name}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400">{tAuto('auto.contractor')}</span>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{bid.contractorName}</p>
              {bid.contractorContact && <p className="text-xs text-slate-500 mt-0.5" dir="ltr">{bid.contractorContact}</p>}
            </div>
            <div>
              <span className="text-xs text-slate-400">{tAuto('auto.amount')}</span>
              <p className="text-lg font-bold text-brand-navy-600 dark:text-brand-navy-400 tabular-nums font-mono">{formatCurrency(bid.amount, ar)}</p>
            </div>

            {/* Scores */}
            {bid.totalScore > 0 && (
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 space-y-2">
                <span className="text-xs font-semibold text-slate-500">{tAuto('auto.evaluation')}</span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400">{tAuto('auto.tech')}</p>
                    <p className="text-sm font-bold text-amber-600 tabular-nums">{bid.technicalScore}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">{tAuto('auto.fin')}</p>
                    <p className="text-sm font-bold text-cyan-600 tabular-nums">{bid.financialScore}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">{tAuto('auto.total')}</p>
                    <p className="text-sm font-bold text-brand-navy-600 tabular-nums">{Math.round(bid.totalScore)}</p>
                  </div>
                </div>
                <Progress value={bid.totalScore} className="h-2 [&>div]:bg-brand-navy-500" />
              </div>
            )}

            <div>
              <span className="text-xs text-slate-400">{tAuto('auto.status1')}</span>
              <div className="mt-1">
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", getStatusConfig(bid.status).color)}>
                  {ar ? getStatusConfig(bid.status).ar : getStatusConfig(bid.status).en}
                </span>
              </div>
            </div>

            {bid.deadline && (
              <div>
                <span className="text-xs text-slate-400">{tAuto('auto.deadline')}</span>
                <div className="mt-1"><DeadlineBadge deadline={bid.deadline} ar={ar} /></div>
              </div>
            )}

            {bid.evaluationNotes && (
              <div>
                <span className="text-xs text-slate-400">{tAuto('auto.evalNotes')}</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{bid.evaluationNotes}</p>
              </div>
            )}

            {bid.notes && (
              <div>
                <span className="text-xs text-slate-400">{tAuto('auto.notes')}</span>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{bid.notes}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-slate-400">{tAuto('auto.submitted')}</span>
              <p className="text-sm text-slate-500">{new Date(bid.createdAt).toLocaleDateString(ar ? "ar-AE" : "en-US")}</p>
            </div>
          </div>

          {(bid.status === "SUBMITTED" || bid.status === "UNDER_REVIEW") && (
            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <Button size="sm" className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-white rounded-lg" onClick={() => onStatusChange(bid.id, "ACCEPTED")}>
                <CheckCircle className="h-3.5 w-3.5 me-1" />{tAuto('auto.accept')}
              </Button>
              <Button size="sm" className="flex-1 h-8 bg-red-600 hover:bg-red-700 text-white rounded-lg" onClick={() => onStatusChange(bid.id, "REJECTED")}>
                <XCircle className="h-3.5 w-3.5 me-1" />{tAuto('auto.reject')}
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 h-8 rounded-lg" onClick={() => onEvaluateBid(bid)}>
              <ClipboardCheck className="h-3.5 w-3.5 me-1" />{tAuto('auto.evaluate')}
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-red-500 hover:text-red-600 rounded-lg" onClick={() => {
              if (confirm(tAuto('auto.deleteBid'))) onDelete(bid.id);
            }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
