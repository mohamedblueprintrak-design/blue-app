"use client";
 


import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  X,
  Calendar,
  Building2,
  FileText,
  TrendingUp,
  Trophy,
  XCircle,
  User,
  MapPin,
  Globe,
  Timer,
  AlertCircle,
} from "lucide-react";
import { TenderDetail } from "./types";
import { getStatusConfig, getAuthorityConfig, getProjectTypeLabel } from "./types";

// ===== Countdown Component (used in detail panel) =====
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

// ===== Detail Panel =====
interface TenderDetailPanelProps {
  tender: TenderDetail;
  ar: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export function TenderDetailPanel({
  tender,
  ar,
  onClose,
  onEdit,
}: TenderDetailPanelProps) {
  const statusCfg = getStatusConfig(tender.status);
  const authCfg = getAuthorityConfig(tender.authority);

  return (
    <div className="w-full lg:w-[420px] flex-shrink-0 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 dark:from-teal-700 dark:to-teal-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            {ar ? "تفاصيل المناقصة" : "Tender Details"}
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10" onClick={onEdit} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10 lg:hidden" onClick={onClose} aria-label="Close">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-h-[calc(100vh-220px)] overflow-y-auto p-4 space-y-4">
        {/* Title & Status */}
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex-1">
              {tender.title}
            </h4>
            <span className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0",
              statusCfg.pill
            )}>
              {ar ? statusCfg.ar : statusCfg.en}
            </span>
          </div>

          {/* Budget Card */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-teal-500 dark:text-teal-400" />
              <span className="text-xs text-teal-600 dark:text-teal-400">
                {ar ? "الميزانية التقديرية" : "Estimated Budget"}
              </span>
            </div>
            <div className="text-2xl font-bold text-teal-700 dark:text-teal-300 font-mono tabular-nums">
              {tender.estimatedBudget.toLocaleString(ar ? "ar-AE" : "en-US")} <span className="text-sm font-medium">{tender.currency}</span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2.5 text-sm">
            {tender.tenderNumber && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "رقم المناقصة" : "No."}</span>
                  <span className="font-mono text-xs">{tender.tenderNumber}</span>
                </div>
              </div>
            )}

            {tender.authority && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "الجهة" : "Authority"}</span>
                  <span className="text-xs">{ar ? authCfg.ar : authCfg.en}</span>
                </div>
              </div>
            )}

            {tender.projectType && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "نوع المشروع" : "Project Type"}</span>
                  <span className="text-xs">{getProjectTypeLabel(tender.projectType, ar)}</span>
                </div>
              </div>
            )}

            {/* Closing Date */}
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-slate-400 block">{ar ? "تاريخ الإغلاق" : "Closing Date"}</span>
                {tender.closingDate ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs">
                      {new Date(tender.closingDate).toLocaleDateString(ar ? "ar-AE" : "en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                    <ClosingCountdown closingDate={tender.closingDate} ar={ar} />
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">{ar ? "غير محدد" : "Not specified"}</span>
                )}
              </div>
            </div>

            {/* Submission Date */}
            {tender.submissionDate && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "تاريخ التقديم" : "Submission Date"}</span>
                  <span className="text-xs">
                    {new Date(tender.submissionDate).toLocaleDateString(ar ? "ar-AE" : "en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            )}

            {/* Source */}
            {tender.source && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "المصدر" : "Source"}</span>
                  <span className="text-xs">
                    {tender.source === "WEBSITE" ? (ar ? "موقع إلكتروني" : "Website") :
                     tender.source === "REFERRAL" ? (ar ? "إحالة" : "Referral") :
                     tender.source === "DIRECT" ? (ar ? "مباشر" : "Direct") : tender.source}
                  </span>
                </div>
              </div>
            )}

            {/* Assigned To */}
            {tender.assignedUser && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "المسؤول" : "Assigned To"}</span>
                  <span className="text-xs">{tender.assignedUser.name}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {tender.description && (
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400">{ar ? "الوصف" : "Description"}</h5>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {tender.description}
            </p>
          </div>
        )}

        {/* Qualifications */}
        {tender.qualifications && (
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400">{ar ? "المؤهلات المطلوبة" : "Required Qualifications"}</h5>
            <div className="flex flex-wrap gap-1">
              {tender.qualifications.split(",").map((q, i) => (
                <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">
                  {q.trim()}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Required Documents */}
        {tender.requiredDocs && (
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400">{ar ? "المستندات المطلوبة" : "Required Documents"}</h5>
            <div className="flex flex-wrap gap-1">
              {tender.requiredDocs.split(",").map((d, i) => (
                <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0">
                  {d.trim()}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Won Info */}
        {tender.status === "WON" && tender.winnerName && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <Trophy className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">{ar ? "فائز" : "Winner"}</span>
            </div>
            <p className="text-sm text-emerald-600 dark:text-emerald-300">{tender.winnerName}</p>
          </div>
        )}

        {/* Lost Info */}
        {tender.status === "LOST" && tender.lostReason && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
              <XCircle className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">{ar ? "سبب الخسارة" : "Lost Reason"}</span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-300">{tender.lostReason}</p>
          </div>
        )}

        {/* Notes */}
        {tender.notes && (
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400">{ar ? "ملاحظات" : "Notes"}</h5>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {tender.notes}
            </p>
          </div>
        )}

        {/* Documents count */}
        {tender._count?.documents > 0 && (
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <FileText className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                {ar ? `${tender._count.documents} مستند مرفق` : `${tender._count.documents} attached document(s)`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
