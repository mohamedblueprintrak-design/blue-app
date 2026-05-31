"use client";

import { Button } from "@/components/ui/button";
import { ClipboardCheck, Plus } from "lucide-react";
import type { Approval } from "./types";
import { ApprovalCard } from "./approval-card";

interface ApprovalCardListProps {
  ar: boolean;
  filteredApprovals: Approval[];
  rejectingId: string | null;
  rejectReason: string;
  requestInfoId: string | null;
  requestInfoText: string;
  approveMutationIsPending: boolean;
  rejectMutationIsPending: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, notes: string) => void;
  setRejectingId: (id: string | null) => void;
  setRejectReason: (reason: string) => void;
  setRequestInfoId: (id: string | null) => void;
  setRequestInfoText: (text: string) => void;
  setSelectedApprovalId: (id: string) => void;
  onNewClick: () => void;
  onRequestInfoSubmit: (id: string, notes: string) => void;
}

export function ApprovalCardList({
  ar,
  filteredApprovals,
  rejectingId,
  rejectReason,
  requestInfoId,
  requestInfoText,
  approveMutationIsPending,
  rejectMutationIsPending,
  onApprove,
  onReject,
  setRejectingId,
  setRejectReason,
  setRequestInfoId,
  setRequestInfoText,
  setSelectedApprovalId,
  onNewClick,
  onRequestInfoSubmit,
}: ApprovalCardListProps) {
  if (filteredApprovals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-5">
          <ClipboardCheck className="h-10 w-10 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          {ar ? "لا توجد طلبات موافقة" : "No approvals found"}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
          {ar
            ? "لا توجد طلبات تطابق الفلاتر المحددة. جرّب تغيير الفلاتر أو أنشئ طلب جديد."
            : "No approval requests match the selected filters. Try changing filters or create a new request."}
        </p>
        <Button
          onClick={onNewClick}
          className="gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white border-0 shadow-md shadow-teal-500/20"
        >
          <Plus className="h-4 w-4" />
          {ar ? "إنشاء طلب جديد" : "Create New Request"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[calc(100vh-460px)] overflow-y-auto custom-scrollbar pr-1">
      {filteredApprovals.map((approval) => (
        <ApprovalCard
          key={approval.id}
          approval={approval}
          ar={ar}
          rejectingId={rejectingId}
          rejectReason={rejectReason}
          requestInfoId={requestInfoId}
          requestInfoText={requestInfoText}
          approveMutationIsPending={approveMutationIsPending}
          rejectMutationIsPending={rejectMutationIsPending}
          onApprove={onApprove}
          onReject={onReject}
          setRejectingId={setRejectingId}
          setRejectReason={setRejectReason}
          setRequestInfoId={setRequestInfoId}
          setRequestInfoText={setRequestInfoText}
          setSelectedApprovalId={setSelectedApprovalId}
          onRequestInfoSubmit={onRequestInfoSubmit}
        />
      ))}
    </div>
  );
}
