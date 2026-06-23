"use client";


import { useTranslations } from 'next-intl';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { XCircle, CheckCircle2, MessageSquare, Eye, Loader2, FileText, CreditCard, ShoppingCart, RefreshCw, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import type { Approval } from "./types";
import { getEntityTypeBadgeColor, getEntityTypeLabel, getStatusConfig, getHashColor, timeAgo } from "./helpers";

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

interface ApprovalCardProps {
  approval: Approval;
  ar: boolean;
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
  onRequestInfoSubmit: (id: string, notes: string) => void;
}

export function ApprovalCard({
  approval,
  ar,
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
  onRequestInfoSubmit,
}: ApprovalCardProps) {
  const tAuto = useTranslations();
  const sc = getStatusConfig(approval.status);
  const isPending = approval.status === "PENDING";
  const showRejectForm = rejectingId === approval.id;
  const showInfoForm = requestInfoId === approval.id;
  const progressPct = approval.totalSteps > 1
    ? approval.status === "APPROVED"
      ? 100
      : (approval.step / approval.totalSteps) * 100
    : approval.status === "APPROVED" ? 100 : 50;

  return (
    <Card
      className={cn(
        "border rounded-xl transition-all duration-200 hover:shadow-md cursor-pointer overflow-hidden",
        isPending && "border-amber-200 dark:border-amber-800/40 hover:border-amber-300 dark:hover:border-amber-700",
        approval.status === "APPROVED" && "border-emerald-200 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-700",
        approval.status === "REJECTED" && "border-red-200 dark:border-red-800/40 hover:border-red-300 dark:hover:border-red-700",
        approval.status === "CANCELLED" && "border-slate-200 dark:border-slate-700/50",
      )}
      onClick={() => setSelectedApprovalId(approval.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Entity Type Icon */}
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            isPending && "bg-amber-100 dark:bg-amber-900/30",
            approval.status === "APPROVED" && "bg-emerald-100 dark:bg-emerald-900/30",
            approval.status === "REJECTED" && "bg-red-100 dark:bg-red-900/30",
            approval.status === "CANCELLED" && "bg-slate-100 dark:bg-slate-800/50",
          )}>
            <EntityTypeIcon type={approval.entityType} className={cn(
              "h-5 w-5",
              isPending && "text-amber-600 dark:text-amber-400",
              approval.status === "APPROVED" && "text-emerald-600 dark:text-emerald-400",
              approval.status === "REJECTED" && "text-red-600 dark:text-red-400",
              approval.status === "CANCELLED" && "text-slate-500 dark:text-slate-400",
            )} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Badges Row */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                getEntityTypeBadgeColor(approval.entityType)
              )}>
                {getEntityTypeLabel(approval.entityType, ar)}
              </span>
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                sc.bgColor, sc.color
              )}>
                {(() => { const Icon = sc.icon; return <Icon className="h-3 w-3" />; })()}
                {ar ? sc.ar : sc.en}
              </span>
              {isPending && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
              )}
              <span className="text-[10px] text-slate-400 dark:text-slate-500 ms-auto">
                {timeAgo(approval.createdAt, ar)}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 truncate">
              {approval.title}
            </h3>

            {/* Description */}
            {approval.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">
                {approval.description}
              </p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-2.5">
              {/* Requested By */}
              <div className="flex items-center gap-1.5">
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 ring-2 ring-white dark:ring-slate-900", getHashColor(approval.requestedBy))}>
                  {approval.requestedBy.charAt(0).toUpperCase()}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {tAuto('auto.from')}: {approval.requestedBy}
                </span>
              </div>

              {/* Assigned To */}
              <div className="flex items-center gap-1.5">
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 ring-2 ring-white dark:ring-slate-900", getHashColor(approval.assignedTo))}>
                  {approval.assignedTo.charAt(0).toUpperCase()}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {tAuto('auto.to')}: {approval.assignedTo}
                </span>
              </div>

              {/* Amount */}
              {approval.amount > 0 && (
                <span className="text-[11px] font-mono tabular-nums font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded-md">
                  {formatCurrency(approval.amount, ar)}
                </span>
              )}
            </div>

            {/* Step Progress */}
            {approval.totalSteps > 1 && (
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {ar ? `الخطوة ${approval.step} من ${approval.totalSteps}` : `Step ${approval.step} of ${approval.totalSteps}`}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden max-w-[140px]">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      approval.status === "APPROVED" ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
                      approval.status === "REJECTED" ? "bg-red-500" :
                      "bg-gradient-to-r from-amber-400 to-amber-500"
                    )}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                {/* Mini step indicators */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: approval.totalSteps }, (_, i) => i + 1).map((s) => (
                    <div
                      key={s}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        approval.status === "APPROVED"
                          ? "bg-emerald-500"
                          : approval.status === "REJECTED"
                            ? s <= approval.step ? "bg-red-500" : "bg-slate-200 dark:bg-slate-700"
                            : s < approval.step
                              ? "bg-emerald-500"
                              : s === approval.step
                                ? "bg-amber-500"
                                : "bg-slate-200 dark:bg-slate-700"
                      )}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Notes (non-pending) */}
            {approval.notes && !isPending && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 mb-2.5 border border-slate-100 dark:border-slate-800">
                <span className="font-semibold">{tAuto('auto.notes')}: </span>
                {approval.notes}
              </div>
            )}

            {/* Reject Form */}
            {showRejectForm && (
              <div className="mb-3 space-y-2 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800/40">
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={tAuto('auto.reasonForRejection')}
                  className="text-xs h-20 resize-none rounded-lg border-red-200 dark:border-red-800/40 focus-visible:ring-red-300"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-7 bg-red-600 hover:bg-red-700 text-white text-xs border-0"
                    disabled={!rejectReason.trim() || rejectMutationIsPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject(approval.id, rejectReason);
                    }}
                  >
                    {rejectMutationIsPending ? <Loader2 className="h-3 w-3 me-1 animate-spin" /> : <XCircle className="h-3 w-3 me-1" />}
                    {tAuto('auto.confirmReject')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRejectingId(null);
                      setRejectReason("");
                    }}
                  >
                    {tAuto('auto.cancel')}
                  </Button>
                </div>
              </div>
            )}

            {/* Request Info Form */}
            {showInfoForm && (
              <div className="mb-3 space-y-2 p-3 bg-sky-50 dark:bg-sky-900/10 rounded-lg border border-sky-200 dark:border-sky-800/40">
                <Textarea
                  value={requestInfoText}
                  onChange={(e) => setRequestInfoText(e.target.value)}
                  placeholder={tAuto('auto.informationRequested')}
                  className="text-xs h-20 resize-none rounded-lg border-sky-200 dark:border-sky-800/40 focus-visible:ring-sky-300"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-7 bg-sky-600 hover:bg-sky-700 text-white text-xs border-0"
                    disabled={!requestInfoText.trim()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestInfoSubmit(approval.id, requestInfoText);
                    }}
                  >
                    <MessageSquare className="h-3 w-3 me-1" />
                    {tAuto('auto.send')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRequestInfoId(null);
                      setRequestInfoText("");
                    }}
                  >
                    {tAuto('auto.cancel')}
                  </Button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {isPending && !showRejectForm && !showInfoForm && (
                <>
                  <Button
                    size="sm"
                    className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-sm shadow-emerald-600/20 border-0 gap-1"
                    disabled={approveMutationIsPending}
                    onClick={() => onApprove(approval.id)}
                  >
                    {approveMutationIsPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    {tAuto('auto.approve')}
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 bg-red-600 hover:bg-red-700 text-white text-xs shadow-sm shadow-red-600/20 border-0 gap-1"
                    onClick={() => setRejectingId(approval.id)}
                  >
                    <XCircle className="h-3 w-3" />
                    {tAuto('auto.reject')}
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 bg-sky-600 hover:bg-sky-700 text-white text-xs shadow-sm shadow-sky-600/20 border-0 gap-1"
                    onClick={() => setRequestInfoId(approval.id)}
                  >
                    <MessageSquare className="h-3 w-3" />
                    {tAuto('auto.requestInfo')}
                  </Button>
                </>
              )}
              {!isPending && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  onClick={() => setSelectedApprovalId(approval.id)}
                >
                  <Eye className="h-3 w-3" />
                  {tAuto('auto.viewDetails')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
