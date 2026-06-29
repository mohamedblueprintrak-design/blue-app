"use client";


import { useTranslations } from 'next-intl';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Plus } from "lucide-react";

interface ApprovalHeaderProps {
  ar: boolean;
  totalCount: number;
  pendingCount: number;
  onNewClick: () => void;
}

export function ApprovalHeader({ ar, totalCount, pendingCount, onNewClick }: ApprovalHeaderProps) {
  const tAuto = useTranslations();
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-navy-500 to-cyan-600 flex items-center justify-center shadow-md shadow-brand-navy-500/20">
          <ClipboardCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {tAuto('auto.approvalCenter')}
            </h2>
            {pendingCount > 0 && (
              <span className="relative flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <Badge className="relative bg-amber-500 text-white text-[10px] h-5 min-w-[20px] px-1.5 border-0 flex items-center justify-center">
                  {pendingCount}
                </Badge>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {ar
              ? `${totalCount} طلب موافقة · ${pendingCount} بانتظار الإجراء`
              : `${totalCount} approval requests · ${pendingCount} pending action`}
          </p>
        </div>
      </div>

      {/* New Approval Request Button */}
      <Button
        onClick={onNewClick}
        className="gap-2 bg-gradient-to-r from-brand-navy-600 to-cyan-600 hover:from-brand-navy-700 hover:to-cyan-700 text-white text-sm shadow-md shadow-brand-navy-500/20 border-0 h-9 px-4"
      >
        <Plus className="h-4 w-4" />
        {tAuto('auto.newApprovalRequest')}
      </Button>
    </div>
  );
}
